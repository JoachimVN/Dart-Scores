import { useEffect, useRef, useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import type { Settings, Theme } from '../storage/schema'
import { Button } from './ui/Button'
import { selectClass } from './ui/Panel'

interface TopBarProps {
  /** Static label for now (only X01 exists); a slot ready for when more modes are added. */
  modeLabel?: string
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
  onOpenStats: () => void
  onResetAllData: () => void
}

export function TopBar({ modeLabel, settings, onSettingsChange, onOpenStats, onResetAllData }: Readonly<TopBarProps>) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { canInstall, promptInstall } = useInstallPrompt()

  function handleResetAllData() {
    if (globalThis.confirm('Reset all data? This deletes every player, game, and stat. This cannot be undone.')) {
      onResetAllData()
    }
  }

  useEffect(() => {
    if (!settingsOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

  return (
    <div className="mb-6 flex items-center justify-between border-b border-line pb-3">
      <div className="flex items-baseline gap-2.5">
        <span className="text-lg font-bold tracking-tight">Dart Scores</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
          {modeLabel ?? 'X01'}
        </span>
      </div>

      <div className="relative flex gap-2" ref={panelRef}>
        {canInstall && (
          <Button variant="ghost" size="sm" onClick={promptInstall}>
            Install
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onOpenStats}>
          Stats
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen((open) => !open)}>
          Settings
        </Button>

        {settingsOpen && (
          <div className="absolute top-full right-0 z-10 mt-2 flex w-64 flex-col gap-4 rounded-(--radius-lg) border border-line bg-card p-4 shadow-lg">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span>Theme</span>
              <select
                className={selectClass}
                value={settings.theme}
                onChange={(e) => onSettingsChange({ theme: e.target.value as Theme })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-(--accent)"
                checked={settings.useDartNotation}
                onChange={(e) => onSettingsChange({ useDartNotation: e.target.checked })}
              />
              <span>Show dart notation (T20) instead of points (60)</span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-(--accent)"
                checked={settings.showCheckoutSuggestions}
                onChange={(e) => onSettingsChange({ showCheckoutSuggestions: e.target.checked })}
              />
              <span>Show checkout suggestions</span>
            </label>

            <div className="border-t border-line pt-3">
              <Button variant="danger" size="sm" className="w-full" onClick={handleResetAllData}>
                Reset all data
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
