import type { Throw, Turn } from '../types'

export interface X01Config {
  startingScore: number
  /** Require the final dart of a leg to land on a double (or bullseye) to win. */
  doubleOut: boolean
}

export interface X01PlayerState {
  playerId: string
  remaining: number
  turns: Turn[]
}

export interface X01State {
  config: X01Config
  playerStates: X01PlayerState[]
  currentPlayerIndex: number
  /** Darts thrown so far in the turn in progress (0-3), not yet committed. */
  currentTurnThrows: Throw[]
  winnerId: string | null
}
