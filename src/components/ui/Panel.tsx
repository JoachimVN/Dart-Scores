import type { HTMLAttributes, ReactNode } from 'react'

interface PanelProps extends HTMLAttributes<HTMLElement> {
  /** Rendered as a small uppercase card header above the content. */
  title?: string
  children: ReactNode
}

/**
 * Standard card surface. Children render flat inside the section (no extra
 * wrappers), so lists that measure/animate their own rows (FLIP) keep working.
 */
export function Panel({ title, className, children, ...rest }: PanelProps) {
  const classes = ['rounded-(--radius-lg) border border-line bg-card p-4 shadow-sm', className]
    .filter(Boolean)
    .join(' ')
  return (
    <section className={classes} {...rest}>
      {title && (
        <h2 className="mt-0 mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
      )}
      {children}
    </section>
  )
}

/** Shared styling for the app's few native text inputs and selects. */
export const inputClass =
  'h-11 rounded-(--radius-md) border border-line-strong bg-card px-3 text-ink ' +
  'placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-accent'

export const selectClass = inputClass + ' cursor-pointer'
