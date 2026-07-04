interface ThrowBadgeProps {
  label: string
}

export function ThrowBadge({ label }: ThrowBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '2.2em',
        padding: '0.4em 0.2em',
        borderRadius: '0.4em',
        border: '1px solid var(--border)',
        background: 'var(--bg)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}
