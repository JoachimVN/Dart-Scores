import type { Throw } from '../game/types'
import type { GameSummary } from '../stats/types'
import type { Matchup, MatchupSlot, Tournament } from './tournamentTypes'

/** Every leg GameState id played anywhere in the tournament's bracket. */
export function tournamentGameIds(tournament: Tournament): string[] {
  return tournament.rounds.flatMap((matchups) => matchups.flatMap((matchup) => matchup.legGameIds))
}

/** The subset of the full game history that belongs to this tournament's legs. */
export function tournamentLegSummaries(tournament: Tournament, history: GameSummary[]): GameSummary[] {
  const ids = new Set(tournamentGameIds(tournament))
  return history.filter((game) => ids.has(game.id))
}

/** Every dart one player threw across every leg they played in the tournament, in leg order. */
export function playerThrowsAcrossTournament(
  tournament: Tournament,
  playerId: string,
  history: GameSummary[],
): Throw[] {
  return tournamentLegSummaries(tournament, history).flatMap(
    (game) => game.players.find((p) => p.playerId === playerId)?.throws ?? [],
  )
}

export interface TournamentRecordEntry {
  playerId: string
  playerName: string
  value: number
}

export interface TournamentRecords {
  highestCheckout: TournamentRecordEntry | null
  most180s: TournamentRecordEntry | null
  bestLegAverage: TournamentRecordEntry | null
  shortestLeg: TournamentRecordEntry | null
}

export interface CricketTournamentRecords {
  bestMPR: TournamentRecordEntry | null
  mostPointsInATurn: TournamentRecordEntry | null
  fastestClose: TournamentRecordEntry | null
}

function bestEntry<T extends { playerId: string; name: string }>(
  entries: T[],
  metric: (entry: T) => number,
  isBetter: (value: number, current: number) => boolean,
): TournamentRecordEntry | null {
  let result: TournamentRecordEntry | null = null
  for (const entry of entries) {
    const value = metric(entry)
    if (value <= 0) continue
    if (!result || isBetter(value, result.value)) result = { playerId: entry.playerId, playerName: entry.name, value }
  }
  return result
}

const higher = (value: number, current: number) => value > current
const lower = (value: number, current: number) => value < current

/** Standout X01 stats across every X01 leg played in the tournament, attributed to whichever player achieved them. */
export function tournamentRecords(tournament: Tournament, history: GameSummary[]): TournamentRecords {
  const entries = tournamentLegSummaries(tournament, history)
    .filter((game): game is Extract<GameSummary, { mode: 'x01' }> => game.mode === 'x01')
    .flatMap((game) => game.players)
  const winners = entries.filter((entry) => entry.won)

  return {
    highestCheckout: bestEntry(winners, (entry) => entry.bestCheckout, higher),
    most180s: bestEntry(entries, (entry) => entry.turnScores.filter((score) => score === 180).length, higher),
    bestLegAverage: bestEntry(
      entries,
      (entry) => (entry.turnsPlayed === 0 ? 0 : entry.pointsScored / entry.turnsPlayed),
      higher,
    ),
    // Fewest darts thrown to finish a leg - only meaningful for the leg's winner.
    shortestLeg: bestEntry(winners, (entry) => entry.throws.length, lower),
  }
}

/** Standout Cricket stats across every Cricket leg played in the tournament, attributed to whichever player achieved them. */
export function cricketTournamentRecords(tournament: Tournament, history: GameSummary[]): CricketTournamentRecords {
  const entries = tournamentLegSummaries(tournament, history)
    .filter((game): game is Extract<GameSummary, { mode: 'cricket' }> => game.mode === 'cricket')
    .flatMap((game) => game.players)
  const winners = entries.filter((entry) => entry.won)

  return {
    bestMPR: bestEntry(entries, (entry) => (entry.turnsPlayed === 0 ? 0 : entry.marksScored / entry.turnsPlayed), higher),
    mostPointsInATurn: bestEntry(entries, (entry) => Math.max(0, ...entry.turnPoints), higher),
    // Fewest turns taken to close everything and win - only meaningful for the leg's winner.
    fastestClose: bestEntry(winners, (entry) => entry.turnsPlayed, lower),
  }
}

export interface MatchupRecap {
  playerAName: string
  playerBName: string
  scoreA: number
  scoreB: number
  winnerName: string | null
}

export type BracketRecap = MatchupRecap[][]

/** Round-by-round matchup summary of the whole bracket, for the champion screen recap. */
export function bracketRecap(tournament: Tournament): BracketRecap {
  const nameForId = (id: string | null) => (id ? (tournament.players.find((p) => p.id === id)?.name ?? '?') : 'TBD')
  const nameForSlot = (slot: MatchupSlot) => (slot.bye ? 'Bye' : nameForId(slot.playerId))

  const recapFor = (matchup: Matchup): MatchupRecap => {
    const [slotA, slotB] = matchup.players
    return {
      playerAName: nameForSlot(slotA),
      playerBName: nameForSlot(slotB),
      scoreA: matchup.legWins[slotA.playerId ?? ''] ?? 0,
      scoreB: matchup.legWins[slotB.playerId ?? ''] ?? 0,
      winnerName: matchup.winnerId ? nameForId(matchup.winnerId) : null,
    }
  }

  return tournament.rounds.map((matchups) => matchups.map(recapFor))
}
