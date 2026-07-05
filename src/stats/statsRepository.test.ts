import { beforeEach, describe, expect, it } from 'vitest'
import { upsertPlayer } from '../players/playerRepository'
import { appendGameHistory, computeAllTimeLeaderboards, computePlayerStats, listHistory } from './statsRepository'
import type { CricketPlayerGameSummary, GameSummary, X01PlayerGameSummary } from './types'

beforeEach(() => {
  localStorage.clear()
})

function makeX01Summary(
  overrides: Partial<Extract<GameSummary, { mode: 'x01' }>> = {},
): Extract<GameSummary, { mode: 'x01' }> {
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

function makeX01PlayerEntry(overrides: Partial<X01PlayerGameSummary> = {}): X01PlayerGameSummary {
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

function makeCricketSummary(
  overrides: Partial<Extract<GameSummary, { mode: 'cricket' }>> = {},
): Extract<GameSummary, { mode: 'cricket' }> {
  return { id: 'g1', mode: 'cricket', completedAt: Date.now(), players: [], ...overrides }
}

function makeCricketPlayerEntry(overrides: Partial<CricketPlayerGameSummary> = {}): CricketPlayerGameSummary {
  return {
    playerId: 'p1',
    name: 'Alice',
    won: false,
    turnsPlayed: 0,
    throws: [],
    pointsScored: 0,
    marksScored: 0,
    numbersClosed: 0,
    turnMarks: [],
    turnPoints: [],
    ...overrides,
  }
}

const zeroX01Stats = {
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
}

const zeroCricketStats = {
  gamesPlayed: 0,
  wins: 0,
  winRate: 0,
  avgMPR: 0,
  bestTurnPoints: 0,
  fastestClose: 0,
  trend: [],
  allThrows: [],
}

describe('appendGameHistory / listHistory', () => {
  it('persists and lists game summaries in order', () => {
    const g1 = makeX01Summary({ id: 'g1' })
    const g2 = makeCricketSummary({ id: 'g2' })
    appendGameHistory(g1)
    appendGameHistory(g2)
    expect(listHistory()).toEqual([g1, g2])
  })
})

describe('computePlayerStats', () => {
  it('returns zeroed stats for both modes for a player with no games', () => {
    expect(computePlayerStats('nobody')).toEqual({ x01: zeroX01Stats, cricket: zeroCricketStats })
  })

  it('aggregates X01 games across multiple games for the same player, leaving cricket stats zeroed', () => {
    appendGameHistory(
      makeX01Summary({
        id: 'g1',
        completedAt: 1000,
        players: [
          makeX01PlayerEntry({
            playerId: 'p1',
            won: true,
            turnsPlayed: 10,
            pointsScored: 501,
            bestCheckout: 40,
            throws: [{ id: 't1', segment: 20, ring: 'double', value: 40, label: 'D20', timestamp: 1 }],
            turnScores: [60, 60, 60, 60, 60, 60, 60, 60, 40, 40],
          }),
          makeX01PlayerEntry({ playerId: 'p2', name: 'Bob', turnsPlayed: 11, pointsScored: 480 }),
        ],
      }),
    )
    appendGameHistory(
      makeX01Summary({
        id: 'g2',
        completedAt: 2000,
        players: [
          makeX01PlayerEntry({
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

    const stats = computePlayerStats('p1').x01
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
    expect(computePlayerStats('p1').cricket).toEqual(zeroCricketStats)

    expect(computePlayerStats('p2').x01).toMatchObject({ gamesPlayed: 1, wins: 0, bestLegDarts: 0 })
  })

  it('aggregates Cricket games for the same player, leaving X01 stats zeroed', () => {
    appendGameHistory(
      makeCricketSummary({
        id: 'g1',
        completedAt: 1000,
        players: [
          makeCricketPlayerEntry({
            playerId: 'p1',
            won: true,
            turnsPlayed: 10,
            marksScored: 21,
            pointsScored: 60,
            numbersClosed: 7,
            turnMarks: [3, 3, 3, 3, 3, 3, 3],
            turnPoints: [0, 0, 20, 0, 40, 0, 0],
          }),
        ],
      }),
    )
    appendGameHistory(
      makeCricketSummary({
        id: 'g2',
        completedAt: 2000,
        players: [
          makeCricketPlayerEntry({
            playerId: 'p1',
            won: false,
            turnsPlayed: 5,
            marksScored: 10,
            pointsScored: 0,
            numbersClosed: 3,
            turnMarks: [2, 2, 2, 2, 2],
            turnPoints: [0, 0, 0, 0, 0],
          }),
        ],
      }),
    )

    const stats = computePlayerStats('p1').cricket
    expect(stats.gamesPlayed).toBe(2)
    expect(stats.wins).toBe(1)
    expect(stats.winRate).toBe(0.5)
    expect(stats.avgMPR).toBe((21 + 10) / (10 + 5))
    expect(stats.bestTurnPoints).toBe(40)
    expect(stats.fastestClose).toBe(10) // only the won game (g1) counts
    expect(stats.trend).toEqual([
      { completedAt: 1000, average: 21 / 10 },
      { completedAt: 2000, average: 10 / 5 },
    ])
    expect(computePlayerStats('p1').x01).toEqual(zeroX01Stats)
  })
})

describe('computeAllTimeLeaderboards', () => {
  it('returns empty boards for both modes when no players are saved', () => {
    expect(computeAllTimeLeaderboards()).toEqual({
      x01: { bestAverage: [], bestWinRate: [], mostWins: [], bestCheckout: [], most180s: [] },
      cricket: { bestMPR: [], bestWinRate: [], mostWins: [], mostPointsInATurn: [] },
    })
  })

  it('excludes rate-based boards for players under the minimum games threshold, but keeps count-based boards', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    upsertPlayer({ id: 'p2', name: 'Bob' })

    // Alice: only 1 game played, but won it with a big checkout - shouldn't
    // qualify for average/win-rate boards (too few games) but should still
    // show up on the count-based ones (wins, checkout).
    appendGameHistory(
      makeX01Summary({
        id: 'g1',
        players: [
          makeX01PlayerEntry({ playerId: 'p1', name: 'Alice', won: true, turnsPlayed: 5, pointsScored: 501, bestCheckout: 120 }),
        ],
      }),
    )

    const boards = computeAllTimeLeaderboards()
    expect(boards.x01.bestAverage).toEqual([])
    expect(boards.x01.bestWinRate).toEqual([])
    expect(boards.x01.mostWins).toEqual([{ playerId: 'p1', name: 'Alice', value: 1 }])
    expect(boards.x01.bestCheckout).toEqual([{ playerId: 'p1', name: 'Alice', value: 120 }])
  })

  it('ranks qualifying players by value, descending, capped at 5, for both modes independently', () => {
    const players = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
    for (const player of players) upsertPlayer(player)

    players.forEach((player, i) => {
      const average = 40 + i * 10 // p1 worst, p6 best
      for (let g = 0; g < 3; g++) {
        appendGameHistory(
          makeX01Summary({
            id: `${player.id}-x01-g${g}`,
            players: [
              makeX01PlayerEntry({ playerId: player.id, name: player.name, won: true, turnsPlayed: 1, pointsScored: average }),
            ],
          }),
        )
        appendGameHistory(
          makeCricketSummary({
            id: `${player.id}-cricket-g${g}`,
            players: [
              makeCricketPlayerEntry({ playerId: player.id, name: player.name, won: true, turnsPlayed: 1, marksScored: i + 1 }),
            ],
          }),
        )
      }
    })

    const boards = computeAllTimeLeaderboards()
    expect(boards.x01.bestAverage).toHaveLength(5)
    expect(boards.x01.bestAverage[0]).toMatchObject({ playerId: 'p6', name: 'Player 6' })
    expect(boards.x01.bestAverage.map((e) => e.playerId)).not.toContain('p1')

    expect(boards.cricket.bestMPR).toHaveLength(5)
    expect(boards.cricket.bestMPR[0]).toMatchObject({ playerId: 'p6', name: 'Player 6' })
    expect(boards.cricket.bestMPR.map((e) => e.playerId)).not.toContain('p1')
  })
})
