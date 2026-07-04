import { beforeEach, describe, expect, it } from 'vitest'
import { getOrCreateDefaultPlayer, listPlayers, upsertPlayer } from './playerRepository'

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

describe('getOrCreateDefaultPlayer', () => {
  it('creates and persists a default player when none exists', () => {
    const player = getOrCreateDefaultPlayer()
    expect(player.name).toBe('Player 1')
    expect(listPlayers()).toEqual([player])
  })

  it('returns the existing first player without creating another', () => {
    upsertPlayer({ id: 'p1', name: 'Alice' })
    const player = getOrCreateDefaultPlayer()
    expect(player).toEqual({ id: 'p1', name: 'Alice' })
    expect(listPlayers()).toHaveLength(1)
  })
})
