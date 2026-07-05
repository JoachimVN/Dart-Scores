import type { Player } from '../game/types'
import type { X01Config } from '../game/x01/x01Types'

export interface MatchupSlot {
  /** null until a previous round's winner (or bye resolution) fills this slot. */
  playerId: string | null
  /** True if this slot was never a real opponent - the other slot's player advances automatically. */
  bye?: boolean
}

export interface Matchup {
  id: string
  round: number
  /** Position within the round; determines which slot of rounds[round + 1] the winner fills. */
  slotIndex: number
  players: [MatchupSlot, MatchupSlot]
  legsToWin: number
  legWins: Record<string, number>
  /** GameState ids of legs played so far, in order. */
  legGameIds: string[]
  status: 'pending' | 'complete'
  winnerId: string | null
}

export interface TournamentConfig {
  x01: X01Config
  /** Legs needed to win a matchup, e.g. best-of-3 -> 2. */
  legsToWin: number
}

export interface Tournament {
  id: string
  status: 'in_progress' | 'complete'
  config: TournamentConfig
  /** Seed order = selection order. */
  players: Player[]
  rounds: Matchup[][]
  championId: string | null
  createdAt: number
  updatedAt: number
}
