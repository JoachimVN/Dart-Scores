import { beforeEach, describe, expect, it } from 'vitest'
import { listPlayers, removePlayer, upsertPlayer } from './playerRepository'

beforeEach(() => {
  localStorage.clear()
})

describe('upsertPlayer / listPlayers round-trip', () => {
  it('adds a new player and lists it back', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    expect(listPlayers()).toEqual([{ id: 'p1', name: 'Alice' }])
  })

  it('updates an existing player in place instead of duplicating', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    upsertPlayer({ id: 'p1', name: 'Alicia' })
    expect(listPlayers()).toEqual([{ id: 'p1', name: 'Alicia' }])
  })
})

describe('removePlayer', () => {
  it('permanently removes a player from the saved roster', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    upsertPlayer({ id: 'p2', name: 'Bob' })
    removePlayer('p1')
    expect(listPlayers()).toEqual([{ id: 'p2', name: 'Bob' }])
  })

  it('is a no-op when the id is not in the roster', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    removePlayer('does-not-exist')
    expect(listPlayers()).toEqual([{ id: 'p1', name: 'Alice' }])
  })
})
