import { describe, expect, it } from 'vitest'
import type { Player } from '../types'
import { applyThrow, createX01Game, liveRemaining, undoLastThrow, type ThrowInput } from './x01Engine'

const players: Player[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

function throwOf(value: number, ring: ThrowInput['ring'] = 'innerSingle', segment: number | null = value): ThrowInput {
  return { segment, ring, value, label: String(value) }
}

describe('createX01Game', () => {
  it('initializes each player at the starting score with no turns', () => {
    const state = createX01Game({ startingScore: 501, doubleOut: true }, players)
    expect(state.playerStates).toEqual([
      { playerId: 'p1', remaining: 501, turns: [] },
      { playerId: 'p2', remaining: 501, turns: [] },
    ])
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.currentTurnThrows).toEqual([])
    expect(state.winnerId).toBeNull()
  })
})

describe('applyThrow', () => {
  it('accumulates darts within a turn without committing to remaining', () => {
    let state = createX01Game({ startingScore: 501, doubleOut: true }, players)
    state = applyThrow(state, throwOf(60, 'treble', 20))
    expect(state.currentTurnThrows).toHaveLength(1)
    expect(state.playerStates[0].remaining).toBe(501) // not committed yet
    expect(liveRemaining(state)).toBe(441) // but live display reflects it
  })

  it('commits remaining and advances to the next player after 3 darts', () => {
    let state = createX01Game({ startingScore: 501, doubleOut: true }, players)
    state = applyThrow(state, throwOf(20))
    state = applyThrow(state, throwOf(20))
    state = applyThrow(state, throwOf(20))

    expect(state.playerStates[0].remaining).toBe(441)
    expect(state.playerStates[0].turns).toHaveLength(1)
    expect(state.playerStates[0].turns[0].bust).toBe(false)
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.currentTurnThrows).toEqual([])
  })

  it('busts when the running total goes negative, rolling back the whole turn', () => {
    let state = createX01Game({ startingScore: 20, doubleOut: true }, players)
    state = applyThrow(state, throwOf(60, 'treble', 20)) // 20 - 60 < 0

    expect(state.playerStates[0].remaining).toBe(20) // rolled back
    expect(state.playerStates[0].turns[0].bust).toBe(true)
    expect(state.currentPlayerIndex).toBe(1)
  })

  it('busts when reaching exactly 1 with double-out enabled', () => {
    let state = createX01Game({ startingScore: 21, doubleOut: true }, players)
    state = applyThrow(state, throwOf(20)) // 21 - 20 = 1

    expect(state.playerStates[0].remaining).toBe(21)
    expect(state.playerStates[0].turns[0].bust).toBe(true)
  })

  it('busts when reaching exactly 0 without finishing on a double (double-out enabled)', () => {
    let state = createX01Game({ startingScore: 20, doubleOut: true }, players)
    state = applyThrow(state, throwOf(20, 'innerSingle', 20)) // single 20, not a double

    expect(state.playerStates[0].remaining).toBe(20)
    expect(state.playerStates[0].turns[0].bust).toBe(true)
    expect(state.winnerId).toBeNull()
  })

  it('wins when finishing on a double with double-out enabled', () => {
    let state = createX01Game({ startingScore: 40, doubleOut: true }, players)
    state = applyThrow(state, throwOf(40, 'double', 20))

    expect(state.playerStates[0].remaining).toBe(0)
    expect(state.winnerId).toBe('p1')
  })

  it('wins when finishing on the bullseye with double-out enabled', () => {
    let state = createX01Game({ startingScore: 50, doubleOut: true }, players)
    state = applyThrow(state, throwOf(50, 'bullseye', null))

    expect(state.winnerId).toBe('p1')
  })

  it('does not treat the outer bull (25) as a double finish', () => {
    let state = createX01Game({ startingScore: 25, doubleOut: true }, players)
    state = applyThrow(state, throwOf(25, 'outerBull', null))

    expect(state.winnerId).toBeNull()
    expect(state.playerStates[0].turns[0].bust).toBe(true)
  })

  it('wins on a plain single when double-out is disabled (straight out)', () => {
    let state = createX01Game({ startingScore: 20, doubleOut: false }, players)
    state = applyThrow(state, throwOf(20, 'innerSingle', 20))

    expect(state.winnerId).toBe('p1')
    expect(state.playerStates[0].remaining).toBe(0)
  })

  it('can win on the first or second dart of a turn, ending it early', () => {
    let state = createX01Game({ startingScore: 40, doubleOut: true }, players)
    state = applyThrow(state, throwOf(40, 'double', 20))

    expect(state.currentTurnThrows).toEqual([])
    expect(state.playerStates[0].turns).toHaveLength(1)
    expect(state.playerStates[0].turns[0].throws).toHaveLength(1)
  })

  it('ignores further throws once the game is won', () => {
    let state = createX01Game({ startingScore: 40, doubleOut: true }, players)
    state = applyThrow(state, throwOf(40, 'double', 20))
    const afterWin = state
    state = applyThrow(state, throwOf(20))

    expect(state).toEqual(afterWin)
  })
})

describe('undoLastThrow', () => {
  it('removes the most recent dart from the in-progress turn', () => {
    let state = createX01Game({ startingScore: 501, doubleOut: true }, players)
    state = applyThrow(state, throwOf(20))
    state = applyThrow(state, throwOf(5))
    state = undoLastThrow(state)

    expect(state.currentTurnThrows).toHaveLength(1)
    expect(state.currentTurnThrows[0].value).toBe(20)
  })

  it('is a no-op when there are no darts to undo', () => {
    const state = createX01Game({ startingScore: 501, doubleOut: true }, players)
    expect(undoLastThrow(state)).toEqual(state)
  })
})
