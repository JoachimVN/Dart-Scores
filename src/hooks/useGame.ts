import { useCallback, useEffect, useRef, useState } from 'react'
import { applyThrow, createX01Game, lastThrow, undoLastThrow, type ThrowInput } from '../game/x01/x01Engine'
import type { X01Config } from '../game/x01/x01Types'
import type { GameState, Player, Throw } from '../game/types'
import { generateId } from '../shared/id'
import { clearActiveGame, loadActiveGame, saveActiveGame } from '../storage/gameRepository'
import { buildGameSummary } from '../stats/buildGameSummary'
import { appendGameHistory } from '../stats/statsRepository'

function buildGameState(config: X01Config, players: Player[]): GameState {
  const now = Date.now()
  return {
    id: generateId(),
    mode: 'x01',
    status: 'in_progress',
    players,
    createdAt: now,
    updatedAt: now,
    x01: createX01Game(config, players),
  }
}

function toThrowInput(dart: Throw): ThrowInput {
  const { id: _id, timestamp: _timestamp, ...throwInput } = dart
  return throwInput
}

interface GameSession {
  game: GameState | null
  /** Darts popped by Undo, in replay order (last undone = last in the array) - cleared by any new throw, since that invalidates the redo history. */
  redoStack: ThrowInput[]
  /** The dart most recently restored by Redo, if that was the last action - lets Dartboard draw its mark back (its original click position wasn't preserved through the undo). */
  lastRedoneThrow: Throw | null
}

function initialSession(): GameSession {
  return { game: loadActiveGame(), redoStack: [], lastRedoneThrow: null }
}

export function useGame() {
  const [session, setSession] = useState<GameSession>(initialSession)
  const { game, redoStack, lastRedoneThrow } = session

  const startGame = useCallback((config: X01Config, players: Player[]) => {
    const next = buildGameState(config, players)
    saveActiveGame(next)
    setSession({ game: next, redoStack: [], lastRedoneThrow: null })
  }, [])

  const throwDart = useCallback((throwInput: ThrowInput) => {
    setSession((current) => {
      if (!current.game || current.game.status === 'complete') return current
      const x01 = applyThrow(current.game.x01, throwInput)
      const next: GameState = {
        ...current.game,
        x01,
        status: x01.winnerId !== null ? 'complete' : 'in_progress',
        updatedAt: Date.now(),
      }
      saveActiveGame(next)
      return { game: next, redoStack: [], lastRedoneThrow: null }
    })
  }, [])

  // Record history in an effect, not inside the setGame updater above: React
  // StrictMode intentionally double-invokes updater functions in dev mode, and
  // unlike the idempotent saveActiveGame overwrite, appendGameHistory appends -
  // a double-invoke there would record every completed game twice. The ref
  // guard also protects against this same effect re-running for a game whose
  // completion was already recorded (e.g. a re-render with no real state change).
  const recordedGameIds = useRef(new Set<string>())
  useEffect(() => {
    if (game?.status === 'complete' && !recordedGameIds.current.has(game.id)) {
      recordedGameIds.current.add(game.id)
      appendGameHistory(buildGameSummary(game))
    }
  }, [game])

  const undo = useCallback(() => {
    setSession((current) => {
      if (!current.game) return current
      const removed = lastThrow(current.game.x01)
      const x01 = undoLastThrow(current.game.x01)
      // Reopening a winning turn (see undoLastThrow) clears winnerId, so
      // status must be recomputed - otherwise it'd stay stuck on 'complete'.
      const next: GameState = {
        ...current.game,
        x01,
        status: x01.winnerId !== null ? 'complete' : 'in_progress',
        updatedAt: Date.now(),
      }
      saveActiveGame(next)
      const redoStack = removed ? [...current.redoStack, toThrowInput(removed)] : current.redoStack
      return { game: next, redoStack, lastRedoneThrow: null }
    })
  }, [])

  const redo = useCallback(() => {
    setSession((current) => {
      if (!current.game || current.redoStack.length === 0) return current
      const throwInput = current.redoStack[current.redoStack.length - 1]
      const x01 = applyThrow(current.game.x01, throwInput)
      const next: GameState = {
        ...current.game,
        x01,
        status: x01.winnerId !== null ? 'complete' : 'in_progress',
        updatedAt: Date.now(),
      }
      saveActiveGame(next)
      return {
        game: next,
        redoStack: current.redoStack.slice(0, -1),
        lastRedoneThrow: lastThrow(x01),
      }
    })
  }, [])

  const newGame = useCallback(() => {
    clearActiveGame()
    setSession({ game: null, redoStack: [], lastRedoneThrow: null })
  }, [])

  return {
    game,
    startGame,
    throwDart,
    undo,
    redo,
    newGame,
    canRedo: redoStack.length > 0,
    lastRedoneThrow,
  }
}
