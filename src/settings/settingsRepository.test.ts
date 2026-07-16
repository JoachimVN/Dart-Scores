import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings, updateSettings } from './settingsRepository'

beforeEach(() => {
  localStorage.clear()
})

describe('getSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getSettings()).toEqual({
      useDartNotation: true,
      theme: 'system',
      showCheckoutSuggestions: true,
      requireTurnConfirmation: false,
      showMissButton: false,
    })
  })
})

describe('updateSettings', () => {
  it('persists a partial patch, keeping other fields unchanged', () => {
    updateSettings({ useDartNotation: false })
    expect(getSettings()).toEqual({
      useDartNotation: false,
      theme: 'system',
      showCheckoutSuggestions: true,
      requireTurnConfirmation: false,
      showMissButton: false,
    })
  })

  it('can update just the theme independently', () => {
    updateSettings({ theme: 'dark' })
    expect(getSettings()).toEqual({
      useDartNotation: true,
      theme: 'dark',
      showCheckoutSuggestions: true,
      requireTurnConfirmation: false,
      showMissButton: false,
    })
  })
})
