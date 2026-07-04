import { ShotsBoard } from '../dartboard/ShotsBoard'
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

const PRIMARY_BUTTON_STYLE = {
  font: 'inherit',
  fontWeight: 700,
  padding: '0.6em 1.4em',
  borderRadius: '0.5em',
  border: '2px solid currentColor',
  background: 'var(--text)',
  color: 'var(--bg)',
  cursor: 'pointer',
} as const

const SECONDARY_BUTTON_STYLE = {
  font: 'inherit',
  padding: '0.6em 1.4em',
  borderRadius: '0.5em',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'inherit',
  cursor: 'pointer',
} as const

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', width: '100%' }}>
      <h1 style={{ margin: 0 }}>{winner ? `${winner.name} wins!` : 'Game over'}</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          gap: 24,
          alignItems: 'start',
          width: '100%',
        }}
      >
        <section className="roster-panel" style={{ justifySelf: 'end', width: '100%', maxWidth: 260 }}>
          <h2 style={{ marginTop: 0 }}>Game stats</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.4em 0.8em', margin: 0 }}>
            <dt style={{ color: 'var(--text-muted)' }}>Turns taken</dt>
            <dd style={{ margin: 0, fontWeight: 700, textAlign: 'right' }}>{winnerSummary?.turnsPlayed ?? 0}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Average per turn</dt>
            <dd style={{ margin: 0, fontWeight: 700, textAlign: 'right' }}>{average.toFixed(1)}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>Checkout</dt>
            <dd style={{ margin: 0, fontWeight: 700, textAlign: 'right' }}>{checkoutLabel}</dd>
          </dl>
        </section>

        <div style={{ width: 'min(60vh, 90vw, 460px)' }}>
          <ShotsBoard throws={winnerSummary?.throws ?? []} />
        </div>

        <section className="roster-panel" style={{ justifySelf: 'start', width: '100%', maxWidth: 260 }}>
          <h2 style={{ marginTop: 0 }}>Top 3</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {podium.map(({ player, remaining }, i) => (
              <li key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.3em' }}>{MEDALS[i]}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {remaining === 0 ? 'Finished' : remaining}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" onClick={onRematch} style={PRIMARY_BUTTON_STYLE}>
          Rematch
        </button>
        <button type="button" onClick={onNewGame} style={SECONDARY_BUTTON_STYLE}>
          New game
        </button>
      </div>
    </div>
  )
}
