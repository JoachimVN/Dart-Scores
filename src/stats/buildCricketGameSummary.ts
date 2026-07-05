import { CRICKET_NUMBERS } from '../game/cricket/cricketTypes'
import type { GameState } from '../game/types'
import type { CricketPlayerGameSummary, GameSummary } from './types'

/** Builds a persistable summary from a just-completed Cricket game, for stats history. */
export function buildCricketGameSummary(
  game: Extract<GameState, { mode: 'cricket' }>,
): Extract<GameSummary, { mode: 'cricket' }> {
  const players: CricketPlayerGameSummary[] = game.players.map((player) => {
    const playerState = game.cricket.playerStates.find((ps) => ps.playerId === player.id)!
    const won = player.id === game.cricket.winnerId
    const turnMarks = playerState.turns.map((turn) =>
      CRICKET_NUMBERS.reduce((sum, n) => sum + (turn.marksAfter[n] - turn.marksBefore[n]), 0),
    )
    const turnPoints = playerState.turns.map((turn) => turn.pointsAfter - turn.pointsBefore)
    const numbersClosed = CRICKET_NUMBERS.filter((n) => playerState.marks[n] === 3).length

    return {
      playerId: player.id,
      name: player.name,
      won,
      turnsPlayed: playerState.turns.length,
      throws: playerState.turns.flatMap((turn) => turn.throws),
      pointsScored: playerState.points,
      marksScored: turnMarks.reduce((sum, marks) => sum + marks, 0),
      numbersClosed,
      turnMarks,
      turnPoints,
    }
  })

  return {
    id: game.id,
    mode: 'cricket',
    completedAt: game.updatedAt,
    players,
  }
}
