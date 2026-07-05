import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '../components/ui/Button'
import { Panel, selectClass } from '../components/ui/Panel'
import { ShotsBoard } from '../dartboard/ShotsBoard'
import { listPlayers } from '../players/playerRepository'
import { computeAllTimeLeaderboards, computePlayerStats } from '../stats/statsRepository'
import type { CricketPlayerStats, LeaderboardEntry, StatsPoint, X01PlayerStats } from '../stats/statsRepository'

interface StatsScreenProps {
  onBack: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardPanel({
  title,
  entries,
  formatValue = String,
}: Readonly<{
  title: string
  entries: LeaderboardEntry[]
  formatValue?: (value: number) => string
}>) {
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

function TilesPanel({ tiles }: Readonly<{ tiles: [string, string][] }>) {
  return (
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
  )
}

function TrendPanel({ title, trend }: Readonly<{ title: string; trend: StatsPoint[] }>) {
  return (
    <Panel title={title}>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.map((point, i) => ({ ...point, game: i + 1 }))}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="game"
              tick={{ fill: 'var(--ink-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--line)' }}
              tickLine={false}
            />
            <YAxis tick={{ fill: 'var(--ink-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={32} />
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
  )
}

function X01Section({ stats }: Readonly<{ stats: X01PlayerStats }>) {
  if (stats.gamesPlayed === 0) return null
  const tiles: [string, string][] = [
    ['Games played', String(stats.gamesPlayed)],
    ['Wins', `${stats.wins} (${(stats.winRate * 100).toFixed(0)}%)`],
    ['Average per turn', stats.avgScorePerTurn.toFixed(1)],
    ['Best checkout', String(stats.bestCheckout || '-')],
    ['Best leg', stats.bestLegDarts ? `${stats.bestLegDarts} darts` : '-'],
    ['180s', String(stats.count180s)],
    ['100+', String(stats.count100Plus)],
  ]

  return (
    <>
      <h2 className="m-0 text-lg font-semibold">X01</h2>
      <TilesPanel tiles={tiles} />
      {stats.trend.length >= 2 && <TrendPanel title="Average over time" trend={stats.trend} />}
      {stats.allThrows.length > 0 && (
        <Panel title="Shot heatmap">
          <div className="mx-auto" style={{ width: 'min(70vw, 320px)' }}>
            <ShotsBoard throws={stats.allThrows} />
          </div>
        </Panel>
      )}
    </>
  )
}

function CricketSection({ stats }: Readonly<{ stats: CricketPlayerStats }>) {
  if (stats.gamesPlayed === 0) return null
  const tiles: [string, string][] = [
    ['Games played', String(stats.gamesPlayed)],
    ['Wins', `${stats.wins} (${(stats.winRate * 100).toFixed(0)}%)`],
    ['Marks per round', stats.avgMPR.toFixed(1)],
    ['Best turn', stats.bestTurnPoints ? `${stats.bestTurnPoints} pts` : '-'],
    ['Fastest close', stats.fastestClose ? `${stats.fastestClose} turns` : '-'],
  ]

  return (
    <>
      <h2 className="m-0 text-lg font-semibold">Cricket</h2>
      <TilesPanel tiles={tiles} />
      {stats.trend.length >= 2 && <TrendPanel title="MPR over time" trend={stats.trend} />}
      {stats.allThrows.length > 0 && (
        <Panel title="Shot heatmap">
          <div className="mx-auto" style={{ width: 'min(70vw, 320px)' }}>
            <ShotsBoard throws={stats.allThrows} />
          </div>
        </Panel>
      )}
    </>
  )
}

export function StatsScreen({ onBack }: Readonly<StatsScreenProps>) {
  const [players] = useState(() => listPlayers())
  const [selectedId, setSelectedId] = useState<string | null>(players[0]?.id ?? null)
  const [tab, setTab] = useState<'player' | 'all-time'>('player')
  const stats = selectedId ? computePlayerStats(selectedId) : null
  const leaderboards = tab === 'all-time' ? computeAllTimeLeaderboards() : null

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

              {stats?.x01.gamesPlayed === 0 && stats.cricket.gamesPlayed === 0 && (
                <p className="text-sm text-ink-muted">No games recorded yet.</p>
              )}

              {stats && (
                <>
                  <X01Section stats={stats.x01} />
                  <CricketSection stats={stats.cricket} />
                </>
              )}
            </>
          ) : (
            leaderboards && (
              <div className="flex flex-col gap-4">
                <h2 className="m-0 text-lg font-semibold">X01</h2>
                <LeaderboardPanel title="Best average" entries={leaderboards.x01.bestAverage} formatValue={(v) => v.toFixed(1)} />
                <LeaderboardPanel
                  title="Best win rate"
                  entries={leaderboards.x01.bestWinRate}
                  formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <LeaderboardPanel title="Most wins" entries={leaderboards.x01.mostWins} />
                <LeaderboardPanel title="Best checkout" entries={leaderboards.x01.bestCheckout} />
                <LeaderboardPanel title="Most 180s" entries={leaderboards.x01.most180s} />

                <h2 className="m-0 text-lg font-semibold">Cricket</h2>
                <LeaderboardPanel title="Best MPR" entries={leaderboards.cricket.bestMPR} formatValue={(v) => v.toFixed(1)} />
                <LeaderboardPanel
                  title="Best win rate"
                  entries={leaderboards.cricket.bestWinRate}
                  formatValue={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <LeaderboardPanel title="Most wins" entries={leaderboards.cricket.mostWins} />
                <LeaderboardPanel title="Most points in a turn" entries={leaderboards.cricket.mostPointsInATurn} />
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
