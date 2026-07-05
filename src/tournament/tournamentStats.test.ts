import { describe, expect, it } from 'vitest'
import type { CricketPlayerGameSummary, GameSummary, X01PlayerGameSummary } from '../stats/types'
import { createTournament, recordLegResult } from './tournamentEngine'
import {
  bracketRecap,
  cricketTournamentRecords,
  playerThrowsAcrossTournament,
  tournamentGameIds,
  tournamentRecords,
} from './tournamentStats'
import type { Player } from '../game/types'
import type { TournamentConfig } from './tournamentTypes'

const config: TournamentConfig = { mode: 'x01', x01: { startingScore: 501, doubleOut: true }, legsToWin: 2 }
const cricketConfig: TournamentConfig = { mode: 'cricket', legsToWin: 2 }

function playersOf(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
}

function makePlayerEntry(overrides: Partial<X01PlayerGameSummary> = {}): X01PlayerGameSummary {
  return {
    playerId: 'p1',
    name: 'Player 1',
    won: false,
    turnsPlayed: 0,
    pointsScored: 0,
    bestCheckout: 0,
    throws: [],
    turnScores: [],
    ...overrides,
  }
}

function makeSummary(id: string, players: X01PlayerGameSummary[]): GameSummary {
  return { id, mode: 'x01', startingScore: 501, doubleOut: true, completedAt: Date.now(), players }
}

function makeCricketPlayerEntry(overrides: Partial<CricketPlayerGameSummary> = {}): CricketPlayerGameSummary {
  return {
    playerId: 'p1',
    name: 'Player 1',
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

function makeCricketSummary(id: string, players: CricketPlayerGameSummary[]): GameSummary {
  return { id, mode: 'cricket', completedAt: Date.now(), players }
}

describe('tournamentGameIds / tournamentLegSummaries', () => {
  it('collects every leg id across every round of the bracket', () => {
    let tournament = createTournament(playersOf(4), config)
    const matchup = tournament.rounds[0][0]
    tournament = recordLegResult(tournament, matchup.id, matchup.players[0].playerId!, 'leg-1')
    tournament = recordLegResult(tournament, matchup.id, matchup.players[0].playerId!, 'leg-2')

    expect(tournamentGameIds(tournament)).toEqual(['leg-1', 'leg-2'])
  })
})

describe('playerThrowsAcrossTournament', () => {
  it('flattens throws for one player across every leg they played, in leg order', () => {
    let tournament = createTournament(playersOf(4), config)
    const matchup = tournament.rounds[0][0]
    const winnerId = matchup.players[0].playerId!
    tournament = recordLegResult(tournament, matchup.id, winnerId, 'leg-1')
    tournament = recordLegResult(tournament, matchup.id, winnerId, 'leg-2')

    const history: GameSummary[] = [
      makeSummary('leg-1', [
        makePlayerEntry({
          playerId: winnerId,
          throws: [{ id: 't1', segment: 20, ring: 'double', value: 40, label: 'D20', timestamp: 1 }],
        }),
      ]),
      makeSummary('leg-2', [
        makePlayerEntry({
          playerId: winnerId,
          throws: [{ id: 't2', segment: 19, ring: 'treble', value: 57, label: 'T19', timestamp: 2 }],
        }),
      ]),
      makeSummary('other-game', [makePlayerEntry({ playerId: winnerId, throws: [] })]),
    ]

    expect(playerThrowsAcrossTournament(tournament, winnerId, history).map((t) => t.id)).toEqual(['t1', 't2'])
  })
})

describe('tournamentRecords', () => {
  it('attributes each record to whichever player achieved it, across all legs', () => {
    let tournament = createTournament(playersOf(4), config)
    const matchupA = tournament.rounds[0][0]
    const matchupB = tournament.rounds[0][1]
    const winnerA = matchupA.players[0].playerId!
    const winnerB = matchupB.players[0].playerId!
    tournament = recordLegResult(tournament, matchupA.id, winnerA, 'leg-a1')
    tournament = recordLegResult(tournament, matchupA.id, winnerA, 'leg-a2')
    tournament = recordLegResult(tournament, matchupB.id, winnerB, 'leg-b1')
    tournament = recordLegResult(tournament, matchupB.id, winnerB, 'leg-b2')

    const history: GameSummary[] = [
      makeSummary('leg-a1', [
        makePlayerEntry({ playerId: winnerA, name: 'Winner A', won: true, turnsPlayed: 10, pointsScored: 501, bestCheckout: 40, throws: new Array(28).fill(0).map((_, i) => ({ id: `a1-${i}`, segment: null, ring: 'outerSingle' as const, value: 1, label: '1', timestamp: i })) }),
      ]),
      makeSummary('leg-a2', [
        makePlayerEntry({ playerId: winnerA, name: 'Winner A', won: true, turnsPlayed: 3, pointsScored: 501, bestCheckout: 170, turnScores: [180, 180, 141], throws: new Array(9).fill(0).map((_, i) => ({ id: `a2-${i}`, segment: null, ring: 'outerSingle' as const, value: 1, label: '1', timestamp: i })) }),
      ]),
      makeSummary('leg-b1', [
        makePlayerEntry({ playerId: winnerB, name: 'Winner B', won: true, turnsPlayed: 9, pointsScored: 501, bestCheckout: 32, throws: new Array(25).fill(0).map((_, i) => ({ id: `b1-${i}`, segment: null, ring: 'outerSingle' as const, value: 1, label: '1', timestamp: i })) }),
      ]),
      makeSummary('leg-b2', [
        makePlayerEntry({ playerId: winnerB, name: 'Winner B', won: true, turnsPlayed: 8, pointsScored: 501, bestCheckout: 60, throws: new Array(24).fill(0).map((_, i) => ({ id: `b2-${i}`, segment: null, ring: 'outerSingle' as const, value: 1, label: '1', timestamp: i })) }),
      ]),
    ]

    const records = tournamentRecords(tournament, history)
    expect(records.highestCheckout).toEqual({ playerId: winnerA, playerName: 'Winner A', value: 170 })
    expect(records.most180s).toEqual({ playerId: winnerA, playerName: 'Winner A', value: 2 })
    expect(records.bestLegAverage?.playerId).toBe(winnerA) // 501/3 > 501/8
    expect(records.shortestLeg).toEqual({ playerId: winnerA, playerName: 'Winner A', value: 9 }) // fewest darts among winners
  })

  it('returns nulls when the tournament has no recorded legs yet', () => {
    const tournament = createTournament(playersOf(4), config)
    expect(tournamentRecords(tournament, [])).toEqual({
      highestCheckout: null,
      most180s: null,
      bestLegAverage: null,
      shortestLeg: null,
    })
  })
})

describe('cricketTournamentRecords', () => {
  it('attributes each cricket record to whichever player achieved it, across all legs, ignoring x01 legs', () => {
    let tournament = createTournament(playersOf(4), cricketConfig)
    const matchupA = tournament.rounds[0][0]
    const matchupB = tournament.rounds[0][1]
    const winnerA = matchupA.players[0].playerId!
    const winnerB = matchupB.players[0].playerId!
    tournament = recordLegResult(tournament, matchupA.id, winnerA, 'leg-a1')
    tournament = recordLegResult(tournament, matchupA.id, winnerA, 'leg-a2')
    tournament = recordLegResult(tournament, matchupB.id, winnerB, 'leg-b1')

    const history: GameSummary[] = [
      // An x01 leg mixed into history that must not affect cricket records.
      makeSummary('unrelated-x01', [makePlayerEntry({ playerId: winnerA, pointsScored: 999 })]),
      makeCricketSummary('leg-a1', [
        makeCricketPlayerEntry({ playerId: winnerA, name: 'Winner A', won: true, turnsPlayed: 10, marksScored: 20, turnPoints: [0, 20, 0] }),
      ]),
      makeCricketSummary('leg-a2', [
        makeCricketPlayerEntry({ playerId: winnerA, name: 'Winner A', won: true, turnsPlayed: 6, marksScored: 18, turnPoints: [60, 0] }),
      ]),
      makeCricketSummary('leg-b1', [
        makeCricketPlayerEntry({ playerId: winnerB, name: 'Winner B', won: true, turnsPlayed: 9, marksScored: 15, turnPoints: [10] }),
      ]),
    ]

    const records = cricketTournamentRecords(tournament, history)
    expect(records.bestMPR?.playerId).toBe(winnerA) // 18/6 = 3 > 20/10 = 2 > 15/9
    expect(records.mostPointsInATurn).toEqual({ playerId: winnerA, playerName: 'Winner A', value: 60 })
    expect(records.fastestClose).toEqual({ playerId: winnerA, playerName: 'Winner A', value: 6 }) // fewest turns among winners
  })

  it('returns nulls when the tournament has no recorded cricket legs yet', () => {
    const tournament = createTournament(playersOf(4), cricketConfig)
    expect(cricketTournamentRecords(tournament, [])).toEqual({
      bestMPR: null,
      mostPointsInATurn: null,
      fastestClose: null,
    })
  })
})

describe('bracketRecap', () => {
  it('summarizes every round, labeling byes and TBD slots correctly', () => {
    const tournament = createTournament(playersOf(3), config)
    const recap = bracketRecap(tournament)

    expect(recap).toHaveLength(2)
    const byeMatchupRecap = recap[0].find((m) => m.playerAName === 'Bye' || m.playerBName === 'Bye')
    expect(byeMatchupRecap?.winnerName).not.toBeNull()

    const realMatchupRecap = recap[0].find((m) => m.playerAName !== 'Bye' && m.playerBName !== 'Bye')!
    expect(realMatchupRecap.winnerName).toBeNull()
    expect(realMatchupRecap.scoreA).toBe(0)
    expect(realMatchupRecap.scoreB).toBe(0)
  })
})
