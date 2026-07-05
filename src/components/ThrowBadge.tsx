interface ThrowBadgeProps {
  readonly label: string
  /** Smaller fixed sizing for tight spaces (e.g. a 3-dart checkout combo in a narrow panel). */
  readonly compact?: boolean
  /** A dart slot not thrown yet - rendered as a dashed placeholder. */
  readonly empty?: boolean
}

export function ThrowBadge({ label, compact, empty }: ThrowBadgeProps) {
  const classes = [
    'inline-flex items-center justify-center bg-card font-semibold tabular-nums border',
    compact ? 'min-w-8 rounded-[5px] px-1 py-[3px] text-[13px]' : 'min-w-[2.2em] rounded-[0.4em] px-[0.2em] py-[0.4em]',
    empty ? 'border-dashed border-line-strong text-ink-muted' : 'border-line',
  ].join(' ')
  return <span className={classes}>{label}</span>
}
