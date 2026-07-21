import { VIEWBOX_SIZE } from './BoardFace'

const MARK_RADIUS = 7
const MARK_DOT_RADIUS = 2.5
// Include the outer stroke, so a marker at the click area's edge is still a
// complete circle rather than being cut off by the SVG viewBox.
export const EDGE_INSET = MARK_RADIUS + 1

interface DartMarkProps {
  x: number
  y: number
  /** Dims the mark once its turn is over, so a finished turn's darts read as "done" before the next player's first throw clears them. */
  faded?: boolean
}

/** Visual for a single dart landing spot, shared by the live click markers and the read-only shots recap. */
export function DartMark({ x, y, faded }: Readonly<DartMarkProps>) {
  const visibleX = Math.min(VIEWBOX_SIZE - EDGE_INSET, Math.max(EDGE_INSET, x))
  const visibleY = Math.min(VIEWBOX_SIZE - EDGE_INSET, Math.max(EDGE_INSET, y))

  return (
    <g opacity={faded ? 0.4 : 1}>
      <circle cx={visibleX} cy={visibleY} r={MARK_RADIUS} fill="#ffffff" stroke="#000000" strokeWidth={2} />
      <circle cx={visibleX} cy={visibleY} r={MARK_DOT_RADIUS} fill="#000000" />
    </g>
  )
}
