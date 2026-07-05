import { describe, expect, it } from 'vitest'
import type { Player } from '../game/types'
import {
  createTournament,
  findMatchupByLegGameId,
  findMatchupForPlayers,
  nextMatchup,
  recordLegResult,
  standings,
} from './tournamentEngine'
import type { TournamentConfig } from './tournamentTypes'

const config: TournamentConfig = { x01: { startingScore: 501, doubleOut: true }, legsToWin: 2 }

function playersOf(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
}

function countByes(matchups: { players: [{ bye?: boolean }, { bye?: boolean }] }[]): number {
  return matchups.reduce((sum, m) => sum + (m.players[0].bye || m.players[1].bye ? 1 : 0), 0)
}

describe('createTournament', () => {
  it('throws when fewer than 3 players are given', () => {
    expect(() => createTournament(playersOf(2), config)).toThrow()
  })

  it('needs no byes for an exact power-of-two count', () => {
    const tournament = createTournament(playersOf(4), config)
    expect(tournament.rounds[0]).toHaveLength(2)
    expect(countByes(tournament.rounds[0])).toBe(0)
    expect(tournament.rounds).toHaveLength(2)
  })

  it.each([3, 5, 6, 7])('never double-byes a matchup for %i players', (count) => {
    const tournament = createTournament(playersOf(count), config)
    for (const matchup of tournament.rounds[0]) {
      expect(Boolean(matchup.players[0].bye) && Boolean(matchup.players[1].bye)).toBe(false)
    }
  })

  it('auto-resolves byes and advances the winner into the next round', () => {
    const tournament = createTournament(playersOf(3), config)
    const byeMatchup = tournament.rounds[0].find((m) => m.players[0].bye || m.players[1].bye)!
    expect(byeMatchup.status).toBe('complete')
    expect(byeMatchup.winnerId).not.toBeNull()

    const finalMatchup = tournament.rounds[1][0]
    const filledSlots = finalMatchup.players.filter((slot) => slot.playerId !== null)
    expect(filledSlots).toHaveLength(1)
    expect(filledSlots[0].playerId).toBe(byeMatchup.winnerId)
  })

  it('leaves the real (non-bye) round-0 matchup pending', () => {
    const tournament = createTournament(playersOf(3), config)
    const realMatchup = tournament.rounds[0].find((m) => !m.players[0].bye && !m.players[1].bye)!
    expect(realMatchup.status).toBe('pending')
    expect(nextMatchup(tournament)?.id).toBe(realMatchup.id)
  })
})

describe('recordLegResult', () => {
  it('does not decide a best-of-3 matchup on the first leg win', () => {
    const tournament = createTournament(playersOf(4), config)
    const matchup = nextMatchup(tournament)!
    const winnerId = matchup.players[0].playerId!
    const updated = recordLegResult(tournament, matchup.id, winnerId, 'game-1')
    const updatedMatchup = updated.rounds[0].find((m) => m.id === matchup.id)!
    expect(updatedMatchup.status).toBe('pending')
    expect(updatedMatchup.legWins[winnerId]).toBe(1)
  })

  it('decides the matchup once a player reaches legsToWin and advances them', () => {
    const tournament = createTournament(playersOf(4), config)
    const matchup = nextMatchup(tournament)!
    const winnerId = matchup.players[0].playerId!
    let updated = recordLegResult(tournament, matchup.id, winnerId, 'game-1')
    updated = recordLegResult(updated, matchup.id, winnerId, 'game-2')

    const decidedMatchup = updated.rounds[0].find((m) => m.id === matchup.id)!
    expect(decidedMatchup.status).toBe('complete')
    expect(decidedMatchup.winnerId).toBe(winnerId)

    const nextRoundMatchup = updated.rounds[1][Math.floor(decidedMatchup.slotIndex / 2)]
    expect(nextRoundMatchup.players.some((slot) => slot.playerId === winnerId)).toBe(true)
  })
})

describe('full bracket walkthrough', () => {
  it('crowns a champion after a 4-player, best-of-1 bracket', () => {
    const bestOfOne: TournamentConfig = { x01: config.x01, legsToWin: 1 }
    let tournament = createTournament(playersOf(4), bestOfOne)

    const firstMatchup = nextMatchup(tournament)!
    const firstWinner = firstMatchup.players[0].playerId!
    tournament = recordLegResult(tournament, firstMatchup.id, firstWinner, 'game-1')

    const secondMatchup = nextMatchup(tournament)!
    expect(secondMatchup.id).not.toBe(firstMatchup.id)
    const secondWinner = secondMatchup.players[0].playerId!
    tournament = recordLegResult(tournament, secondMatchup.id, secondWinner, 'game-2')

    expect(tournament.status).toBe('in_progress')
    const final = nextMatchup(tournament)!
    expect(final.players.map((s) => s.playerId).sort()).toEqual([firstWinner, secondWinner].sort())

    tournament = recordLegResult(tournament, final.id, firstWinner, 'game-3')

    expect(tournament.status).toBe('complete')
    expect(tournament.championId).toBe(firstWinner)
  })
})

describe('findMatchupForPlayers', () => {
  it('finds the pending matchup between two given players, ignoring completed ones', () => {
    const tournament = createTournament(playersOf(4), config)
    const matchup = nextMatchup(tournament)!
    const playerIds = matchup.players.map((s) => s.playerId!) as [string, string]
    expect(findMatchupForPlayers(tournament, playerIds)?.id).toBe(matchup.id)
  })
})

describe('findMatchupByLegGameId', () => {
  it('finds the matchup a leg belonged to even after that matchup is decided', () => {
    const bestOfOne: TournamentConfig = { x01: config.x01, legsToWin: 1 }
    let tournament = createTournament(playersOf(4), bestOfOne)
    const matchup = nextMatchup(tournament)!
    const winnerId = matchup.players[0].playerId!
    tournament = recordLegResult(tournament, matchup.id, winnerId, 'game-1')

    const found = findMatchupByLegGameId(tournament, 'game-1')
    expect(found?.id).toBe(matchup.id)
    expect(found?.status).toBe('complete')
  })

  it('returns null for an unknown game id', () => {
    const tournament = createTournament(playersOf(4), config)
    expect(findMatchupByLegGameId(tournament, 'nonexistent')).toBeNull()
  })
})

describe('standings', () => {
  it('orders champion, then runner-up, then earlier-eliminated players', () => {
    const bestOfOne: TournamentConfig = { x01: config.x01, legsToWin: 1 }
    let tournament = createTournament(playersOf(4), bestOfOne)

    const m1 = nextMatchup(tournament)!
    const m1Winner = m1.players[0].playerId!
    const m1Loser = m1.players[1].playerId!
    tournament = recordLegResult(tournament, m1.id, m1Winner, 'game-1')

    const m2 = nextMatchup(tournament)!
    const m2Winner = m2.players[0].playerId!
    const m2Loser = m2.players[1].playerId!
    tournament = recordLegResult(tournament, m2.id, m2Winner, 'game-2')

    const final = nextMatchup(tournament)!
    tournament = recordLegResult(tournament, final.id, m1Winner, 'game-3')

    const result = standings(tournament)
    expect(result[0].id).toBe(m1Winner)
    expect(result[1].id).toBe(m2Winner)
    expect(result.map((p) => p.id).sort()).toEqual([m1Winner, m1Loser, m2Winner, m2Loser].sort())
  })
})
