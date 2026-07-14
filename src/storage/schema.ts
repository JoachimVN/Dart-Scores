import type { GameState, Player } from '../game/types'
import type { GameSummary } from '../stats/types'
import type { Tournament } from '../tournament/tournamentTypes'

export const STORAGE_KEY = 'dartscores:root'
export const CURRENT_SCHEMA_VERSION = 11

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  /** Show dart notation (e.g. "T20") on thrown darts instead of their plain point value (e.g. "60"). */
  useDartNotation: boolean
  theme: Theme
  /** Show the recommended finishing combos panel during X01 play. */
  showCheckoutSuggestions: boolean
}

export interface PersistedRoot {
  players: Player[]
  activeGame: GameState | null
  settings: Settings
  history: GameSummary[]
  activeTournament: Tournament | null
}

export interface PersistedEnvelope<T> {
  schemaVersion: number
  data: T
}

export function defaultSettings(): Settings {
  return { useDartNotation: true, theme: 'system', showCheckoutSuggestions: true }
}

export function defaultRoot(): PersistedRoot {
  return { players: [], activeGame: null, settings: defaultSettings(), history: [], activeTournament: null }
}
