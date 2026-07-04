import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings, updateSettings } from './settingsRepository'

beforeEach(() => {
  localStorage.clear()
})

describe('getSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getSettings()).toEqual({ useDartNotation: true })
  })
})

describe('updateSettings', () => {
  it('persists a partial patch, keeping other fields unchanged', () => {
    updateSettings({ useDartNotation: false })
    expect(getSettings()).toEqual({ useDartNotation: false })
  })
})
