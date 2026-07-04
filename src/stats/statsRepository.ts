import { loadRoot, saveRoot } from '../storage/storage'
import type { GameSummary } from './types'

export function listHistory(): GameSummary[] {
  return loadRoot().history
}

export function appendGameHistory(summary: GameSummary): void {
  const root = loadRoot()
  saveRoot({ ...root, history: [...root.history, summary] })
}

export interface PlayerStats {
  gamesPlayed: number
  wins: number
  /** 0-1; 0 when the player has no recorded games. */
  winRate: number
  avgScorePerTurn: number
  bestCheckout: number
}

/** Simple aggregate stats for one player, computed from their entries across all recorded game history. */
export function computePlayerStats(playerId: string): PlayerStats {
  const entries = listHistory()
    .map((game) => game.players.find((p) => p.playerId === playerId))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))

  const gamesPlayed = entries.length
  const wins = entries.filter((p) => p.won).length
  const totalPoints = entries.reduce((sum, p) => sum + p.pointsScored, 0)
  const totalTurns = entries.reduce((sum, p) => sum + p.turnsPlayed, 0)
  const bestCheckout = entries.reduce((max, p) => Math.max(max, p.bestCheckout), 0)

  return {
    gamesPlayed,
    wins,
    winRate: gamesPlayed === 0 ? 0 : wins / gamesPlayed,
    avgScorePerTurn: totalTurns === 0 ? 0 : totalPoints / totalTurns,
    bestCheckout,
  }
}
