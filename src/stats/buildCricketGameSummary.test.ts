import { describe, expect, it } from 'vitest'
import { buildCricketGameSummary } from './buildCricketGameSummary'
import { applyThrow, createCricketGame, type ThrowInput } from '../game/cricket/cricketEngine'
import type { GameState, Player } from '../game/types'

const players: Player[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

function hit(segment: number | null, ring: ThrowInput['ring']): ThrowInput {
  return { segment, ring, value: 0, label: ring }
}
const treble = (n: number) => hit(n, 'treble')
const single = (n: number) => hit(n, 'innerSingle')
const miss = () => hit(null, 'miss')

function wrapAsGameState(cricket: ReturnType<typeof createCricketGame>): Extract<GameState, { mode: 'cricket' }> {
  return {
    id: 'game-1',
    mode: 'cricket',
    status: cricket.winnerId !== null ? 'complete' : 'in_progress',
    players,
    createdAt: 1000,
    updatedAt: 2000,
    cricket,
  }
}

describe('buildCricketGameSummary', () => {
  it('records marks scored, points scored, numbers closed, and per-turn trends', () => {
    let cricket = createCricketGame(players)
    // Alice closes 20 on her first dart, then overflows it for 20 points.
    cricket = applyThrow(cricket, treble(20))
    cricket = applyThrow(cricket, single(20))
    cricket = applyThrow(cricket, miss())

    const summary = buildCricketGameSummary(wrapAsGameState(cricket))
    expect(summary.mode).toBe('cricket')
    expect(summary.completedAt).toBe(2000)

    const alice = summary.players.find((p) => p.playerId === 'p1')!
    expect(alice.won).toBe(false)
    expect(alice.turnsPlayed).toBe(1)
    expect(alice.pointsScored).toBe(20)
    expect(alice.marksScored).toBe(3)
    expect(alice.numbersClosed).toBe(1)
    expect(alice.turnMarks).toEqual([3])
    expect(alice.turnPoints).toEqual([20])

    const bob = summary.players.find((p) => p.playerId === 'p2')!
    expect(bob.turnsPlayed).toBe(0)
    expect(bob.pointsScored).toBe(0)
    expect(bob.marksScored).toBe(0)
    expect(bob.numbersClosed).toBe(0)
  })
})
