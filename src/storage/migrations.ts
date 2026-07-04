export interface Migration {
  from: number
  to: number
  migrate: (data: unknown) => unknown
}

/**
 * Ordered schema migrations, applied in sequence by storage.ts when a
 * persisted envelope's schemaVersion is older than CURRENT_SCHEMA_VERSION.
 * Empty at v1 - add an entry here (and bump CURRENT_SCHEMA_VERSION) whenever
 * the PersistedRoot shape changes, so existing saved games aren't discarded.
 */
export const migrations: Migration[] = []
