import { useState } from 'react'
import type { X01Config } from '../game/x01/x01Types'
import type { Player } from '../game/types'
import { getOrCreateDefaultPlayer, listPlayers, upsertPlayer } from '../players/playerRepository'
import { generateId } from '../shared/id'

interface SetupScreenProps {
  onStart: (config: X01Config, players: Player[]) => void
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [player1] = useState<Player>(() => getOrCreateDefaultPlayer())
  const [existingPlayer2] = useState<Player | undefined>(() => listPlayers()[1])
  const [player1Name, setPlayer1Name] = useState(player1.name)
  const [twoPlayers, setTwoPlayers] = useState(false)
  const [player2Name, setPlayer2Name] = useState(existingPlayer2?.name ?? 'Player 2')
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const updatedPlayer1: Player = { ...player1, name: player1Name.trim() || player1.name }
    upsertPlayer(updatedPlayer1)

    const players = [updatedPlayer1]
    if (twoPlayers) {
      const updatedPlayer2: Player = existingPlayer2
        ? { ...existingPlayer2, name: player2Name.trim() || existingPlayer2.name }
        : { id: generateId(), name: player2Name.trim() || 'Player 2' }
      upsertPlayer(updatedPlayer2)
      players.push(updatedPlayer2)
    }

    onStart({ startingScore, doubleOut }, players)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Dart Scores</h1>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        Player 1 name
        <input value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} />
      </label>

      <label>
        <input type="checkbox" checked={twoPlayers} onChange={(e) => setTwoPlayers(e.target.checked)} /> 2 players
      </label>

      {twoPlayers && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          Player 2 name
          <input value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} />
        </label>
      )}

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
