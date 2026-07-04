import type { GameState, Player } from '../game/types'

export const STORAGE_KEY = 'dartscores:root'
export const CURRENT_SCHEMA_VERSION = 2

export interface Settings {
  /** Show dart notation (e.g. "T20") on thrown darts instead of their plain point value (e.g. "60"). */
  useDartNotation: boolean
}

export interface PersistedRoot {
  players: Player[]
  activeGame: GameState | null
  settings: Settings
}

export interface PersistedEnvelope<T> {
  schemaVersion: number
  data: T
}

export function defaultSettings(): Settings {
  return { useDartNotation: true }
}

export function defaultRoot(): PersistedRoot {
  return { players: [], activeGame: null, settings: defaultSettings() }
}
