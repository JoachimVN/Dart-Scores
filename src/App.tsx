import { useState, type ReactNode } from 'react'
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
  const { game, startGame, throwDart, undo, redo, canRedo, newGame } = useGame()
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

  // Instantly starts a fresh game with the exact same players and settings,
  // skipping Setup entirely - "New game" above is for when you want to
  // change something first.
  function handleRematch() {
    if (!game) return
    startGame(game.x01.config, game.players)
  }

  // Applies globally regardless of which screen renders below (including Play,
  // which has no top bar of its own).
  useTheme(settings.theme)

  function handleSettingsChange(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }))
    updateSettings(patch)
  }

  let mainContent: ReactNode
  if (!game) {
    mainContent = (
      <>
        <TopBar
          modeLabel="X01"
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onOpenStats={() => setView('stats')}
        />
        <SetupScreen onStart={startGame} initialPlayers={lastPlayers} />
      </>
    )
  } else if (game.status === 'complete') {
    mainContent = (
      <>
        <TopBar
          modeLabel="X01"
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onOpenStats={() => setView('stats')}
        />
        <GameOverScreen
          game={game}
          useDartNotation={settings.useDartNotation}
          onRematch={handleRematch}
          onNewGame={handleNewGame}
        />
      </>
    )
  } else {
    mainContent = (
      <PlayScreen
        game={game}
        onThrow={throwDart}
        onUndo={undo}
        onRedo={redo}
        canRedo={canRedo}
        onNewGame={handleNewGame}
        onRestart={handleRematch}
        useDartNotation={settings.useDartNotation}
      />
    )
  }

  return (
    <main>
      {/* Kept mounted (just hidden), not unmounted, while viewing stats - so
          Setup's in-progress Players selection survives the round trip. */}
      <div style={{ display: view === 'main' ? 'contents' : 'none' }}>{mainContent}</div>
      {view === 'stats' && <StatsScreen onBack={() => setView('main')} />}
    </main>
  )
}

export default App
