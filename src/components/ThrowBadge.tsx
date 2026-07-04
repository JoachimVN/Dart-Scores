interface ThrowBadgeProps {
  label: string
  /** Smaller fixed sizing for tight spaces (e.g. a 3-dart checkout combo in a 140px panel). */
  compact?: boolean
}

export function ThrowBadge({ label, compact }: ThrowBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: compact ? '32px' : '2.2em',
        padding: compact ? '3px 4px' : '0.4em 0.2em',
        borderRadius: compact ? '5px' : '0.4em',
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        fontSize: compact ? '13px' : undefined,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}
