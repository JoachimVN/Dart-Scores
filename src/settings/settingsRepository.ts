import type { Settings } from '../storage/schema'
import { loadRoot, saveRoot } from '../storage/storage'

export function getSettings(): Settings {
  return loadRoot().settings
}

export function updateSettings(patch: Partial<Settings>): void {
  const root = loadRoot()
  saveRoot({ ...root, settings: { ...root.settings, ...patch } })
}
