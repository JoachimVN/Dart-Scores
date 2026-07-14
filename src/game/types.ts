import type { Ring } from '../dartboard/dartboard.types'
import type { CricketConfig, CricketState } from './cricket/cricketTypes'
import type { X01Config, X01State } from './x01/x01Types'

export interface Throw {
  id: string
  segment: number | null
  ring: Ring
  value: number
  label: string
  timestamp: number
}

/** X01-only turn record - a countdown score before/after. Cricket has its own CricketTurn shape (marks/points, no single score). */
export interface Turn {
  id: string
  playerId: string
  throws: Throw[]
  scoreBefore: number
  scoreAfter: number
  bust: boolean
}

export interface Player {
  id: string
  name: string
}

export type GameMode = 'x01' | 'cricket'
export type GameStatus = 'in_progress' | 'complete'

interface GameBase {
  id: string
  status: GameStatus
  players: Player[]
  createdAt: number
  updatedAt: number
}

export type GameState =
  | (GameBase & { mode: 'x01'; x01: X01State })
  | (GameBase & { mode: 'cricket'; cricket: CricketState })

/** Params needed to start a fresh game, one variant per mode. */
export type NewGameParams =
  | { mode: 'x01'; config: X01Config; players: Player[] }
  | { mode: 'cricket'; config: CricketConfig; players: Player[] }
