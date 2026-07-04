import type { Throw } from '../game/types'
import { ThrowBadge } from './ThrowBadge'

interface TurnPanelProps {
  throws: Throw[]
  useDartNotation: boolean
  /** Whose darts these are - shown as a caption so it's unambiguous even while these stay visible into the next player's turn. */
  playerName: string
}

export function TurnPanel({ throws, useDartNotation, playerName }: TurnPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2em' }}>
      <span style={{ fontSize: '0.75em', fontWeight: 600, color: 'var(--text-muted)' }}>{playerName}</span>
      <div style={{ display: 'flex', gap: '0.3em' }}>
        {[0, 1, 2].map((i) => {
          const dart = throws[i]
          const label = dart ? (useDartNotation ? dart.label : String(dart.value)) : '-'
          return <ThrowBadge key={i} label={label} />
        })}
      </div>
    </div>
  )
}
