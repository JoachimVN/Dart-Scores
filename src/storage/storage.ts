import { migrations } from './migrations'
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  defaultRoot,
  type PersistedEnvelope,
  type PersistedRoot,
} from './schema'

export function loadRoot(): PersistedRoot {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultRoot()

  try {
    const envelope = JSON.parse(raw) as PersistedEnvelope<unknown>
    let data = envelope.data
    let version = envelope.schemaVersion

    for (const migration of migrations) {
      if (version === migration.from) {
        data = migration.migrate(data)
        version = migration.to
      }
    }

    if (version !== CURRENT_SCHEMA_VERSION) {
      return defaultRoot()
    }

    return data as PersistedRoot
  } catch {
    return defaultRoot()
  }
}

export function saveRoot(root: PersistedRoot): void {
  const envelope: PersistedEnvelope<PersistedRoot> = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    data: root,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
}

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEY)
}
