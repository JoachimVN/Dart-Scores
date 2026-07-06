import { ShotsBoard } from '../dartboard/ShotsBoard'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { listHistory } from '../stats/statsRepository'
import { roundRobinLeaderboard, standings } from '../tournament/tournamentEngine'
import {
  bracketRecap,
  cricketTournamentRecords,
  playerThrowsAcrossTournament,
  tournamentRecords,
} from '../tournament/tournamentStats'
import type { TournamentRecordEntry } from '../tournament/tournamentStats'
import type { Tournament } from '../tournament/tournamentTypes'

interface TournamentChampionScreenProps {
  readonly tournament: Tournament
  readonly onNewTournament: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

function RecordRow({
  label,
  record,
  formatValue = String,
}: Readonly<{
  label: string
  record: TournamentRecordEntry | null
  formatValue?: (value: number) => string
}>) {
  return (
    <>
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="m-0 text-right">
        <div className="text-lg font-bold tabular-nums">{record ? formatValue(record.value) : '-'}</div>
        {record && <div className="text-xs font-normal text-ink-muted">{record.playerName}</div>}
      </dd>
    </>
  )
}

export function TournamentChampionScreen({ tournament, onNewTournament }: TournamentChampionScreenProps) {
  const isLeague = tournament.config.format === 'round_robin'
  const results = standings(tournament)
  const champion = results[0]
  const history = listHistory()
  const championThrows = champion ? playerThrowsAcrossTournament(tournament, champion.id, history) : []
  const records = tournamentRecords(tournament, history)
  const cricketRecords = cricketTournamentRecords(tournament, history)
  const recap = bracketRecap(tournament)
  const leaderboardByPlayerId = new Map(roundRobinLeaderboard(tournament).map((s) => [s.player.id, s]))

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Champion</span>
        <h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">{champion ? champion.name : 'Tournament over'}</h1>
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Panel title="Tournament records" className="w-full max-w-[280px] justify-self-center md:justify-self-end">
          <dl className="m-0 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2">
            {tournament.config.mode === 'x01' ? (
              <>
                <RecordRow label="Highest checkout" record={records.highestCheckout} />
                <RecordRow label="Most 180s" record={records.most180s} />
                <RecordRow label="Best leg average" record={records.bestLegAverage} formatValue={(v) => v.toFixed(1)} />
                <RecordRow label="Shortest leg" record={records.shortestLeg} formatValue={(v) => `${v} darts`} />
              </>
            ) : (
              <>
                <RecordRow label="Best MPR" record={cricketRecords.bestMPR} formatValue={(v) => v.toFixed(1)} />
                <RecordRow label="Most points in a turn" record={cricketRecords.mostPointsInATurn} />
                <RecordRow label="Fastest close" record={cricketRecords.fastestClose} formatValue={(v) => `${v} turns`} />
              </>
            )}
          </dl>
        </Panel>

        <div className="-order-1 justify-self-center md:order-none" style={{ width: 'min(60vh, 90vw, 460px)' }}>
          <ShotsBoard throws={championThrows} />
        </div>

        <Panel title="Standings" className="w-full max-w-[280px] justify-self-center md:justify-self-start">
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {results.map((player, i) => {
              const standing = leaderboardByPlayerId.get(player.id)
              return (
                <li key={player.id} className="flex items-center gap-2">
                  <span className="w-6 text-xl">{MEDALS[i] ?? ''}</span>
                  <span className="flex-1 truncate font-medium">{player.name}</span>
                  {isLeague && standing ? (
                    <span className="text-ink-muted tabular-nums">
                      {standing.matchesWon}-{standing.matchesPlayed - standing.matchesWon}
                    </span>
                  ) : (
                    <span className="text-ink-muted tabular-nums">{i + 1}</span>
                  )}
                </li>
              )
            })}
          </ol>
        </Panel>
      </div>

      <Panel title={isLeague ? 'Round recap' : 'Bracket recap'} className="w-full max-w-lg">
        <div className="flex flex-col gap-4">
          {recap.map((round, i) => (
            <div key={round.map((m) => `${m.playerAName}-${m.playerBName}`).join('|')}>
              <h3 className="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {isLeague ? `Round ${i + 1}` : i === recap.length - 1 ? 'Final' : `Round ${i + 1}`}
              </h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {round.map((matchup) => (
                  <li key={`${matchup.playerAName}-${matchup.playerBName}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className={matchup.winnerName === matchup.playerAName ? 'font-semibold' : 'text-ink-muted'}>
                      {matchup.playerAName}
                    </span>
                    <span className="tabular-nums text-ink-muted">
                      {matchup.scoreA} - {matchup.scoreB}
                    </span>
                    <span className={matchup.winnerName === matchup.playerBName ? 'font-semibold' : 'text-ink-muted'}>
                      {matchup.playerBName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      <Button variant="primary" size="lg" onClick={onNewTournament}>
        Start new tournament
      </Button>
    </div>
  )
}
