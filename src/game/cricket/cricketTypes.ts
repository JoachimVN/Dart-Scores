import type { Throw } from '../types'

/** Standard Cricket's 7 scoring numbers - 20 down to 15, plus the bull (25). */
export const STANDARD_CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25] as const
/** Kept as an alias while callers move to the game-specific config. */
export const CRICKET_NUMBERS = STANDARD_CRICKET_NUMBERS
export type CricketMultiplierTarget = 'double' | 'triple'
export type CricketTarget = number | CricketMultiplierTarget

export interface CricketConfig {
  /** Selected board targets, in scoreboard order. 25 represents the bull. */
  targets: CricketTarget[]
}

export const standardCricketConfig = (): CricketConfig => ({ targets: [...STANDARD_CRICKET_NUMBERS] })

export function cricketTargetLabel(target: CricketTarget): string {
  if (target === 25) return 'Bull'
  if (target === 'double') return 'Double'
  if (target === 'triple') return 'Triple'
  return String(target)
}

/** Marks on each cricket number, 0-3 (3 = closed). */
export type CricketMarks = Record<CricketTarget, number>

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
  config: CricketConfig
  playerStates: CricketPlayerState[]
  currentPlayerIndex: number
  /** Darts thrown so far in the turn in progress (0-3), not yet committed. */
  currentTurnThrows: Throw[]
  winnerId: string | null
}
