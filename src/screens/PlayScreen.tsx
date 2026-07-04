import { useCallback, useEffect, useRef, useState } from 'react'
import { BOARD_TOP_INSET_RATIO, Dartboard } from '../dartboard/Dartboard'
import type { BoardThrow } from '../dartboard/dartboard.types'
import { CheckoutCalculator } from '../components/CheckoutCalculator'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { TurnPanel } from '../components/TurnPanel'
import { lastCompletedTurn, liveRemaining } from '../game/x01/x01Engine'
import type { GameState, Throw } from '../game/types'

interface PlayScreenProps {
  game: GameState
  onThrow: (throwInput: BoardThrow) => void
  onUndo: () => void
  onRedo: () => void
  canRedo: boolean
  redoneThrow: Throw | null
  onNewGame: () => void
  onRestart: () => void
  useDartNotation: boolean
}

// The score list lives in a sidebar to the left of the board (not overlaid
// on it), so it can never cover the clickable board area regardless of
// player count or screen size. Undo/New Game/current-turn darts are small
// enough to safely sit in the square board's own corner dead-space (outside
// the drawn circle).
const CORNER_INSET = '4%'
const CORNER_FONT_SIZE = 'clamp(10px, 3cqw, 17px)'
const CORNER_BUTTON_STYLE = { font: 'inherit', padding: '0.35em 0.6em', borderRadius: '0.4em' } as const
const SIDEBAR_WIDTH = 175 // px, fixed so board sizing math stays simple; names truncate to fit
const SIDEBAR_GAP = 12
const ROW_HEIGHT_ESTIMATE = 44 // px, used to decide how many rows fit before fading the rest
const MAX_VISIBLE_SCORES = 6 // most darts nights are 2-4 players; cap here rather than fill all available height

export function PlayScreen({
  game,
  onThrow,
  onUndo,
  onRedo,
  canRedo,
  redoneThrow,
  onNewGame,
  onRestart,
  useDartNotation,
}: PlayScreenProps) {
  const { x01 } = game
  const engineCurrentPlayerId = x01.playerStates[x01.currentPlayerIndex].playerId
  const isBetweenTurns = x01.currentTurnThrows.length === 0
  const lastTurn = lastCompletedTurn(x01)
  const canUndo = x01.currentTurnThrows.length > 0 || !!lastTurn

  // The dart marks/turn badges deliberately keep showing the player who just
  // went until their replacement actually throws (see Dartboard/TurnPanel) -
  // whoever that is, named directly above those badges so there's no need to
  // infer it from the score list. The score list itself always shows the
  // real current/next player immediately, with no lag.
  const displayedCurrentPlayerId = isBetweenTurns && lastTurn ? lastTurn.playerId : engineCurrentPlayerId
  const displayedPlayerName = game.players.find((p) => p.id === displayedCurrentPlayerId)?.name ?? ''

  // The board's own square box has empty space above the drawn rim circle
  // (see BOARD_TOP_INSET_RATIO), so nudge the sidebar down by that same
  // amount to line its top row up with the board's visible top edge. The
  // sidebar's available height is also capped to the board's own height
  // (minus that offset) so a long player list can never grow past the
  // board and force the page to scroll.
  const boardRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState(0)
  const [undoSignal, setUndoSignal] = useState(0)

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => setBoardSize(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const sidebarTopOffset = boardSize * BOARD_TOP_INSET_RATIO
  const sidebarAvailableHeight = Math.max(0, boardSize - sidebarTopOffset)
  const maxVisible = Math.min(MAX_VISIBLE_SCORES, Math.max(2, Math.floor(sidebarAvailableHeight / ROW_HEIGHT_ESTIMATE)))

  // Rotate so the real current/next player sits first, then turn order after
  // them - the list visually "moves" each turn instead of jumping around.
  const playerCount = game.players.length
  const currentPlayerIndexInList = game.players.findIndex((p) => p.id === engineCurrentPlayerId)
  const rotatedPlayers = Array.from(
    { length: playerCount },
    (_, i) => game.players[(currentPlayerIndexInList + i) % playerCount],
  )
  const scoreEntries = rotatedPlayers.map((player) => {
    const playerState = x01.playerStates.find((ps) => ps.playerId === player.id)!
    const isLive = player.id === engineCurrentPlayerId && !isBetweenTurns
    const remaining = isLive ? liveRemaining(x01) : playerState.remaining
    return { id: player.id, name: player.name, remaining }
  })

  const bustedPlayerId = isBetweenTurns && lastTurn?.bust ? lastTurn.playerId : null

  // Between turns, currentTurnThrows is already reset to [] (and the engine
  // commits the final dart directly, so there's never an intermediate render
  // showing all 3) - fall back to the last completed turn's full throw list
  // so the last player's hits stay visible until the next turn's first dart.
  const displayedThrows = isBetweenTurns ? (lastTurn?.throws ?? []) : x01.currentTurnThrows

  function handleQuit() {
    if (window.confirm('Quit this game? Current progress will be lost.')) {
      onNewGame()
    }
  }

  function handleRestart() {
    if (window.confirm('Restart this game? Current progress will be lost.')) {
      onRestart()
    }
  }

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    onUndo()
    setUndoSignal((n) => n + 1)
  }, [canUndo, onUndo])

  const handleRedo = useCallback(() => {
    if (!canRedo) return
    onRedo()
  }, [canRedo, onRedo])

  // Arrow keys are the primary shortcut (no modifier, easy to discover);
  // Ctrl+Z/Ctrl+Y and Ctrl+Shift+Z are offered on top for players used to
  // those editor/OS conventions. All are equivalent to the buttons below.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const isUndo = event.key === 'ArrowLeft' || (mod && !event.shiftKey && key === 'z')
      const isRedo = event.key === 'ArrowRight' || (mod && key === 'y') || (mod && event.shiftKey && key === 'z')

      if (isUndo) {
        event.preventDefault()
        handleUndo()
      } else if (isRedo) {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  return (
    // Three-column grid, not flex+justifyContent:center - that would center the
    // (sidebar+board) group as a unit, leaving the board itself off-center. The
    // "auto" middle column always centers the board regardless of sidebar width;
    // the empty third column balances it (and leaves room for future right-side info).
    <div
      style={{
        display: 'grid',
        // minmax(0, 1fr), not plain 1fr: a bare 1fr track still can't shrink
        // below its content's min size, and the sidebar's 140px content would
        // make the left track wider than the empty right one, pushing the
        // "auto" board column off-center.
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        alignItems: 'start',
        gap: SIDEBAR_GAP,
        width: '100%',
      }}
    >
      <div
        style={{
          justifySelf: 'start',
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          marginTop: sidebarTopOffset,
          maxHeight: sidebarAvailableHeight,
          overflow: 'hidden',
        }}
      >
        <ScoreDisplay
          players={scoreEntries}
          currentPlayerId={engineCurrentPlayerId}
          bustedPlayerId={bustedPlayerId}
          maxVisible={maxVisible}
        />
      </div>

      <div
        ref={boardRef}
        style={{
          position: 'relative',
          // Two side columns (sidebar + checkout), not one - each needs its
          // own width+gap reserved, or the total layout can exceed 92vw.
          width: `min(90vh, calc(92vw - ${2 * (SIDEBAR_WIDTH + SIDEBAR_GAP)}px), 800px)`,
          height: `min(90vh, calc(92vw - ${2 * (SIDEBAR_WIDTH + SIDEBAR_GAP)}px), 800px)`,
          containerType: 'inline-size',
        }}
      >
        <Dartboard
          onThrow={onThrow}
          currentTurnDartCount={x01.currentTurnThrows.length}
          undoSignal={undoSignal}
          redoneThrow={redoneThrow}
        />

        <div
          style={{
            position: 'absolute',
            top: CORNER_INSET,
            right: CORNER_INSET,
            fontSize: CORNER_FONT_SIZE,
            display: 'flex',
            gap: '0.4em',
          }}
        >
          <button type="button" onClick={handleRestart} style={CORNER_BUTTON_STYLE}>
            Restart
          </button>
          <button type="button" onClick={handleQuit} style={CORNER_BUTTON_STYLE}>
            Quit
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: CORNER_INSET, left: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
          <TurnPanel throws={displayedThrows} useDartNotation={useDartNotation} playerName={displayedPlayerName} />
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: CORNER_INSET,
            right: CORNER_INSET,
            fontSize: CORNER_FONT_SIZE,
            display: 'flex',
            gap: '0.4em',
          }}
        >
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            style={CORNER_BUTTON_STYLE}
            title="Undo (← or Ctrl+Z)"
          >
            ← Undo
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            style={CORNER_BUTTON_STYLE}
            title="Redo (→ or Ctrl+Y / Ctrl+Shift+Z)"
          >
            Redo →
          </button>
        </div>
      </div>

      <div
        style={{
          justifySelf: 'end',
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          marginTop: sidebarTopOffset,
        }}
      >
        <CheckoutCalculator
          remaining={liveRemaining(x01)}
          dartsAvailable={3 - x01.currentTurnThrows.length}
          doubleOut={x01.config.doubleOut}
        />
      </div>
    </div>
  )
}
