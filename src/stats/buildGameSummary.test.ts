import { describe, expect, it } from 'vitest'
import { buildGameSummary } from './buildGameSummary'
import type { GameSummary, X01PlayerGameSummary } from './types'
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

function asX01Summary(summary: GameSummary) {
  if (summary.mode !== 'x01') throw new Error('expected an x01 summary')
  return summary
}

function findPlayer(summary: GameSummary, playerId: string): X01PlayerGameSummary {
  return asX01Summary(summary).players.find((p) => p.playerId === playerId)!
}

describe('buildGameSummary', () => {
  it('records the winner, checkout dart, turns, and points scored per player', () => {
    let x01 = createX01Game({ startingScore: 40, doubleOut: true }, players)
    // Alice busts by going negative (40 - 60 < 0)
    x01 = applyThrow(x01, throwOf(60, 'treble', 20))
    // Bob checks out with D20
    x01 = applyThrow(x01, throwOf(40, 'double', 20))

    const summary = asX01Summary(buildGameSummary(wrapAsGameState(x01)))

    expect(summary.id).toBe('game-1')
    expect(summary.startingScore).toBe(40)
    expect(summary.doubleOut).toBe(true)
    expect(summary.completedAt).toBe(2000)

    const alice = findPlayer(summary, 'p1')
    expect(alice).toMatchObject({ playerId: 'p1', name: 'Alice', won: false, turnsPlayed: 1, pointsScored: 0, bestCheckout: 0 })
    expect(alice.throws.map((t) => t.value)).toEqual([60])
    // Alice's turn busted, so it scores 0 despite the 60-value dart thrown.
    expect(alice.turnScores).toEqual([0])

    const bob = findPlayer(summary, 'p2')
    expect(bob).toMatchObject({ playerId: 'p2', name: 'Bob', won: true, turnsPlayed: 1, pointsScored: 40, bestCheckout: 40 })
    expect(bob.throws.map((t) => t.value)).toEqual([40])
    expect(bob.turnScores).toEqual([40])
  })

  it('records a 0 in turnScores for a bust turn even mid-game, alongside real scores for other turns', () => {
    let x01 = createX01Game({ startingScore: 501, doubleOut: false }, players)
    // Alice's first turn: 3 darts of 20, scoring 60.
    x01 = applyThrow(x01, throwOf(20))
    x01 = applyThrow(x01, throwOf(20))
    x01 = applyThrow(x01, throwOf(20))
    // Bob's turn: busts by going negative.
    x01 = applyThrow(x01, throwOf(60, 'treble', 20))
    x01 = applyThrow(x01, throwOf(60, 'treble', 20))
    x01 = applyThrow(x01, throwOf(501, 'treble', 20))

    const summary = buildGameSummary(wrapAsGameState(x01))
    const alice = findPlayer(summary, 'p1')
    const bob = findPlayer(summary, 'p2')

    expect(alice.turnScores).toEqual([60])
    expect(bob.turnScores).toEqual([0])
  })
})
