import type { Throw } from '../game/types'
import { listPlayers } from '../players/playerRepository'
import { loadRoot, saveRoot } from '../storage/storage'
import type { GameSummary } from './types'

export function listHistory(): GameSummary[] {
  return loadRoot().history
}

export function appendGameHistory(summary: GameSummary): void {
  const root = loadRoot()
  saveRoot({ ...root, history: [...root.history, summary] })
}

export interface StatsPoint {
  completedAt: number
  average: number
}

export interface PlayerStats {
  gamesPlayed: number
  wins: number
  /** 0-1; 0 when the player has no recorded games. */
  winRate: number
  avgScorePerTurn: number
  bestCheckout: number
  /** Fewest darts thrown in a game this player won; 0 if they've never won. */
  bestLegDarts: number
  /** Turns that scored exactly 180. */
  count180s: number
  /** Turns that scored 100 or more (180s included). */
  count100Plus: number
  /** Average score per turn for each game, oldest first - feeds a trend chart. */
  trend: StatsPoint[]
  /** Every dart this player has ever thrown, across all recorded games - feeds a heatmap. */
  allThrows: Throw[]
}

/** Simple aggregate stats for one player, computed from their entries across all recorded game history. */
export function computePlayerStats(playerId: string): PlayerStats {
  const games = listHistory()
    .map((game) => ({ game, entry: game.players.find((p) => p.playerId === playerId) }))
    .filter((g): g is { game: GameSummary; entry: NonNullable<(typeof g)['entry']> } => Boolean(g.entry))
  const entries = games.map((g) => g.entry)

  const gamesPlayed = entries.length
  const wins = entries.filter((p) => p.won).length
  const totalPoints = entries.reduce((sum, p) => sum + p.pointsScored, 0)
  const totalTurns = entries.reduce((sum, p) => sum + p.turnsPlayed, 0)
  const bestCheckout = entries.reduce((max, p) => Math.max(max, p.bestCheckout), 0)
  const bestLegDarts = entries.filter((p) => p.won).reduce((min, p) => Math.min(min, p.throws.length), Infinity)
  const allTurnScores = entries.flatMap((p) => p.turnScores)

  return {
    gamesPlayed,
    wins,
    winRate: gamesPlayed === 0 ? 0 : wins / gamesPlayed,
    avgScorePerTurn: totalTurns === 0 ? 0 : totalPoints / totalTurns,
    bestCheckout,
    bestLegDarts: Number.isFinite(bestLegDarts) ? bestLegDarts : 0,
    count180s: allTurnScores.filter((score) => score === 180).length,
    count100Plus: allTurnScores.filter((score) => score >= 100).length,
    trend: games
      .map(({ game, entry }) => ({
        completedAt: game.completedAt,
        average: entry.turnsPlayed === 0 ? 0 : entry.pointsScored / entry.turnsPlayed,
      }))
      .sort((a, b) => a.completedAt - b.completedAt),
    allThrows: entries.flatMap((p) => p.throws),
  }
}

/** Rate-based leaderboards (average, win rate) need at least this many games so one lucky game can't top the board. */
const MIN_GAMES_FOR_RATE_LEADERBOARD = 3

export interface LeaderboardEntry {
  playerId: string
  name: string
  value: number
}

export interface Leaderboards {
  bestAverage: LeaderboardEntry[]
  bestWinRate: LeaderboardEntry[]
  mostWins: LeaderboardEntry[]
  bestCheckout: LeaderboardEntry[]
  most180s: LeaderboardEntry[]
}

function topEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.value - a.value).slice(0, 5)
}

/** Cross-player leaderboards for the all-time stats view. */
export function computeAllTimeLeaderboards(): Leaderboards {
  const perPlayer = listPlayers().map((player) => ({ player, stats: computePlayerStats(player.id) }))
  const rateEligible = perPlayer.filter(({ stats }) => stats.gamesPlayed >= MIN_GAMES_FOR_RATE_LEADERBOARD)

  const entriesFor = (
    pool: typeof perPlayer,
    metric: (stats: PlayerStats) => number,
  ): LeaderboardEntry[] =>
    topEntries(
      pool
        .filter(({ stats }) => metric(stats) > 0)
        .map(({ player, stats }) => ({ playerId: player.id, name: player.name, value: metric(stats) })),
    )

  return {
    bestAverage: entriesFor(rateEligible, (stats) => stats.avgScorePerTurn),
    bestWinRate: entriesFor(rateEligible, (stats) => stats.winRate),
    mostWins: entriesFor(perPlayer, (stats) => stats.wins),
    bestCheckout: entriesFor(perPlayer, (stats) => stats.bestCheckout),
    most180s: entriesFor(perPlayer, (stats) => stats.count180s),
  }
}
