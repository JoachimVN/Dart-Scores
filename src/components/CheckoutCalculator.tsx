import { getCheckoutOptions } from '../game/checkout/checkoutCalculator'
import { ThrowBadge } from './ThrowBadge'

interface CheckoutCalculatorProps {
  remaining: number
  dartsAvailable: number
  doubleOut: boolean
}

const MAX_OPTIONS = 3

export function CheckoutCalculator({ remaining, dartsAvailable, doubleOut }: CheckoutCalculatorProps) {
  const options = getCheckoutOptions(remaining, dartsAvailable, doubleOut, MAX_OPTIONS)

  return (
    <div className="roster-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontWeight: 700 }}>Checkout</span>
      {options.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((combo, i) => (
            <li key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3em' }}>
              {combo.map((label, j) => (
                <ThrowBadge key={j} label={label} />
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <span style={{ color: 'var(--border)' }}>-</span>
      )}
    </div>
  )
}
