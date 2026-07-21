import type { Throw } from '../game/types'
import { ThrowBadge } from './ThrowBadge'

interface TurnPanelProps {
  throws: Throw[]
  useDartNotation: boolean
  /** Whose darts these are - shown as a caption so it's unambiguous even while these stay visible into the next player's turn. */
  playerName: string
}

function labelFor(throwData: Throw | undefined, useDartNotation: boolean): string {
  if (!throwData) return '-'
  return useDartNotation ? throwData.label : String(throwData.value)
}

export function TurnPanel({ throws, useDartNotation, playerName }: Readonly<TurnPanelProps>) {
  return (
    <div className="flex flex-col gap-[0.2em]">
      <span className="max-w-[10em] truncate text-[0.75em] font-semibold uppercase tracking-wide text-ink-muted">
        {playerName}
      </span>
      <div className="flex gap-[0.3em]">
        {[0, 1, 2].map((i) => {
          const dart = throws[i]
          const label = labelFor(dart, useDartNotation)
          return <ThrowBadge key={i} label={label} empty={!dart} />
        })}
      </div>
    </div>
  )
}
