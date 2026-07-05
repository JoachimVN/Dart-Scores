import type { Throw } from '../game/types'
import { listPlayers } from '../players/playerRepository'
import { loadRoot, saveRoot } from '../storage/storage'
import type { CricketPlayerGameSummary, GameSummary, X01PlayerGameSummary } from './types'

export function listHistory(): GameSummary[] {
  return loadRoot().history
}

export function appendGameHistory(summary: GameSummary): void {
  const root = loadRoot()
  saveRoot({ ...root, history: [...root.history, summary] })
}

export interface StatsPoint {
  completedAt: number
  /** X01: average points per turn. Cricket: average marks per turn (MPR). */
  average: number
}

export interface X01PlayerStats {
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
  /** Every dart this player has ever thrown, across all recorded X01 games - feeds a heatmap. */
  allThrows: Throw[]
}

export interface CricketPlayerStats {
  gamesPlayed: number
  wins: number
  /** 0-1; 0 when the player has no recorded games. */
  winRate: number
  /** Average marks scored per turn (marks per round). */
  avgMPR: number
  /** Most points scored in a single turn, across all games. */
  bestTurnPoints: number
  /** Fewest turns taken in a game this player won; 0 if they've never won. */
  fastestClose: number
  /** MPR for each game, oldest first - feeds a trend chart. */
  trend: StatsPoint[]
  /** Every dart this player has ever thrown, across all recorded Cricket games - feeds a heatmap. */
  allThrows: Throw[]
}

export interface PlayerStats {
  x01: X01PlayerStats
  cricket: CricketPlayerStats
}

function historyOfMode<M extends GameSummary['mode']>(mode: M): Extract<GameSummary, { mode: M }>[] {
  return listHistory().filter((game): game is Extract<GameSummary, { mode: M }> => game.mode === mode)
}

function computeX01Stats(playerId: string): X01PlayerStats {
  const games = historyOfMode('x01')
    .map((game) => ({ game, entry: game.players.find((p) => p.playerId === playerId) }))
    .filter((g): g is { game: Extract<GameSummary, { mode: 'x01' }>; entry: X01PlayerGameSummary } => Boolean(g.entry))
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

function computeCricketStats(playerId: string): CricketPlayerStats {
  const games = historyOfMode('cricket')
    .map((game) => ({ game, entry: game.players.find((p) => p.playerId === playerId) }))
    .filter(
      (g): g is { game: Extract<GameSummary, { mode: 'cricket' }>; entry: CricketPlayerGameSummary } => Boolean(g.entry),
    )
  const entries = games.map((g) => g.entry)

  const gamesPlayed = entries.length
  const wins = entries.filter((p) => p.won).length
  const totalMarks = entries.reduce((sum, p) => sum + p.marksScored, 0)
  const totalTurns = entries.reduce((sum, p) => sum + p.turnsPlayed, 0)
  const bestTurnPoints = entries.reduce((max, p) => Math.max(max, ...p.turnPoints, 0), 0)
  const fastestClose = entries.filter((p) => p.won).reduce((min, p) => Math.min(min, p.turnsPlayed), Infinity)

  return {
    gamesPlayed,
    wins,
    winRate: gamesPlayed === 0 ? 0 : wins / gamesPlayed,
    avgMPR: totalTurns === 0 ? 0 : totalMarks / totalTurns,
    bestTurnPoints,
    fastestClose: Number.isFinite(fastestClose) ? fastestClose : 0,
    trend: games
      .map(({ game, entry }) => ({
        completedAt: game.completedAt,
        average: entry.turnsPlayed === 0 ? 0 : entry.marksScored / entry.turnsPlayed,
      }))
      .sort((a, b) => a.completedAt - b.completedAt),
    allThrows: entries.flatMap((p) => p.throws),
  }
}

/** Simple aggregate stats for one player, split by mode since X01 (points) and Cricket (marks) don't share metrics. */
export function computePlayerStats(playerId: string): PlayerStats {
  return { x01: computeX01Stats(playerId), cricket: computeCricketStats(playerId) }
}

/** Rate-based leaderboards (average, win rate) need at least this many games so one lucky game can't top the board. */
const MIN_GAMES_FOR_RATE_LEADERBOARD = 3

export interface LeaderboardEntry {
  playerId: string
  name: string
  value: number
}

export interface X01Leaderboards {
  bestAverage: LeaderboardEntry[]
  bestWinRate: LeaderboardEntry[]
  mostWins: LeaderboardEntry[]
  bestCheckout: LeaderboardEntry[]
  most180s: LeaderboardEntry[]
}

export interface CricketLeaderboards {
  bestMPR: LeaderboardEntry[]
  bestWinRate: LeaderboardEntry[]
  mostWins: LeaderboardEntry[]
  mostPointsInATurn: LeaderboardEntry[]
}

export interface Leaderboards {
  x01: X01Leaderboards
  cricket: CricketLeaderboards
}

function topEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.value - a.value).slice(0, 5)
}

/** Cross-player leaderboards for the all-time stats view, split by mode. */
export function computeAllTimeLeaderboards(): Leaderboards {
  const perPlayer = listPlayers().map((player) => ({ player, stats: computePlayerStats(player.id) }))

  const entriesFor = (
    pool: typeof perPlayer,
    metric: (stats: PlayerStats) => number,
  ): LeaderboardEntry[] =>
    topEntries(
      pool
        .filter(({ stats }) => metric(stats) > 0)
        .map(({ player, stats }) => ({ playerId: player.id, name: player.name, value: metric(stats) })),
    )

  const x01Eligible = perPlayer.filter(({ stats }) => stats.x01.gamesPlayed >= MIN_GAMES_FOR_RATE_LEADERBOARD)
  const cricketEligible = perPlayer.filter(({ stats }) => stats.cricket.gamesPlayed >= MIN_GAMES_FOR_RATE_LEADERBOARD)

  return {
    x01: {
      bestAverage: entriesFor(x01Eligible, (stats) => stats.x01.avgScorePerTurn),
      bestWinRate: entriesFor(x01Eligible, (stats) => stats.x01.winRate),
      mostWins: entriesFor(perPlayer, (stats) => stats.x01.wins),
      bestCheckout: entriesFor(perPlayer, (stats) => stats.x01.bestCheckout),
      most180s: entriesFor(perPlayer, (stats) => stats.x01.count180s),
    },
    cricket: {
      bestMPR: entriesFor(cricketEligible, (stats) => stats.cricket.avgMPR),
      bestWinRate: entriesFor(cricketEligible, (stats) => stats.cricket.winRate),
      mostWins: entriesFor(perPlayer, (stats) => stats.cricket.wins),
      mostPointsInATurn: entriesFor(perPlayer, (stats) => stats.cricket.bestTurnPoints),
    },
  }
}
