import type { GameState } from '../game/types'

interface GameOverScreenProps {
  game: GameState
  onNewGame: () => void
}

export function GameOverScreen({ game, onNewGame }: GameOverScreenProps) {
  const winner = game.players.find((player) => player.id === game.x01.winnerId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <h1>{winner ? `${winner.name} wins!` : 'Game over'}</h1>
      <button type="button" onClick={onNewGame}>
        New game
      </button>
    </div>
  )
}
