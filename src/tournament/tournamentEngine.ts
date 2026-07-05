import { generateId } from '../shared/id'
import type { Player } from '../game/types'
import type { Matchup, MatchupSlot, Tournament, TournamentConfig } from './tournamentTypes'

function nextPowerOfTwo(n: number): number {
  let size = 1
  while (size < n) size *= 2
  return size
}

/**
 * Standard single-elimination bracket seed order: within the final array, seed
 * s always sits adjacent to seed (size + 1 - s), so byes/weak seeds (the
 * highest seed numbers) always pair against the strongest remaining seeds
 * one-to-one instead of clustering into a double-bye matchup.
 */
function seedOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const total = order.length * 2
    const next: number[] = []
    for (const seed of order) {
      next.push(seed, total + 1 - seed)
    }
    order = next
  }
  return order
}

function toSlot(players: Player[], seed: number): MatchupSlot {
  const player = players[seed - 1]
  return player ? { playerId: player.id } : { playerId: null, bye: true }
}

function emptyMatchup(round: number, slotIndex: number, legsToWin: number): Matchup {
  return {
    id: generateId(),
    round,
    slotIndex,
    players: [{ playerId: null }, { playerId: null }],
    legsToWin,
    legWins: {},
    legGameIds: [],
    status: 'pending',
    winnerId: null,
  }
}

function findMatchupLocation(tournament: Tournament, matchupId: string): { round: number; index: number } | null {
  for (let round = 0; round < tournament.rounds.length; round++) {
    const index = tournament.rounds[round].findIndex((m) => m.id === matchupId)
    if (index !== -1) return { round, index }
  }
  return null
}

function replaceMatchup(tournament: Tournament, round: number, index: number, matchup: Matchup): Tournament {
  const rounds = tournament.rounds.map((matchups, r) =>
    r === round ? matchups.map((m, i) => (i === index ? matchup : m)) : matchups,
  )
  return { ...tournament, rounds, updatedAt: Date.now() }
}

/** Places a decided matchup's winner into the next round's slot, or crowns the champion if it was the final. */
function advanceWinner(tournament: Tournament, matchup: Matchup): Tournament {
  const winnerId = matchup.winnerId
  if (!winnerId) return tournament

  const nextRound = matchup.round + 1
  if (nextRound >= tournament.rounds.length) {
    return { ...tournament, status: 'complete', championId: winnerId, updatedAt: Date.now() }
  }

  const targetIndex = Math.floor(matchup.slotIndex / 2)
  const slotInTarget = matchup.slotIndex % 2
  const target = tournament.rounds[nextRound][targetIndex]
  const players = [...target.players] as [MatchupSlot, MatchupSlot]
  players[slotInTarget] = { playerId: winnerId }
  return replaceMatchup(tournament, nextRound, targetIndex, { ...target, players })
}

/** Builds a fresh single-elimination bracket, auto-resolving any byes and advancing their winners. */
export function createTournament(players: Player[], config: TournamentConfig): Tournament {
  if (players.length < 3) {
    throw new Error('A tournament needs at least 3 players.')
  }

  const bracketSize = nextPowerOfTwo(players.length)
  const order = seedOrder(bracketSize)
  const roundCount = Math.log2(bracketSize)
  const now = Date.now()

  const round0: Matchup[] = []
  for (let i = 0; i < bracketSize / 2; i++) {
    const slotA = toSlot(players, order[i * 2])
    const slotB = toSlot(players, order[i * 2 + 1])
    const matchup = emptyMatchup(0, i, config.legsToWin)
    matchup.players = [slotA, slotB]
    if (slotA.bye || slotB.bye) {
      matchup.status = 'complete'
      matchup.winnerId = slotA.bye ? slotB.playerId : slotA.playerId
    }
    round0.push(matchup)
  }

  const rounds: Matchup[][] = [round0]
  for (let round = 1; round < roundCount; round++) {
    const count = bracketSize / 2 ** (round + 1)
    rounds.push(Array.from({ length: count }, (_, i) => emptyMatchup(round, i, config.legsToWin)))
  }

  let tournament: Tournament = {
    id: generateId(),
    status: 'in_progress',
    config,
    players,
    rounds,
    championId: null,
    createdAt: now,
    updatedAt: now,
  }

  for (const matchup of round0) {
    if (matchup.status === 'complete' && matchup.winnerId) {
      tournament = advanceWinner(tournament, matchup)
    }
  }

  return tournament
}

/** Records one leg's result, deciding (and advancing) the matchup once a player reaches legsToWin. */
export function recordLegResult(
  tournament: Tournament,
  matchupId: string,
  winnerId: string,
  gameId: string,
): Tournament {
  const location = findMatchupLocation(tournament, matchupId)
  if (!location) return tournament
  const matchup = tournament.rounds[location.round][location.index]

  const legWins = { ...matchup.legWins, [winnerId]: (matchup.legWins[winnerId] ?? 0) + 1 }
  const legGameIds = [...matchup.legGameIds, gameId]
  const decided = legWins[winnerId] >= matchup.legsToWin

  const updatedMatchup: Matchup = {
    ...matchup,
    legWins,
    legGameIds,
    status: decided ? 'complete' : 'pending',
    winnerId: decided ? winnerId : null,
  }

  let updated = replaceMatchup(tournament, location.round, location.index, updatedMatchup)
  if (decided) updated = advanceWinner(updated, updatedMatchup)
  return updated
}

/** The one matchup that's currently playable: not yet decided, with both slots filled. Rounds/slots are walked in order, so v1 only ever surfaces one matchup at a time even if a round has several independently-playable ones. */
export function nextMatchup(tournament: Tournament): Matchup | null {
  for (const matchups of tournament.rounds) {
    for (const matchup of matchups) {
      if (matchup.status !== 'complete' && matchup.players[0].playerId && matchup.players[1].playerId) {
        return matchup
      }
    }
  }
  return null
}

/**
 * Finds the not-yet-decided matchup between exactly these two players - used to
 * attribute a just-finished leg to the right matchup, since by the time a leg
 * completes the bracket's "next matchup" pointer may already have moved on.
 */
export function findMatchupForPlayers(tournament: Tournament, playerIds: string[]): Matchup | null {
  const [a, b] = playerIds
  for (const matchups of tournament.rounds) {
    for (const matchup of matchups) {
      if (matchup.status === 'complete') continue
      const ids = new Set(matchup.players.map((slot) => slot.playerId))
      if (ids.has(a) && ids.has(b)) return matchup
    }
  }
  return null
}

/**
 * Finds whichever matchup recorded this leg's GameState id, regardless of the
 * matchup's current status - used to show a leg-completion summary even after
 * the matchup (and possibly the whole bracket) has since been decided.
 */
export function findMatchupByLegGameId(tournament: Tournament, gameId: string): Matchup | null {
  for (const matchups of tournament.rounds) {
    for (const matchup of matchups) {
      if (matchup.legGameIds.includes(gameId)) return matchup
    }
  }
  return null
}

/** Champion first, then reverse-elimination order (runner-up, then semi-finalists, etc). */
export function standings(tournament: Tournament): Player[] {
  const playerById = new Map(tournament.players.map((p) => [p.id, p]))
  const result: Player[] = []
  const seen = new Set<string>()

  if (tournament.championId) {
    const champion = playerById.get(tournament.championId)
    if (champion) {
      result.push(champion)
      seen.add(tournament.championId)
    }
  }

  for (let round = tournament.rounds.length - 1; round >= 0; round--) {
    for (const matchup of tournament.rounds[round]) {
      if (matchup.status !== 'complete' || !matchup.winnerId) continue
      const loserId = matchup.players.find((slot) => slot.playerId && slot.playerId !== matchup.winnerId)?.playerId
      if (loserId && !seen.has(loserId)) {
        const loser = playerById.get(loserId)
        if (loser) {
          result.push(loser)
          seen.add(loserId)
        }
      }
    }
  }

  return result
}
