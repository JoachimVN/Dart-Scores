import type { GameState, Player } from '../game/types'
import type { GameSummary } from '../stats/types'
import type { Tournament } from '../tournament/tournamentTypes'

export const STORAGE_KEY = 'dartscores:root'
export const CURRENT_SCHEMA_VERSION = 13

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  /** Show dart notation (e.g. "T20") on thrown darts instead of their plain point value (e.g. "60"). */
  useDartNotation: boolean
  theme: Theme
  /** Show the recommended finishing combos panel during X01 play. */
  showCheckoutSuggestions: boolean
  /** Hold a finished turn (3 darts or a bust) on screen until a Done button confirms it, instead of auto-advancing to the next player. */
  requireTurnConfirmation: boolean
  /** Show a Miss button next to the board as an explicit way to record a dart that missed it. */
  showMissButton: boolean
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
  return {
    useDartNotation: true,
    theme: 'system',
    showCheckoutSuggestions: true,
    requireTurnConfirmation: false,
    showMissButton: false,
  }
}

export function defaultRoot(): PersistedRoot {
  return { players: [], activeGame: null, settings: defaultSettings(), history: [], activeTournament: null }
}
