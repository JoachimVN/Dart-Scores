import { generateId } from '../../shared/id'
import type { Player, Throw, Turn } from '../types'
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

/** Removes the most recent dart from the in-progress turn, e.g. to correct a misclick. */
export function undoLastThrow(state: X01State): X01State {
  if (state.currentTurnThrows.length === 0) return state
  return { ...state, currentTurnThrows: state.currentTurnThrows.slice(0, -1) }
}

/** The current player's remaining score including darts thrown so far this turn (for live display). */
export function liveRemaining(state: X01State): number {
  const currentPlayerState = state.playerStates[state.currentPlayerIndex]
  const scoredThisTurn = state.currentTurnThrows.reduce((sum, t) => sum + t.value, 0)
  return currentPlayerState.remaining - scoredThisTurn
}

/** The most recently completed turn across all players, or null if none has finished yet. */
export function lastCompletedTurn(state: X01State): Turn | null {
  let latest: Turn | null = null
  let latestTimestamp = -Infinity

  for (const playerState of state.playerStates) {
    const turn = playerState.turns.at(-1)
    const turnTimestamp = turn?.throws.at(-1)?.timestamp ?? -Infinity
    if (turn && turnTimestamp > latestTimestamp) {
      latest = turn
      latestTimestamp = turnTimestamp
    }
  }

  return latest
}
