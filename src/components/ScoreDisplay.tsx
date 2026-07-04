import { useLayoutEffect, useRef } from 'react'

interface ScoreDisplayEntry {
  id: string
  name: string
  remaining: number
}

interface ScoreDisplayProps {
  /** Players in turn order starting with whoever is up next - rotates as turns pass. */
  players: ScoreDisplayEntry[]
  /** Highlighted row - the player who most recently threw, kept stable through the gap between turns. */
  currentPlayerId: string
  /**
   * The engine's real current player. Only pass this when it differs from
   * currentPlayerId (i.e. during the gap between turns) - it labels the
   * highlighted row "Just played" and this row "Up next", so it's clear
   * the highlight isn't claiming the next player took the previous shots.
   */
  upNextPlayerId?: string | null
  /** Player whose turn just ended in a bust, highlighted briefly until their next throw. */
  bustedPlayerId?: string | null
  /** Cap on visible entries; if there are more players, the last visible one fades to hint at the rest. */
  maxVisible?: number
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

export function ScoreDisplay({
  players,
  currentPlayerId,
  upNextPlayerId,
  bustedPlayerId,
  maxVisible = 4,
}: ScoreDisplayProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const visible = players.slice(0, maxVisible)
  const isCutoff = players.length > maxVisible
  const inGap = Boolean(upNextPlayerId) && upNextPlayerId !== currentPlayerId

  useReorderAnimation(
    visible.map((p) => p.id),
    listRef,
  )

  return (
    <ul
      ref={listRef}
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: '0.5em',
      }}
    >
      {visible.map((player, index) => {
        const isActive = player.id === currentPlayerId
        const isBusted = player.id === bustedPlayerId
        const isLastVisible = isCutoff && index === visible.length - 1
        const tag = inGap ? (isActive ? 'Just played' : player.id === upNextPlayerId ? 'Up next' : null) : null

        return (
          <li
            key={player.id}
            title={isBusted ? `${player.name} - bust!` : player.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.1em',
              padding: '0.4em 0.7em',
              borderRadius: '0.5em',
              background: isBusted ? '#fdecea' : 'var(--bg)',
              border: isBusted ? '2px solid #c62828' : isActive ? '2px solid currentColor' : '1px solid var(--border)',
              color: isBusted ? '#c62828' : 'inherit',
              opacity: isLastVisible ? 0.4 : 1,
              flexShrink: 0,
              transition: 'opacity 0.3s ease, border-color 0.3s ease, background-color 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
              <span
                style={{
                  maxWidth: '5em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {player.name}
              </span>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {player.remaining}
              </span>
            </div>
            {tag && (
              <span style={{ fontSize: '0.7em', fontWeight: 400, color: isBusted ? 'inherit' : 'var(--text-muted)' }}>
                {tag}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
