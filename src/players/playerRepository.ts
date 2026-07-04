import { generateId } from '../shared/id'
import type { Player } from '../game/types'
import { loadRoot, saveRoot } from '../storage/storage'

export function listPlayers(): Player[] {
  return loadRoot().players
}

export function upsertPlayer(player: Player): void {
  const root = loadRoot()
  const index = root.players.findIndex((p) => p.id === player.id)
  const players =
    index === -1
      ? [...root.players, player]
      : root.players.map((p, i) => (i === index ? player : p))
  saveRoot({ ...root, players })
}

/** Returns the first stored player, creating a default local profile if none exists yet. */
export function getOrCreateDefaultPlayer(): Player {
  const [firstPlayer] = listPlayers()
  if (firstPlayer) return firstPlayer

  const player: Player = { id: generateId(), name: 'Player 1' }
  upsertPlayer(player)
  return player
}
