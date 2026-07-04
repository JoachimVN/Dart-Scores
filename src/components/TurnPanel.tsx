import type { Throw } from '../game/types'
import { ThrowBadge } from './ThrowBadge'

interface TurnPanelProps {
  throws: Throw[]
}

export function TurnPanel({ throws }: TurnPanelProps) {
  return (
    <div style={{ display: 'flex', gap: '0.3em' }}>
      {[0, 1, 2].map((i) => (
        <ThrowBadge key={i} label={throws[i]?.label ?? '-'} />
      ))}
    </div>
  )
}
