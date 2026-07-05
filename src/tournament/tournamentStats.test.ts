import { describe, expect, it } from 'vitest'
import type { GameSummary, PlayerGameSummary } from '../stats/types'
import { createTournament, recordLegResult } from './tournamentEngine'
import { bracketRecap, playerThrowsAcrossTournament, tournamentGameIds, tournamentRecords } from './tournamentStats'
import type { Player } from '../game/types'
import type { TournamentConfig } from './tournamentTypes'

const config: TournamentConfig = { x01: { startingScore: 501, doubleOut: true }, legsToWin: 2 }

function playersOf(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
}

function makePlayerEntry(overrides: Partial<PlayerGameSummary> = {}): PlayerGameSummary {
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

function makeSummary(id: string, players: PlayerGameSummary[]): GameSummary {
  return { id, mode: 'x01', startingScore: 501, doubleOut: true, completedAt: Date.now(), players }
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
