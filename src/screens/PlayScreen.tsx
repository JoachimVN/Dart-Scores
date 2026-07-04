import { useEffect, useRef, useState } from 'react'
import { BOARD_TOP_INSET_RATIO, Dartboard } from '../dartboard/Dartboard'
import type { BoardThrow } from '../dartboard/dartboard.types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { TurnPanel } from '../components/TurnPanel'
import { lastCompletedTurn, liveRemaining } from '../game/x01/x01Engine'
import type { GameState } from '../game/types'
import { getSettings } from '../settings/settingsRepository'

interface PlayScreenProps {
  game: GameState
  onThrow: (throwInput: BoardThrow) => void
  onUndo: () => void
  onNewGame: () => void
}

// The score list lives in a sidebar to the left of the board (not overlaid
// on it), so it can never cover the clickable board area regardless of
// player count or screen size. Undo/New Game/current-turn darts are small
// enough to safely sit in the square board's own corner dead-space (outside
// the drawn circle).
const CORNER_INSET = '4%'
const CORNER_FONT_SIZE = 'clamp(10px, 3cqw, 17px)'
const CORNER_BUTTON_STYLE = { font: 'inherit', padding: '0.35em 0.6em', borderRadius: '0.4em' } as const
const SIDEBAR_WIDTH = 140 // px, fixed so board sizing math stays simple; names truncate to fit
const SIDEBAR_GAP = 12
const ROW_HEIGHT_ESTIMATE = 44 // px, used to decide how many rows fit before fading the rest
const MAX_VISIBLE_SCORES = 6 // most darts nights are 2-4 players; cap here rather than fill all available height

export function PlayScreen({ game, onThrow, onUndo, onNewGame }: PlayScreenProps) {
  const { x01 } = game
  const currentPlayerId = x01.playerStates[x01.currentPlayerIndex].playerId
  const [useDartNotation] = useState(() => getSettings().useDartNotation)

  // The board's own square box has empty space above the drawn rim circle
  // (see BOARD_TOP_INSET_RATIO), so nudge the sidebar down by that same
  // amount to line its top row up with the board's visible top edge. The
  // sidebar's available height is also capped to the board's own height
  // (minus that offset) so a long player list can never grow past the
  // board and force the page to scroll.
  const boardRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState(0)

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
          currentPlayerId={currentPlayerId}
          bustedPlayerId={bustedPlayerId}
          maxVisible={maxVisible}
        />
      </div>

      <div
        ref={boardRef}
        style={{
          position: 'relative',
          width: `min(90vh, calc(92vw - ${SIDEBAR_WIDTH + SIDEBAR_GAP}px), 800px)`,
          height: `min(90vh, calc(92vw - ${SIDEBAR_WIDTH + SIDEBAR_GAP}px), 800px)`,
          containerType: 'inline-size',
        }}
      >
        <Dartboard onThrow={onThrow} />

        <div style={{ position: 'absolute', top: CORNER_INSET, right: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
          <button type="button" onClick={handleNewGame} style={CORNER_BUTTON_STYLE}>
            New game
          </button>
        </div>

        <div style={{ position: 'absolute', bottom: CORNER_INSET, left: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
          <TurnPanel throws={x01.currentTurnThrows} useDartNotation={useDartNotation} />
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

      <div aria-hidden="true" />
    </div>
  )
}
