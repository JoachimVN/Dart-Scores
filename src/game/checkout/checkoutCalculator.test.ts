import { describe, expect, it } from 'vitest'
import { getCheckoutOptions } from './checkoutCalculator'

describe('getCheckoutOptions (double out)', () => {
  it('lists the famous 170 checkout first: T20, T20, Bull', () => {
    const options = getCheckoutOptions(170, 3, true)
    expect(options[0]).toEqual(['T20', 'T20', 'Bull'])
  })

  it('prefers the fewest darts - 40 finishes on a single D20, not a longer sequence', () => {
    expect(getCheckoutOptions(40, 3, true)).toEqual([['D20']])
  })

  it('lists the standard 2-dart 100 checkout first: T20, D20', () => {
    const options = getCheckoutOptions(100, 3, true)
    expect(options[0]).toEqual(['T20', 'D20'])
  })

  it('returns multiple distinct options when more than one exists at the minimal dart count', () => {
    const options = getCheckoutOptions(100, 3, true)
    expect(options.length).toBeGreaterThan(1)
    for (const combo of options) {
      expect(totalValue(combo)).toBe(100)
      expect(isFinishingLabel(combo.at(-1)!)).toBe(true)
    }
  })

  it('never returns the same darts in a different order as a separate option', () => {
    const options = getCheckoutOptions(100, 3, true)
    const signatures = options.map((combo) => [...combo].sort().join(','))
    expect(new Set(signatures).size).toBe(signatures.length)
  })

  it('caps the number of options at the given limit', () => {
    const options = getCheckoutOptions(100, 3, true, 2)
    expect(options.length).toBeLessThanOrEqual(2)
  })

  it('every option for a valid 3-dart finish sums correctly and ends on a finishing dart', () => {
    const options = getCheckoutOptions(121, 3, true)
    expect(options.length).toBeGreaterThan(0)
    for (const combo of options) {
      expect(combo).toHaveLength(3)
      expect(totalValue(combo)).toBe(121)
      expect(isFinishingLabel(combo.at(-1)!)).toBe(true)
    }
  })

  it('returns an empty array for scores above the maximum 170 checkout', () => {
    expect(getCheckoutOptions(171, 3, true)).toEqual([])
  })

  it('returns an empty array for a bogey number with no valid double-out finish', () => {
    expect(getCheckoutOptions(169, 3, true)).toEqual([])
    expect(getCheckoutOptions(168, 3, true)).toEqual([])
  })

  it('returns an empty array when reaching exactly 1 (can never finish from 1)', () => {
    expect(getCheckoutOptions(1, 3, true)).toEqual([])
  })

  it('respects a reduced number of darts available (e.g. 1 dart left this turn)', () => {
    expect(getCheckoutOptions(100, 1, true)).toEqual([]) // needs 2 darts minimum
    expect(getCheckoutOptions(40, 1, true)).toEqual([['D20']])
  })

  it('returns an empty array for 0 or negative remaining, or 0 darts available', () => {
    expect(getCheckoutOptions(0, 3, true)).toEqual([])
    expect(getCheckoutOptions(40, 0, true)).toEqual([])
  })
})

describe('getCheckoutOptions (straight out, no double required)', () => {
  it('allows finishing on a non-double single dart when no other candidate matches', () => {
    // 19 has no double/treble/bull equivalent, so it must fall back to the plain single.
    expect(getCheckoutOptions(19, 3, false)).toEqual([['19']])
  })
})

function totalValue(combo: string[]): number {
  return combo.reduce((sum, label) => sum + dartValue(label), 0)
}

function dartValue(label: string): number {
  if (label === 'Bull') return 50
  if (label === '25') return 25
  if (label.startsWith('T')) return Number(label.slice(1)) * 3
  if (label.startsWith('D')) return Number(label.slice(1)) * 2
  return Number(label)
}

function isFinishingLabel(label: string): boolean {
  return label === 'Bull' || label.startsWith('D')
}
