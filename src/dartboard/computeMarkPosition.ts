import type { Throw } from '../game/types'
import { BOARD_RADIUS, CENTER, NUMBER_RING_OUTER } from './BoardFace'
import { RING_RADII, SEGMENT_ORDER, type Point, polarToCartesian, wedgeAngles } from './geometry'

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

function ringBandFor(ring: Throw['ring']): RingBand {
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
    case 'miss':
      return { innerFraction: NUMBER_RING_OUTER, outerFraction: NUMBER_RING_OUTER + 0.15 }
  }
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
