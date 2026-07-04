import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, defaultRoot, defaultSettings } from './schema'
import { loadRoot, saveRoot } from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('loadRoot', () => {
  it('returns the default root when nothing is stored', () => {
    expect(loadRoot()).toEqual(defaultRoot())
  })

  it('returns the default root when stored data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadRoot()).toEqual(defaultRoot())
  })

  it('returns the default root when the schema version is unrecognized and unmigratable', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 999, data: {} }))
    expect(loadRoot()).toEqual(defaultRoot())
  })
})

describe('saveRoot / loadRoot round-trip', () => {
  it('persists and reloads players, the active game, and settings unchanged', () => {
    const root = {
      players: [{ id: 'p1', name: 'Alice' }],
      activeGame: null,
      settings: { useDartNotation: false },
    }
    saveRoot(root)
    expect(loadRoot()).toEqual(root)
  })
})

describe('migrations', () => {
  it('migrates a v1 envelope (no settings field) up to the current version, adding defaults', () => {
    const v1Data = { players: [{ id: 'p1', name: 'Alice' }], activeGame: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, data: v1Data }))
    expect(loadRoot()).toEqual({ ...v1Data, settings: defaultSettings() })
  })
})
