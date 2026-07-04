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
  onThrow: (hit: BoardThrow) => void
  /** Darts already thrown this turn, before the upcoming click - used only to know when to clear the previous turn's click markers. */
  currentTurnDartCount: number
  /**
   * The darts to render marks for right now - the live in-progress turn, or
   * (between turns) the last completed one. This is the same list PlayScreen
   * hands to TurnPanel, and is the single source of truth for which marks
   * should be on the board: undo/redo/reopening a previous turn all just
   * change this array, with no separate signal needed.
   */
  displayedThrows: Throw[]
}

interface Mark {
  x: number
  y: number
}

export function Dartboard({ onThrow, currentTurnDartCount, displayedThrows }: DartboardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  // Exact click positions for the turn currently being displayed, indexed
  // the same as displayedThrows - cleared whenever displayedThrows turns out
  // to belong to a different turn (see turnKey below), and otherwise filled
  // in by handleClick as darts land. Entries with no cached click (a redone
  // dart, or a previous turn reopened by Undo, whose exact click position
  // this session never recorded) fall back to computeMarkPosition.
  const marksRef = useRef<Mark[]>([])
  // Identifies "which turn" by its first dart's id, which stays constant
  // while that turn's own throws grow/shrink (new dart, undo, redo) and only
  // changes when displayedThrows switches to a genuinely different turn.
  const turnKeyRef = useRef<string | null>(null)
  // Set by handleClick so the render right after a click can tell "the turn
  // changed because of the click I already handled" apart from "the turn
  // changed because Undo/Redo reopened a different one" - only the latter
  // should blow away the click-position cache.
  const justClickedRef = useRef(false)

  const turnKey = displayedThrows[0]?.id ?? null
  if (turnKey !== turnKeyRef.current) {
    if (!justClickedRef.current) {
      marksRef.current = []
    }
    turnKeyRef.current = turnKey
  }
  justClickedRef.current = false

  const marks = displayedThrows.map((t, i) => marksRef.current[i] ?? computeMarkPosition(t))

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const scale = VIEWBOX_SIZE / rect.width
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = (event.clientX - centerX) * scale
    const dy = (event.clientY - centerY) * scale

    // currentTurnDartCount === 0 means this click starts a fresh turn, so the
    // previous turn's marks should disappear now rather than keep accumulating.
    const mark: Mark = { x: CENTER + dx, y: CENTER + dy }
    marksRef.current = currentTurnDartCount === 0 ? [mark] : [...marksRef.current, mark]
    justClickedRef.current = true

    const hit = resolvePoint(dx, dy, BOARD_RADIUS)
    onThrow({ segment: hit.segment, ring: hit.ring, ...scoreHit(hit) })
  }

  return (
    <BoardFace svgRef={svgRef} onClick={handleClick}>
      {displayedThrows.map((t, i) => (
        <DartMark key={t.id} x={marks[i].x} y={marks[i].y} faded={currentTurnDartCount === 0} />
      ))}
    </BoardFace>
  )
}
