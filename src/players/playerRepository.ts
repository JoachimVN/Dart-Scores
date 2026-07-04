import type { Player } from '../game/types'
import { loadRoot, saveRoot } from '../storage/storage'

/** The full saved local user roster (not who's playing any particular game). */
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

/** Permanently removes a user from the saved roster. */
export function removePlayer(id: string): void {
  const root = loadRoot()
  saveRoot({ ...root, players: root.players.filter((p) => p.id !== id) })
}
