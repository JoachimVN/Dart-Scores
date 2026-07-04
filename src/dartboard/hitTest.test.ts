import { describe, expect, it } from 'vitest'
import { RING_RADII } from './geometry'
import { resolveHit, resolvePoint, toPolar } from './hitTest'

const midpoint = (a: number, b: number) => (a + b) / 2

describe('resolveHit', () => {
  it('resolves bullseye at the center', () => {
    expect(resolveHit(0, 0)).toEqual({ segment: null, ring: 'bullseye' })
    expect(resolveHit(RING_RADII.bullseye / 2, 45)).toEqual({ segment: null, ring: 'bullseye' })
  })

  it('resolves outer bull just outside the bullseye', () => {
    const radius = midpoint(RING_RADII.bullseye, RING_RADII.outerBull)
    expect(resolveHit(radius, 0)).toEqual({ segment: null, ring: 'outerBull' })
  })

  it('resolves a miss outside the double ring', () => {
    expect(resolveHit(RING_RADII.doubleOuter * 1.5, 0)).toEqual({ segment: null, ring: 'miss' })
  })

  it('resolves double 20 in the double band, straight up', () => {
    const radius = midpoint(RING_RADII.doubleInner, RING_RADII.doubleOuter)
    expect(resolveHit(radius, 0)).toEqual({ segment: 20, ring: 'double' })
  })

  it('resolves treble 20 in the treble band, straight up', () => {
    const radius = midpoint(RING_RADII.trebleInner, RING_RADII.trebleOuter)
    expect(resolveHit(radius, 0)).toEqual({ segment: 20, ring: 'treble' })
  })

  it('resolves inner single just outside outer bull', () => {
    const radius = midpoint(RING_RADII.outerBull, RING_RADII.trebleInner)
    expect(resolveHit(radius, 0)).toEqual({ segment: 20, ring: 'innerSingle' })
  })

  it('resolves outer single between treble and double bands', () => {
    const radius = midpoint(RING_RADII.trebleOuter, RING_RADII.doubleInner)
    expect(resolveHit(radius, 0)).toEqual({ segment: 20, ring: 'outerSingle' })
  })
})

describe('toPolar', () => {
  it('treats straight up as angle 0', () => {
    const { radius, angleDeg } = toPolar(0, -50)
    expect(radius).toBeCloseTo(50)
    expect(angleDeg).toBeCloseTo(0)
  })

  it('treats straight right as angle 90', () => {
    const { angleDeg } = toPolar(50, 0)
    expect(angleDeg).toBeCloseTo(90)
  })

  it('treats straight down as angle 180', () => {
    const { angleDeg } = toPolar(0, 50)
    expect(angleDeg).toBeCloseTo(180)
  })

  it('treats straight left as angle 270', () => {
    const { angleDeg } = toPolar(-50, 0)
    expect(angleDeg).toBeCloseTo(270)
  })
})

describe('resolvePoint', () => {
  it('resolves a pixel click near the top edge to D20', () => {
    // board radius 100px, click 98px straight up from center
    expect(resolvePoint(0, -98, 100)).toEqual({ segment: 20, ring: 'double' })
  })

  it('resolves a pixel click at dead center to bullseye', () => {
    expect(resolvePoint(0, 0, 100)).toEqual({ segment: null, ring: 'bullseye' })
  })
})
