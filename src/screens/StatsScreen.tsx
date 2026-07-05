import { useState } from 'react'
import { listPlayers } from '../players/playerRepository'
import { computePlayerStats } from '../stats/statsRepository'
import { Button } from '../components/ui/Button'
import { Panel, selectClass } from '../components/ui/Panel'

interface StatsScreenProps {
  onBack: () => void
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [players] = useState(() => listPlayers())
  const [selectedId, setSelectedId] = useState<string | null>(players[0]?.id ?? null)
  const stats = selectedId ? computePlayerStats(selectedId) : null

  const rows = stats
    ? [
        ['Games played', String(stats.gamesPlayed)],
        ['Wins', `${stats.wins} (${(stats.winRate * 100).toFixed(0)}%)`],
        ['Average score per turn', stats.avgScorePerTurn.toFixed(1)],
        ['Best checkout', String(stats.bestCheckout || '-')],
      ]
    : []

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="m-0 text-3xl font-bold tracking-tight">Statistics</h1>
      </div>

      {players.length === 0 ? (
        <p className="text-ink-muted">No saved users yet - add some from the setup screen first.</p>
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Player
            <select className={selectClass} value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>

          {stats && (
            <Panel>
              <ul className="m-0 flex list-none flex-col p-0">
                {rows.map(([label, value]) => (
                  <li
                    key={label}
                    className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 first:pt-0 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-ink-muted">{label}</span>
                    <span className="text-xl font-bold tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
