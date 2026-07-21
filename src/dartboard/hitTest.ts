import type { HitResult } from './dartboard.types'
import { RING_RADII, normalizeAngle, segmentValueForAngle } from './geometry'

/**
 * Converts a click offset from board center (dx, dy, screen coords where
 * +y is down) into (radius, angle clockwise-from-up) matching the
 * convention used throughout geometry.ts.
 */
export function toPolar(dx: number, dy: number): { radius: number; angleDeg: number } {
  const radius = Math.hypot(dx, dy)
  const angleDeg = normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI)
  return { radius, angleDeg }
}

/**
 * Resolves a hit given a radius (as a fraction of the board radius, R = 1)
 * and an angle (clockwise-from-up, degrees) into a segment + ring.
 */
export function resolveHit(radius: number, angleDeg: number): HitResult {
  if (radius <= RING_RADII.bullseye) {
    return { segment: null, ring: 'bullseye' }
  }
  if (radius <= RING_RADII.outerBull) {
    return { segment: null, ring: 'outerBull' }
  }
  if (radius > RING_RADII.doubleOuter) {
    return { segment: null, ring: 'miss' }
  }

  const segment = segmentValueForAngle(angleDeg)

  if (radius <= RING_RADII.trebleInner) {
    return { segment, ring: 'innerSingle' }
  }
  if (radius <= RING_RADII.trebleOuter) {
    return { segment, ring: 'treble' }
  }
  if (radius <= RING_RADII.doubleInner) {
    return { segment, ring: 'outerSingle' }
  }
  return { segment, ring: 'double' }
}

/**
 * Resolves a click given its offset from board center in pixels and the
 * board's pixel radius (i.e. R = 1 in board-normalized units).
 */
export function resolvePoint(dx: number, dy: number, boardRadiusPx: number): HitResult {
  const { radius, angleDeg } = toPolar(dx, dy)
  return resolveHit(radius / boardRadiusPx, angleDeg)
}
