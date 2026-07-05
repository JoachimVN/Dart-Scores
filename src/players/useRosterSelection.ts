import { useState } from 'react'
import type { Player } from '../game/types'
import { generateId } from '../shared/id'
import { listPlayers, removePlayer, upsertPlayer } from './playerRepository'

/** Shared "pick players for this game/tournament from the saved roster" state, used by SetupScreen and TournamentSetupScreen. */
export function useRosterSelection(initialPlayers?: Player[]) {
  const [allUsers, setAllUsers] = useState<Player[]>(() => listPlayers())
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialPlayers?.map((p) => p.id) ?? [])
  const [newUserName, setNewUserName] = useState('')

  const availableUsers = allUsers.filter((u) => !selectedIds.includes(u.id))
  const players = selectedIds.map((id) => allUsers.find((u) => u.id === id)).filter((p): p is Player => Boolean(p))

  function addUser() {
    const name = newUserName.trim()
    if (!name) return
    if (allUsers.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      globalThis.alert(`A user named "${name}" already exists.`)
      return
    }
    const user: Player = { id: generateId(), name }
    upsertPlayer(user)
    setAllUsers((prev) => [...prev, user])
    setNewUserName('')
  }

  function deleteUser(id: string, name: string) {
    if (!globalThis.confirm(`Remove "${name}" from your saved users? This can't be undone.`)) return
    removePlayer(id)
    setAllUsers((prev) => prev.filter((u) => u.id !== id))
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  function addToGame(id: string) {
    setSelectedIds((prev) => [...prev, id])
  }

  function removeFromGame(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  return {
    availableUsers,
    players,
    newUserName,
    setNewUserName,
    addUser,
    deleteUser,
    addToGame,
    removeFromGame,
  }
}
