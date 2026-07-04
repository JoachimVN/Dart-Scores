import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, defaultRoot } from './schema'
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
  it('persists and reloads players and the active game unchanged', () => {
    const root = {
      players: [{ id: 'p1', name: 'Alice' }],
      activeGame: null,
    }
    saveRoot(root)
    expect(loadRoot()).toEqual(root)
  })
})
