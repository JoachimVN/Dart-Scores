import type { GameState } from '../game/types'
import { buildCricketGameSummary } from './buildCricketGameSummary'
import { buildX01GameSummary } from './buildX01GameSummary'
import type { GameSummary } from './types'

/** Builds a persistable summary from a just-completed game, for stats history - dispatches by mode. */
export function buildGameSummary(game: GameState): GameSummary {
  return game.mode === 'x01' ? buildX01GameSummary(game) : buildCricketGameSummary(game)
}
