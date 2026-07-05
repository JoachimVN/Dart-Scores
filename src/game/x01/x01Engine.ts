import { generateId } from '../../shared/id'
import type { Player, Throw, Turn } from '../types'
import { mostRecentTurn } from '../turnUtils'
import type { X01Config, X01PlayerState, X01State } from './x01Types'

export function createX01Game(config: X01Config, players: Player[]): X01State {
  const playerStates: X01PlayerState[] = players.map((player) => ({
    playerId: player.id,
    remaining: config.startingScore,
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
 * Applies one dart throw to the current player's in-progress turn.
 *
 * Darts aren't committed to a player's `remaining` until the turn ends
 * (3 darts, a bust, or a win) - this makes bust rollback trivial, since
 * nothing was written to committed state yet.
 */
export function applyThrow(state: X01State, throwInput: ThrowInput): X01State {
  if (state.winnerId !== null) return state

  const currentPlayerState = state.playerStates[state.currentPlayerIndex]
  const dart: Throw = { id: generateId(), timestamp: Date.now(), ...throwInput }
  const turnThrows = [...state.currentTurnThrows, dart]

  const scoreBefore = currentPlayerState.remaining
  const scoredThisTurn = turnThrows.reduce((sum, t) => sum + t.value, 0)
  const provisional = scoreBefore - scoredThisTurn

  let bust = false
  let win = false

  if (provisional < 0) {
    bust = true
  } else if (provisional === 1 && state.config.doubleOut) {
    // Can never check out from 1 when a double is required (minimum double is 2).
    bust = true
  } else if (provisional === 0) {
    if (!state.config.doubleOut) {
      win = true
    } else if (dart.ring === 'double' || dart.ring === 'bullseye') {
      // Bullseye (50) counts as a double for checkout purposes; outer bull (25) does not.
      win = true
    } else {
      bust = true
    }
  }

  const turnComplete = bust || win || turnThrows.length === 3
  if (!turnComplete) {
    return { ...state, currentTurnThrows: turnThrows }
  }

  const committedTurn: Turn = {
    id: generateId(),
    playerId: currentPlayerState.playerId,
    throws: turnThrows,
    scoreBefore,
    scoreAfter: bust ? scoreBefore : provisional,
    bust,
  }

  const playerStates = state.playerStates.map((playerState, index) =>
    index === state.currentPlayerIndex
      ? { ...playerState, remaining: committedTurn.scoreAfter, turns: [...playerState.turns, committedTurn] }
      : playerState,
  )

  if (win) {
    return {
      ...state,
      playerStates,
      currentTurnThrows: [],
      winnerId: currentPlayerState.playerId,
    }
  }

  return {
    ...state,
    playerStates,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.playerStates.length,
    currentTurnThrows: [],
  }
}

/**
 * Removes the most recent dart, e.g. to correct a misclick. If a turn is
 * still in progress, that's just the last of currentTurnThrows. But a turn's
 * final dart (3rd dart, a bust, or a win) commits immediately - there's no
 * lingering "in progress" state to pop from - so undoing *that* dart means
 * reopening the just-committed turn: drop it from the player's turns,
 * restore their score to what it was before the turn, hand the turn back to
 * them, and put its other darts back into the in-progress state.
 */
export function undoLastThrow(state: X01State): X01State {
  if (state.currentTurnThrows.length > 0) {
    return { ...state, currentTurnThrows: state.currentTurnThrows.slice(0, -1) }
  }

  const lastTurn = lastCompletedTurn(state)
  if (!lastTurn) return state

  const playerIndex = state.playerStates.findIndex((ps) => ps.playerId === lastTurn.playerId)
  if (playerIndex === -1) return state

  const playerStates = state.playerStates.map((playerState, index) =>
    index === playerIndex
      ? { ...playerState, remaining: lastTurn.scoreBefore, turns: playerState.turns.slice(0, -1) }
      : playerState,
  )

  return {
    ...state,
    playerStates,
    currentPlayerIndex: playerIndex,
    currentTurnThrows: lastTurn.throws.slice(0, -1),
    winnerId: null,
  }
}

/** The most recent dart thrown - whatever `undoLastThrow` would remove next, whether it's still in-progress or was the final dart of the last completed turn. */
export function lastThrow(state: X01State): Throw | null {
  if (state.currentTurnThrows.length > 0) return state.currentTurnThrows.at(-1)!
  return lastCompletedTurn(state)?.throws.at(-1) ?? null
}

/** The current player's remaining score including darts thrown so far this turn (for live display). */
export function liveRemaining(state: X01State): number {
  const currentPlayerState = state.playerStates[state.currentPlayerIndex]
  const scoredThisTurn = state.currentTurnThrows.reduce((sum, t) => sum + t.value, 0)
  return currentPlayerState.remaining - scoredThisTurn
}

/** The most recently completed turn across all players, or null if none has finished yet. */
export function lastCompletedTurn(state: X01State): Turn | null {
  return mostRecentTurn(state.playerStates)
}
