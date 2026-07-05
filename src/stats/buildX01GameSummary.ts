import type { GameState } from '../game/types'
import type { GameSummary, X01PlayerGameSummary } from './types'

/** Builds a persistable summary from a just-completed X01 game, for stats history. */
export function buildX01GameSummary(game: Extract<GameState, { mode: 'x01' }>): Extract<GameSummary, { mode: 'x01' }> {
  const players: X01PlayerGameSummary[] = game.players.map((player) => {
    const playerState = game.x01.playerStates.find((ps) => ps.playerId === player.id)!
    const won = player.id === game.x01.winnerId
    const turnScores = playerState.turns.map((turn) => (turn.bust ? 0 : turn.scoreBefore - turn.scoreAfter))
    const pointsScored = turnScores.reduce((sum, score) => sum + score, 0)
    // The dart that checked them out, if they won this game.
    const bestCheckout = won ? (playerState.turns.at(-1)?.throws.at(-1)?.value ?? 0) : 0

    return {
      playerId: player.id,
      name: player.name,
      won,
      turnsPlayed: playerState.turns.length,
      pointsScored,
      bestCheckout,
      throws: playerState.turns.flatMap((turn) => turn.throws),
      turnScores,
    }
  })

  return {
    id: game.id,
    mode: 'x01',
    startingScore: game.x01.config.startingScore,
    doubleOut: game.x01.config.doubleOut,
    completedAt: game.updatedAt,
    players,
  }
}
