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
    firstLegStarterId: null,
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

/** Builds a fresh single-elimination bracket's rounds, auto-resolving byes (but not yet advancing their winners). */
function buildKnockoutRounds(players: Player[], legsToWin: number): Matchup[][] {
  const bracketSize = nextPowerOfTwo(players.length)
  const order = seedOrder(bracketSize)
  const roundCount = Math.log2(bracketSize)

  const round0: Matchup[] = []
  for (let i = 0; i < bracketSize / 2; i++) {
    const slotA = toSlot(players, order[i * 2])
    const slotB = toSlot(players, order[i * 2 + 1])
    const matchup = emptyMatchup(0, i, legsToWin)
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
    rounds.push(Array.from({ length: count }, (_, i) => emptyMatchup(round, i, legsToWin)))
  }

  return rounds
}

/**
 * Standard circle-method round-robin scheduling: fixes one id, rotates the rest each round.
 * For an odd player count a placeholder `null` bye is added so pairing math stays even - the
 * player paired against it simply sits out that round (no matchup is created for it, unlike
 * knockout's bye-slot-that-auto-wins convention).
 */
function circleMethodRounds(playerIds: string[]): string[][][] {
  const ids: (string | null)[] = [...playerIds]
  if (ids.length % 2 !== 0) ids.push(null)
  const n = ids.length
  const fixed = ids[0]
  let rotating = ids.slice(1)
  const rounds: string[][][] = []
  for (let r = 0; r < n - 1; r++) {
    const roundIds = [fixed, ...rotating]
    const pairs: string[][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = roundIds[i]
      const b = roundIds[n - 1 - i]
      if (a !== null && b !== null) pairs.push([a, b])
    }
    rounds.push(pairs)
    rotating = [rotating.at(-1) ?? null, ...rotating.slice(0, -1)]
  }
  return rounds
}

/**
 * Builds the full round-robin schedule: `matchesPerPair` full cycles of the circle method,
 * each cycle producing fresh, distinct Matchup ids so match-win tallies count each meeting
 * separately (needed for a double round-robin "league").
 */
function buildRoundRobinRounds(players: Player[], legsToWin: number, matchesPerPair: 1 | 2): Matchup[][] {
  const pairingsPerCycle = circleMethodRounds(players.map((p) => p.id))
  const rounds: Matchup[][] = []
  for (let cycle = 0; cycle < matchesPerPair; cycle++) {
    for (const pairs of pairingsPerCycle) {
      const roundIndex = rounds.length
      rounds.push(
        pairs.map(([a, b], slotIndex) => {
          const matchup = emptyMatchup(roundIndex, slotIndex, legsToWin)
          matchup.players = [{ playerId: a }, { playerId: b }]
          return matchup
        }),
      )
    }
  }
  return rounds
}

/** Builds a fresh tournament, dispatching bracket vs. league scheduling by `config.format`. */
export function createTournament(players: Player[], config: TournamentConfig): Tournament {
  if (players.length < 2) {
    throw new Error('A tournament needs at least 2 players.')
  }

  const now = Date.now()
  const rounds =
    config.format === 'round_robin'
      ? buildRoundRobinRounds(players, config.legsToWin, config.matchesPerPair)
      : buildKnockoutRounds(players, config.legsToWin)

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

  if (config.format === 'knockout') {
    for (const matchup of rounds[0]) {
      if (matchup.status === 'complete' && matchup.winnerId) {
        tournament = advanceWinner(tournament, matchup)
      }
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
  if (decided) {
    updated =
      tournament.config.format === 'round_robin' ? maybeCompleteRoundRobin(updated) : advanceWinner(updated, updatedMatchup)
  }
  return updated
}

/** Crowns a champion once every matchup in the league schedule is complete, from the top of the leaderboard. */
function maybeCompleteRoundRobin(tournament: Tournament): Tournament {
  const allDone = tournament.rounds.every((matchups) => matchups.every((m) => m.status === 'complete'))
  if (!allDone) return tournament
  const championId = roundRobinLeaderboard(tournament)[0]?.player.id ?? null
  return { ...tournament, status: 'complete', championId, updatedAt: Date.now() }
}

/**
 * Standard darts convention: leg 1 of a matchup is decided by a random throw, then players
 * alternate who goes first every leg after that - regardless of who won the previous leg.
 * Decides (and persists) that leg-1 starter once, the first time it's called for a matchup
 * with both slots filled; every call after that is a no-op.
 */
export function ensureFirstLegStarter(tournament: Tournament, matchupId: string): Tournament {
  const location = findMatchupLocation(tournament, matchupId)
  if (!location) return tournament
  const matchup = tournament.rounds[location.round][location.index]
  if (matchup.firstLegStarterId) return tournament
  const [slotA, slotB] = matchup.players
  if (!slotA.playerId || !slotB.playerId) return tournament
  const firstLegStarterId = Math.random() < 0.5 ? slotA.playerId : slotB.playerId
  return replaceMatchup(tournament, location.round, location.index, { ...matchup, firstLegStarterId })
}

/**
 * Player ids in throw order for whichever leg is next (`legGameIds.length`), alternating from
 * `firstLegStarterId` every leg. Null if the matchup isn't ready yet (see ensureFirstLegStarter).
 */
export function legStartOrder(matchup: Matchup): [string, string] | null {
  const [slotA, slotB] = matchup.players
  if (!slotA.playerId || !slotB.playerId || !matchup.firstLegStarterId) return null
  const other = matchup.firstLegStarterId === slotA.playerId ? slotB.playerId : slotA.playerId
  return matchup.legGameIds.length % 2 === 0 ? [matchup.firstLegStarterId, other] : [other, matchup.firstLegStarterId]
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

export interface RoundRobinStanding {
  player: Player
  matchesWon: number
  matchesPlayed: number
  legsWon: number
  legsLost: number
}

/** Folds one decided matchup's result into both players' running standings; no-op if undecided. */
function tallyMatchup(byId: Map<string, RoundRobinStanding>, m: Matchup): void {
  if (m.status !== 'complete') return
  const [slotA, slotB] = m.players
  const a = slotA.playerId ? byId.get(slotA.playerId) : undefined
  const b = slotB.playerId ? byId.get(slotB.playerId) : undefined
  if (!a || !b || !slotA.playerId || !slotB.playerId) return

  a.matchesPlayed++
  b.matchesPlayed++
  a.legsWon += m.legWins[slotA.playerId] ?? 0
  a.legsLost += m.legWins[slotB.playerId] ?? 0
  b.legsWon += m.legWins[slotB.playerId] ?? 0
  b.legsLost += m.legWins[slotA.playerId] ?? 0
  if (m.winnerId === slotA.playerId) a.matchesWon++
  else if (m.winnerId === slotB.playerId) b.matchesWon++
}

/**
 * Every player's record across the league schedule so far, ranked by match wins, tiebroken by
 * leg differential (legs won minus legs lost). Only tallies already-complete matchups, so this
 * doubles as a live in-progress leaderboard, not just a final one.
 */
export function roundRobinLeaderboard(tournament: Tournament): RoundRobinStanding[] {
  const byId = new Map(
    tournament.players.map((p) => [p.id, { player: p, matchesWon: 0, matchesPlayed: 0, legsWon: 0, legsLost: 0 }]),
  )
  for (const matchups of tournament.rounds) {
    for (const m of matchups) tallyMatchup(byId, m)
  }
  return [...byId.values()].sort(
    (x, y) => y.matchesWon - x.matchesWon || y.legsWon - y.legsLost - (x.legsWon - x.legsLost),
  )
}

/**
 * Walks knockout rounds from the final backward, collecting each decided matchup's loser the
 * first time they're seen - which is exactly reverse-elimination order (runner-up first, then
 * the semi-finalists, etc), since a player who lost earlier keeps showing up as a loser in every
 * later round they would have played had they won.
 */
function bracketRunnersUp(tournament: Tournament, playerById: Map<string, Player>, seen: Set<string>): Player[] {
  const result: Player[] = []
  for (let round = tournament.rounds.length - 1; round >= 0; round--) {
    for (const matchup of tournament.rounds[round]) {
      if (matchup.status !== 'complete' || !matchup.winnerId) continue
      const loserId = matchup.players.find((slot) => slot.playerId && slot.playerId !== matchup.winnerId)?.playerId
      if (!loserId || seen.has(loserId)) continue
      const loser = playerById.get(loserId)
      if (loser) {
        result.push(loser)
        seen.add(loserId)
      }
    }
  }
  return result
}

/** Champion first, then reverse-elimination order (runner-up, then semi-finalists, etc) for knockout;
 *  league-leaderboard order for round_robin. */
export function standings(tournament: Tournament): Player[] {
  if (tournament.config.format === 'round_robin') {
    return roundRobinLeaderboard(tournament).map((s) => s.player)
  }

  const playerById = new Map(tournament.players.map((p) => [p.id, p]))
  const seen = new Set<string>()
  const result: Player[] = []

  if (tournament.championId) {
    const champion = playerById.get(tournament.championId)
    if (champion) {
      result.push(champion)
      seen.add(tournament.championId)
    }
  }

  return [...result, ...bracketRunnersUp(tournament, playerById, seen)]
}
