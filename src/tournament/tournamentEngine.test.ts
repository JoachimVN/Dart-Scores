import { describe, expect, it } from 'vitest'
import type { Player } from '../game/types'
import {
  createTournament,
  findMatchupByLegGameId,
  findMatchupForPlayers,
  nextMatchup,
  recordLegResult,
  roundRobinLeaderboard,
  standings,
} from './tournamentEngine'
import type { TournamentConfig } from './tournamentTypes'

const x01Config = { startingScore: 501, doubleOut: true } as const
const config: TournamentConfig = { format: 'knockout', mode: 'x01', x01: x01Config, legsToWin: 2 }

function playersOf(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }))
}

function countByes(matchups: { players: [{ bye?: boolean }, { bye?: boolean }] }[]): number {
  return matchups.reduce((sum, m) => sum + (m.players[0].bye || m.players[1].bye ? 1 : 0), 0)
}

describe('createTournament', () => {
  it('throws when fewer than 2 players are given', () => {
    expect(() => createTournament(playersOf(1), config)).toThrow()
  })

  it('builds a single pending matchup for a 2-player bracket (no byes needed)', () => {
    const tournament = createTournament(playersOf(2), config)
    expect(tournament.rounds).toHaveLength(1)
    expect(tournament.rounds[0]).toHaveLength(1)
    expect(countByes(tournament.rounds[0])).toBe(0)
    expect(tournament.rounds[0][0].status).toBe('pending')
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
    const bestOfOne: TournamentConfig = { format: 'knockout', mode: 'x01', x01: x01Config, legsToWin: 1 }
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
    const bestOfOne: TournamentConfig = { format: 'knockout', mode: 'x01', x01: x01Config, legsToWin: 1 }
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
    const bestOfOne: TournamentConfig = { format: 'knockout', mode: 'x01', x01: x01Config, legsToWin: 1 }
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

describe('round-robin scheduling', () => {
  const single: TournamentConfig = { format: 'round_robin', matchesPerPair: 1, mode: 'x01', x01: x01Config, legsToWin: 1 }
  const double: TournamentConfig = { format: 'round_robin', matchesPerPair: 2, mode: 'x01', x01: x01Config, legsToWin: 1 }

  function allPairs(tournament: ReturnType<typeof createTournament>): [string, string][] {
    return tournament.rounds.flatMap((matchups) =>
      matchups.map((m) => m.players.map((s) => s.playerId!).sort() as [string, string]),
    )
  }

  it('schedules n-1 rounds of n/2 matches each for an even player count (single)', () => {
    const tournament = createTournament(playersOf(4), single)
    expect(tournament.rounds).toHaveLength(3)
    for (const round of tournament.rounds) expect(round).toHaveLength(2)
  })

  it('schedules n rounds of one bye each for an odd player count (single)', () => {
    const tournament = createTournament(playersOf(3), single)
    expect(tournament.rounds).toHaveLength(3)
    for (const round of tournament.rounds) expect(round).toHaveLength(1)
  })

  it('has every player meet every other player exactly once (single)', () => {
    const players = playersOf(5)
    const tournament = createTournament(players, single)
    const pairs = allPairs(tournament).map((p) => p.join('-'))
    const expected = []
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        expected.push([players[i].id, players[j].id].sort().join('-'))
      }
    }
    expect(pairs.sort()).toEqual(expected.sort())
  })

  it('doubles the schedule with distinct matchups for matchesPerPair: 2', () => {
    const tournament = createTournament(playersOf(4), double)
    expect(tournament.rounds).toHaveLength(6)
    const allIds = tournament.rounds.flatMap((matchups) => matchups.map((m) => m.id))
    expect(new Set(allIds).size).toBe(allIds.length)
    const pairs = allPairs(tournament).map((p) => p.join('-'))
    // each of the 6 unique pairs among 4 players should appear exactly twice
    const counts = new Map<string, number>()
    for (const pair of pairs) counts.set(pair, (counts.get(pair) ?? 0) + 1)
    expect([...counts.values()]).toEqual(Array(6).fill(2))
  })

  it('never creates a bye Matchup (all round-robin matchups have both slots filled)', () => {
    const tournament = createTournament(playersOf(3), single)
    for (const matchups of tournament.rounds) {
      for (const m of matchups) {
        expect(m.players[0].playerId).not.toBeNull()
        expect(m.players[1].playerId).not.toBeNull()
      }
    }
  })
})

describe('round-robin play-through', () => {
  const config3: TournamentConfig = { format: 'round_robin', matchesPerPair: 1, mode: 'x01', x01: x01Config, legsToWin: 1 }

  it('completes the tournament and crowns the leaderboard leader once every matchup is decided', () => {
    let tournament = createTournament(playersOf(3), config3)
    expect(tournament.status).toBe('in_progress')

    for (let i = 0; i < 3; i++) {
      const matchup = nextMatchup(tournament)!
      const winnerId = matchup.players[0].playerId!
      tournament = recordLegResult(tournament, matchup.id, winnerId, `game-${i}`)
    }

    expect(nextMatchup(tournament)).toBeNull()
    expect(tournament.status).toBe('complete')
    expect(tournament.championId).toBe(roundRobinLeaderboard(tournament)[0].player.id)
  })

  it('ranks by match wins, then by leg differential on a tie', () => {
    const players = playersOf(3)
    const [p1, p2, p3] = players.map((p) => p.id)

    // p1 beats p2 2-1, p2 beats p3 2-0, p3 beats p1 2-0 - a 3-way tie on 1
    // match win each, broken by leg differential.
    const bestOf3: TournamentConfig = { ...config3, legsToWin: 2 }
    let tournament = createTournament(players, bestOf3)

    const m1 = findMatchupForPlayers(tournament, [p1, p2])!
    tournament = recordLegResult(tournament, m1.id, p1, 'g1')
    tournament = recordLegResult(tournament, m1.id, p2, 'g2')
    tournament = recordLegResult(tournament, m1.id, p1, 'g3') // p1 wins 2-1

    const m2 = findMatchupForPlayers(tournament, [p2, p3])!
    tournament = recordLegResult(tournament, m2.id, p2, 'g4')
    tournament = recordLegResult(tournament, m2.id, p2, 'g5') // p2 wins 2-0

    const m3 = findMatchupForPlayers(tournament, [p1, p3])!
    tournament = recordLegResult(tournament, m3.id, p3, 'g6')
    tournament = recordLegResult(tournament, m3.id, p3, 'g7') // p3 wins 2-0

    const board = roundRobinLeaderboard(tournament)
    // All three tie on 1 match win; leg diff is p2: +1, p3: 0, p1: -1.
    expect(board[0].player.id).toBe(p2)
    expect(board.map((s) => s.matchesWon)).toEqual([1, 1, 1])
  })

  it('resolves a rematch (matchesPerPair: 2) to the earlier still-open meeting', () => {
    const players = playersOf(2)
    const double: TournamentConfig = { format: 'round_robin', matchesPerPair: 2, mode: 'x01', x01: x01Config, legsToWin: 1 }
    let tournament = createTournament(players, double)
    const [p1, p2] = players.map((p) => p.id)

    const first = findMatchupForPlayers(tournament, [p1, p2])!
    expect(first.round).toBe(0)
    tournament = recordLegResult(tournament, first.id, p1, 'g1')

    const second = findMatchupForPlayers(tournament, [p1, p2])!
    expect(second.id).not.toBe(first.id)
    expect(second.round).toBe(1)
  })
})
