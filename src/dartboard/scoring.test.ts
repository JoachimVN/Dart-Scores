import { describe, expect, it } from 'vitest'
import { scoreHit } from './scoring'

describe('scoreHit', () => {
  it('scores treble 20 as T20 = 60', () => {
    expect(scoreHit({ segment: 20, ring: 'treble' })).toEqual({ label: 'T20', value: 60 })
  })

  it('scores double 16 as D16 = 32', () => {
    expect(scoreHit({ segment: 16, ring: 'double' })).toEqual({ label: 'D16', value: 32 })
  })

  it('scores outer bull as 25', () => {
    expect(scoreHit({ segment: null, ring: 'outerBull' })).toEqual({ label: '25', value: 25 })
  })

  it('scores bullseye as 50', () => {
    expect(scoreHit({ segment: null, ring: 'bullseye' })).toEqual({ label: '50', value: 50 })
  })

  it('scores a single as its plain segment value', () => {
    expect(scoreHit({ segment: 5, ring: 'innerSingle' })).toEqual({ label: '5', value: 5 })
    expect(scoreHit({ segment: 5, ring: 'outerSingle' })).toEqual({ label: '5', value: 5 })
  })

  it('scores a miss as 0', () => {
    expect(scoreHit({ segment: null, ring: 'miss' })).toEqual({ label: 'MISS', value: 0 })
  })
})
