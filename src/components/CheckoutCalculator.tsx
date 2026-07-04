import { getCheckoutSuggestion } from '../game/checkout/checkoutCalculator'
import { ThrowBadge } from './ThrowBadge'

interface CheckoutCalculatorProps {
  remaining: number
  dartsAvailable: number
  doubleOut: boolean
}

export function CheckoutCalculator({ remaining, dartsAvailable, doubleOut }: CheckoutCalculatorProps) {
  const suggestion = getCheckoutSuggestion(remaining, dartsAvailable, doubleOut)

  return (
    <div className="roster-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontWeight: 700 }}>Checkout</span>
      {suggestion ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3em' }}>
          {suggestion.map((label, i) => (
            <ThrowBadge key={i} label={label} />
          ))}
        </div>
      ) : (
        <span style={{ color: 'var(--border)' }}>-</span>
      )}
    </div>
  )
}
