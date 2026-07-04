import type { GameState } from '../game/types'
import { loadRoot, saveRoot } from './storage'

export function loadActiveGame(): GameState | null {
  return loadRoot().activeGame
}

export function saveActiveGame(game: GameState): void {
  saveRoot({ ...loadRoot(), activeGame: game })
}

export function clearActiveGame(): void {
  saveRoot({ ...loadRoot(), activeGame: null })
}
