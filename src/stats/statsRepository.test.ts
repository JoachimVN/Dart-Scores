import { beforeEach, describe, expect, it } from 'vitest'
import { upsertPlayer } from '../players/playerRepository'
import {
  appendGameHistory,
  computeAllTimeLeaderboards,
  computePlayerStats,
  listHistory,
} from './statsRepository'
import type { GameSummary, PlayerGameSummary } from './types'

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

function makePlayerEntry(overrides: Partial<PlayerGameSummary> = {}): PlayerGameSummary {
  return {
    playerId: 'p1',
    name: 'Alice',
    won: false,
    turnsPlayed: 0,
    pointsScored: 0,
    bestCheckout: 0,
    throws: [],
    turnScores: [],
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
      bestLegDarts: 0,
      count180s: 0,
      count100Plus: 0,
      trend: [],
      allThrows: [],
    })
  })

  it('aggregates across multiple games for the same player', () => {
    appendGameHistory(
      makeSummary({
        id: 'g1',
        completedAt: 1000,
        players: [
          makePlayerEntry({
            playerId: 'p1',
            won: true,
            turnsPlayed: 10,
            pointsScored: 501,
            bestCheckout: 40,
            throws: [{ id: 't1', segment: 20, ring: 'double', value: 40, label: 'D20', timestamp: 1 }],
            turnScores: [60, 60, 60, 60, 60, 60, 60, 60, 40, 40],
          }),
          makePlayerEntry({ playerId: 'p2', name: 'Bob', turnsPlayed: 11, pointsScored: 480 }),
        ],
      }),
    )
    appendGameHistory(
      makeSummary({
        id: 'g2',
        completedAt: 2000,
        players: [
          makePlayerEntry({
            playerId: 'p1',
            won: true,
            turnsPlayed: 3,
            pointsScored: 501,
            bestCheckout: 100,
            throws: [
              { id: 't2', segment: 20, ring: 'treble', value: 60, label: 'T20', timestamp: 2 },
              { id: 't3', segment: 20, ring: 'treble', value: 60, label: 'T20', timestamp: 3 },
              { id: 't4', segment: 20, ring: 'treble', value: 60, label: 'T20', timestamp: 4 },
            ],
            turnScores: [180, 180, 141],
          }),
        ],
      }),
    )

    const stats = computePlayerStats('p1')
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.wins).toBe(2)
    expect(stats.winRate).toBe(1)
    expect(stats.avgScorePerTurn).toBe((501 + 501) / (10 + 3))
    expect(stats.bestCheckout).toBe(100)
    expect(stats.bestLegDarts).toBe(1)
    expect(stats.count180s).toBe(2)
    expect(stats.count100Plus).toBe(3)
    expect(stats.trend).toEqual([
      { completedAt: 1000, average: 501 / 10 },
      { completedAt: 2000, average: 501 / 3 },
    ])
    expect(stats.allThrows).toHaveLength(4)

    expect(computePlayerStats('p2')).toMatchObject({ gamesPlayed: 1, wins: 0, bestLegDarts: 0 })
  })
})

describe('computeAllTimeLeaderboards', () => {
  it('returns empty boards when no players are saved', () => {
    expect(computeAllTimeLeaderboards()).toEqual({
      bestAverage: [],
      bestWinRate: [],
      mostWins: [],
      bestCheckout: [],
      most180s: [],
    })
  })

  it('excludes rate-based boards for players under the minimum games threshold, but keeps count-based boards', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    upsertPlayer({ id: 'p2', name: 'Bob' })

    // Alice: only 1 game played, but won it with a big checkout - shouldn't
    // qualify for average/win-rate boards (too few games) but should still
    // show up on the count-based ones (wins, checkout).
    appendGameHistory(
      makeSummary({
        id: 'g1',
        players: [
          makePlayerEntry({ playerId: 'p1', name: 'Alice', won: true, turnsPlayed: 5, pointsScored: 501, bestCheckout: 120 }),
        ],
      }),
    )

    const boards = computeAllTimeLeaderboards()
    expect(boards.bestAverage).toEqual([])
    expect(boards.bestWinRate).toEqual([])
    expect(boards.mostWins).toEqual([{ playerId: 'p1', name: 'Alice', value: 1 }])
    expect(boards.bestCheckout).toEqual([{ playerId: 'p1', name: 'Alice', value: 120 }])
  })

  it('ranks qualifying players by value, descending, capped at 5', () => {
    const players = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
    for (const player of players) upsertPlayer(player)

    players.forEach((player, i) => {
      const average = 40 + i * 10 // p1 worst, p6 best
      for (let g = 0; g < 3; g++) {
        appendGameHistory(
          makeSummary({
            id: `${player.id}-g${g}`,
            players: [
              makePlayerEntry({
                playerId: player.id,
                name: player.name,
                won: true,
                turnsPlayed: 1,
                pointsScored: average,
              }),
            ],
          }),
        )
      }
    })

    const boards = computeAllTimeLeaderboards()
    expect(boards.bestAverage).toHaveLength(5)
    expect(boards.bestAverage[0]).toMatchObject({ playerId: 'p6', name: 'Player 6' })
    expect(boards.bestAverage.map((e) => e.playerId)).not.toContain('p1')
  })
})
