import { useGame } from './hooks/useGame'
import { GameOverScreen } from './screens/GameOverScreen'
import { PlayScreen } from './screens/PlayScreen'
import { SetupScreen } from './screens/SetupScreen'

function App() {
  const { game, startGame, throwDart, undo, newGame } = useGame()

  if (!game) {
    return (
      <main>
        <SetupScreen onStart={startGame} />
      </main>
    )
  }

  if (game.status === 'complete') {
    return (
      <main>
        <GameOverScreen game={game} onNewGame={newGame} />
      </main>
    )
  }

  return (
    <main>
      <PlayScreen game={game} onThrow={throwDart} onUndo={undo} />
    </main>
  )
}

export default App
