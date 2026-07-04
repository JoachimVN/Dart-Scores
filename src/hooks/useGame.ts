import { useCallback, useEffect, useRef, useState } from 'react'
import { applyThrow, createX01Game, undoLastThrow, type ThrowInput } from '../game/x01/x01Engine'
import type { X01Config } from '../game/x01/x01Types'
import type { GameState, Player } from '../game/types'
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

export function useGame() {
  const [game, setGame] = useState<GameState | null>(() => loadActiveGame())

  const startGame = useCallback((config: X01Config, players: Player[]) => {
    const next = buildGameState(config, players)
    setGame(next)
    saveActiveGame(next)
  }, [])

  const throwDart = useCallback((throwInput: ThrowInput) => {
    setGame((current) => {
      if (!current || current.status === 'complete') return current
      const x01 = applyThrow(current.x01, throwInput)
      const next: GameState = {
        ...current,
        x01,
        status: x01.winnerId !== null ? 'complete' : 'in_progress',
        updatedAt: Date.now(),
      }
      saveActiveGame(next)
      return next
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
    setGame((current) => {
      if (!current) return current
      const next: GameState = { ...current, x01: undoLastThrow(current.x01), updatedAt: Date.now() }
      saveActiveGame(next)
      return next
    })
  }, [])

  const newGame = useCallback(() => {
    setGame(null)
    clearActiveGame()
  }, [])

  return { game, startGame, throwDart, undo, newGame }
}
