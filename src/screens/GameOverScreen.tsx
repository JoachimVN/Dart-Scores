import { Fragment } from 'react'
import { ShotsBoard } from '../dartboard/ShotsBoard'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { winnerIdOf } from '../game/gameSelectors'
import type { GameState, Player, Throw } from '../game/types'
import { buildCricketGameSummary } from '../stats/buildCricketGameSummary'
import { buildX01GameSummary } from '../stats/buildX01GameSummary'

interface GameOverScreenProps {
  game: GameState
  useDartNotation: boolean
  /** Instantly starts a fresh game with the same players and settings - no Setup screen. */
  onRematch: () => void
  /** Goes back to Setup to change players/settings before starting again. */
  onNewGame: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

interface PodiumEntry {
  player: Player
  valueLabel: string
}

interface GameResult {
  throws: Throw[]
  statTiles: [string, string][]
  podium: PodiumEntry[]
}

function dartNotationLabel(throwData: Throw): string {
  return throwData.label
}

function scoreLabel(throwData: Throw): string {
  return String(throwData.value)
}

function buildX01Result(game: Extract<GameState, { mode: 'x01' }>, formatThrow: (throwData: Throw) => string): GameResult {
  const summary = buildX01GameSummary(game)
  const winnerSummary = summary.players.find((p) => p.won)
  const average = winnerSummary && winnerSummary.turnsPlayed > 0 ? winnerSummary.pointsScored / winnerSummary.turnsPlayed : 0
  const checkoutThrow = winnerSummary?.throws.at(-1)
  const checkoutLabel = checkoutThrow ? formatThrow(checkoutThrow) : '-'

  const podium: PodiumEntry[] = [...game.players]
    .map((player) => ({ player, remaining: game.x01.playerStates.find((ps) => ps.playerId === player.id)!.remaining }))
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3)
    .map(({ player, remaining }) => ({ player, valueLabel: remaining === 0 ? 'Finished' : String(remaining) }))

  return {
    throws: winnerSummary?.throws ?? [],
    statTiles: [
      ['Turns taken', String(winnerSummary?.turnsPlayed ?? 0)],
      ['Average per turn', average.toFixed(1)],
      ['Checkout', checkoutLabel],
    ],
    podium,
  }
}

function buildCricketResult(game: Extract<GameState, { mode: 'cricket' }>): GameResult {
  const summary = buildCricketGameSummary(game)
  const winnerSummary = summary.players.find((p) => p.won)
  const mpr = winnerSummary && winnerSummary.turnsPlayed > 0 ? winnerSummary.marksScored / winnerSummary.turnsPlayed : 0

  const podium: PodiumEntry[] = [...game.players]
    .map((player) => {
      const playerState = game.cricket.playerStates.find((ps) => ps.playerId === player.id)!
      const numbersClosed = summary.players.find((p) => p.playerId === player.id)!.numbersClosed
      return { player, points: playerState.points, numbersClosed }
    })
    .sort((a, b) => b.points - a.points || b.numbersClosed - a.numbersClosed)
    .slice(0, 3)
    .map(({ player, points }) => ({ player, valueLabel: `${points} pts` }))

  return {
    throws: winnerSummary?.throws ?? [],
    statTiles: [
      ['Turns taken', String(winnerSummary?.turnsPlayed ?? 0)],
      ['Marks per round', mpr.toFixed(1)],
      ['Points scored', String(winnerSummary?.pointsScored ?? 0)],
    ],
    podium,
  }
}

export function GameOverScreen({ game, useDartNotation, onRematch, onNewGame }: Readonly<GameOverScreenProps>) {
  const winner = game.players.find((player) => player.id === winnerIdOf(game))
  const formatThrow = useDartNotation ? dartNotationLabel : scoreLabel
  const result = game.mode === 'x01' ? buildX01Result(game, formatThrow) : buildCricketResult(game)

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">Winner</span>
        <h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">
          {winner ? winner.name : 'Game over'}
        </h1>
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Panel title="Game stats" className="w-full max-w-[280px] justify-self-center md:justify-self-end">
          <dl className="m-0 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-2">
            {result.statTiles.map(([label, value]) => (
              <Fragment key={label}>
                <dt className="text-sm text-ink-muted">{label}</dt>
                <dd className="m-0 text-right text-2xl font-bold tabular-nums">{value}</dd>
              </Fragment>
            ))}
          </dl>
        </Panel>

        <div className="-order-1 justify-self-center md:order-none" style={{ width: 'min(60vh, 90vw, 460px)' }}>
          <ShotsBoard throws={result.throws} />
        </div>

        <Panel title="Top 3" className="w-full max-w-[280px] justify-self-center md:justify-self-start">
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {result.podium.map(({ player, valueLabel }, i) => (
              <li key={player.id} className="flex items-center gap-2">
                <span className="text-xl">{MEDALS[i]}</span>
                <span className="flex-1 truncate font-medium">{player.name}</span>
                <span className="text-ink-muted tabular-nums">{valueLabel}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" size="lg" onClick={onRematch}>
          Rematch
        </Button>
        <Button size="lg" onClick={onNewGame}>
          New game
        </Button>
      </div>
    </div>
  )
}
