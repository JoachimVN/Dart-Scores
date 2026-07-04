const MARK_RADIUS = 7
const MARK_DOT_RADIUS = 2.5

interface DartMarkProps {
  x: number
  y: number
  /** Dims the mark once its turn is over, so a finished turn's darts read as "done" before the next player's first throw clears them. */
  faded?: boolean
}

/** Visual for a single dart landing spot, shared by the live click markers and the read-only shots recap. */
export function DartMark({ x, y, faded }: DartMarkProps) {
  return (
    <g opacity={faded ? 0.4 : 1}>
      <circle cx={x} cy={y} r={MARK_RADIUS} fill="#ffffff" stroke="#000000" strokeWidth={2} />
      <circle cx={x} cy={y} r={MARK_DOT_RADIUS} fill="#000000" />
    </g>
  )
}
