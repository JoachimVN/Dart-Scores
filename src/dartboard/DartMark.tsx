const MARK_RADIUS = 7
const MARK_DOT_RADIUS = 2.5

interface DartMarkProps {
  x: number
  y: number
}

/** Visual for a single dart landing spot, shared by the live click markers and the read-only shots recap. */
export function DartMark({ x, y }: DartMarkProps) {
  return (
    <g>
      <circle cx={x} cy={y} r={MARK_RADIUS} fill="#ffffff" stroke="#000000" strokeWidth={2} />
      <circle cx={x} cy={y} r={MARK_DOT_RADIUS} fill="#000000" />
    </g>
  )
}
