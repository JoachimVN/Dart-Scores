import { useState } from 'react'
import { TopBar } from './components/TopBar'
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
        <SetupScreen onStart={startGame} />
      </main>
    )
  }

  if (game.status === 'complete') {
    return (
      <main>
        <TopBar modeLabel="X01" settings={settings} onSettingsChange={handleSettingsChange} onOpenStats={() => setView('stats')} />
        <GameOverScreen game={game} onNewGame={newGame} />
      </main>
    )
  }

  return (
    <main>
      <PlayScreen
        game={game}
        onThrow={throwDart}
        onUndo={undo}
        onNewGame={newGame}
        useDartNotation={settings.useDartNotation}
      />
    </main>
  )
}

export default App
