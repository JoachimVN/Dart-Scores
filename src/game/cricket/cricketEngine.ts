import { generateId } from '../../shared/id'
import type { Player, Throw } from '../types'
import { mostRecentTurn } from '../turnUtils'
import {
  standardCricketConfig,
  type CricketConfig,
  type CricketMarks,
  type CricketNumber,
  type CricketPlayerState,
  type CricketState,
  type CricketTurn,
} from './cricketTypes'

function emptyMarks(numbers: CricketNumber[]): CricketMarks {
  return Object.fromEntries(numbers.map((number) => [number, 0]))
}

export function createCricketGame(players: Player[], config: CricketConfig = standardCricketConfig()): CricketState {
  const playerStates: CricketPlayerState[] = players.map((player) => ({
    playerId: player.id,
    marks: emptyMarks(config.numbers),
    points: 0,
    turns: [],
  }))

  return {
    config,
    playerStates,
    currentPlayerIndex: 0,
    currentTurnThrows: [],
    winnerId: null,
  }
}

export type ThrowInput = Omit<Throw, 'id' | 'timestamp'>

/**
 * Which cricket number a dart hit, and how many marks it's worth. Only
 * 15-20 and the bull count for Cricket - everything else (segments 1-14, or
 * a miss) is a no-op that still consumes a dart of the turn. The bull marks
 * like a "double": outer bull is 1 mark, bullseye is 2.
 */
function cricketHit(dart: ThrowInput, numbers: CricketNumber[]): { number: CricketNumber; marks: number } | null {
  if (dart.ring === 'bullseye') return numbers.includes(25) ? { number: 25, marks: 2 } : null
  if (dart.ring === 'outerBull') return numbers.includes(25) ? { number: 25, marks: 1 } : null
  if (dart.segment === null || !numbers.includes(dart.segment)) return null

  const number = dart.segment as CricketNumber
  if (dart.ring === 'treble') return { number, marks: 3 }
  if (dart.ring === 'double') return { number, marks: 2 }
  return { number, marks: 1 } // innerSingle or outerSingle
}

/** A number is dead (scores nothing more for anyone) once every player except `forPlayerIndex` has closed it. */
function isDeadForOthers(playerStates: CricketPlayerState[], forPlayerIndex: number, number: CricketNumber): boolean {
  return playerStates.every((ps, i) => i === forPlayerIndex || ps.marks[number] === 3)
}

function isAllClosed(marks: CricketMarks, numbers: CricketNumber[]): boolean {
  return numbers.every((n) => marks[n] === 3)
}

/**
 * Folds a sequence of darts onto a player's committed marks/points. Each
 * dart's marks split between closing the number (up to 3) and, if any marks
 * are left over, scoring points equal to the number's value per extra mark -
 * but only while some other player hasn't closed that number yet. A single
 * dart can both close a number and score off it (e.g. 2 existing marks, then
 * a treble hits: 1 mark closes, 2 marks' worth of points score).
 */
function foldCricketThrows(
  marksBefore: CricketMarks,
  pointsBefore: number,
  throws: Throw[],
  playerStates: CricketPlayerState[],
  playerIndex: number,
  numbers: CricketNumber[],
): { marks: CricketMarks; points: number } {
  let marks = marksBefore
  let points = pointsBefore

  for (const dart of throws) {
    const hit = cricketHit(dart, numbers)
    if (!hit) continue

    const currentCount = marks[hit.number]
    const toClose = Math.min(hit.marks, 3 - currentCount)
    const overflow = hit.marks - toClose
    const newCount = currentCount + toClose
    if (newCount !== currentCount) marks = { ...marks, [hit.number]: newCount }

    if (overflow > 0 && !isDeadForOthers(playerStates, playerIndex, hit.number)) {
      points += overflow * hit.number
    }
  }

  return { marks, points }
}

/**
 * Applies one dart throw to the current player's in-progress turn.
 *
 * Mirrors x01Engine.applyThrow's shape: darts accumulate uncommitted in
 * currentTurnThrows, and marks/points are recomputed fresh from the
 * committed state each dart (not mutated incrementally) - so nothing is
 * written until the turn ends. Cricket has no bust; a turn only ends on a
 * win or the 3rd dart.
 */
export function applyThrow(state: CricketState, throwInput: ThrowInput): CricketState {
  if (state.winnerId !== null) return state

  const playerIndex = state.currentPlayerIndex
  const currentPlayerState = state.playerStates[playerIndex]
  const dart: Throw = { id: generateId(), timestamp: Date.now(), ...throwInput }
  const turnThrows = [...state.currentTurnThrows, dart]

  const marksBefore = currentPlayerState.marks
  const pointsBefore = currentPlayerState.points
  const { marks, points } = foldCricketThrows(
    marksBefore,
    pointsBefore,
    turnThrows,
    state.playerStates,
    playerIndex,
    state.config.numbers,
  )

  const opponentsPoints = state.playerStates.filter((_, i) => i !== playerIndex).map((ps) => ps.points)
  const win = isAllClosed(marks, state.config.numbers) && points >= Math.max(0, ...opponentsPoints)
  const turnComplete = win || turnThrows.length === 3

  if (!turnComplete) {
    return { ...state, currentTurnThrows: turnThrows }
  }

  const committedTurn: CricketTurn = {
    id: generateId(),
    playerId: currentPlayerState.playerId,
    throws: turnThrows,
    marksBefore,
    marksAfter: marks,
    pointsBefore,
    pointsAfter: points,
  }

  const playerStates = state.playerStates.map((ps, i) =>
    i === playerIndex ? { ...ps, marks, points, turns: [...ps.turns, committedTurn] } : ps,
  )

  if (win) {
    return { ...state, playerStates, currentTurnThrows: [], winnerId: currentPlayerState.playerId }
  }

  return {
    ...state,
    playerStates,
    currentPlayerIndex: (playerIndex + 1) % state.playerStates.length,
    currentTurnThrows: [],
  }
}

/**
 * Removes the most recent dart. Mirrors x01Engine.undoLastThrow: a turn
 * still in progress just pops its last dart, but a turn's final dart
 * commits immediately, so undoing that dart means reopening the
 * just-committed turn - drop it, restore marks/points to what they were
 * before the turn, hand the turn back, and put its other darts back in
 * progress.
 */
export function undoLastThrow(state: CricketState): CricketState {
  if (state.currentTurnThrows.length > 0) {
    return { ...state, currentTurnThrows: state.currentTurnThrows.slice(0, -1) }
  }

  const lastTurn = lastCompletedTurn(state)
  if (!lastTurn) return state

  const playerIndex = state.playerStates.findIndex((ps) => ps.playerId === lastTurn.playerId)
  if (playerIndex === -1) return state

  const playerStates = state.playerStates.map((ps, i) =>
    i === playerIndex
      ? { ...ps, marks: lastTurn.marksBefore, points: lastTurn.pointsBefore, turns: ps.turns.slice(0, -1) }
      : ps,
  )

  return {
    ...state,
    playerStates,
    currentPlayerIndex: playerIndex,
    currentTurnThrows: lastTurn.throws.slice(0, -1),
    winnerId: null,
  }
}

/** The most recent dart thrown - whatever `undoLastThrow` would remove next. */
export function lastThrow(state: CricketState): Throw | null {
  if (state.currentTurnThrows.length > 0) return state.currentTurnThrows.at(-1)!
  return lastCompletedTurn(state)?.throws.at(-1) ?? null
}

/** The current player's live marks/points including darts thrown so far this turn (for live display). */
export function liveMarksAndPoints(state: CricketState): { marks: CricketMarks; points: number } {
  const currentPlayerState = state.playerStates[state.currentPlayerIndex]
  return foldCricketThrows(
    currentPlayerState.marks,
    currentPlayerState.points,
    state.currentTurnThrows,
    state.playerStates,
    state.currentPlayerIndex,
    state.config.numbers,
  )
}

/** The most recently completed turn across all players, or null if none has finished yet. */
export function lastCompletedTurn(state: CricketState): CricketTurn | null {
  return mostRecentTurn(state.playerStates)
}
