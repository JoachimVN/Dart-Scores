import { describe, expect, it } from 'vitest'
import { buildGameSummary } from './buildGameSummary'
import { applyThrow, createX01Game, type ThrowInput } from '../game/x01/x01Engine'
import type { GameState, Player } from '../game/types'

const players: Player[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

function throwOf(value: number, ring: ThrowInput['ring'] = 'innerSingle', segment: number | null = value): ThrowInput {
  return { segment, ring, value, label: String(value) }
}

function wrapAsGameState(x01: ReturnType<typeof createX01Game>): GameState {
  return {
    id: 'game-1',
    mode: 'x01',
    status: x01.winnerId !== null ? 'complete' : 'in_progress',
    players,
    createdAt: 1000,
    updatedAt: 2000,
    x01,
  }
}

describe('buildGameSummary', () => {
  it('records the winner, checkout dart, turns, and points scored per player', () => {
    let x01 = createX01Game({ startingScore: 40, doubleOut: true }, players)
    // Alice busts by going negative (40 - 60 < 0)
    x01 = applyThrow(x01, throwOf(60, 'treble', 20))
    // Bob checks out with D20
    x01 = applyThrow(x01, throwOf(40, 'double', 20))

    const summary = buildGameSummary(wrapAsGameState(x01))

    expect(summary.id).toBe('game-1')
    expect(summary.startingScore).toBe(40)
    expect(summary.doubleOut).toBe(true)
    expect(summary.completedAt).toBe(2000)

    const alice = summary.players.find((p) => p.playerId === 'p1')!
    expect(alice).toEqual({ playerId: 'p1', name: 'Alice', won: false, turnsPlayed: 1, pointsScored: 0, bestCheckout: 0 })

    const bob = summary.players.find((p) => p.playerId === 'p2')!
    expect(bob).toEqual({ playerId: 'p2', name: 'Bob', won: true, turnsPlayed: 1, pointsScored: 40, bestCheckout: 40 })
  })
})
