import type { CricketNumber } from '../game/cricket/cricketTypes'

const AVAILABLE_NUMBERS: CricketNumber[] = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25]

interface CricketNumberPickerProps {
  readonly numbers: CricketNumber[]
  readonly onChange: (numbers: CricketNumber[]) => void
}

/** Choose exactly which board targets count in this Cricket game. */
export function CricketNumberPicker({ numbers, onChange }: CricketNumberPickerProps) {
  function toggle(number: CricketNumber) {
    if (numbers.includes(number)) {
      if (numbers.length === 1) return
      onChange(numbers.filter((selected) => selected !== number))
      return
    }
    onChange([...numbers, number].sort((a, b) => (a === 25 ? 1 : b === 25 ? -1 : b - a)))
  }

  return (
    <fieldset className="m-0 border-none p-0">
      <legend className="mb-2 p-0 text-sm font-medium">Cricket targets</legend>
      <p className="mb-3 text-sm text-ink-muted">Choose the numbers to close. At least one target is required.</p>
      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-11">
        {AVAILABLE_NUMBERS.map((number) => {
          const selected = numbers.includes(number)
          return (
            <button
              key={number}
              type="button"
              aria-pressed={selected}
              aria-label={number === 25 ? 'Bull' : String(number)}
              disabled={selected && numbers.length === 1}
              onClick={() => toggle(number)}
              className={
                'h-9 cursor-pointer rounded-(--radius-md) text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ' +
                (selected ? 'bg-accent text-on-accent hover:bg-accent-hover' : 'bg-sunken text-ink-muted hover:text-ink')
              }
            >
              {number === 25 ? 'Bull' : number}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
