import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyThrow as cricketApplyThrow,
  createCricketGame,
  endTurn as cricketEndTurn,
  lastThrow as cricketLastThrow,
  undoLastThrow as cricketUndoLastThrow,
} from '../game/cricket/cricketEngine'
import {
  applyThrow as x01ApplyThrow,
  createX01Game,
  endTurn as x01EndTurn,
  lastThrow as x01LastThrow,
  undoLastThrow as x01UndoLastThrow,
} from '../game/x01/x01Engine'
import type { ThrowInput } from '../game/x01/x01Engine'
import type { GameState, NewGameParams, Throw } from '../game/types'
import { getSettings } from '../settings/settingsRepository'
import { generateId } from '../shared/id'
import { clearActiveGame, loadActiveGame, saveActiveGame } from '../storage/gameRepository'
import { buildGameSummary } from '../stats/buildGameSummary'
import { appendGameHistory } from '../stats/statsRepository'

function buildGameState(params: NewGameParams): GameState {
  const now = Date.now()
  const base = { id: generateId(), status: 'in_progress' as const, players: params.players, createdAt: now, updatedAt: now }

  if (params.mode === 'x01') {
    return { ...base, mode: 'x01', x01: createX01Game(params.config, params.players) }
  }
  return { ...base, mode: 'cricket', cricket: createCricketGame(params.players, params.config) }
}

/** Applies one dart to whichever mode's engine the game is using, and recomputes status from its winnerId. */
function applyThrowToGame(game: GameState, throwInput: ThrowInput, manualTurnEnd: boolean): GameState {
  if (game.mode === 'x01') {
    const x01 = x01ApplyThrow(game.x01, throwInput, { manualTurnEnd })
    return { ...game, x01, status: x01.winnerId === null ? 'in_progress' : 'complete' }
  }
  const cricket = cricketApplyThrow(game.cricket, throwInput, { manualTurnEnd })
  return { ...game, cricket, status: cricket.winnerId === null ? 'in_progress' : 'complete' }
}

/** Commits a held (pending) turn, if any - returns the same game object when there's nothing to commit. */
function endTurnOfGame(game: GameState): GameState {
  if (game.mode === 'x01') {
    const x01 = x01EndTurn(game.x01)
    return x01 === game.x01 ? game : { ...game, x01, status: x01.winnerId === null ? 'in_progress' : 'complete' }
  }
  const cricket = cricketEndTurn(game.cricket)
  return cricket === game.cricket ? game : { ...game, cricket, status: cricket.winnerId === null ? 'in_progress' : 'complete' }
}

function undoGame(game: GameState): GameState {
  if (game.mode === 'x01') {
    const x01 = x01UndoLastThrow(game.x01)
    return { ...game, x01, status: x01.winnerId === null ? 'in_progress' : 'complete' }
  }
  const cricket = cricketUndoLastThrow(game.cricket)
  return { ...game, cricket, status: cricket.winnerId === null ? 'in_progress' : 'complete' }
}

function lastThrowOfGame(game: GameState): Throw | null {
  return game.mode === 'x01' ? x01LastThrow(game.x01) : cricketLastThrow(game.cricket)
}

function toThrowInput(dart: Throw): ThrowInput {
  const { id: _id, timestamp: _timestamp, ...throwInput } = dart
  return throwInput
}

interface GameSession {
  game: GameState | null
  /** Darts popped by Undo, in replay order (last undone = last in the array) - cleared by any new throw, since that invalidates the redo history. */
  redoStack: ThrowInput[]
}

function initialSession(): GameSession {
  return { game: loadActiveGame(), redoStack: [] }
}

export function useGame() {
  const [session, setSession] = useState<GameSession>(initialSession)
  const { game, redoStack } = session

  const startGame = useCallback((params: NewGameParams) => {
    const next = buildGameState(params)
    saveActiveGame(next)
    setSession({ game: next, redoStack: [] })
  }, [])

  const throwDart = useCallback((throwInput: ThrowInput) => {
    setSession((current) => {
      if (!current.game || current.game.status === 'complete') return current
      // Read the setting fresh per throw (not captured at mount) so toggling
      // it mid-game applies to the very next dart.
      const manualTurnEnd = getSettings().requireTurnConfirmation
      const next: GameState = { ...applyThrowToGame(current.game, throwInput, manualTurnEnd), updatedAt: Date.now() }
      saveActiveGame(next)
      return { game: next, redoStack: [] }
    })
  }, [])

  const endTurn = useCallback(() => {
    setSession((current) => {
      if (!current.game || current.game.status === 'complete') return current
      const ended = endTurnOfGame(current.game)
      if (ended === current.game) return current
      const next: GameState = { ...ended, updatedAt: Date.now() }
      saveActiveGame(next)
      // Committing the held turn invalidates redo history, same as a new throw.
      return { game: next, redoStack: [] }
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
      const removed = lastThrowOfGame(current.game)
      // Reopening a winning turn (see undoLastThrow) clears winnerId, so
      // status must be recomputed - otherwise it'd stay stuck on 'complete'.
      const next: GameState = { ...undoGame(current.game), updatedAt: Date.now() }
      saveActiveGame(next)
      const redoStack = removed ? [...current.redoStack, toThrowInput(removed)] : current.redoStack
      return { game: next, redoStack }
    })
  }, [])

  const redo = useCallback(() => {
    setSession((current) => {
      if (!current.game || current.redoStack.length === 0) return current
      const throwInput = current.redoStack.at(-1)!
      const manualTurnEnd = getSettings().requireTurnConfirmation
      const next: GameState = { ...applyThrowToGame(current.game, throwInput, manualTurnEnd), updatedAt: Date.now() }
      saveActiveGame(next)
      return { game: next, redoStack: current.redoStack.slice(0, -1) }
    })
  }, [])

  const newGame = useCallback(() => {
    clearActiveGame()
    setSession({ game: null, redoStack: [] })
  }, [])

  return {
    game,
    startGame,
    throwDart,
    endTurn,
    undo,
    redo,
    newGame,
    canRedo: redoStack.length > 0,
  }
}
