import { useState } from 'react'
import { listPlayers } from '../players/playerRepository'
import { computePlayerStats } from '../stats/statsRepository'

interface StatsScreenProps {
  onBack: () => void
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [players] = useState(() => listPlayers())
  const [selectedId, setSelectedId] = useState<string | null>(players[0]?.id ?? null)
  const stats = selectedId ? computePlayerStats(selectedId) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="button" onClick={onBack}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Statistics</h1>
      </div>

      {players.length === 0 ? (
        <p>No saved users yet - add some from the setup screen first.</p>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            Player
            <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>

          {stats && (
            <ul
              className="roster-panel"
              style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <li>Games played: {stats.gamesPlayed}</li>
              <li>
                Wins: {stats.wins} ({(stats.winRate * 100).toFixed(0)}%)
              </li>
              <li>Average score per turn: {stats.avgScorePerTurn.toFixed(1)}</li>
              <li>Best checkout: {stats.bestCheckout || '-'}</li>
            </ul>
          )}
        </>
      )}
    </div>
  )
}
