import type { GameMode } from '../game/types'

interface GameModeToggleProps {
  readonly mode: GameMode
  readonly onChange: (mode: GameMode) => void
}

const MODE_LABELS: Record<GameMode, string> = { x01: 'X01', cricket: 'Cricket' }
const MODES: GameMode[] = ['x01', 'cricket']

export function GameModeToggle({ mode, onChange }: GameModeToggleProps) {
  return (
    <fieldset className="m-0 border-none p-0">
      <legend className="mb-2 p-0 text-sm font-medium">Game mode</legend>
      <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onChange(m)}
            className={
              'h-10 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-base font-semibold transition-colors ' +
              (mode === m ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
            }
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
