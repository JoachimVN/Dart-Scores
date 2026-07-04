/**
 * All angles in this module use a single convention: degrees measured
 * clockwise from straight up (12 o'clock), matching how a dartboard is
 * visually laid out with "20" at top. This keeps rendering and hit-testing
 * in agreement without an extra mental offset.
 */

export const WEDGE_ANGLE_DEG = 18

/** Segment values in clockwise order starting from the wedge centered at 0deg (straight up). */
export const SEGMENT_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const

/**
 * Ring radii as fractions of the overall board radius (R = 1).
 * Tune proportions here; everything else derives from these values.
 * Deliberately not to regulation scale - bull and double/treble rings are
 * enlarged well beyond a real board so they're easy to tap accurately.
 */
export const RING_RADII = {
  bullseye: 0.08,
  outerBull: 0.16,
  trebleInner: 0.45,
  trebleOuter: 0.58,
  doubleInner: 0.88,
  doubleOuter: 1.0,
} as const

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Normalizes an angle in degrees to the range [0, 360). */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export interface Point {
  x: number
  y: number
}

/** Converts (radius, angle clockwise-from-up) to cartesian coordinates centered on (cx, cy). */
export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): Point {
  const rad = toRadians(angleDeg)
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  }
}

export interface WedgeAngles {
  startAngle: number
  centerAngle: number
  endAngle: number
}

/** Returns the angular span (clockwise-from-up, degrees) of the i-th wedge in SEGMENT_ORDER. */
export function wedgeAngles(index: number): WedgeAngles {
  const centerAngle = index * WEDGE_ANGLE_DEG
  return {
    startAngle: centerAngle - WEDGE_ANGLE_DEG / 2,
    centerAngle,
    endAngle: centerAngle + WEDGE_ANGLE_DEG / 2,
  }
}

/** Maps a clockwise-from-up angle to the SEGMENT_ORDER index whose wedge contains it. */
export function segmentIndexForAngle(angleDeg: number): number {
  const shifted = normalizeAngle(angleDeg + WEDGE_ANGLE_DEG / 2)
  return Math.floor(shifted / WEDGE_ANGLE_DEG)
}

/** Maps a clockwise-from-up angle to the segment value (1-20) whose wedge contains it. */
export function segmentValueForAngle(angleDeg: number): number {
  return SEGMENT_ORDER[segmentIndexForAngle(angleDeg)]
}

/**
 * Builds an SVG path `d` string for one annulus sector (a "donut slice"):
 * the region between rInner and rOuter, spanning startAngle to endAngle
 * (clockwise-from-up, degrees). Each dartboard wedge is 18deg, so the
 * large-arc-flag is always 0.
 */
export function describeAnnulusSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, rOuter, startAngle)
  const outerEnd = polarToCartesian(cx, cy, rOuter, endAngle)
  const innerEnd = polarToCartesian(cx, cy, rInner, endAngle)
  const innerStart = polarToCartesian(cx, cy, rInner, startAngle)

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}
