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
]
