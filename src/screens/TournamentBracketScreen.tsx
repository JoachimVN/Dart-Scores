import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import type { Matchup, Tournament } from '../tournament/tournamentTypes'

interface TournamentBracketScreenProps {
  readonly tournament: Tournament
  readonly matchup: Matchup | null
  readonly onPlayNextLeg: () => void
  readonly onAbandon: () => void
}

interface BracketMatchProps {
  readonly matchup: Matchup
  readonly currentMatchup: Matchup | null
  readonly playerName: (id: string | null) => string
  readonly onPlay: () => void
}

function roundLabel(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex
  if (fromEnd === 0) return 'Final'
  if (fromEnd === 1) return 'Semifinal'
  if (fromEnd === 2) return 'Quarterfinal'
  return `Round ${roundIndex + 1}`
}

function BracketMatch({ matchup, currentMatchup, playerName, onPlay }: BracketMatchProps) {
  const isCurrent = matchup.id === currentMatchup?.id
  const legsPlayed = matchup.legGameIds.length
  const bestOf = matchup.legsToWin * 2 - 1

  return (
    <Panel data-matchup-id={matchup.id} className={'bracket-match ' + (isCurrent ? 'bracket-match-current' : '')}>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {matchup.players.map((slot, index) => (
          <li
            key={slot.playerId ?? `bye-${index}`}
            className={
              'flex min-w-0 items-center justify-between gap-2 rounded-[calc(var(--radius-md)-2px)] px-2 py-1.5 text-sm ' +
              (slot.playerId && slot.playerId === matchup.winnerId ? 'bg-accent-soft font-bold' : '')
            }
          >
            <span className="truncate">{slot.bye ? 'Bye' : playerName(slot.playerId)}</span>
            {slot.playerId && <span className="shrink-0 tabular-nums text-ink-muted">{matchup.legWins[slot.playerId] ?? 0}</span>}
          </li>
        ))}
      </ul>
      {isCurrent && (
        <Button variant="primary" size="sm" className="mt-2 w-full" onClick={onPlay}>
          Play leg {legsPlayed + 1} of {bestOf}
        </Button>
      )}
    </Panel>
  )
}

interface BracketColumnProps {
  readonly roundIndex: number
  readonly totalRounds: number
  readonly matchups: Matchup[]
  readonly side: 'left' | 'right'
  readonly currentMatchup: Matchup | null
  readonly playerName: (id: string | null) => string
  readonly onPlay: () => void
}

function BracketColumn({ roundIndex, totalRounds, matchups, side, currentMatchup, playerName, onPlay }: BracketColumnProps) {
  return (
    <section className={'bracket-column bracket-column-' + side}>
      <h2 className="bracket-round-label">{roundLabel(roundIndex, totalRounds)}</h2>
      <div className="bracket-column-matches">
        {matchups.map((item) => (
          <BracketMatch key={item.id} matchup={item} currentMatchup={currentMatchup} playerName={playerName} onPlay={onPlay} />
        ))}
      </div>
    </section>
  )
}

/**
 * A knockout tree is rendered from the outside toward a central final: the
 * first half of every round feeds in from the left, the second half mirrors
 * it from the right. This gives a 4-player event one semi on each side with
 * the final between them, while larger brackets retain the same familiar
 * World-Cup-style shape.
 */
export function TournamentBracketScreen({ tournament, matchup, onPlayNextLeg, onAbandon }: TournamentBracketScreenProps) {
  const playerName = (id: string | null) => (id ? (tournament.players.find((p) => p.id === id)?.name ?? '?') : 'TBD')
  const totalRounds = tournament.rounds.length
  const final = tournament.rounds.at(-1)?.[0]
  const nonFinalRounds = tournament.rounds.slice(0, -1)
  const leftColumns = nonFinalRounds.map((round, roundIndex) => ({ roundIndex, matchups: round.slice(0, round.length / 2) }))
  const rightColumns = nonFinalRounds
    .map((round, roundIndex) => ({ roundIndex, matchups: round.slice(round.length / 2).toReversed() }))
    .toReversed()
  const bracketRef = useRef<HTMLDivElement>(null)
  const [connectorPaths, setConnectorPaths] = useState<string[]>([])

  useLayoutEffect(() => {
    const bracket = bracketRef.current
    if (!bracket) return

    function measureConnectors() {
      const element = bracketRef.current
      if (!element) return
      const bracketRect = element.getBoundingClientRect()
      const paths: string[] = []
      for (const round of tournament.rounds.slice(0, -1)) {
        for (const source of round) {
          const target = tournament.rounds[source.round + 1]?.[Math.floor(source.slotIndex / 2)]
          const sourceElement = element.querySelector<HTMLElement>(`[data-matchup-id="${source.id}"]`)
          const targetElement = target && element.querySelector<HTMLElement>(`[data-matchup-id="${target.id}"]`)
          if (!sourceElement || !targetElement) continue

          const from = sourceElement.getBoundingClientRect()
          const to = targetElement.getBoundingClientRect()
          const sourceIsLeftOfTarget = from.left < to.left
          const fromX = (sourceIsLeftOfTarget ? from.right : from.left) - bracketRect.left
          const toX = (sourceIsLeftOfTarget ? to.left : to.right) - bracketRect.left
          const fromY = from.top + from.height / 2 - bracketRect.top
          const toY = to.top + to.height / 2 - bracketRect.top
          const elbowX = (fromX + toX) / 2
          paths.push(`M ${fromX} ${fromY} H ${elbowX} V ${toY} H ${toX}`)
        }
      }
      setConnectorPaths(paths)
    }

    const observer = new ResizeObserver(measureConnectors)
    observer.observe(bracket)
    measureConnectors()
    return () => observer.disconnect()
  }, [tournament, matchup])

  function handleAbandon() {
    if (globalThis.confirm('Abandon this tournament? Current progress will be lost.')) {
      onAbandon()
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-accent">Knockout</p>
          <h1 className="m-0 text-2xl font-bold tracking-tight">Tournament bracket</h1>
        </div>
        <Button variant="danger" size="sm" onClick={handleAbandon}>
          Abandon tournament
        </Button>
      </div>

      <div className="bracket-scroll">
        <div ref={bracketRef} className="knockout-bracket" style={{ '--bracket-rounds': totalRounds } as CSSProperties}>
          <svg className="bracket-connectors" viewBox={`0 0 ${bracketRef.current?.clientWidth ?? 0} ${bracketRef.current?.clientHeight ?? 0}`} aria-hidden="true">
            {connectorPaths.map((path, index) => (
              <path key={index} d={path} />
            ))}
          </svg>
          <div className="bracket-side bracket-side-left">
            {leftColumns.map(({ roundIndex, matchups }) => (
              <BracketColumn
                key={roundIndex}
                roundIndex={roundIndex}
                totalRounds={totalRounds}
                matchups={matchups}
                side="left"
                currentMatchup={matchup}
                playerName={playerName}
                onPlay={onPlayNextLeg}
              />
            ))}
          </div>

          {final && (
            <section className="bracket-final">
              <h2 className="bracket-round-label">Final</h2>
              <BracketMatch matchup={final} currentMatchup={matchup} playerName={playerName} onPlay={onPlayNextLeg} />
            </section>
          )}

          <div className="bracket-side bracket-side-right">
            {rightColumns.map(({ roundIndex, matchups }) => (
              <BracketColumn
                key={roundIndex}
                roundIndex={roundIndex}
                totalRounds={totalRounds}
                matchups={matchups}
                side="right"
                currentMatchup={matchup}
                playerName={playerName}
                onPlay={onPlayNextLeg}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
