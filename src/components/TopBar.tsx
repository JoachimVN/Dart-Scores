import { useEffect, useRef, useState } from 'react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import type { Settings, Theme } from '../storage/schema'
import { Button } from './ui/Button'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function ThemePicker({ theme, onChange }: Readonly<{ theme: Theme; onChange: (theme: Theme) => void }>) {
  return (
    <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
      {THEMES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => onChange(value)}
          className={
            'h-8 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-sm font-semibold transition-colors ' +
            (theme === value ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

interface ToggleRowProps {
  readonly label: string
  readonly hint?: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}

function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 bg-transparent p-0 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={
          'relative h-5.5 w-9.5 shrink-0 rounded-full transition-colors ' +
          (checked ? 'bg-accent' : 'bg-line-strong')
        }
      >
        <span
          className={
            'absolute top-0.5 left-0.5 h-4.5 w-4.5 rounded-full bg-card shadow-sm transition-transform ' +
            (checked ? 'translate-x-4' : '')
          }
        />
      </span>
    </button>
  )
}

interface TopBarProps {
  /** Static label for now (only X01 exists); a slot ready for when more modes are added. */
  modeLabel?: string
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
  onOpenStats: () => void
  onResetAllData: () => void
  /** Active play uses only the Settings control, without the app header. */
  compact?: boolean
}

export function TopBar({ modeLabel, settings, onSettingsChange, onOpenStats, onResetAllData, compact = false }: Readonly<TopBarProps>) {
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
    <div
      className={
        compact
          ? 'fixed top-4 right-4 z-30 flex justify-end'
          : 'mb-6 flex items-center justify-between border-b border-line pb-3'
      }
    >
      {!compact && (
        <div className="flex items-baseline gap-2.5">
          <span className="text-lg font-bold tracking-tight">Dart Scores</span>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
            {modeLabel ?? 'X01'}
          </span>
        </div>
      )}

      <div className="relative flex gap-2" ref={panelRef}>
        {!compact && canInstall && (
          <Button variant="ghost" size="sm" onClick={promptInstall}>
            Install
          </Button>
        )}
        {!compact && (
          <Button variant="ghost" size="sm" onClick={onOpenStats}>
            Stats
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen((open) => !open)}>
          Settings
        </Button>

        {settingsOpen && (
          <div className="absolute top-full right-0 z-10 mt-2 flex w-72 flex-col gap-3 rounded-(--radius-lg) border border-line bg-card p-4 shadow-lg">
            <ThemePicker theme={settings.theme} onChange={(theme) => onSettingsChange({ theme })} />

            <div className="flex flex-col gap-3 border-t border-line pt-3">
              <ToggleRow
                label="Dart notation"
                hint="T20 instead of 60"
                checked={settings.useDartNotation}
                onChange={(useDartNotation) => onSettingsChange({ useDartNotation })}
              />
              <ToggleRow
                label="Checkout suggestions"
                checked={settings.showCheckoutSuggestions}
                onChange={(showCheckoutSuggestions) => onSettingsChange({ showCheckoutSuggestions })}
              />
              <ToggleRow
                label="Confirm turn end"
                hint="Done button instead of auto-advance"
                checked={settings.requireTurnConfirmation}
                onChange={(requireTurnConfirmation) => onSettingsChange({ requireTurnConfirmation })}
              />
              <ToggleRow
                label="Miss button"
                hint="Log darts that miss the board"
                checked={settings.showMissButton}
                onChange={(showMissButton) => onSettingsChange({ showMissButton })}
              />
            </div>

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
