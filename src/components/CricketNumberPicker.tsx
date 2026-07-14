import { cricketTargetLabel, type CricketTarget } from '../game/cricket/cricketTypes'

const AVAILABLE_NUMBERS: number[] = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25]
const MULTIPLIER_TARGETS: CricketTarget[] = ['double', 'triple']

interface CricketNumberPickerProps {
  readonly targets: CricketTarget[]
  readonly onChange: (targets: CricketTarget[]) => void
}

/** Choose exactly which board targets count in this Cricket game. */
export function CricketNumberPicker({ targets, onChange }: CricketNumberPickerProps) {
  function toggle(target: CricketTarget) {
    if (targets.includes(target)) {
      onChange(targets.filter((selected) => selected !== target))
      return
    }
    onChange(
      [...targets, target].sort((a, b) => {
        if (typeof a === 'string') return 1
        if (typeof b === 'string') return -1
        if (a === 25) return 1
        if (b === 25) return -1
        return b - a
      }),
    )
  }

  return (
    <fieldset className="m-0 border-none p-0">
      <legend className="mb-2 p-0 text-sm font-medium">Cricket targets</legend>
      <p className="mb-3 text-sm text-ink-muted">Choose the targets to close. Add Double or Triple to count any dart in that ring.</p>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-11">
        {AVAILABLE_NUMBERS.map((target) => {
          const selected = targets.includes(target)
          return (
            <button
              key={target}
              type="button"
              aria-pressed={selected}
              aria-label={cricketTargetLabel(target)}
              onClick={() => toggle(target)}
              className={
                'h-9 cursor-pointer rounded-(--radius-md) text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ' +
                (selected ? 'bg-accent text-on-accent hover:bg-accent-hover' : 'bg-sunken text-ink-muted hover:text-ink')
              }
            >
              {cricketTargetLabel(target)}
            </button>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {MULTIPLIER_TARGETS.map((target) => {
          const selected = targets.includes(target)
          return (
            <button
              key={target}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(target)}
              className={
                'h-9 cursor-pointer rounded-(--radius-md) text-sm font-semibold transition-colors ' +
                (selected ? 'bg-accent text-on-accent hover:bg-accent-hover' : 'bg-sunken text-ink-muted hover:text-ink')
              }
            >
              {cricketTargetLabel(target)}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
