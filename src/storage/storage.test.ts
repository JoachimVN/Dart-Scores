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
  it('persists and reloads players, the active game, settings, and history unchanged', () => {
    const root = {
      players: [{ id: 'p1', name: 'Alice' }],
      activeGame: null,
      settings: { useDartNotation: false, theme: 'dark' as const },
      history: [],
    }
    saveRoot(root)
    expect(loadRoot()).toEqual(root)
  })
})

describe('migrations', () => {
  it('migrates a v1 envelope (no settings/history fields) all the way to the current version', () => {
    const v1Data = { players: [{ id: 'p1', name: 'Alice' }], activeGame: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, data: v1Data }))
    expect(loadRoot()).toEqual({ ...v1Data, settings: defaultSettings(), history: [] })
  })

  it('migrates a v2 envelope (settings present, no theme/history) preserving existing settings', () => {
    const v2Data = {
      players: [{ id: 'p1', name: 'Alice' }],
      activeGame: null,
      settings: { useDartNotation: false },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 2, data: v2Data }))
    expect(loadRoot()).toEqual({
      players: v2Data.players,
      activeGame: null,
      settings: { useDartNotation: false, theme: 'system' },
      history: [],
    })
  })
})
