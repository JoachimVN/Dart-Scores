import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../components/ui/Button'
import { Panel, selectClass } from '../components/ui/Panel'
import { ShotsBoard } from '../dartboard/ShotsBoard'
import { listPlayers } from '../players/playerRepository'
import { computeAllTimeLeaderboards, computePlayerStats } from '../stats/statsRepository'
import type { LeaderboardEntry } from '../stats/statsRepository'

interface StatsScreenProps {
  onBack: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardPanel({
  title,
  entries,
  formatValue = String,
}: {
  title: string
  entries: LeaderboardEntry[]
  formatValue?: (value: number) => string
}) {
  return (
    <Panel title={title}>
      {entries.length === 0 ? (
        <p className="m-0 text-sm text-ink-muted">Not enough games yet.</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {entries.map((entry, i) => (
            <li key={entry.playerId} className="flex items-center gap-2">
              <span className="w-6 text-lg">{MEDALS[i] ?? `${i + 1}.`}</span>
              <span className="flex-1 truncate font-medium">{entry.name}</span>
              <span className="text-ink-muted tabular-nums">{formatValue(entry.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [players] = useState(() => listPlayers())
  const [selectedId, setSelectedId] = useState<string | null>(players[0]?.id ?? null)
  const [tab, setTab] = useState<'player' | 'all-time'>('player')
  const stats = selectedId ? computePlayerStats(selectedId) : null
  const leaderboards = tab === 'all-time' ? computeAllTimeLeaderboards() : null

  const tiles = stats
    ? [
        ['Games played', String(stats.gamesPlayed)],
        ['Wins', `${stats.wins} (${(stats.winRate * 100).toFixed(0)}%)`],
        ['Average per turn', stats.avgScorePerTurn.toFixed(1)],
        ['Best checkout', String(stats.bestCheckout || '-')],
        ['Best leg', stats.bestLegDarts ? `${stats.bestLegDarts} darts` : '-'],
        ['180s', String(stats.count180s)],
        ['100+', String(stats.count100Plus)],
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
          <div className="flex w-full max-w-[220px] gap-1 self-start rounded-(--radius-md) bg-sunken p-1">
            {(['player', 'all-time'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
                className={
                  'h-9 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-sm font-semibold capitalize transition-colors ' +
                  (tab === t ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
                }
              >
                {t === 'player' ? 'Player' : 'All-time'}
              </button>
            ))}
          </div>

          {tab === 'player' ? (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                <span>Player</span>
                <select className={selectClass} value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>

              {stats && (
                <>
                  <Panel>
                    <div className="grid grid-cols-2 gap-3">
                      {tiles.map(([label, value]) => (
                        <div key={label} className="flex flex-col gap-0.5 rounded-(--radius-md) bg-sunken p-3">
                          <span className="text-xs text-ink-muted">{label}</span>
                          <span className="text-xl font-bold tabular-nums">{value}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  {stats.trend.length >= 2 && (
                    <Panel title="Average over time">
                      <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.trend.map((point, i) => ({ ...point, game: i + 1 }))}>
                            <CartesianGrid stroke="var(--line)" vertical={false} />
                            <XAxis
                              dataKey="game"
                              tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                              axisLine={{ stroke: 'var(--line)' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              width={32}
                            />
                            <Tooltip
                              contentStyle={{
                                background: 'var(--surface-card)',
                                border: '1px solid var(--line)',
                                borderRadius: 8,
                                color: 'var(--ink)',
                              }}
                              labelFormatter={(label) => `Game ${label}`}
                              formatter={(value) => [Number(value).toFixed(1), 'Average']}
                            />
                            <Line type="monotone" dataKey="average" stroke="var(--accent)" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </Panel>
                  )}

                  {stats.allThrows.length > 0 && (
                    <Panel title="Shot heatmap">
                      <div className="mx-auto" style={{ width: 'min(70vw, 320px)' }}>
                        <ShotsBoard throws={stats.allThrows} />
                      </div>
                    </Panel>
                  )}
                </>
              )}
            </>
          ) : (
            leaderboards && (
              <div className="flex flex-col gap-4">
                <LeaderboardPanel title="Best average" entries={leaderboards.bestAverage} formatValue={(v) => v.toFixed(1)} />
                <LeaderboardPanel
                  title="Best win rate"
                  entries={leaderboards.bestWinRate}
                  formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <LeaderboardPanel title="Most wins" entries={leaderboards.mostWins} />
                <LeaderboardPanel title="Best checkout" entries={leaderboards.bestCheckout} />
                <LeaderboardPanel title="Most 180s" entries={leaderboards.most180s} />
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
