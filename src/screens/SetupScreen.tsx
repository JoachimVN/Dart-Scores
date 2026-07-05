import { useState } from 'react'
import type { X01Config } from '../game/x01/x01Types'
import type { Player } from '../game/types'
import { listPlayers, removePlayer, upsertPlayer } from '../players/playerRepository'
import { generateId } from '../shared/id'
import { Button } from '../components/ui/Button'
import { Panel, inputClass } from '../components/ui/Panel'

interface SetupScreenProps {
  onStart: (config: X01Config, players: Player[]) => void
  /** Pre-selects these into the Players list (e.g. a rematch after "New game"), instead of starting empty. */
  initialPlayers?: Player[]
}

interface RosterRowProps {
  name: string
  /** Tints the row with the accent to mark it as picked for the game. */
  selected?: boolean
  onMove: () => void
  onDelete?: () => void
}

/** A name that moves the person to the other list when clicked (hover/focus signals it's clickable). */
function RosterRow({ name, selected, onMove, onDelete }: RosterRowProps) {
  return (
    <li
      className={
        'flex cursor-pointer items-center justify-between gap-2 rounded-(--radius-md) border px-3 py-2.5 transition-colors ' +
        (selected
          ? 'border-accent/40 bg-accent-soft hover:border-accent/70'
          : 'border-line bg-card hover:bg-sunken focus-visible:bg-sunken')
      }
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
      <span className="truncate font-medium">{name}</span>
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label={`Delete ${name}`}
        >
          Delete
        </Button>
      )}
    </li>
  )
}

export function SetupScreen({ onStart, initialPlayers }: SetupScreenProps) {
  const [allUsers, setAllUsers] = useState<Player[]>(() => listPlayers())
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialPlayers?.map((p) => p.id) ?? [])
  const [newUserName, setNewUserName] = useState('')

  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)

  const availableUsers = allUsers.filter((u) => !selectedIds.includes(u.id))
  const players = selectedIds.map((id) => allUsers.find((u) => u.id === id)).filter((p): p is Player => Boolean(p))

  function addUser() {
    const name = newUserName.trim()
    if (!name) return
    if (allUsers.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      window.alert(`A user named "${name}" already exists.`)
      return
    }
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
      className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.5fr] lg:gap-6"
    >
      <Panel title="Users" className="min-w-0">
        <ul className="my-2 flex list-none flex-col gap-2 p-0">
          {availableUsers.length === 0 && <li className="text-ink-muted">No saved users yet.</li>}
          {availableUsers.map((user) => (
            <RosterRow
              key={user.id}
              name={user.name}
              onMove={() => addToGame(user.id)}
              onDelete={() => deleteUser(user.id, user.name)}
            />
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className={inputClass + ' min-w-0 flex-1'}
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            onKeyDown={(e) => {
              // Without this, Enter here bubbles up to the outer form and
              // triggers "Start Game" instead (the only submit button on the
              // page), rather than adding the user like clicking Add would.
              if (e.key === 'Enter') {
                e.preventDefault()
                addUser()
              }
            }}
            placeholder="New user name"
          />
          <Button onClick={addUser}>Add</Button>
        </div>
      </Panel>

      <Panel title={`Players (${players.length})`} className="min-w-0">
        <ul className="my-2 flex list-none flex-col gap-2 p-0">
          {players.length === 0 && <li className="text-ink-muted">Click a user to add them here.</li>}
          {players.map((player) => (
            <RosterRow key={player.id} name={player.name} selected onMove={() => removeFromGame(player.id)} />
          ))}
        </ul>
      </Panel>

      <Panel title="Game settings" className="flex min-w-0 flex-col gap-5">
        <fieldset className="m-0 border-none p-0">
          <legend className="mb-2 p-0 text-sm font-medium">Starting score</legend>
          {/* Segmented control on top of the same radio state. */}
          <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
            {([501, 301] as const).map((score) => (
              <button
                key={score}
                type="button"
                aria-pressed={startingScore === score}
                onClick={() => setStartingScore(score)}
                className={
                  'h-10 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-base font-semibold transition-colors ' +
                  (startingScore === score
                    ? 'bg-card text-ink shadow-sm'
                    : 'bg-transparent text-ink-muted hover:text-ink')
                }
              >
                {score}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-(--accent)"
            checked={doubleOut}
            onChange={(e) => setDoubleOut(e.target.checked)}
          />
          Double out
        </label>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={players.length === 0}>
          Start Game
        </Button>
      </Panel>
    </form>
  )
}
