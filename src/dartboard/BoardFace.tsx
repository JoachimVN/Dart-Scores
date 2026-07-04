import type { Ref } from 'react'
import { RING_RADII, SEGMENT_ORDER, describeAnnulusSector, polarToCartesian, wedgeAngles } from './geometry'

export const VIEWBOX_SIZE = 560
export const CENTER = VIEWBOX_SIZE / 2
export const BOARD_RADIUS = 190
/** Radius of the black rim/number ring beyond the double ring, as a fraction of BOARD_RADIUS. */
export const NUMBER_RING_OUTER = 1.28

/** Empty space between the top of the square SVG and the top of the drawn rim circle, as a fraction of the rendered board size - lets other UI (e.g. a sidebar) line up with the board's visible top edge instead of its invisible square box. */
export const BOARD_TOP_INSET_RATIO = (CENTER - NUMBER_RING_OUTER * BOARD_RADIUS) / VIEWBOX_SIZE

const DARK_SINGLE = '#1a1a1a'
const LIGHT_SINGLE = '#f0e6d2'
const RED_ACCENT = '#c62828'
const GREEN_ACCENT = '#2e7d32'
const RIM_COLOR = '#111111'

interface BoardFaceProps {
  svgRef?: Ref<SVGSVGElement>
  onClick?: (event: React.MouseEvent<SVGSVGElement>) => void
  /** Extra SVG content layered on top, in the same viewBox coordinate space (e.g. click/shot markers). */
  children?: React.ReactNode
}

/**
 * The static board visuals (wedges, rim, bulls) shared by the interactive,
 * clickable Dartboard and the read-only ShotsBoard recap - so the ~100 lines
 * of wedge-rendering math and colors live in exactly one place.
 */
export function BoardFace({ svgRef, onClick, children }: BoardFaceProps) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      onClick={onClick}
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

      {children}
    </svg>
  )
}
