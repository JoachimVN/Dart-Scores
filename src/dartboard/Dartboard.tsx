import { useRef } from 'react'
import { BOARD_RADIUS, CENTER, VIEWBOX_SIZE, BoardFace } from './BoardFace'
import { computeMarkPosition } from './computeMarkPosition'
import { DartMark } from './DartMark'
import type { BoardThrow } from './dartboard.types'
import type { Throw } from '../game/types'
import { resolvePoint } from './hitTest'
import { scoreHit } from './scoring'

export { BOARD_TOP_INSET_RATIO } from './BoardFace'

interface DartboardProps {
  readonly onThrow: (hit: BoardThrow) => void
  /** Darts already thrown this turn, before the upcoming click - used only to know when to clear the previous turn's click markers. */
  readonly currentTurnDartCount: number
  /**
   * The darts to render marks for right now - the live in-progress turn, or
   * (between turns) the last completed one. This is the same list PlayScreen
   * hands to TurnPanel, and is the single source of truth for which marks
   * should be on the board: undo/redo/reopening a previous turn all just
   * change this array, with no separate signal needed.
   */
  readonly displayedThrows: Throw[]
  /** Blocks clicks entirely (no dart, no cached mark) - used while a held turn awaits its Done confirmation. */
  readonly disabled?: boolean
}

interface Mark {
  x: number
  y: number
}

export function Dartboard({ onThrow, currentTurnDartCount, displayedThrows, disabled = false }: DartboardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // Exact click positions keyed by throw id, so a throw with no click of its
  // own (a Miss-button dart, a redone dart, or a previous turn reopened by
  // Undo) can never inherit another dart's position. Uncached throws fall
  // back to computeMarkPosition - except misses, which have no meaningful
  // board position and simply get no mark (the MISS turn badge covers them).
  const marksRef = useRef<Map<string, Mark>>(new Map())
  // The click that produced the throw currently being added. handleClick
  // can't know the new throw's engine-generated id, so it stashes the click
  // here and a later render pairs it with the newest displayed throw - "later"
  // rather than "next", because Cricket's target chooser can hold the throw
  // in a dialog for several renders before it lands (expectedLength is how
  // many displayed throws the turn will have once it does).
  const pendingClickRef = useRef<{ mark: Mark; expectedLength: number } | null>(null)
  // Identifies "which turn" by its first dart's id, which stays constant
  // while that turn's own throws grow/shrink (new dart, undo, redo) and only
  // changes when displayedThrows switches to a genuinely different turn.
  const turnKeyRef = useRef<string | null>(null)

  const turnKey = displayedThrows[0]?.id ?? null
  if (turnKey !== turnKeyRef.current) {
    // A different turn's throws are now displayed - its darts have no click
    // positions cached this session, so drop the old turn's. A click that
    // *started* this new turn re-adds its own position just below.
    marksRef.current = new Map()
    turnKeyRef.current = turnKey
  }

  const pending = pendingClickRef.current
  if (displayedThrows.length === pending?.expectedLength) {
    const newest = displayedThrows.at(-1)
    if (newest && !marksRef.current.has(newest.id)) {
      marksRef.current.set(newest.id, pending.mark)
    }
    pendingClickRef.current = null
  }

  const marks = displayedThrows.map(
    (t) => marksRef.current.get(t.id) ?? (t.ring === 'miss' ? null : computeMarkPosition(t)),
  )

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    if (disabled) return
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const scale = VIEWBOX_SIZE / rect.width
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = (event.clientX - centerX) * scale
    const dy = (event.clientY - centerY) * scale

    pendingClickRef.current = {
      mark: { x: CENTER + dx, y: CENTER + dy },
      // currentTurnDartCount === 0 means this click starts a fresh turn, whose
      // displayed list will hold just this dart once it lands.
      expectedLength: currentTurnDartCount + 1,
    }

    const hit = resolvePoint(dx, dy, BOARD_RADIUS)
    onThrow({ segment: hit.segment, ring: hit.ring, ...scoreHit(hit) })
  }

  return (
    <BoardFace svgRef={svgRef} onClick={handleClick}>
      {displayedThrows.map((t, i) => {
        const mark = marks[i]
        if (!mark) return null
        return <DartMark key={t.id} x={mark.x} y={mark.y} faded={currentTurnDartCount === 0} />
      })}
    </BoardFace>
  )
}
