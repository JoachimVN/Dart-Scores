import { beforeEach, describe, expect, it } from 'vitest'
import { appendGameHistory, computePlayerStats, listHistory } from './statsRepository'
import type { GameSummary } from './types'

beforeEach(() => {
  localStorage.clear()
})

function makeSummary(overrides: Partial<GameSummary> = {}): GameSummary {
  return {
    id: 'g1',
    mode: 'x01',
    startingScore: 501,
    doubleOut: true,
    completedAt: Date.now(),
    players: [],
    ...overrides,
  }
}

describe('appendGameHistory / listHistory', () => {
  it('persists and lists game summaries in order', () => {
    const g1 = makeSummary({ id: 'g1' })
    const g2 = makeSummary({ id: 'g2' })
    appendGameHistory(g1)
    appendGameHistory(g2)
    expect(listHistory()).toEqual([g1, g2])
  })
})

describe('computePlayerStats', () => {
  it('returns zeroed stats for a player with no games', () => {
    expect(computePlayerStats('nobody')).toEqual({
      gamesPlayed: 0,
      wins: 0,
      winRate: 0,
      avgScorePerTurn: 0,
      bestCheckout: 0,
    })
  })

  it('aggregates across multiple games for the same player', () => {
    appendGameHistory(
      makeSummary({
        id: 'g1',
        players: [
          { playerId: 'p1', name: 'Alice', won: true, turnsPlayed: 10, pointsScored: 501, bestCheckout: 40, throws: [] },
          { playerId: 'p2', name: 'Bob', won: false, turnsPlayed: 11, pointsScored: 480, bestCheckout: 0, throws: [] },
        ],
      }),
    )
    appendGameHistory(
      makeSummary({
        id: 'g2',
        players: [
          { playerId: 'p1', name: 'Alice', won: false, turnsPlayed: 12, pointsScored: 490, bestCheckout: 0, throws: [] },
        ],
      }),
    )

    expect(computePlayerStats('p1')).toEqual({
      gamesPlayed: 2,
      wins: 1,
      winRate: 0.5,
      avgScorePerTurn: (501 + 490) / (10 + 12),
      bestCheckout: 40,
    })

    expect(computePlayerStats('p2')).toEqual({
      gamesPlayed: 1,
      wins: 0,
      winRate: 0,
      avgScorePerTurn: 480 / 11,
      bestCheckout: 0,
    })
  })
})
