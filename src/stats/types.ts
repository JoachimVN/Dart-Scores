import type { Throw } from '../game/types'

/** One player's result within a single completed game, snapshotted at game-over time. */
export interface PlayerGameSummary {
  playerId: string
  /** Snapshotted so a later rename doesn't rewrite history. */
  name: string
  won: boolean
  turnsPlayed: number
  pointsScored: number
  /** Highest winning checkout this player hit in the game, 0 if they didn't finish it. */
  bestCheckout: number
  /** Every dart this player threw in the game, in order - powers shot recaps/heatmaps. */
  throws: Throw[]
}

export interface GameSummary {
  id: string
  mode: 'x01'
  startingScore: number
  doubleOut: boolean
  completedAt: number
  players: PlayerGameSummary[]
}
