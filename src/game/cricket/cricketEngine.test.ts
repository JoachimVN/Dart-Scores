import { describe, expect, it } from 'vitest'
import type { Player } from '../types'
import {
  applyThrow,
  createCricketGame,
  lastThrow,
  liveMarksAndPoints,
  undoLastThrow,
  type ThrowInput,
} from './cricketEngine'
import type { CricketState } from './cricketTypes'

const players: Player[] = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

function hit(segment: number | null, ring: ThrowInput['ring']): ThrowInput {
  return { segment, ring, value: 0, label: ring }
}

const single = (n: number) => hit(n, 'innerSingle')
const double = (n: number) => hit(n, 'double')
const treble = (n: number) => hit(n, 'treble')
const outerBull = () => hit(null, 'outerBull')
const bullseye = () => hit(null, 'bullseye')
const miss = () => hit(null, 'miss')
const offNumberTreble = () => hit(5, 'treble') // segment 5 isn't a cricket number

/** p1 closes 20,19,18,17,16,15 across two turns, with p2 passing both turns in between - a shared setup for the win/undo tests below. */
function closeFirstSixNumbers(state: CricketState): CricketState {
  state = applyThrow(state, treble(20))
  state = applyThrow(state, treble(19))
  state = applyThrow(state, treble(18)) // p1 turn 1 -> p2
  state = applyThrow(state, miss())
  state = applyThrow(state, miss())
  state = applyThrow(state, miss()) // p2 passes -> p1
  state = applyThrow(state, treble(17))
  state = applyThrow(state, treble(16))
  state = applyThrow(state, treble(15)) // p1 turn 3 -> p2
  state = applyThrow(state, miss())
  state = applyThrow(state, miss())
  state = applyThrow(state, miss()) // p2 passes -> p1
  return state
}

describe('createCricketGame', () => {
  it('initializes each player with zeroed marks/points and no turns', () => {
    const state = createCricketGame(players)
    const zeroMarks = { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 }
    expect(state.playerStates).toEqual([
      { playerId: 'p1', marks: zeroMarks, points: 0, turns: [] },
      { playerId: 'p2', marks: zeroMarks, points: 0, turns: [] },
    ])
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.currentTurnThrows).toEqual([])
    expect(state.winnerId).toBeNull()
  })
})

describe('applyThrow', () => {
  it('accumulates darts within a turn without committing marks', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    expect(state.currentTurnThrows).toHaveLength(1)
    expect(state.playerStates[0].marks[20]).toBe(0) // not committed yet
    expect(liveMarksAndPoints(state).marks[20]).toBe(3) // but live display reflects it
  })

  it('commits marks and advances to the next player after 3 darts', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, single(20))
    state = applyThrow(state, single(19))
    state = applyThrow(state, single(18))

    expect(state.playerStates[0].marks).toMatchObject({ 20: 1, 19: 1, 18: 1 })
    expect(state.playerStates[0].turns).toHaveLength(1)
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.currentTurnThrows).toEqual([])
  })

  it('closes a number exactly at 3 marks', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    expect(state.playerStates[0].marks[20]).toBe(0) // still in-progress
    expect(liveMarksAndPoints(state).marks[20]).toBe(3)
    expect(liveMarksAndPoints(state).points).toBe(0) // exactly 3, no overflow
  })

  it('scores overflow points on a closed number while an opponent has not closed it', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20)) // closes 20 for p1
    state = applyThrow(state, single(20)) // 1 more mark -> overflow, p2 hasn't closed 20
    state = applyThrow(state, miss())

    expect(state.playerStates[0].marks[20]).toBe(3)
    expect(state.playerStates[0].points).toBe(20)
  })

  it('handles closing and scoring overflow on the very same dart', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, double(20)) // 2 marks on 20
    state = applyThrow(state, treble(20)) // 1 mark closes, 2 marks' worth overflow -> 40 points
    state = applyThrow(state, miss())

    expect(state.playerStates[0].marks[20]).toBe(3)
    expect(state.playerStates[0].points).toBe(40)
  })

  it('scores nothing once a number is dead (every other player has closed it too)', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, miss())
    state = applyThrow(state, miss()) // p1 closes 20 -> p2
    state = applyThrow(state, treble(20))
    state = applyThrow(state, miss())
    state = applyThrow(state, miss()) // p2 closes 20 too (now dead) -> p1
    state = applyThrow(state, single(20)) // dead - scores nothing
    state = applyThrow(state, miss())
    state = applyThrow(state, miss())

    expect(state.playerStates[0].points).toBe(0)
  })

  it('marks the outer bull as 1 mark and the bullseye as 2 marks', () => {
    let outerState = createCricketGame(players)
    outerState = applyThrow(outerState, outerBull())
    expect(liveMarksAndPoints(outerState).marks[25]).toBe(1)

    let bullseyeState = createCricketGame(players)
    bullseyeState = applyThrow(bullseyeState, bullseye())
    expect(liveMarksAndPoints(bullseyeState).marks[25]).toBe(2)
  })

  it('treats a hit on a non-cricket-number segment as a miss that still consumes a dart', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, offNumberTreble())
    state = applyThrow(state, miss())
    state = applyThrow(state, miss())

    expect(state.playerStates[0].points).toBe(0)
    expect(state.playerStates[0].marks).toMatchObject({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 })
    expect(state.currentPlayerIndex).toBe(1)
  })

  it('wins mid-turn (before the 3rd dart) when closing the last number with points already tied', () => {
    let state = createCricketGame(players)
    state = closeFirstSixNumbers(state)
    state = applyThrow(state, bullseye()) // 2 marks on bull
    expect(state.winnerId).toBeNull()
    state = applyThrow(state, outerBull()) // closes bull (3rd mark) - points tied 0-0
    expect(state.winnerId).toBe('p1')
    expect(state.currentTurnThrows).toEqual([]) // ended after the 2nd dart, not the 3rd
    expect(state.playerStates[0].turns.at(-1)?.throws).toHaveLength(2)
  })

  it('does not win by closing everything while behind on points, but can catch up and win later, mid-turn', () => {
    let state = createCricketGame(players)
    // p1 closes 20, 19, 18
    state = applyThrow(state, treble(20))
    state = applyThrow(state, treble(19))
    state = applyThrow(state, treble(18))
    // p2 closes 17, then overflows it for 51 points
    state = applyThrow(state, treble(17))
    state = applyThrow(state, treble(17))
    state = applyThrow(state, miss())
    expect(state.playerStates[1].points).toBe(51)
    // p1 closes 17, 16, 15
    state = applyThrow(state, treble(17))
    state = applyThrow(state, treble(16))
    state = applyThrow(state, treble(15))
    // p2 passes
    state = applyThrow(state, miss())
    state = applyThrow(state, miss())
    state = applyThrow(state, miss())
    // p1 closes the bull (all 7 numbers closed now) but is still behind 0-51 - no win yet
    state = applyThrow(state, outerBull())
    state = applyThrow(state, outerBull())
    state = applyThrow(state, outerBull())
    expect(state.winnerId).toBeNull()
    expect(state.currentPlayerIndex).toBe(1)
    // p2 passes again
    state = applyThrow(state, miss())
    state = applyThrow(state, miss())
    state = applyThrow(state, miss())
    // p1's first dart of a fresh turn overflows on the already-closed 20, catching up and winning immediately
    state = applyThrow(state, treble(20))
    expect(state.playerStates[0].points).toBe(60)
    expect(state.winnerId).toBe('p1')
    expect(state.playerStates[0].turns.at(-1)?.throws).toHaveLength(1) // won on the very first dart
  })

  it('ignores further throws once the game is won', () => {
    let state = createCricketGame(players)
    state = closeFirstSixNumbers(state)
    state = applyThrow(state, outerBull())
    state = applyThrow(state, outerBull())
    state = applyThrow(state, outerBull())
    const afterWin = state
    state = applyThrow(state, single(20))
    expect(state).toEqual(afterWin)
  })
})

describe('undoLastThrow', () => {
  it('removes the most recent dart from the in-progress turn', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, single(19))
    state = undoLastThrow(state)

    expect(state.currentTurnThrows).toHaveLength(1)
    expect(state.currentTurnThrows[0].ring).toBe('treble')
  })

  it('is a no-op when there are no darts to undo', () => {
    const state = createCricketGame(players)
    expect(undoLastThrow(state)).toEqual(state)
  })

  it('reopens a just-committed 3-dart turn, restoring marks/points and putting the first 2 darts back in progress', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, single(20)) // overflow: 20 points
    state = applyThrow(state, miss()) // commits, advances to p2

    state = undoLastThrow(state)

    expect(state.currentPlayerIndex).toBe(0)
    expect(state.playerStates[0].marks[20]).toBe(0)
    expect(state.playerStates[0].points).toBe(0)
    expect(state.playerStates[0].turns).toHaveLength(0)
    expect(state.currentTurnThrows).toHaveLength(2)
  })

  it('reopens a just-committed winning turn and clears winnerId', () => {
    let state = createCricketGame(players)
    state = closeFirstSixNumbers(state)
    state = applyThrow(state, outerBull())
    state = applyThrow(state, outerBull())
    state = applyThrow(state, outerBull())
    expect(state.winnerId).toBe('p1')

    state = undoLastThrow(state)

    expect(state.winnerId).toBeNull()
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.playerStates[0].marks[25]).toBe(0) // restored to before the whole winning turn started
    expect(state.currentTurnThrows).toHaveLength(2) // the turn's first 2 darts put back in progress
  })

  it('supports chaining: reopen a turn, then undo again to pop from the restored in-progress darts', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, single(19))
    state = applyThrow(state, single(18)) // commits, advances to p2

    state = undoLastThrow(state) // reopen: currentTurnThrows = [treble20, single19]
    state = undoLastThrow(state) // normal pop: currentTurnThrows = [treble20]

    expect(state.currentTurnThrows).toHaveLength(1)
    expect(state.playerStates[0].turns).toHaveLength(0)
  })

  it("reopens the correct player's turn in a multi-player game", () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, treble(19))
    state = applyThrow(state, treble(18)) // p1's turn commits, advances to p2

    state = undoLastThrow(state)

    expect(state.currentPlayerIndex).toBe(0)
    expect(state.playerStates[0].marks[20]).toBe(0)
    expect(state.playerStates[1].marks).toMatchObject({ 20: 0, 19: 0, 18: 0 }) // untouched
  })
})

describe('lastThrow', () => {
  it('returns null when no darts have been thrown', () => {
    const state = createCricketGame(players)
    expect(lastThrow(state)).toBeNull()
  })

  it('returns the last dart of the in-progress turn', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, single(19))

    expect(lastThrow(state)?.ring).toBe('innerSingle')
  })

  it('returns the last dart of the last completed turn once the in-progress turn is empty', () => {
    let state = createCricketGame(players)
    state = applyThrow(state, treble(20))
    state = applyThrow(state, treble(19))
    state = applyThrow(state, treble(18)) // commits p1's turn, advances to p2

    expect(lastThrow(state)?.segment).toBe(18)
  })
})
