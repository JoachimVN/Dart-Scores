import { useState } from 'react'
import type { X01Config } from '../game/x01/x01Types'
import type { Player } from '../game/types'
import { getOrCreateDefaultPlayer, upsertPlayer } from '../players/playerRepository'

interface SetupScreenProps {
  onStart: (config: X01Config, players: Player[]) => void
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [player] = useState<Player>(() => getOrCreateDefaultPlayer())
  const [playerName, setPlayerName] = useState(player.name)
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const updatedPlayer: Player = { ...player, name: playerName.trim() || player.name }
    upsertPlayer(updatedPlayer)
    onStart({ startingScore, doubleOut }, [updatedPlayer])
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Dart Scores</h1>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Player name
        <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
      </label>

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
