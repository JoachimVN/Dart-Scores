import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './ui/Button'

/**
 * Caps a list's height and scrolls it, with a top/bottom shadow that fades in
 * only on the edge(s) still hiding content. Native scrollbars can't be relied
 * on for this cue - macOS Safari and Chrome both ignore CSS attempts to force
 * an always-visible scrollbar when the OS is set to auto-hide on trackpad -
 * so this tracks real scrollTop/scrollHeight instead (see index.css).
 */
export function ScrollShadow({ children }: { readonly children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  function updateShadows() {
    const el = ref.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 0)
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1)
  }

  // Content height changes as users are added/removed/moved between lists.
  useEffect(() => {
    updateShadows()
  })

  return (
    <div className="relative my-2">
      <ul
        ref={ref}
        onScroll={updateShadows}
        className="flex max-h-[60vh] list-none flex-col gap-2 overflow-y-auto p-0"
      >
        {children}
      </ul>
      <div className={'scroll-shadow-top' + (canScrollUp ? ' is-visible' : '')} />
      <div className={'scroll-shadow-bottom' + (canScrollDown ? ' is-visible' : '')} />
    </div>
  )
}

interface RosterRowProps {
  readonly name: string
  /** Tints the row with the accent to mark it as picked for the game. */
  readonly selected?: boolean
  readonly onMove: () => void
  readonly onDelete?: () => void
}

/** A name that moves the person to the other list when clicked. */
export function RosterRow({ name, selected, onMove, onDelete }: RosterRowProps) {
  return (
    <li
      className={
        'flex items-center justify-between gap-2 rounded-(--radius-md) border px-3 py-2.5 transition-colors ' +
        (selected
          ? 'border-accent/40 bg-accent-soft hover:border-accent/70'
          : 'border-line bg-card hover:bg-sunken')
      }
    >
      <button
        type="button"
        onClick={onMove}
        className="min-w-0 flex-1 cursor-pointer truncate text-left font-medium outline-none focus-visible:underline"
      >
        {name}
      </button>
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label={`Delete ${name}`}
        >
          Delete
        </Button>
      )}
    </li>
  )
}
