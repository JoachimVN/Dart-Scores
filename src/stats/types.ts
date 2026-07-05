import type { Throw } from '../game/types'

interface PlayerGameSummaryBase {
  playerId: string
  /** Snapshotted so a later rename doesn't rewrite history. */
  name: string
  won: boolean
  turnsPlayed: number
  /** Every dart this player threw in the game, in order - powers shot recaps/heatmaps. */
  throws: Throw[]
}

/** One X01 player's result within a single completed game, snapshotted at game-over time. */
export interface X01PlayerGameSummary extends PlayerGameSummaryBase {
  pointsScored: number
  /** Highest winning checkout this player hit in the game, 0 if they didn't finish it. */
  bestCheckout: number
  /** Points scored per completed turn, in order; 0 for a bust - powers 180/ton counts and trend charts. */
  turnScores: number[]
}

/** One Cricket player's result within a single completed game, snapshotted at game-over time. */
export interface CricketPlayerGameSummary extends PlayerGameSummaryBase {
  /** Points scored off numbers opponents hadn't closed yet. */
  pointsScored: number
  /** Total marks (closing + scoring) across the whole game - powers MPR (marks per round/turn). */
  marksScored: number
  /** 0-7: how many of the 7 numbers this player closed by game end. */
  numbersClosed: number
  /** Marks scored per completed turn, in order - powers MPR trend charts. */
  turnMarks: number[]
  /** Points scored per completed turn, in order - powers "best turn" stats. */
  turnPoints: number[]
}

export type PlayerGameSummary = X01PlayerGameSummary | CricketPlayerGameSummary

export type GameSummary =
  | { id: string; mode: 'x01'; startingScore: number; doubleOut: boolean; completedAt: number; players: X01PlayerGameSummary[] }
  | { id: string; mode: 'cricket'; completedAt: number; players: CricketPlayerGameSummary[] }
