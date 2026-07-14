import { standardCricketConfig } from '../game/cricket/cricketTypes'
import { defaultSettings } from './schema'

export interface Migration {
  from: number
  to: number
  migrate: (data: unknown) => unknown
}

/**
 * Ordered schema migrations, applied in sequence by storage.ts when a
 * persisted envelope's schemaVersion is older than CURRENT_SCHEMA_VERSION.
 * Add an entry here (and bump CURRENT_SCHEMA_VERSION) whenever the
 * PersistedRoot shape changes, so existing saved games aren't discarded.
 */
export const migrations: Migration[] = [
  {
    from: 1,
    to: 2,
    migrate: (data) => ({ ...(data as object), settings: defaultSettings() }),
  },
  {
    from: 2,
    to: 3,
    migrate: (data) => {
      const root = data as { settings?: Partial<ReturnType<typeof defaultSettings>> }
      return {
        ...root,
        settings: { ...defaultSettings(), ...root.settings },
        history: [],
      }
    },
  },
  {
    from: 3,
    to: 4,
    migrate: (data) => {
      // Existing history entries predate per-dart tracking - their throws
      // can't be reconstructed, so default to an empty list.
      const root = data as { history?: Array<{ players?: Array<Record<string, unknown>> }> }
      return {
        ...root,
        history: (root.history ?? []).map((game) => ({
          ...game,
          players: (game.players ?? []).map((player) => ({ ...player, throws: [] })),
        })),
      }
    },
  },
  {
    from: 4,
    to: 5,
    migrate: (data) => ({ ...(data as object), activeTournament: null }),
  },
  {
    from: 5,
    to: 6,
    migrate: (data) => {
      // Existing history entries predate per-turn score tracking - they just
      // won't retroactively count toward 180/ton stats.
      const root = data as { history?: Array<{ players?: Array<Record<string, unknown>> }> }
      return {
        ...root,
        history: (root.history ?? []).map((game) => ({
          ...game,
          players: (game.players ?? []).map((player) => ({ ...player, turnScores: [] })),
        })),
      }
    },
  },
  {
    from: 6,
    to: 7,
    migrate: (data) => {
      // Cricket mode's addition means GameMode is no longer x01-only, so
      // TournamentConfig needs an explicit discriminant - existing
      // tournaments predate it and are always x01. GameState/GameSummary
      // already carried a literal mode: 'x01', so nothing to backfill there.
      const root = data as { activeTournament?: { config?: Record<string, unknown> } | null }
      if (!root.activeTournament) return root
      return {
        ...root,
        activeTournament: {
          ...root.activeTournament,
          config: { mode: 'x01', ...root.activeTournament.config },
        },
      }
    },
  },
  {
    from: 7,
    to: 8,
    migrate: (data) => {
      const root = data as { settings?: Partial<ReturnType<typeof defaultSettings>> }
      return { ...root, settings: { ...defaultSettings(), ...root.settings } }
    },
  },
  {
    from: 8,
    to: 9,
    migrate: (data) => {
      // The league (round-robin) format's addition means TournamentConfig
      // needs an explicit format discriminant - existing tournaments predate
      // it and were always knockout, with no matchesPerPair concept.
      const root = data as { activeTournament?: { config?: Record<string, unknown> } | null }
      if (!root.activeTournament) return root
      return {
        ...root,
        activeTournament: {
          ...root.activeTournament,
          config: { format: 'knockout', ...root.activeTournament.config },
        },
      }
    },
  },
  {
    from: 9,
    to: 10,
    migrate: (data) => {
      // Cricket used to imply the standard targets. Persist that default on
      // existing games/tournaments so configured targets survive reloads.
      const root = data as {
        activeGame?: { mode?: string; cricket?: Record<string, unknown> } | null
        activeTournament?: { config?: Record<string, unknown> } | null
      }
      const activeGame =
        root.activeGame?.mode === 'cricket' && root.activeGame.cricket
          ? { ...root.activeGame, cricket: { ...root.activeGame.cricket, config: standardCricketConfig() } }
          : root.activeGame
      const activeTournament =
        root.activeTournament?.config?.mode === 'cricket'
          ? { ...root.activeTournament, config: { ...root.activeTournament.config, cricket: standardCricketConfig() } }
          : root.activeTournament
      return { ...root, activeGame, activeTournament }
    },
  },
  {
    from: 10,
    to: 11,
    migrate: (data) => {
      // v10 made the standard numbers explicit. v11 generalizes that list to
      // targets so the optional Double/Triple rings can be stored alongside it.
      const root = data as {
        activeGame?: { mode?: string; cricket?: { config?: { numbers?: unknown[] } } } | null
        activeTournament?: { config?: { mode?: string; cricket?: { numbers?: unknown[] } } } | null
      }
      const activeGame =
        root.activeGame?.mode === 'cricket' && root.activeGame.cricket?.config
          ? {
              ...root.activeGame,
              cricket: {
                ...root.activeGame.cricket,
                config: { targets: root.activeGame.cricket.config.numbers ?? standardCricketConfig().targets },
              },
            }
          : root.activeGame
      const activeTournament =
        root.activeTournament?.config?.mode === 'cricket' && root.activeTournament.config.cricket
          ? {
              ...root.activeTournament,
              config: {
                ...root.activeTournament.config,
                cricket: { targets: root.activeTournament.config.cricket.numbers ?? standardCricketConfig().targets },
              },
            }
          : root.activeTournament
      return { ...root, activeGame, activeTournament }
    },
  },
]
