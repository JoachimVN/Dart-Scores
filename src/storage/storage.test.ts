import { beforeEach, describe, expect, it } from 'vitest'
import { standardCricketConfig } from '../game/cricket/cricketTypes'
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
      settings: { useDartNotation: false, theme: 'dark' as const, showCheckoutSuggestions: false },
      history: [],
      activeTournament: null,
    }
    saveRoot(root)
    expect(loadRoot()).toEqual(root)
  })
})

describe('migrations', () => {
  it('migrates a v1 envelope (no settings/history fields) all the way to the current version', () => {
    const v1Data = { players: [{ id: 'p1', name: 'Alice' }], activeGame: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, data: v1Data }))
    expect(loadRoot()).toEqual({ ...v1Data, settings: defaultSettings(), history: [], activeTournament: null })
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
      settings: { useDartNotation: false, theme: 'system', showCheckoutSuggestions: true },
      history: [],
      activeTournament: null,
    })
  })

  it('migrates a v3 envelope (history present, no per-player throws) defaulting throws to []', () => {
    const v3Data = {
      players: [],
      activeGame: null,
      settings: defaultSettings(),
      history: [
        {
          id: 'g1',
          mode: 'x01',
          startingScore: 501,
          doubleOut: true,
          completedAt: 1000,
          players: [{ playerId: 'p1', name: 'Alice', won: true, turnsPlayed: 5, pointsScored: 501, bestCheckout: 40 }],
        },
      ],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 3, data: v3Data }))
    expect(loadRoot()).toEqual({
      ...v3Data,
      history: [
        { ...v3Data.history[0], players: [{ ...v3Data.history[0].players[0], throws: [], turnScores: [] }] },
      ],
      activeTournament: null,
    })
  })

  it('migrates a v4 envelope (no activeTournament field) defaulting it to null', () => {
    const v4Data = {
      players: [],
      activeGame: null,
      settings: defaultSettings(),
      history: [],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 4, data: v4Data }))
    expect(loadRoot()).toEqual({ ...v4Data, activeTournament: null })
  })

  it('migrates a v5 envelope (no per-player turnScores) defaulting turnScores to []', () => {
    const v5Data = {
      players: [],
      activeGame: null,
      settings: defaultSettings(),
      history: [
        {
          id: 'g1',
          mode: 'x01',
          startingScore: 501,
          doubleOut: true,
          completedAt: 1000,
          players: [
            { playerId: 'p1', name: 'Alice', won: true, turnsPlayed: 5, pointsScored: 501, bestCheckout: 40, throws: [] },
          ],
        },
      ],
      activeTournament: null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 5, data: v5Data }))
    expect(loadRoot()).toEqual({
      ...v5Data,
      history: [{ ...v5Data.history[0], players: [{ ...v5Data.history[0].players[0], turnScores: [] }] }],
    })
  })

  it('migrates a v6 envelope (tournament config with no mode) defaulting it to x01', () => {
    const v6Data = {
      players: [],
      activeGame: null,
      settings: defaultSettings(),
      history: [],
      activeTournament: {
        id: 't1',
        status: 'in_progress',
        config: { x01: { startingScore: 501, doubleOut: true }, legsToWin: 2 },
        players: [],
        rounds: [],
        championId: null,
        createdAt: 1000,
        updatedAt: 1000,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 6, data: v6Data }))
    expect(loadRoot()).toEqual({
      ...v6Data,
      activeTournament: {
        ...v6Data.activeTournament,
        config: { format: 'knockout', mode: 'x01', ...v6Data.activeTournament.config },
      },
    })
  })

  it('leaves a v6 envelope with no active tournament unchanged', () => {
    const v6Data = { players: [], activeGame: null, settings: defaultSettings(), history: [], activeTournament: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 6, data: v6Data }))
    expect(loadRoot()).toEqual(v6Data)
  })

  it('migrates a v7 envelope (no showCheckoutSuggestions) defaulting it to true, preserving existing settings', () => {
    const v7Data = {
      players: [],
      activeGame: null,
      settings: { useDartNotation: false, theme: 'dark' },
      history: [],
      activeTournament: null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 7, data: v7Data }))
    expect(loadRoot()).toEqual({
      ...v7Data,
      settings: { ...v7Data.settings, showCheckoutSuggestions: true },
    })
  })

  it('migrates a v8 envelope (tournament config with no format) defaulting it to knockout', () => {
    const v8Data = {
      players: [],
      activeGame: null,
      settings: defaultSettings(),
      history: [],
      activeTournament: {
        id: 't1',
        status: 'in_progress',
        config: { mode: 'x01', x01: { startingScore: 501, doubleOut: true }, legsToWin: 2 },
        players: [],
        rounds: [],
        championId: null,
        createdAt: 1000,
        updatedAt: 1000,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 8, data: v8Data }))
    expect(loadRoot()).toEqual({
      ...v8Data,
      activeTournament: { ...v8Data.activeTournament, config: { format: 'knockout', ...v8Data.activeTournament.config } },
    })
  })

  it('leaves a v8 envelope with no active tournament unchanged', () => {
    const v8Data = { players: [], activeGame: null, settings: defaultSettings(), history: [], activeTournament: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 8, data: v8Data }))
    expect(loadRoot()).toEqual(v8Data)
  })

  it('migrates v9 Cricket tournament settings to the standard target list', () => {
    const v9Data = {
      players: [],
      activeGame: null,
      settings: defaultSettings(),
      history: [],
      activeTournament: {
        id: 't1',
        status: 'in_progress',
        config: { format: 'knockout', mode: 'cricket', legsToWin: 2 },
        players: [],
        rounds: [],
        championId: null,
        createdAt: 1000,
        updatedAt: 1000,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 9, data: v9Data }))
    expect(loadRoot()).toEqual({
      ...v9Data,
      activeTournament: {
        ...v9Data.activeTournament,
        config: { ...v9Data.activeTournament.config, cricket: standardCricketConfig() },
      },
    })
  })

  it('migrates v10 Cricket target numbers to the generalized targets field', () => {
    const v10Data = {
      players: [],
      settings: defaultSettings(),
      history: [],
      activeGame: null,
      activeTournament: {
        id: 't1',
        status: 'in_progress',
        config: { format: 'knockout', mode: 'cricket', cricket: { numbers: [20, 19, 25] }, legsToWin: 2 },
        players: [],
        rounds: [],
        championId: null,
        createdAt: 1000,
        updatedAt: 1000,
      },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 10, data: v10Data }))
    expect(loadRoot()).toEqual({
      ...v10Data,
      activeTournament: {
        ...v10Data.activeTournament,
        config: { ...v10Data.activeTournament.config, cricket: { targets: [20, 19, 25] } },
      },
    })
  })
})
