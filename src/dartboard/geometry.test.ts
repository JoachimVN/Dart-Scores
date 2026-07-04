import { describe, expect, it } from 'vitest'
import {
  SEGMENT_ORDER,
  WEDGE_ANGLE_DEG,
  normalizeAngle,
  polarToCartesian,
  segmentIndexForAngle,
  segmentValueForAngle,
  wedgeAngles,
} from './geometry'

describe('SEGMENT_ORDER', () => {
  it('has 20 unique segment values 1-20', () => {
    expect(SEGMENT_ORDER).toHaveLength(20)
    expect(new Set(SEGMENT_ORDER).size).toBe(20)
    for (const value of SEGMENT_ORDER) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(20)
    }
  })

  it('starts with 20 at the top wedge', () => {
    expect(SEGMENT_ORDER[0]).toBe(20)
  })
})

describe('wedgeAngles', () => {
  it('centers wedge 0 at 0 degrees (straight up)', () => {
    const { startAngle, centerAngle, endAngle } = wedgeAngles(0)
    expect(centerAngle).toBe(0)
    expect(startAngle).toBe(-9)
    expect(endAngle).toBe(9)
  })

  it('spans exactly 360 degrees across all 20 wedges', () => {
    const totalSpan = SEGMENT_ORDER.length * WEDGE_ANGLE_DEG
    expect(totalSpan).toBe(360)
  })
})

describe('normalizeAngle', () => {
  it('wraps negative angles into [0, 360)', () => {
    expect(normalizeAngle(-10)).toBe(350)
    expect(normalizeAngle(370)).toBe(10)
    expect(normalizeAngle(0)).toBe(0)
  })
})

describe('segmentIndexForAngle / segmentValueForAngle', () => {
  it('maps 0 degrees (straight up) to segment 20', () => {
    expect(segmentIndexForAngle(0)).toBe(0)
    expect(segmentValueForAngle(0)).toBe(20)
  })

  it('maps an angle just inside a wedge boundary correctly', () => {
    expect(segmentValueForAngle(8.9)).toBe(20)
    expect(segmentValueForAngle(9.1)).toBe(1)
  })

  it('maps a negative (wrapped) angle to the last wedge', () => {
    expect(segmentValueForAngle(-10)).toBe(5)
  })
})

describe('polarToCartesian', () => {
  it('places 0 degrees directly above center', () => {
    const p = polarToCartesian(100, 100, 50, 0)
    expect(p.x).toBeCloseTo(100)
    expect(p.y).toBeCloseTo(50)
  })

  it('places 90 degrees directly to the right of center', () => {
    const p = polarToCartesian(100, 100, 50, 90)
    expect(p.x).toBeCloseTo(150)
    expect(p.y).toBeCloseTo(100)
  })
})
