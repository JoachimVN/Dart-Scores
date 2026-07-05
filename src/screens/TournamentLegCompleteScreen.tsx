import { ShotsBoard } from '../dartboard/ShotsBoard'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { winnerIdOf } from '../game/gameSelectors'
import type { GameState, Throw } from '../game/types'
import { buildCricketGameSummary } from '../stats/buildCricketGameSummary'
import { buildX01GameSummary } from '../stats/buildX01GameSummary'
import type { Matchup, Tournament } from '../tournament/tournamentTypes'

interface TournamentLegCompleteScreenProps {
  readonly game: GameState
  readonly matchup: Matchup
  readonly tournament: Tournament
  readonly useDartNotation: boolean
  readonly onContinue: () => void
}

interface LegStats {
  turnsPlayed: number
  secondLabel: string
  secondValue: string
  throws: Throw[]
}

function buildLegStats(game: GameState, useDartNotation: boolean): LegStats {
  if (game.mode === 'x01') {
    const summary = buildX01GameSummary(game)
    const winnerSummary = summary.players.find((p) => p.won)
    const checkoutThrow = winnerSummary?.throws.at(-1)
    let checkoutLabel: string
    if (checkoutThrow) {
      checkoutLabel = useDartNotation ? checkoutThrow.label : String(checkoutThrow.value)
    } else {
      checkoutLabel = '-'
    }
    return {
      turnsPlayed: winnerSummary?.turnsPlayed ?? 0,
      secondLabel: 'Checkout',
      secondValue: checkoutLabel,
      throws: winnerSummary?.throws ?? [],
    }
  }

  const summary = buildCricketGameSummary(game)
  const winnerSummary = summary.players.find((p) => p.won)
  return {
    turnsPlayed: winnerSummary?.turnsPlayed ?? 0,
    secondLabel: 'Points scored',
    secondValue: String(winnerSummary?.pointsScored ?? 0),
    throws: winnerSummary?.throws ?? [],
  }
}

export function TournamentLegCompleteScreen({
  game,
  matchup,
  tournament,
  useDartNotation,
  onContinue,
}: TournamentLegCompleteScreenProps) {
  const winner = game.players.find((player) => player.id === winnerIdOf(game))
  const legStats = buildLegStats(game, useDartNotation)

  const playerName = (id: string | null) => (id ? (tournament.players.find((p) => p.id === id)?.name ?? '?') : 'TBD')
  const [slotA, slotB] = matchup.players
  const legScoreLabel = `${playerName(slotA.playerId)} ${matchup.legWins[slotA.playerId ?? ''] ?? 0} - ${
    matchup.legWins[slotB.playerId ?? ''] ?? 0
  } ${playerName(slotB.playerId)}`

  const isFinal = matchup.round === tournament.rounds.length - 1
  const advancesTo = matchup.status === 'complete' && matchup.winnerId ? playerName(matchup.winnerId) : null

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Leg winner</span>
        <h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">{winner ? winner.name : 'Leg over'}</h1>
        <p className="m-0 text-lg font-medium text-ink-muted">{legScoreLabel}</p>
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Panel title="Leg stats" className="w-full max-w-[280px] justify-self-center md:justify-self-end">
          <dl className="m-0 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2">
            <dt className="text-sm text-ink-muted">Turns taken</dt>
            <dd className="m-0 text-right text-2xl font-bold tabular-nums">{legStats.turnsPlayed}</dd>
            <dt className="text-sm text-ink-muted">{legStats.secondLabel}</dt>
            <dd className="m-0 text-right text-2xl font-bold tabular-nums">{legStats.secondValue}</dd>
          </dl>
        </Panel>

        <div className="-order-1 justify-self-center md:order-none" style={{ width: 'min(60vh, 90vw, 460px)' }}>
          <ShotsBoard throws={legStats.throws} />
        </div>

        <Panel title="Matchup" className="w-full max-w-[280px] justify-self-center md:justify-self-start">
          {advancesTo ? (
            <p className="m-0">
              {isFinal ? `🏆 ${advancesTo} wins the tournament!` : `${advancesTo} advances to the next round.`}
            </p>
          ) : (
            <p className="m-0 text-ink-muted">First to {matchup.legsToWin} legs wins the matchup.</p>
          )}
        </Panel>
      </div>

      <Button variant="primary" size="lg" onClick={onContinue}>
        Continue
      </Button>
    </div>
  )
}
