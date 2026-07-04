import type { Throw } from '../game/types'
import { ThrowBadge } from './ThrowBadge'

interface TurnPanelProps {
  throws: Throw[]
  useDartNotation: boolean
}

export function TurnPanel({ throws, useDartNotation }: TurnPanelProps) {
  return (
    <div style={{ display: 'flex', gap: '0.3em' }}>
      {[0, 1, 2].map((i) => {
        const dart = throws[i]
        const label = dart ? (useDartNotation ? dart.label : String(dart.value)) : '-'
        return <ThrowBadge key={i} label={label} />
      })}
    </div>
  )
}
