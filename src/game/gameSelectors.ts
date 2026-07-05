import type { GameState } from './types'

/** The winning player's id, whichever mode's engine the game uses - or null if no one has won yet. */
export function winnerIdOf(game: GameState): string | null {
  return game.mode === 'x01' ? game.x01.winnerId : game.cricket.winnerId
}
