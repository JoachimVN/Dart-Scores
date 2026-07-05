import type { Throw } from '../types'

/** Standard Cricket's 7 scoring numbers - 20 down to 15, plus the bull (25). */
export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25] as const
export type CricketNumber = (typeof CRICKET_NUMBERS)[number]

/** Marks on each cricket number, 0-3 (3 = closed). */
export type CricketMarks = Record<CricketNumber, number>

/** Cricket's own turn record - marks/points snapshots, not a single countdown score like X01's Turn. */
export interface CricketTurn {
  id: string
  playerId: string
  throws: Throw[]
  marksBefore: CricketMarks
  marksAfter: CricketMarks
  pointsBefore: number
  pointsAfter: number
}

export interface CricketPlayerState {
  playerId: string
  marks: CricketMarks
  points: number
  turns: CricketTurn[]
}

export interface CricketState {
  playerStates: CricketPlayerState[]
  currentPlayerIndex: number
  /** Darts thrown so far in the turn in progress (0-3), not yet committed. */
  currentTurnThrows: Throw[]
  winnerId: string | null
}
