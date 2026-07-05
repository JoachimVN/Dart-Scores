import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-(--radius-md) transition-colors ' +
  'cursor-pointer disabled:opacity-40 disabled:cursor-default ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover disabled:hover:bg-accent',
  secondary: 'bg-card text-ink border border-line-strong hover:bg-sunken disabled:hover:bg-card',
  ghost: 'bg-transparent text-ink-muted hover:bg-sunken hover:text-ink',
  danger: 'bg-card text-danger border border-line-strong hover:bg-danger-soft disabled:hover:bg-card',
}

/* md/lg heights meet the 44px tap-target guideline for use at the board. */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-4',
  lg: 'h-12 px-6 text-lg',
}

export function Button({ variant = 'secondary', size = 'md', className, type, ...rest }: ButtonProps) {
  const classes = [BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ')
  return <button type={type ?? 'button'} className={classes} {...rest} />
}
