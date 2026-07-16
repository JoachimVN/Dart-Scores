import type { Throw } from '../game/types'
import { BOARD_RADIUS, CENTER, NUMBER_RING_OUTER } from './BoardFace'
import { EDGE_INSET } from './DartMark'
import { RING_RADII, SEGMENT_ORDER, type Point, polarToCartesian, toRadians, wedgeAngles } from './geometry'

/** Deterministic pseudo-random value in [-0.5, 0.5], seeded by a string - stable across re-renders. */
function jitter(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0
  return ((h >>> 0) % 10000) / 10000 - 0.5
}

interface RingBand {
  innerFraction: number
  outerFraction: number
}

function ringBandFor(ring: Exclude<Throw['ring'], 'miss'>): RingBand {
  switch (ring) {
    case 'bullseye':
      return { innerFraction: 0, outerFraction: RING_RADII.bullseye }
    case 'outerBull':
      return { innerFraction: RING_RADII.bullseye, outerFraction: RING_RADII.outerBull }
    case 'innerSingle':
      return { innerFraction: RING_RADII.outerBull, outerFraction: RING_RADII.trebleInner }
    case 'treble':
      return { innerFraction: RING_RADII.trebleInner, outerFraction: RING_RADII.trebleOuter }
    case 'outerSingle':
      return { innerFraction: RING_RADII.trebleOuter, outerFraction: RING_RADII.doubleInner }
    case 'double':
      return { innerFraction: RING_RADII.doubleInner, outerFraction: RING_RADII.doubleOuter }
  }
}

/**
 * A miss has no ring band to sit in - scatter it anywhere between the
 * board's rim and the viewbox edge. The usable radius depends on direction
 * (the viewbox is square, so the corners reach much further than the
 * cardinal directions), which is exactly what keeps misses from lining up
 * in a neat ring around the rim.
 */
function computeMissPosition(throwData: Throw): Point {
  const angle = jitter(throwData.id + 'a') * 360
  const rad = toRadians(angle)
  // polarToCartesian maps angle -> (sin, -cos), so |sin| governs how soon the
  // ray exits the viewbox horizontally and |cos| vertically.
  const maxRadius = (CENTER - EDGE_INSET) / Math.max(Math.abs(Math.sin(rad)), Math.abs(Math.cos(rad)))
  const minRadius = NUMBER_RING_OUTER * BOARD_RADIUS
  const radius = minRadius + (0.5 + jitter(throwData.id + 'r')) * (maxRadius - minRadius)
  return polarToCartesian(CENTER, CENTER, radius, angle)
}

/**
 * Approximates where a historical dart landed, for the shots recap board.
 * Exact click coordinates aren't persisted (a Throw only records
 * segment/ring/value), so this places a mark at a jittered point within the
 * correct wedge/ring band - close enough to show the shape of a game's shots
 * without claiming pixel-perfect accuracy. The jitter is seeded by the
 * throw's id, so repeated darts in the same spot visibly scatter instead of
 * stacking exactly on top of each other, and positions are stable across
 * re-renders.
 */
export function computeMarkPosition(throwData: Throw): Point {
  if (throwData.ring === 'miss') return computeMissPosition(throwData)

  const { innerFraction, outerFraction } = ringBandFor(throwData.ring)
  const radiusFraction = innerFraction + (0.5 + jitter(throwData.id + 'r') * 0.8) * (outerFraction - innerFraction)
  const radius = radiusFraction * BOARD_RADIUS

  if (throwData.segment !== null && throwData.ring !== 'bullseye' && throwData.ring !== 'outerBull') {
    const index = (SEGMENT_ORDER as readonly number[]).indexOf(throwData.segment)
    const { centerAngle, startAngle, endAngle } = wedgeAngles(index)
    const angle = centerAngle + jitter(throwData.id + 'a') * (endAngle - startAngle) * 0.8
    return polarToCartesian(CENTER, CENTER, radius, angle)
  }

  const angle = jitter(throwData.id + 'a') * 360
  return polarToCartesian(CENTER, CENTER, radius, angle)
}
