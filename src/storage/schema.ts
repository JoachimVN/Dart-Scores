import type { GameState, Player } from '../game/types'

export const STORAGE_KEY = 'dartscores:root'
export const CURRENT_SCHEMA_VERSION = 1

export interface PersistedRoot {
  players: Player[]
  activeGame: GameState | null
}

export interface PersistedEnvelope<T> {
  schemaVersion: number
  data: T
}

export function defaultRoot(): PersistedRoot {
  return { players: [], activeGame: null }
}
