import { useEffect, useRef, useState } from 'react'
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
   * Increment this once per Undo click. A plain dart-count comparison can't
   * tell "turn ended normally" (marks should stay) apart from "undo removed
   * a dart" (its marker should go too) - both drop the count the same way -
   * so this is an explicit signal instead of an inferred one.
   */
  undoSignal: number
  /**
   * The dart most recently restored by Redo, if that was the last action -
   * its mark is added back approximated from segment/ring via
   * computeMarkPosition, the same way ShotsBoard renders historical throws,
   * since the original click position isn't preserved through an undo.
   */
  redoneThrow: Throw | null
}

interface Mark {
  x: number
  y: number
}

export function Dartboard({ onThrow, currentTurnDartCount, undoSignal, redoneThrow }: DartboardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [marks, setMarks] = useState<Mark[]>([])

  useEffect(() => {
    if (undoSignal === 0) return
    setMarks((prev) => prev.slice(0, -1))
  }, [undoSignal])

  useEffect(() => {
    if (!redoneThrow) return
    // currentTurnDartCount === 1 here means this redone dart is the first of
    // its turn (mirrors the currentTurnDartCount === 0 check in handleClick,
    // just observed a step later since this reads post-redo state) - so the
    // previous turn's marks should be cleared instead of accumulated onto.
    const mark = computeMarkPosition(redoneThrow)
    setMarks((prev) => (currentTurnDartCount === 1 ? [mark] : [...prev, mark]))
  }, [redoneThrow, currentTurnDartCount])

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
    setMarks((prev) => (currentTurnDartCount === 0 ? [mark] : [...prev, mark]))

    const hit = resolvePoint(dx, dy, BOARD_RADIUS)
    onThrow({ segment: hit.segment, ring: hit.ring, ...scoreHit(hit) })
  }

  return (
    <BoardFace svgRef={svgRef} onClick={handleClick}>
      {marks.map((mark, i) => (
        <DartMark key={i} x={mark.x} y={mark.y} faded={currentTurnDartCount === 0} />
      ))}
    </BoardFace>
  )
}
