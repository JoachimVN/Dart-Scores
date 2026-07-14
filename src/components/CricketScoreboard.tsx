import { cricketTargetLabel, type CricketMarks, type CricketTarget } from '../game/cricket/cricketTypes'
import { Panel } from './ui/Panel'

export interface CricketScoreboardEntry {
  id: string
  name: string
  marks: CricketMarks
  points: number
}

interface CricketScoreboardProps {
  readonly players: CricketScoreboardEntry[]
  readonly currentPlayerId: string
  readonly targets: CricketTarget[]
}

/** Standard cricket mark notation: dash, slash, X, circled X (closed). */
function markSymbol(count: number): string {
  if (count >= 3) return '⊗'
  if (count === 2) return '✕'
  if (count === 1) return '╱'
  return '-'
}

export function CricketScoreboard({ players, currentPlayerId, targets }: CricketScoreboardProps) {
  return (
    <Panel title="Cricket">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-1" />
            {players.map((player) => (
              <th
                key={player.id}
                title={player.name}
                className={
                  'max-w-[4.5em] truncate p-1 text-center text-xs font-semibold ' +
                  (player.id === currentPlayerId ? 'text-accent' : 'text-ink-muted')
                }
              >
                {player.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={target} className="border-t border-line">
              <td className="p-1 text-xs font-semibold text-ink-muted tabular-nums">{cricketTargetLabel(target)}</td>
              {players.map((player) => (
                <td key={player.id} className="p-1 text-center font-bold tabular-nums">
                  {markSymbol(player.marks[target])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-line-strong">
            <td className="p-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Pts</td>
            {players.map((player) => (
              <td key={player.id} className="p-1 text-center font-bold tabular-nums">
                {player.points}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Panel>
  )
}
