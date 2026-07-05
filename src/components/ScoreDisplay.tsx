import { useLayoutEffect, useRef } from 'react'

interface ScoreDisplayEntry {
  id: string
  name: string
  remaining: number
}

interface ScoreDisplayProps {
  /** Players in turn order starting with whoever is up next - rotates as turns pass. */
  players: ScoreDisplayEntry[]
  /** The real current/next player - always highlighted immediately, no lag. */
  currentPlayerId: string
  /** Player whose turn just ended in a bust, highlighted briefly until their next throw. */
  bustedPlayerId?: string | null
  /** Cap on visible entries; if there are more players, the last visible one fades to hint at the rest. Column layout only. */
  maxVisible?: number
  /** 'column' is the desktop sidebar; 'row' is a horizontal scroll strip for narrow/portrait screens. */
  layout?: 'column' | 'row'
}

const FLIP_DURATION_MS = 280

/** Animates entries sliding into their new position when turn order rotates (FLIP technique). */
function useReorderAnimation(rowIds: string[], listRef: React.RefObject<HTMLUListElement | null>) {
  const prevRects = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const container = listRef.current
    if (!container) return
    const items = Array.from(container.children) as HTMLElement[]
    const nextRects = new Map<string, DOMRect>()

    items.forEach((item, i) => {
      const id = rowIds[i]
      if (id) nextRects.set(id, item.getBoundingClientRect())
    })

    items.forEach((item, i) => {
      const id = rowIds[i]
      if (!id) return
      const prev = prevRects.current.get(id)
      const next = nextRects.get(id)
      if (!prev || !next) return

      const deltaX = prev.left - next.left
      const deltaY = prev.top - next.top
      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        item.animate(
          [{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: 'translate(0, 0)' }],
          { duration: FLIP_DURATION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        )
      }
    })

    prevRects.current = nextRects
  })
}

// Explicit transition properties, never transition-all: the FLIP animation
// above works by applying a transform, and transitioning transform would
// fight it.
const ROW_TRANSITION = 'transition-[opacity,border-color,background-color,color] duration-300'

export function ScoreDisplay({
  players,
  currentPlayerId,
  bustedPlayerId,
  maxVisible = 4,
  layout = 'column',
}: ScoreDisplayProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const isRow = layout === 'row'
  const visible = isRow ? players : players.slice(0, maxVisible)
  const isCutoff = !isRow && players.length > maxVisible

  useReorderAnimation(
    visible.map((p) => p.id),
    listRef,
  )

  return (
    <div className={isRow ? undefined : 'flex flex-col gap-2'}>
      {!isRow && (
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Turn order</div>
      )}
      <ul
        ref={listRef}
        className={
          'm-0 list-none p-0 ' +
          (isRow ? 'flex flex-row gap-2 overflow-x-auto pb-1' : 'flex flex-col gap-2 overflow-hidden')
        }
      >
        {visible.map((player, index) => {
          const isActive = player.id === currentPlayerId
          const isBusted = player.id === bustedPlayerId
          const isLastVisible = isCutoff && index === visible.length - 1

          if (isActive) {
            // Hero card: the score people squint at from the oche, so it gets
            // its own line at display size.
            return (
              <li
                key={player.id}
                title={isBusted ? `${player.name} - bust!` : player.name}
                className={
                  `flex shrink-0 flex-col gap-0.5 rounded-(--radius-lg) border-2 px-3 py-2.5 shadow-sm ${ROW_TRANSITION} ` +
                  (isBusted ? 'border-danger bg-danger-soft text-danger' : 'border-accent bg-card') +
                  (isRow ? ' min-w-32' : '')
                }
              >
                <span className="truncate text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {player.name}
                </span>
                <span className="text-score-hero font-bold leading-none tabular-nums">{player.remaining}</span>
              </li>
            )
          }

          return (
            <li
              key={player.id}
              title={isBusted ? `${player.name} - bust!` : player.name}
              className={
                `flex shrink-0 items-center justify-between gap-2 rounded-(--radius-lg) border px-3 py-2 ${ROW_TRANSITION} ` +
                (isBusted ? 'border-2 border-danger bg-danger-soft text-danger' : 'border-line bg-card') +
                (isLastVisible ? ' opacity-40' : '') +
                (isRow ? ' min-w-28' : '')
              }
            >
              <span className="max-w-[6em] truncate text-sm font-medium">{player.name}</span>
              <span className="whitespace-nowrap text-score font-semibold tabular-nums">{player.remaining}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
