import { describe, expect, it } from 'vitest'
import { BOARD_RADIUS, CENTER, NUMBER_RING_OUTER } from './BoardFace'
import { computeMarkPosition } from './computeMarkPosition'
import { RING_RADII } from './geometry'
import type { Throw } from '../game/types'

function throwOf(overrides: Partial<Throw>): Throw {
  return { id: 't1', segment: 20, ring: 'innerSingle', value: 20, label: '20', timestamp: 0, ...overrides }
}

function distanceFromCenter(x: number, y: number): number {
  return Math.hypot(x - CENTER, y - CENTER)
}

describe('computeMarkPosition', () => {
  it('places a treble dart within the treble ring band', () => {
    const pos = computeMarkPosition(throwOf({ id: 'a', segment: 20, ring: 'treble' }))
    const dist = distanceFromCenter(pos.x, pos.y)
    expect(dist).toBeGreaterThanOrEqual(RING_RADII.trebleInner * BOARD_RADIUS)
    expect(dist).toBeLessThanOrEqual(RING_RADII.trebleOuter * BOARD_RADIUS)
  })

  it('places a bullseye dart within the bullseye radius, near center', () => {
    const pos = computeMarkPosition(throwOf({ id: 'b', segment: null, ring: 'bullseye' }))
    const dist = distanceFromCenter(pos.x, pos.y)
    expect(dist).toBeLessThanOrEqual(RING_RADII.bullseye * BOARD_RADIUS)
  })

  it('places a miss outside the drawn board', () => {
    const pos = computeMarkPosition(throwOf({ id: 'c', segment: null, ring: 'miss' }))
    const dist = distanceFromCenter(pos.x, pos.y)
    expect(dist).toBeGreaterThanOrEqual(NUMBER_RING_OUTER * BOARD_RADIUS)
  })

  it('is deterministic - the same throw id always yields the same position', () => {
    const t = throwOf({ id: 'stable', ring: 'double' })
    expect(computeMarkPosition(t)).toEqual(computeMarkPosition(t))
  })

  it('scatters repeated same-spot darts instead of stacking exactly', () => {
    const posA = computeMarkPosition(throwOf({ id: 'dart-1', segment: 20, ring: 'treble' }))
    const posB = computeMarkPosition(throwOf({ id: 'dart-2', segment: 20, ring: 'treble' }))
    expect(posA).not.toEqual(posB)
  })
})
