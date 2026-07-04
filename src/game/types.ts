import type { Ring } from '../dartboard/dartboard.types'
import type { X01State } from './x01/x01Types'

export interface Throw {
  id: string
  segment: number | null
  ring: Ring
  value: number
  label: string
  timestamp: number
}

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

export type GameMode = 'x01'
export type GameStatus = 'in_progress' | 'complete'

export interface GameState {
  id: string
  mode: GameMode
  status: GameStatus
  players: Player[]
  createdAt: number
  updatedAt: number
  x01: X01State
}
