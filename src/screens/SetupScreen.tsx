import { useState } from 'react'
import type { X01Config } from '../game/x01/x01Types'
import type { Player } from '../game/types'
import { listPlayers, removePlayer, upsertPlayer } from '../players/playerRepository'
import { generateId } from '../shared/id'

interface SetupScreenProps {
  onStart: (config: X01Config, players: Player[]) => void
}

interface RosterRowProps {
  name: string
  onMove: () => void
  onDelete?: () => void
}

/** A name that moves the person to the other list when clicked (hover/focus signals it's clickable). */
function RosterRow({ name, onMove, onDelete }: RosterRowProps) {
  return (
    <li
      className="roster-row"
      role="button"
      tabIndex={0}
      onClick={onMove}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onMove()
        }
      }}
    >
      <span>{name}</span>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label={`Delete ${name}`}
        >
          Delete
        </button>
      )}
    </li>
  )
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [allUsers, setAllUsers] = useState<Player[]>(() => listPlayers())
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [newUserName, setNewUserName] = useState('')

  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)

  const availableUsers = allUsers.filter((u) => !selectedIds.includes(u.id))
  const players = selectedIds.map((id) => allUsers.find((u) => u.id === id)).filter((p): p is Player => Boolean(p))

  function addUser(event: React.FormEvent) {
    event.preventDefault()
    const name = newUserName.trim()
    if (!name) return
    const user: Player = { id: generateId(), name }
    upsertPlayer(user)
    setAllUsers((prev) => [...prev, user])
    setNewUserName('')
  }

  function deleteUser(id: string, name: string) {
    if (!window.confirm(`Remove "${name}" from your saved users? This can't be undone.`)) return
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (players.length === 0) return
    onStart({ startingScore, doubleOut }, players)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'grid',
        // fr units, not percentages: percentage flex/grid tracks don't
        // account for `gap`, so 25%+25%+50%+gaps overflowed past 100% and
        // pushed the settings column past the true halfway point. 1fr 1fr 2fr
        // divides the space left over *after* gaps, so it stays exact.
        gridTemplateColumns: '1fr 1fr 2fr',
        width: '100%',
        gap: 16,
      }}
    >
      <section className="roster-panel" style={{ minWidth: 0 }}>
        <h2>Users</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {availableUsers.length === 0 && <li style={{ color: 'var(--border)' }}>No saved users yet.</li>}
          {availableUsers.map((user) => (
            <RosterRow
              key={user.id}
              name={user.name}
              onMove={() => addToGame(user.id)}
              onDelete={() => deleteUser(user.id, user.name)}
            />
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="New user name"
            style={{ minWidth: 0, flex: 1 }}
          />
          <button type="button" onClick={addUser}>
            Add
          </button>
        </div>
      </section>

      <section className="roster-panel" style={{ minWidth: 0 }}>
        <h2>Players ({players.length})</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.length === 0 && (
            <li style={{ color: 'var(--border)' }}>Click a user to add them here.</li>
          )}
          {players.map((player) => (
            <RosterRow key={player.id} name={player.name} onMove={() => removeFromGame(player.id)} />
          ))}
        </ul>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        <h2>Game Settings</h2>

        <fieldset style={{ display: 'flex', gap: 16, border: 'none', padding: 0 }}>
          <legend>Starting score</legend>
          <label>
            <input
              type="radio"
              name="startingScore"
              checked={startingScore === 501}
              onChange={() => setStartingScore(501)}
            />{' '}
            501
          </label>
          <label>
            <input
              type="radio"
              name="startingScore"
              checked={startingScore === 301}
              onChange={() => setStartingScore(301)}
            />{' '}
            301
          </label>
        </fieldset>

        <label>
          <input type="checkbox" checked={doubleOut} onChange={(e) => setDoubleOut(e.target.checked)} /> Double out
        </label>

        <button type="submit" disabled={players.length === 0}>
          Start Game
        </button>
      </div>
    </form>
  )
}
