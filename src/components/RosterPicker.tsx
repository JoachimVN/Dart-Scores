import { useEffect, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { Button } from './ui/Button'
import { inputClass } from './ui/Panel'

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-9 0 1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
  )
}

/**
 * Caps a list's height and scrolls it, with a top/bottom shadow that fades in
 * only on the edge(s) still hiding content. Native scrollbars can't be relied
 * on for this cue - macOS Safari and Chrome both ignore CSS attempts to force
 * an always-visible scrollbar when the OS is set to auto-hide on trackpad -
 * so this tracks real scrollTop/scrollHeight instead (see index.css).
 */
interface ScrollShadowProps {
  readonly children: ReactNode
  readonly className?: string
  readonly isDropTarget?: boolean
  readonly onDragOver?: (event: DragEvent<HTMLUListElement>) => void
  readonly onDragLeave?: (event: DragEvent<HTMLUListElement>) => void
  readonly onDrop?: (event: DragEvent<HTMLUListElement>) => void
}

export function ScrollShadow({ children, className, isDropTarget, onDragOver, onDragLeave, onDrop }: ScrollShadowProps) {
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
    <div className={'relative my-2 ' + (className ?? '')}>
      <ul
        ref={ref}
        onScroll={updateShadows}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={
          'flex h-full min-h-40 max-h-[60vh] list-none flex-col gap-2 overflow-y-auto rounded-(--radius-md) py-2 transition-colors ' +
          (isDropTarget ? 'bg-accent-soft ring-1 ring-accent/50' : '')
        }
      >
        {children}
      </ul>
      <div className={'scroll-shadow-top' + (canScrollUp ? ' is-visible' : '')} />
      <div className={'scroll-shadow-bottom' + (canScrollDown ? ' is-visible' : '')} />
    </div>
  )
}

interface RosterRowProps {
  readonly id: string
  readonly name: string
  /** Tints the row with the accent to mark it as picked for the game. */
  readonly selected?: boolean
  readonly onMove: () => void
  readonly onDelete?: () => void
  readonly onRename?: (name: string) => void
  readonly draggable?: boolean
  readonly isDragging?: boolean
  readonly isDropTarget?: boolean
  /** Paints an insertion line over this row without changing list layout. */
  readonly insertionPreview?: 'before' | 'after'
  readonly onDragStart?: (event: DragEvent<HTMLLIElement>) => void
  readonly onDragEnd?: () => void
  readonly onDragOver?: (event: DragEvent<HTMLLIElement>) => void
  readonly onDragLeave?: (event: DragEvent<HTMLLIElement>) => void
  readonly onDrop?: (event: DragEvent<HTMLLIElement>) => void
}

/** A name that moves the person to the other list when clicked. */
export function RosterRow({
  id,
  name,
  selected,
  onMove,
  onDelete,
  onRename,
  draggable,
  isDragging,
  isDropTarget,
  insertionPreview,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: RosterRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const draggedSinceLastClick = useRef(false)

  // Keep the draft in sync if the underlying name changes while not editing (e.g. renamed elsewhere).
  useEffect(() => {
    if (!editing) setDraft(name)
  }, [name, editing])

  function commitRename() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename?.(trimmed)
    else setDraft(name)
  }

  function handleMove(event: MouseEvent<HTMLElement>) {
    if (draggedSinceLastClick.current) {
      event.preventDefault()
      event.stopPropagation()
      draggedSinceLastClick.current = false
      return
    }
    onMove()
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-(--radius-md) border border-accent/40 bg-card px-3 py-2.5">
        <input
          autoFocus
          className={inputClass + ' h-auto min-w-0 flex-1 py-0'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitRename()
            }
            if (e.key === 'Escape') {
              setDraft(name)
              setEditing(false)
            }
          }}
        />
      </li>
    )
  }

  return (
    <li
      data-roster-id={id}
      draggable={draggable}
      onDragStart={(event) => {
        draggedSinceLastClick.current = true
        onDragStart?.(event)
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={handleMove}
      aria-roledescription={draggable ? 'draggable user' : undefined}
      aria-label={draggable ? `${name}. Drag to move or reorder.` : undefined}
      className={
        'relative flex items-center justify-between gap-2 rounded-(--radius-md) border px-3 py-2.5 transition-[background-color,border-color,opacity,transform] ' +
        (draggable ? 'cursor-pointer ' : '') +
        (isDragging ? 'scale-[0.98] opacity-40 ' : '') +
        (isDropTarget ? 'border-accent ' : '') +
        (selected
          ? 'border-accent/40 bg-accent-soft hover:border-accent/70'
          : 'border-line bg-card hover:bg-sunken')
      }
    >
      {insertionPreview && (
        <span
          aria-hidden="true"
          className={
            'pointer-events-none absolute inset-x-1 h-1 rounded-full bg-accent shadow-[0_0_0_3px_var(--color-accent-soft)] ' +
            (insertionPreview === 'before' ? '-top-1.5' : '-bottom-1.5')
          }
        />
      )}
      <button
        type="button"
        onClick={handleMove}
        className="min-w-0 flex-1 cursor-pointer truncate text-left font-medium outline-none focus-visible:underline"
      >
        {name}
      </button>
      {onRename && (
        <Button
          variant="ghost-quiet"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            setDraft(name)
            setEditing(true)
          }}
          aria-label={`Rename ${name}`}
        >
          <PencilIcon />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost-danger"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label={`Delete ${name}`}
        >
          <TrashIcon />
        </Button>
      )}
    </li>
  )
}
