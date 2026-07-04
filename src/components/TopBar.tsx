import { useEffect, useRef, useState } from 'react'
import type { Settings, Theme } from '../storage/schema'

interface TopBarProps {
  /** Static label for now (only X01 exists); a slot ready for when more modes are added. */
  modeLabel?: string
  settings: Settings
  onSettingsChange: (patch: Partial<Settings>) => void
  onOpenStats: () => void
}

export function TopBar({ modeLabel, settings, onSettingsChange, onOpenStats }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <strong>{modeLabel ?? 'Dart Scores'}</strong>

      <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={panelRef}>
        <button type="button" onClick={onOpenStats}>
          Stats
        </button>
        <button type="button" onClick={() => setSettingsOpen((open) => !open)}>
          Settings
        </button>

        {settingsOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              padding: 16,
              minWidth: 240,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              Theme
              <select
                value={settings.theme}
                onChange={(e) => onSettingsChange({ theme: e.target.value as Theme })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={settings.useDartNotation}
                onChange={(e) => onSettingsChange({ useDartNotation: e.target.checked })}
              />{' '}
              Show dart notation (T20) instead of points (60)
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
