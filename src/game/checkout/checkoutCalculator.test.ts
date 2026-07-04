import { describe, expect, it } from 'vitest'
import { getCheckoutSuggestion } from './checkoutCalculator'

describe('getCheckoutSuggestion (double out)', () => {
  it('suggests the famous 170 checkout: T20, T20, Bull', () => {
    expect(getCheckoutSuggestion(170, 3, true)).toEqual(['T20', 'T20', 'Bull'])
  })

  it('prefers the fewest darts - 40 finishes on a single D20, not a longer sequence', () => {
    expect(getCheckoutSuggestion(40, 3, true)).toEqual(['D20'])
  })

  it('suggests the standard 2-dart 100 checkout: T20, D20', () => {
    expect(getCheckoutSuggestion(100, 3, true)).toEqual(['T20', 'D20'])
  })

  it('suggests the standard 121 checkout: T20, 11, D16 (or an equivalent 3-dart finish)', () => {
    const result = getCheckoutSuggestion(121, 3, true)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(3)
    const total = result!.reduce((sum, label) => sum + dartValue(label), 0)
    expect(total).toBe(121)
    expect(isFinishingLabel(result!.at(-1)!)).toBe(true)
  })

  it('returns null for scores above the maximum 170 checkout', () => {
    expect(getCheckoutSuggestion(171, 3, true)).toBeNull()
  })

  it('returns null for a bogey number with no valid double-out finish', () => {
    expect(getCheckoutSuggestion(169, 3, true)).toBeNull()
    expect(getCheckoutSuggestion(168, 3, true)).toBeNull()
  })

  it('returns null when reaching exactly 1 with fewer darts (can never finish from 1)', () => {
    expect(getCheckoutSuggestion(1, 3, true)).toBeNull()
  })

  it('respects a reduced number of darts available (e.g. 1 dart left this turn)', () => {
    expect(getCheckoutSuggestion(100, 1, true)).toBeNull() // needs 2 darts minimum
    expect(getCheckoutSuggestion(40, 1, true)).toEqual(['D20'])
  })

  it('returns null for 0 or negative remaining, or 0 darts available', () => {
    expect(getCheckoutSuggestion(0, 3, true)).toBeNull()
    expect(getCheckoutSuggestion(40, 0, true)).toBeNull()
  })
})

describe('getCheckoutSuggestion (straight out, no double required)', () => {
  it('allows finishing on a non-double single dart when no other candidate matches', () => {
    // 19 has no double/treble/bull equivalent, so it must fall back to the plain single.
    expect(getCheckoutSuggestion(19, 3, false)).toEqual(['19'])
  })

  it('still finds a same-value double ahead of the equivalent single (priority order, not a double-out requirement)', () => {
    expect(getCheckoutSuggestion(20, 3, false)).toEqual(['D10'])
  })
})

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
