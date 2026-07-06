import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { roundRobinLeaderboard } from '../tournament/tournamentEngine'
import type { Matchup, Tournament } from '../tournament/tournamentTypes'

interface TournamentRoundRobinScreenProps {
  readonly tournament: Tournament
  readonly matchup: Matchup | null
  readonly onPlayNextLeg: () => void
  readonly onAbandon: () => void
}

export function TournamentRoundRobinScreen({
  tournament,
  matchup,
  onPlayNextLeg,
  onAbandon,
}: TournamentRoundRobinScreenProps) {
  const playerName = (id: string | null) => (id ? (tournament.players.find((p) => p.id === id)?.name ?? '?') : 'TBD')
  const legsPlayed = matchup?.legGameIds.length ?? 0
  const bestOf = matchup ? matchup.legsToWin * 2 - 1 : 0
  const leaderboard = roundRobinLeaderboard(tournament)

  function handleAbandon() {
    if (globalThis.confirm('Abandon this tournament? Current progress will be lost.')) {
      onAbandon()
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between">
        <h1 className="m-0 text-2xl font-bold tracking-tight">League</h1>
        <Button variant="danger" size="sm" onClick={handleAbandon}>
          Abandon tournament
        </Button>
      </div>

      <Panel title="Standings" className="w-full max-w-lg">
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
          {leaderboard.map((standing, i) => (
            <li key={standing.player.id} className="flex items-center gap-3 rounded-(--radius-md) px-2 py-1.5">
              <span className="w-5 text-sm text-ink-muted tabular-nums">{i + 1}</span>
              <span className="flex-1 truncate font-medium">{standing.player.name}</span>
              <span className="tabular-nums text-ink-muted">
                {standing.matchesWon}-{standing.matchesPlayed - standing.matchesWon}
              </span>
              <span className="w-14 text-right tabular-nums text-ink-muted">
                {standing.legsWon - standing.legsLost >= 0 ? '+' : ''}
                {standing.legsWon - standing.legsLost}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="flex w-full snap-x gap-4 overflow-x-auto pb-2">
        {tournament.rounds.map((matchups, roundIndex) => (
          <div key={matchups.map((m) => m.id).join('-')} className="flex min-w-[240px] flex-1 snap-start flex-col gap-3">
            <h2 className="m-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">Round {roundIndex + 1}</h2>
            {matchups.map((m) => {
              const isCurrent = m.id === matchup?.id
              return (
                <Panel key={m.id} className={isCurrent ? 'border-accent/60 ring-2 ring-accent/30' : undefined}>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {m.players.map((slot, i) => (
                      <li
                        key={slot.playerId ?? `empty-${i}`}
                        className={
                          'flex items-center justify-between gap-2 rounded-(--radius-md) px-2 py-1.5 ' +
                          (slot.playerId && slot.playerId === m.winnerId ? 'bg-accent-soft font-semibold' : '')
                        }
                      >
                        <span className="truncate">{playerName(slot.playerId)}</span>
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
