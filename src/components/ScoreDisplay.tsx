import { useLayoutEffect, useRef } from 'react'

interface ScoreDisplayEntry {
  id: string
  name: string
  remaining: number
}

interface ScoreDisplayProps {
  /** Players in turn order starting with whoever is up next - rotates as turns pass. */
  players: ScoreDisplayEntry[]
  currentPlayerId: string
  /** Player whose turn just ended in a bust, highlighted briefly until their next throw. */
  bustedPlayerId?: string | null
  /** Cap on visible rows; if there are more players, the last visible row fades to hint at the rest. */
  maxVisible?: number
}

const FLIP_DURATION_MS = 280

/** Animates rows sliding into their new position when turn order rotates (FLIP technique). */
function useRowReorderAnimation(rowIds: string[], listRef: React.RefObject<HTMLUListElement | null>) {
  const prevRects = useRef(new Map<string, DOMRect>())

  useLayoutEffect(() => {
    const container = listRef.current
    if (!container) return
    const rows = Array.from(container.children) as HTMLElement[]
    const nextRects = new Map<string, DOMRect>()

    rows.forEach((row, i) => {
      const id = rowIds[i]
      if (id) nextRects.set(id, row.getBoundingClientRect())
    })

    rows.forEach((row, i) => {
      const id = rowIds[i]
      if (!id) return
      const prev = prevRects.current.get(id)
      const next = nextRects.get(id)
      if (!prev || !next) return

      const deltaY = prev.top - next.top
      if (Math.abs(deltaY) > 0.5) {
        row.animate(
          [{ transform: `translateY(${deltaY}px)` }, { transform: 'translateY(0)' }],
          { duration: FLIP_DURATION_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
        )
      }
    })

    prevRects.current = nextRects
  })
}

export function ScoreDisplay({ players, currentPlayerId, bustedPlayerId, maxVisible = 4 }: ScoreDisplayProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const visible = players.slice(0, maxVisible)
  const isCutoff = players.length > maxVisible

  useRowReorderAnimation(
    visible.map((p) => p.id),
    listRef,
  )

  return (
    <ul
      ref={listRef}
      style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35em' }}
    >
      {visible.map((player, index) => {
        const isActive = player.id === currentPlayerId
        const isBusted = player.id === bustedPlayerId
        const isLastVisible = isCutoff && index === visible.length - 1

        return (
          <li
            key={player.id}
            title={isBusted ? `${player.name} - bust!` : player.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5em',
              padding: '0.3em 0.5em',
              borderRadius: '0.5em',
              background: isBusted ? '#fdecea' : 'var(--bg)',
              border: isBusted ? '2px solid #c62828' : isActive ? '2px solid currentColor' : '1px solid var(--border)',
              color: isBusted ? '#c62828' : 'inherit',
              opacity: isLastVisible ? 0.4 : 1,
              fontWeight: isActive ? 700 : 400,
              transition: 'opacity 0.3s ease, border-color 0.3s ease, background-color 0.3s ease',
            }}
          >
            <span
              style={{
                maxWidth: '5em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {player.name}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {player.remaining}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
