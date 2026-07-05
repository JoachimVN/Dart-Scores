import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { standings } from '../tournament/tournamentEngine'
import type { Tournament } from '../tournament/tournamentTypes'

interface TournamentChampionScreenProps {
  readonly tournament: Tournament
  readonly onNewTournament: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

export function TournamentChampionScreen({ tournament, onNewTournament }: TournamentChampionScreenProps) {
  const results = standings(tournament)
  const champion = results[0]

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Champion</span>
        <h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">{champion ? champion.name : 'Tournament over'}</h1>
      </div>

      <Panel title="Standings" className="w-full max-w-sm">
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {results.map((player, i) => (
            <li key={player.id} className="flex items-center gap-2">
              <span className="w-6 text-xl">{MEDALS[i] ?? ''}</span>
              <span className="flex-1 truncate font-medium">{player.name}</span>
              <span className="text-ink-muted tabular-nums">{i + 1}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Button variant="primary" size="lg" onClick={onNewTournament}>
        Start new tournament
      </Button>
    </div>
  )
}
