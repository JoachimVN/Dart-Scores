import { ShotsBoard } from '../dartboard/ShotsBoard'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import type { GameState } from '../game/types'
import { buildGameSummary } from '../stats/buildGameSummary'

interface GameOverScreenProps {
  game: GameState
  useDartNotation: boolean
  /** Instantly starts a fresh game with the same players and settings - no Setup screen. */
  onRematch: () => void
  /** Goes back to Setup to change players/settings before starting again. */
  onNewGame: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

export function GameOverScreen({ game, useDartNotation, onRematch, onNewGame }: GameOverScreenProps) {
  const winner = game.players.find((player) => player.id === game.x01.winnerId)
  const summary = buildGameSummary(game)
  const winnerSummary = summary.players.find((p) => p.won)

  const average = winnerSummary && winnerSummary.turnsPlayed > 0 ? winnerSummary.pointsScored / winnerSummary.turnsPlayed : 0
  const checkoutThrow = winnerSummary?.throws.at(-1)
  const checkoutLabel = checkoutThrow ? (useDartNotation ? checkoutThrow.label : String(checkoutThrow.value)) : '-'

  const podium = [...game.players]
    .map((player) => ({
      player,
      remaining: game.x01.playerStates.find((ps) => ps.playerId === player.id)!.remaining,
    }))
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3)

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
            <dt className="text-sm text-ink-muted">Turns taken</dt>
            <dd className="m-0 text-right text-2xl font-bold tabular-nums">{winnerSummary?.turnsPlayed ?? 0}</dd>
            <dt className="text-sm text-ink-muted">Average per turn</dt>
            <dd className="m-0 text-right text-2xl font-bold tabular-nums">{average.toFixed(1)}</dd>
            <dt className="text-sm text-ink-muted">Checkout</dt>
            <dd className="m-0 text-right text-2xl font-bold tabular-nums">{checkoutLabel}</dd>
          </dl>
        </Panel>

        <div className="-order-1 justify-self-center md:order-none" style={{ width: 'min(60vh, 90vw, 460px)' }}>
          <ShotsBoard throws={winnerSummary?.throws ?? []} />
        </div>

        <Panel title="Top 3" className="w-full max-w-[280px] justify-self-center md:justify-self-start">
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {podium.map(({ player, remaining }, i) => (
              <li key={player.id} className="flex items-center gap-2">
                <span className="text-xl">{MEDALS[i]}</span>
                <span className="flex-1 truncate font-medium">{player.name}</span>
                <span className="text-ink-muted tabular-nums">{remaining === 0 ? 'Finished' : remaining}</span>
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
