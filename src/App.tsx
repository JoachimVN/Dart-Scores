import { useState } from 'react'
import { TopBar } from './components/TopBar'
import type { Player } from './game/types'
import { useGame } from './hooks/useGame'
import { useTheme } from './hooks/useTheme'
import { GameOverScreen } from './screens/GameOverScreen'
import { PlayScreen } from './screens/PlayScreen'
import { SetupScreen } from './screens/SetupScreen'
import { StatsScreen } from './screens/StatsScreen'
import { getSettings, updateSettings } from './settings/settingsRepository'
import type { Settings } from './storage/schema'

function App() {
  const { game, startGame, throwDart, undo, newGame } = useGame()
  const [settings, setSettings] = useState<Settings>(() => getSettings())
  const [view, setView] = useState<'main' | 'stats'>('main')
  const [lastPlayers, setLastPlayers] = useState<Player[]>([])

  // Captures who just played before clearing the game, so Setup can offer
  // them as a ready-made Players list for a quick rematch instead of making
  // you re-pick everyone from Users again.
  function handleNewGame() {
    if (game) setLastPlayers(game.players)
    newGame()
  }

  // Applies globally regardless of which screen renders below (including Play,
  // which has no top bar of its own).
  useTheme(settings.theme)

  function handleSettingsChange(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }))
    updateSettings(patch)
  }

  if (view === 'stats') {
    return (
      <main>
        <StatsScreen onBack={() => setView('main')} />
      </main>
    )
  }

  if (!game) {
    return (
      <main>
        <TopBar modeLabel="X01" settings={settings} onSettingsChange={handleSettingsChange} onOpenStats={() => setView('stats')} />
        <SetupScreen onStart={startGame} initialPlayers={lastPlayers} />
      </main>
    )
  }

  if (game.status === 'complete') {
    return (
      <main>
        <TopBar modeLabel="X01" settings={settings} onSettingsChange={handleSettingsChange} onOpenStats={() => setView('stats')} />
        <GameOverScreen game={game} onNewGame={handleNewGame} />
      </main>
    )
  }

  return (
    <main>
      <PlayScreen
        game={game}
        onThrow={throwDart}
        onUndo={undo}
        onNewGame={handleNewGame}
        useDartNotation={settings.useDartNotation}
      />
    </main>
  )
}

export default App
