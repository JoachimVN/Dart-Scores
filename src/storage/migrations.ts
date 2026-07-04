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
]
