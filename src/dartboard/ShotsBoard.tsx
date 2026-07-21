import { BoardFace } from './BoardFace'
import { computeMarkPosition } from './computeMarkPosition'
import { DartMark } from './DartMark'
import type { Throw } from '../game/types'

interface ShotsBoardProps {
  throws: Throw[]
}

/** Read-only recap board: plots every dart in `throws` at once (see computeMarkPosition for how positions are approximated). */
export function ShotsBoard({ throws }: Readonly<ShotsBoardProps>) {
  return (
    <BoardFace>
      {throws.map((t) => {
        const pos = computeMarkPosition(t)
        return <DartMark key={t.id} x={pos.x} y={pos.y} />
      })}
    </BoardFace>
  )
}
