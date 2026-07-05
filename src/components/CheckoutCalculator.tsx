import { getCheckoutOptions } from '../game/checkout/checkoutCalculator'
import { ThrowBadge } from './ThrowBadge'
import { Panel } from './ui/Panel'

interface CheckoutCalculatorProps {
  remaining: number
  dartsAvailable: number
  doubleOut: boolean
}

const MAX_OPTIONS = 8

export function CheckoutCalculator({ remaining, dartsAvailable, doubleOut }: CheckoutCalculatorProps) {
  const options = getCheckoutOptions(remaining, dartsAvailable, doubleOut, MAX_OPTIONS)

  return (
    <Panel title="Checkout">
      {options.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
          {/* The first combo is the recommended one - emphasized with the accent tint. */}
          {options.map((combo, i) => (
            <li
              key={`${combo.join('-')}-${i}`}
              className={
                'flex items-center gap-1.5 ' +
                (i === 0 ? '-mx-1.5 rounded-(--radius-sm) bg-accent-soft px-1.5 py-1' : '')
              }
            >
              <span className="min-w-[1.2em] text-[13px] text-ink-muted">{i + 1}.</span>
              {combo.map((label, j) => (
                <ThrowBadge key={`${label}-${j}`} label={label} compact={i !== 0} />
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm text-ink-muted">No checkout available</span>
      )}
    </Panel>
  )
}
