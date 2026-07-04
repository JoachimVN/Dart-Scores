import { useEffect, useRef, useState } from 'react'
import type { BoardThrow } from './dartboard.types'
import { RING_RADII, SEGMENT_ORDER, describeAnnulusSector, polarToCartesian, wedgeAngles } from './geometry'
import { resolvePoint } from './hitTest'
import { scoreHit } from './scoring'

const VIEWBOX_SIZE = 560
const CENTER = VIEWBOX_SIZE / 2
const BOARD_RADIUS = 190
/** Radius of the black rim/number ring beyond the double ring, as a fraction of BOARD_RADIUS. */
const NUMBER_RING_OUTER = 1.28

/** Empty space between the top of the square SVG and the top of the drawn rim circle, as a fraction of the rendered board size - lets other UI (e.g. a sidebar) line up with the board's visible top edge instead of its invisible square box. */
export const BOARD_TOP_INSET_RATIO = (CENTER - NUMBER_RING_OUTER * BOARD_RADIUS) / VIEWBOX_SIZE

const DARK_SINGLE = '#1a1a1a'
const LIGHT_SINGLE = '#f0e6d2'
const RED_ACCENT = '#c62828'
const GREEN_ACCENT = '#2e7d32'
const RIM_COLOR = '#111111'

interface DartboardProps {
  onThrow: (hit: BoardThrow) => void
  /** Darts already thrown this turn, before the upcoming click - used only to know when to clear the previous turn's click markers. */
  currentTurnDartCount: number
  /**
   * Increment this once per Undo click. A plain dart-count comparison can't
   * tell "turn ended normally" (marks should stay) apart from "undo removed
   * a dart" (its marker should go too) - both drop the count the same way -
   * so this is an explicit signal instead of an inferred one.
   */
  undoSignal: number
}

interface Mark {
  x: number
  y: number
}

const MARK_RADIUS = 7
const MARK_DOT_RADIUS = 2.5

export function Dartboard({ onThrow, currentTurnDartCount, undoSignal }: DartboardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [marks, setMarks] = useState<Mark[]>([])

  useEffect(() => {
    if (undoSignal === 0) return
    setMarks((prev) => prev.slice(0, -1))
  }, [undoSignal])

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const scale = VIEWBOX_SIZE / rect.width
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = (event.clientX - centerX) * scale
    const dy = (event.clientY - centerY) * scale

    // currentTurnDartCount === 0 means this click starts a fresh turn, so the
    // previous turn's marks should disappear now rather than keep accumulating.
    const mark: Mark = { x: CENTER + dx, y: CENTER + dy }
    setMarks((prev) => (currentTurnDartCount === 0 ? [mark] : [...prev, mark]))

    const hit = resolvePoint(dx, dy, BOARD_RADIUS)
    onThrow({ segment: hit.segment, ring: hit.ring, ...scoreHit(hit) })
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      onClick={handleClick}
      role="img"
      aria-label="Dartboard"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <rect x={0} y={0} width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill="transparent" />

      <circle cx={CENTER} cy={CENTER} r={NUMBER_RING_OUTER * BOARD_RADIUS} fill={RIM_COLOR} />

      {SEGMENT_ORDER.map((segmentValue, i) => {
        const { startAngle, endAngle, centerAngle } = wedgeAngles(i)
        const isDark = i % 2 === 0
        const singleFill = isDark ? DARK_SINGLE : LIGHT_SINGLE
        const accentFill = isDark ? RED_ACCENT : GREEN_ACCENT
        const labelRadius = BOARD_RADIUS * ((RING_RADII.doubleOuter + NUMBER_RING_OUTER) / 2)
        const labelPos = polarToCartesian(CENTER, CENTER, labelRadius, centerAngle)

        return (
          <g key={segmentValue}>
            <path
              d={describeAnnulusSector(
                CENTER,
                CENTER,
                RING_RADII.doubleInner * BOARD_RADIUS,
                RING_RADII.doubleOuter * BOARD_RADIUS,
                startAngle,
                endAngle,
              )}
              fill={accentFill}
            />
            <path
              d={describeAnnulusSector(
                CENTER,
                CENTER,
                RING_RADII.trebleOuter * BOARD_RADIUS,
                RING_RADII.doubleInner * BOARD_RADIUS,
                startAngle,
                endAngle,
              )}
              fill={singleFill}
            />
            <path
              d={describeAnnulusSector(
                CENTER,
                CENTER,
                RING_RADII.trebleInner * BOARD_RADIUS,
                RING_RADII.trebleOuter * BOARD_RADIUS,
                startAngle,
                endAngle,
              )}
              fill={accentFill}
            />
            <path
              d={describeAnnulusSector(
                CENTER,
                CENTER,
                RING_RADII.outerBull * BOARD_RADIUS,
                RING_RADII.trebleInner * BOARD_RADIUS,
                startAngle,
                endAngle,
              )}
              fill={singleFill}
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={18}
              fontWeight={600}
              fill="#ffffff"
            >
              {segmentValue}
            </text>
          </g>
        )
      })}

      <circle cx={CENTER} cy={CENTER} r={RING_RADII.outerBull * BOARD_RADIUS} fill={GREEN_ACCENT} />
      <circle cx={CENTER} cy={CENTER} r={RING_RADII.bullseye * BOARD_RADIUS} fill={RED_ACCENT} />

      {marks.map((mark, i) => (
        <g key={i}>
          <circle cx={mark.x} cy={mark.y} r={MARK_RADIUS} fill="#ffffff" stroke="#000000" strokeWidth={2} />
          <circle cx={mark.x} cy={mark.y} r={MARK_DOT_RADIUS} fill="#000000" />
        </g>
      ))}
    </svg>
  )
}
