import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import type { Matchup, Tournament } from '../tournament/tournamentTypes'

interface TournamentBracketScreenProps {
  readonly tournament: Tournament
  readonly matchup: Matchup | null
  readonly onPlayNextLeg: () => void
  readonly onAbandon: () => void
}

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Quarterfinal'
  return `Round ${roundIndex + 1}`
}

export function TournamentBracketScreen({ tournament, matchup, onPlayNextLeg, onAbandon }: TournamentBracketScreenProps) {
  const playerName = (id: string | null) => (id ? (tournament.players.find((p) => p.id === id)?.name ?? '?') : 'TBD')
  const legsPlayed = matchup?.legGameIds.length ?? 0
  const bestOf = matchup ? matchup.legsToWin * 2 - 1 : 0

  function handleAbandon() {
    if (globalThis.confirm('Abandon this tournament? Current progress will be lost.')) {
      onAbandon()
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between">
        <h1 className="m-0 text-2xl font-bold tracking-tight">Tournament</h1>
        <Button variant="danger" size="sm" onClick={handleAbandon}>
          Abandon tournament
        </Button>
      </div>

      <div className="flex w-full snap-x gap-4 overflow-x-auto pb-2">
        {tournament.rounds.map((matchups, roundIndex) => (
          <div key={roundIndex} className="flex min-w-[240px] flex-1 snap-start flex-col gap-3">
            <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {roundLabel(roundIndex, tournament.rounds.length)}
            </h2>
            {matchups.map((m) => {
              const isCurrent = m.id === matchup?.id
              return (
                <Panel key={m.id} className={isCurrent ? 'border-accent/60 ring-2 ring-accent/30' : undefined}>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {m.players.map((slot, i) => (
                      <li
                        key={i}
                        className={
                          'flex items-center justify-between gap-2 rounded-(--radius-md) px-2 py-1.5 ' +
                          (slot.playerId && slot.playerId === m.winnerId ? 'bg-accent-soft font-semibold' : '')
                        }
                      >
                        <span className="truncate">{slot.bye ? '(bye)' : playerName(slot.playerId)}</span>
                        {slot.playerId && <span className="tabular-nums text-ink-muted">{m.legWins[slot.playerId] ?? 0}</span>}
                      </li>
                    ))}
                  </ul>
                  {isCurrent && (
                    <Button variant="primary" size="sm" className="mt-3 w-full" onClick={onPlayNextLeg}>
                      Play leg {legsPlayed + 1} of {bestOf}
                    </Button>
                  )}
                </Panel>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
