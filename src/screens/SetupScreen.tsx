import { useState } from 'react'
import type { X01Config } from '../game/x01/x01Types'
import type { Player } from '../game/types'
import { listPlayers, upsertPlayer } from '../players/playerRepository'
import { generateId } from '../shared/id'

interface SetupScreenProps {
  onStart: (config: X01Config, players: Player[]) => void
}

function makeDraftPlayer(index: number): Player {
  return { id: generateId(), name: `Player ${index}` }
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = listPlayers()
    return saved.length > 0 ? saved : [makeDraftPlayer(1)]
  })
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)

  function updatePlayerName(id: string, name: string) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, makeDraftPlayer(prev.length + 1)])
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (players.length === 0) return

    const finalized = players.map((p) => ({ ...p, name: p.name.trim() || p.name }))
    finalized.forEach(upsertPlayer)
    onStart({ startingScore, doubleOut }, finalized)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Dart Scores</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.map((player, index) => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {`Player ${index + 1} name`}
              <input value={player.name} onChange={(e) => updatePlayerName(player.id, e.target.value)} />
            </label>
            <button
              type="button"
              onClick={() => removePlayer(player.id)}
              disabled={players.length <= 1}
              aria-label={`Remove ${player.name}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addPlayer}>
        Add player
      </button>

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

      <button type="submit">Start Game</button>
    </form>
  )
}
