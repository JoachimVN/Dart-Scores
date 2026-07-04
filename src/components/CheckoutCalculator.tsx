import { getCheckoutOptions } from '../game/checkout/checkoutCalculator'
import { ThrowBadge } from './ThrowBadge'

interface CheckoutCalculatorProps {
  remaining: number
  dartsAvailable: number
  doubleOut: boolean
}

const MAX_OPTIONS = 8

export function CheckoutCalculator({ remaining, dartsAvailable, doubleOut }: CheckoutCalculatorProps) {
  const options = getCheckoutOptions(remaining, dartsAvailable, doubleOut, MAX_OPTIONS)

  return (
    <div className="roster-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
      <span style={{ fontWeight: 700, fontSize: 13 }}>Checkout</span>
      {options.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((combo, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--border)', minWidth: '1.1em' }}>{i + 1}.</span>
              {combo.map((label, j) => (
                <ThrowBadge key={j} label={label} compact />
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <span style={{ fontSize: 13, color: 'var(--border)' }}>No checkout available</span>
      )}
    </div>
  )
}
