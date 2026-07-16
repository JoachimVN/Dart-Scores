import { describe, expect, it } from 'vitest'
import { derangement, shuffle } from './random'

describe('shuffle', () => {
  it('does not mutate the input', () => {
    const items = [1, 2, 3, 4, 5]
    const copy = [...items]
    shuffle(items)
    expect(items).toEqual(copy)
  })

  it('keeps the same elements', () => {
    const items = [1, 2, 3, 4, 5]
    expect(shuffle(items).sort()).toEqual(items.sort())
  })
})

describe('derangement', () => {
  it('returns short inputs unchanged', () => {
    expect(derangement([])).toEqual([])
    expect(derangement([1])).toEqual([1])
  })

  it('always swaps a 2-element input', () => {
    expect(derangement([1, 2])).toEqual([2, 1])
  })

  it('never leaves any element in its original position', () => {
    const items = [1, 2, 3, 4, 5, 6]
    for (let i = 0; i < 200; i++) {
      const result = derangement(items)
      expect(result).not.toBe(items)
      result.forEach((item, index) => expect(item).not.toBe(items[index]))
    }
  })

  it('keeps the same elements', () => {
    const items = ['a', 'b', 'c', 'd']
    expect([...derangement(items)].sort()).toEqual([...items].sort())
  })
})
