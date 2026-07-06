import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BOARD_TOP_INSET_RATIO, Dartboard } from '../dartboard/Dartboard'
import type { BoardThrow } from '../dartboard/dartboard.types'
import { CheckoutCalculator } from '../components/CheckoutCalculator'
import { CricketScoreboard } from '../components/CricketScoreboard'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { TurnPanel } from '../components/TurnPanel'
import { lastCompletedTurn as lastCompletedCricketTurn, liveMarksAndPoints } from '../game/cricket/cricketEngine'
import { lastCompletedTurn as lastCompletedX01Turn, liveRemaining } from '../game/x01/x01Engine'
import type { GameState, Throw } from '../game/types'
import { useWakeLock } from '../hooks/useWakeLock'

/** What PlayScreen needs to render, independent of which mode's engine produced it. */
interface PlayViewModel {
  engineCurrentPlayerId: string
  currentTurnThrows: Throw[]
  lastTurn: { playerId: string; throws: Throw[] } | null
  bustedPlayerId: string | null
  /** The "big number" shown per player in the sidebar - remaining score for X01, points for Cricket. */
  valueFor: (playerId: string) => number
  rightPanel: ReactNode | null
}

function buildX01ViewModel(
  game: Extract<GameState, { mode: 'x01' }>,
  showCheckoutSuggestions: boolean,
): PlayViewModel {
  const { x01 } = game
  const engineCurrentPlayerId = x01.playerStates[x01.currentPlayerIndex].playerId
  const isBetweenTurns = x01.currentTurnThrows.length === 0
  const lastTurn = lastCompletedX01Turn(x01)

  return {
    engineCurrentPlayerId,
    currentTurnThrows: x01.currentTurnThrows,
    lastTurn,
    bustedPlayerId: isBetweenTurns && lastTurn?.bust ? lastTurn.playerId : null,
    valueFor: (playerId) => {
      const playerState = x01.playerStates.find((ps) => ps.playerId === playerId)!
      return playerId === engineCurrentPlayerId && !isBetweenTurns ? liveRemaining(x01) : playerState.remaining
    },
    rightPanel: showCheckoutSuggestions ? (
      <CheckoutCalculator
        remaining={liveRemaining(x01)}
        dartsAvailable={3 - x01.currentTurnThrows.length}
        doubleOut={x01.config.doubleOut}
      />
    ) : null,
  }
}

function buildCricketViewModel(game: Extract<GameState, { mode: 'cricket' }>): PlayViewModel {
  const { cricket } = game
  const engineCurrentPlayerId = cricket.playerStates[cricket.currentPlayerIndex].playerId
  const lastTurn = lastCompletedCricketTurn(cricket)
  const live = liveMarksAndPoints(cricket)

  const scoreboardEntries = game.players.map((player) => {
    const playerState = cricket.playerStates.find((ps) => ps.playerId === player.id)!
    const isLive = player.id === engineCurrentPlayerId
    return {
      id: player.id,
      name: player.name,
      marks: isLive ? live.marks : playerState.marks,
      points: isLive ? live.points : playerState.points,
    }
  })

  return {
    engineCurrentPlayerId,
    currentTurnThrows: cricket.currentTurnThrows,
    lastTurn,
    bustedPlayerId: null, // Cricket has no bust concept
    valueFor: (playerId) => scoreboardEntries.find((e) => e.id === playerId)!.points,
    rightPanel: <CricketScoreboard players={scoreboardEntries} currentPlayerId={engineCurrentPlayerId} />,
  }
}

interface PlayScreenProps {
  game: GameState
  onThrow: (throwInput: BoardThrow) => void
  onUndo: () => void
  onRedo: () => void
  canRedo: boolean
  onNewGame: () => void
  onRestart: () => void
  useDartNotation: boolean
  showCheckoutSuggestions: boolean
}

// The score list lives in a sidebar to the left of the board (not overlaid
// on it), so it can never cover the clickable board area regardless of
// player count or screen size. Undo/New Game/current-turn darts are small
// enough to safely sit in the square board's own corner dead-space (outside
// the drawn circle).
const CORNER_INSET = '4%'
const CORNER_FONT_SIZE = 'clamp(10px, 3cqw, 17px)'
// Preflight gives buttons `font: inherit`, so these scale with the corner's
// cqw-clamped font size instead of a fixed px height.
const CORNER_BUTTON_CLASS =
  'cursor-pointer rounded-[0.4em] border border-line-strong bg-card px-[0.6em] py-[0.35em] font-medium ' +
  'text-ink transition-colors hover:bg-sunken disabled:opacity-40 disabled:hover:bg-card'
const SIDEBAR_WIDTH = 210 // px, fixed so board sizing math stays simple; names truncate to fit
const SIDEBAR_GAP = 12
// Estimated rendered heights (incl. gap) used to decide how many score rows
// fit before fading the rest: one hero card for the current player, compact
// rows for everyone else.
const HERO_HEIGHT_ESTIMATE = 104
const ROW_HEIGHT_ESTIMATE = 54
const MAX_VISIBLE_SCORES = 6 // most darts nights are 2-4 players; cap here rather than fill all available height

/** True at >= 1024px: the side-by-side sidebar/board/checkout layout fits. Below it everything stacks. */
function useIsWideLayout() {
  const [isWide, setIsWide] = useState(() => globalThis.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = globalThis.matchMedia('(min-width: 1024px)')
    const onChange = (event: MediaQueryListEvent) => setIsWide(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isWide
}

export function PlayScreen({
  game,
  onThrow,
  onUndo,
  onRedo,
  canRedo,
  onNewGame,
  onRestart,
  useDartNotation,
  showCheckoutSuggestions,
}: PlayScreenProps) {
  useWakeLock()
  const viewModel =
    game.mode === 'x01' ? buildX01ViewModel(game, showCheckoutSuggestions) : buildCricketViewModel(game)
  const { engineCurrentPlayerId, currentTurnThrows, lastTurn, bustedPlayerId, valueFor, rightPanel } = viewModel
  const isBetweenTurns = currentTurnThrows.length === 0
  const canUndo = currentTurnThrows.length > 0 || !!lastTurn
  const isWide = useIsWideLayout()

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

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => setBoardSize(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
    // Re-observe when the layout flips: the board container is a different
    // element in the stacked layout.
  }, [isWide])

  const sidebarTopOffset = boardSize * BOARD_TOP_INSET_RATIO
  const sidebarAvailableHeight = Math.max(0, boardSize - sidebarTopOffset)
  const maxVisible = Math.min(
    MAX_VISIBLE_SCORES,
    Math.max(2, 1 + Math.floor((sidebarAvailableHeight - HERO_HEIGHT_ESTIMATE) / ROW_HEIGHT_ESTIMATE)),
  )

  // Rotate so the real current/next player sits first, then turn order after
  // them - the list visually "moves" each turn instead of jumping around.
  const playerCount = game.players.length
  const currentPlayerIndexInList = game.players.findIndex((p) => p.id === engineCurrentPlayerId)
  const rotatedPlayers = Array.from(
    { length: playerCount },
    (_, i) => game.players[(currentPlayerIndexInList + i) % playerCount],
  )
  const scoreEntries = rotatedPlayers.map((player) => ({
    id: player.id,
    name: player.name,
    remaining: valueFor(player.id),
  }))

  // Between turns, currentTurnThrows is already reset to [] (and the engine
  // commits the final dart directly, so there's never an intermediate render
  // showing all 3) - fall back to the last completed turn's full throw list
  // so the last player's hits stay visible until the next turn's first dart.
  const displayedThrows = isBetweenTurns ? (lastTurn?.throws ?? []) : currentTurnThrows

  function handleQuit() {
    if (globalThis.confirm('Quit this game? Current progress will be lost.')) {
      onNewGame()
    }
  }

  function handleRestart() {
    if (globalThis.confirm('Restart this game? Current progress will be lost.')) {
      onRestart()
    }
  }

  const handleUndo = useCallback(() => {
    if (!canUndo) return
    onUndo()
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

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo])

  // Two side columns (sidebar + checkout), not one - each needs its own
  // width+gap reserved, or the total layout can exceed 92vw. The stacked
  // layout has no side columns, so the board only answers to the viewport.
  const boardWidth = isWide
    ? `min(90vh, calc(92vw - ${2 * (SIDEBAR_WIDTH + SIDEBAR_GAP)}px), 800px)`
    : 'min(92vw, 70vh)'

  const boardBox = (
    <div
      ref={boardRef}
      style={{
        position: 'relative',
        width: boardWidth,
        height: boardWidth,
        containerType: 'inline-size',
      }}
    >
      <Dartboard onThrow={onThrow} currentTurnDartCount={currentTurnThrows.length} displayedThrows={displayedThrows} />

      <div
        className="absolute flex gap-[0.4em]"
        style={{ top: CORNER_INSET, right: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}
      >
        <button type="button" onClick={handleRestart} className={CORNER_BUTTON_CLASS}>
          Restart
        </button>
        <button type="button" onClick={handleQuit} className={CORNER_BUTTON_CLASS}>
          Quit
        </button>
      </div>

      <div className="absolute" style={{ bottom: CORNER_INSET, left: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}>
        <TurnPanel throws={displayedThrows} useDartNotation={useDartNotation} playerName={displayedPlayerName} />
      </div>

      <div
        className="absolute flex gap-[0.4em]"
        style={{ bottom: CORNER_INSET, right: CORNER_INSET, fontSize: CORNER_FONT_SIZE }}
      >
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={CORNER_BUTTON_CLASS}
          title="Undo (← or Ctrl+Z)"
        >
          ← Undo
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={!canRedo}
          className={CORNER_BUTTON_CLASS}
          title="Redo (→ or Ctrl+Y / Ctrl+Shift+Z)"
        >
          Redo →
        </button>
      </div>
    </div>
  )

  if (!isWide) {
    // Stacked portrait/narrow layout: horizontal score strip, board, checkout.
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="w-full">
          <ScoreDisplay
            players={scoreEntries}
            currentPlayerId={engineCurrentPlayerId}
            bustedPlayerId={bustedPlayerId}
            layout="row"
          />
        </div>
        {boardBox}
        {rightPanel && <div className="w-full max-w-md">{rightPanel}</div>}
      </div>
    )
  }

  return (
    // Three-column grid, not flex+justifyContent:center - that would center the
    // (sidebar+board) group as a unit, leaving the board itself off-center. The
    // "auto" middle column always centers the board regardless of sidebar width;
    // minmax(0, 1fr) (not plain 1fr) lets each side track shrink below its
    // content's min size so the board column stays centered.
    <div
      className="grid w-full items-start"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: SIDEBAR_GAP }}
    >
      <div
        className="justify-self-start overflow-hidden"
        style={{ width: SIDEBAR_WIDTH, marginTop: sidebarTopOffset, maxHeight: sidebarAvailableHeight }}
      >
        <ScoreDisplay
          players={scoreEntries}
          currentPlayerId={engineCurrentPlayerId}
          bustedPlayerId={bustedPlayerId}
          maxVisible={maxVisible}
        />
      </div>

      {boardBox}

      {rightPanel && (
        <div className="justify-self-end" style={{ width: SIDEBAR_WIDTH, marginTop: sidebarTopOffset }}>
          {rightPanel}
        </div>
      )}
    </div>
  )
}
