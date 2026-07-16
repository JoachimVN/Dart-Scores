import { generateId } from '../../shared/id'
import type { Player, Throw } from '../types'
import { mostRecentTurn } from '../turnUtils'
import {
  standardCricketConfig,
  type CricketConfig,
  type CricketMarks,
  type CricketPlayerState,
  type CricketState,
  type CricketTarget,
  type CricketTurn,
} from './cricketTypes'

function emptyMarks(targets: CricketTarget[]): CricketMarks {
  return Object.fromEntries(targets.map((target) => [target, 0])) as CricketMarks
}

export function createCricketGame(players: Player[], config: CricketConfig = standardCricketConfig()): CricketState {
  const playerStates: CricketPlayerState[] = players.map((player) => ({
    playerId: player.id,
    marks: emptyMarks(config.targets),
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

export interface ApplyThrowOptions {
  /**
   * When true, a finished 3-dart turn is held uncommitted in
   * currentTurnThrows until endTurn confirms it, instead of auto-advancing
   * to the next player. A win always commits immediately regardless.
   */
  manualTurnEnd?: boolean
}

/** Every configured target that this physical dart can satisfy. */
export function cricketTargetOptions(dart: ThrowInput, targets: CricketTarget[]): CricketTarget[] {
  const options: CricketTarget[] = []
  if (dart.ring === 'bullseye' || dart.ring === 'outerBull') {
    if (targets.includes(25)) options.push(25)
    return options
  }
  if (dart.segment !== null && targets.includes(dart.segment)) options.push(dart.segment)
  if (dart.ring === 'double' && targets.includes('double')) options.push('double')
  if (dart.ring === 'treble' && targets.includes('triple')) options.push('triple')
  return options
}

function cricketHit(
  dart: ThrowInput,
  targets: CricketTarget[],
): { target: CricketTarget; marks: number; pointsPerMark: number } | null {
  const options = cricketTargetOptions(dart, targets)
  const target = dart.cricketTarget && options.includes(dart.cricketTarget) ? dart.cricketTarget : options[0]
  if (target === undefined) return null

  if (target === 'double' || target === 'triple') return { target, marks: 1, pointsPerMark: dart.value }
  if (target === 25) return { target, marks: dart.ring === 'bullseye' ? 2 : 1, pointsPerMark: 25 }
  if (dart.ring === 'treble') return { target, marks: 3, pointsPerMark: target }
  if (dart.ring === 'double') return { target, marks: 2, pointsPerMark: target }
  return { target, marks: 1, pointsPerMark: target }
}

/** A number is dead (scores nothing more for anyone) once every player except `forPlayerIndex` has closed it. */
function isDeadForOthers(playerStates: CricketPlayerState[], forPlayerIndex: number, target: CricketTarget): boolean {
  return playerStates.every((ps, i) => i === forPlayerIndex || ps.marks[target] === 3)
}

function isAllClosed(marks: CricketMarks, targets: CricketTarget[]): boolean {
  return targets.length > 0 && targets.every((target) => marks[target] === 3)
}

/**
 * Folds a sequence of darts onto a player's committed marks/points. Each
 * dart's marks split between closing its target (up to 3) and, if any marks
 * are left over, scoring the target's configured dart value per extra mark -
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
  targets: CricketTarget[],
): { marks: CricketMarks; points: number } {
  let marks = marksBefore
  let points = pointsBefore

  for (const dart of throws) {
    const hit = cricketHit(dart, targets)
    if (!hit) continue

    const currentCount = marks[hit.target]
    const toClose = Math.min(hit.marks, 3 - currentCount)
    const overflow = hit.marks - toClose
    const newCount = currentCount + toClose
    if (newCount !== currentCount) marks = { ...marks, [hit.target]: newCount }

    if (overflow > 0 && !isDeadForOthers(playerStates, playerIndex, hit.target)) {
      points += overflow * hit.pointsPerMark
    }
  }

  return { marks, points }
}

interface TurnOutcome {
  marks: CricketMarks
  points: number
  win: boolean
}

/** Folds a turn's darts onto the current player's committed marks/points and checks the win condition. */
function evaluateTurn(state: CricketState, turnThrows: Throw[]): TurnOutcome {
  const playerIndex = state.currentPlayerIndex
  const currentPlayerState = state.playerStates[playerIndex]
  const { marks, points } = foldCricketThrows(
    currentPlayerState.marks,
    currentPlayerState.points,
    turnThrows,
    state.playerStates,
    playerIndex,
    state.config.targets,
  )
  const opponentsPoints = state.playerStates.filter((_, i) => i !== playerIndex).map((ps) => ps.points)
  const win = isAllClosed(marks, state.config.targets) && points >= Math.max(0, ...opponentsPoints)
  return { marks, points, win }
}

/** Commits `turnThrows` as the current player's completed turn, then hands play to the next player (or declares the win). */
function commitTurn(state: CricketState, turnThrows: Throw[], { marks, points, win }: TurnOutcome): CricketState {
  const playerIndex = state.currentPlayerIndex
  const currentPlayerState = state.playerStates[playerIndex]

  const committedTurn: CricketTurn = {
    id: generateId(),
    playerId: currentPlayerState.playerId,
    throws: turnThrows,
    marksBefore: currentPlayerState.marks,
    marksAfter: marks,
    pointsBefore: currentPlayerState.points,
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
 * Applies one dart throw to the current player's in-progress turn.
 *
 * Mirrors x01Engine.applyThrow's shape: darts accumulate uncommitted in
 * currentTurnThrows, and marks/points are recomputed fresh from the
 * committed state each dart (not mutated incrementally) - so nothing is
 * written until the turn ends. Cricket has no bust; a turn only ends on a
 * win or the 3rd dart.
 */
export function applyThrow(state: CricketState, throwInput: ThrowInput, options: ApplyThrowOptions = {}): CricketState {
  if (state.winnerId !== null) return state
  // A held turn accepts no more darts - it must be confirmed via endTurn
  // (or shrunk by undo) first, even if manual turn end was toggled off since.
  if (isTurnPending(state)) return state

  const dart: Throw = { id: generateId(), timestamp: Date.now(), ...throwInput }
  const turnThrows = [...state.currentTurnThrows, dart]
  const outcome = evaluateTurn(state, turnThrows)

  const turnComplete = outcome.win || turnThrows.length === 3
  if (!turnComplete) {
    return { ...state, currentTurnThrows: turnThrows }
  }

  if (options.manualTurnEnd && !outcome.win) {
    return { ...state, currentTurnThrows: turnThrows }
  }

  return commitTurn(state, turnThrows, outcome)
}

/**
 * True when the in-progress turn has ended (3 darts) but hasn't been
 * committed - only possible in manual turn-end mode, where applyThrow holds
 * the finished turn for endTurn to confirm. Derived from the throws rather
 * than stored, so toggling the setting mid-game can't strand a flag.
 */
export function isTurnPending(state: CricketState): boolean {
  return state.currentTurnThrows.length === 3
}

/** Commits a held (pending) turn - see isTurnPending. No-op while the turn is still in progress. */
export function endTurn(state: CricketState): CricketState {
  if (!isTurnPending(state)) return state
  return commitTurn(state, state.currentTurnThrows, evaluateTurn(state, state.currentTurnThrows))
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
    state.config.targets,
  )
}

/** The most recently completed turn across all players, or null if none has finished yet. */
export function lastCompletedTurn(state: CricketState): CricketTurn | null {
  return mostRecentTurn(state.playerStates)
}
