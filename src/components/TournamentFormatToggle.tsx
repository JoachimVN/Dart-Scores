import type { TournamentConfig } from '../tournament/tournamentTypes'

type TournamentFormat = TournamentConfig['format']

interface TournamentFormatToggleProps {
  readonly format: TournamentFormat
  readonly onChange: (format: TournamentFormat) => void
}

const FORMAT_LABELS: Record<TournamentFormat, string> = { knockout: 'Knockout', round_robin: 'League' }
const FORMATS: TournamentFormat[] = ['knockout', 'round_robin']

export function TournamentFormatToggle({ format, onChange }: TournamentFormatToggleProps) {
  return (
    <fieldset className="m-0 border-none p-0">
      <legend className="mb-2 p-0 text-sm font-medium">Format</legend>
      <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={format === f}
            onClick={() => onChange(f)}
            className={
              'h-10 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-base font-semibold transition-colors ' +
              (format === f ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
            }
          >
            {FORMAT_LABELS[f]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
