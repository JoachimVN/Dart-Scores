import { useEffect, useRef, useState } from 'react'
import { Dartboard } from '../dartboard/Dartboard'
import type { BoardThrow } from '../dartboard/dartboard.types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { TurnPanel } from '../components/TurnPanel'
import { lastCompletedTurn, liveRemaining } from '../game/x01/x01Engine'
import type { GameState } from '../game/types'

interface PlayScreenProps {
  game: GameState
  onThrow: (throwInput: BoardThrow) => void
  onUndo: () => void
  onNewGame: () => void
}

// Corners of the square board area sit outside the circular dartboard drawn
// inside it, so score/turn/undo overlay those corners instead of stacking
// below the board - keeps everything on screen without scrolling. Font size
// is driven by container query units (cqw = % of the board wrapper's own
// width) so the overlay text/badges shrink along with a smaller board
// instead of overflowing into the board on narrow screens.
const CORNER_INSET = '4%'
const CORNER_FONT_SIZE = 'clamp(10px, 3cqw, 17px)'
const CORNER_BUTTON_STYLE = { font: 'inherit', padding: '0.35em 0.6em', borderRadius: '0.4em' } as const

/** How many score rows fit the top-left corner without reaching the board - grows with the board's own pixel size. */
function maxVisibleScoresFor(boardWidthPx: number): number {
  if (boardWidthPx < 380) return 2
  if (boardWidthPx < 550) return 3
  return 4
}

export function PlayScreen({ game, onThrow, onUndo, onNewGame }: PlayScreenProps) {
  const { x01 } = game
  const currentPlayerId = x01.playerStates[x01.currentPlayerIndex].playerId

  const boardRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(0)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => setBoardWidth(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Rotate so whoever is up sits first, then turn order after them - the list
  // visually "moves" each turn instead of the current player jumping around.
  const playerCount = game.players.length
  const rotatedPlayers = Array.from(
    { length: playerCount },
    (_, i) => game.players[(x01.currentPlayerIndex + i) % playerCount],
  )
  const scoreEntries = rotatedPlayers.map((player) => {
    const playerState = x01.playerStates.find((ps) => ps.playerId === player.id)!
    const remaining = player.id === currentPlayerId ? liveRemaining(x01) : playerState.remaining
    return { id: player.id, name: player.name, remaining }
  })

  const lastTurn = lastCompletedTurn(x01)
  const bustedPlayerId = x01.currentTurnThrows.length === 0 && lastTurn?.bust ? lastTurn.playerId : null

  function handleNewGame() {
    if (window.confirm('Start a new game? Current progress will be lost.')) {
      onNewGame()
    }
  }

  return (
    <div
      ref={boardRef}
      style={{
        position: 'relative',
        width: 'min(90vh, 92vw, 800px)',
        height: 'min(90vh, 92vw, 800px)',
        margin: '0 auto',
        containerType: 'inline-size',
      }}
    >
      <Dartboard onThrow={onThrow} />

      <div style={{ position: 'absolute', top: CORNER_INSET, left: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
        <ScoreDisplay
          players={scoreEntries}
          currentPlayerId={currentPlayerId}
          bustedPlayerId={bustedPlayerId}
          maxVisible={maxVisibleScoresFor(boardWidth)}
        />
      </div>

      <div style={{ position: 'absolute', top: CORNER_INSET, right: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
        <button type="button" onClick={handleNewGame} style={CORNER_BUTTON_STYLE}>
          New game
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: CORNER_INSET, left: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
        <TurnPanel throws={x01.currentTurnThrows} />
      </div>

      <div style={{ position: 'absolute', bottom: CORNER_INSET, right: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
        <button
          type="button"
          onClick={onUndo}
          disabled={x01.currentTurnThrows.length === 0}
          style={CORNER_BUTTON_STYLE}
        >
          Undo
        </button>
      </div>
    </div>
  )
}
