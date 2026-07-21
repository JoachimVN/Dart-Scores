import { useEffect, useRef, useState, type DragEvent, type SubmitEvent } from 'react'
import type { GameMode, Player } from '../game/types'
import { standardCricketConfig, type CricketConfig } from '../game/cricket/cricketTypes'
import { useRosterSelection } from '../players/useRosterSelection'
import { Button } from '../components/ui/Button'
import { GameModeToggle } from '../components/GameModeToggle'
import { TournamentFormatToggle } from '../components/TournamentFormatToggle'
import { Panel, inputClass } from '../components/ui/Panel'
import { RosterRow, ScrollShadow } from '../components/RosterPicker'
import { CricketNumberPicker } from '../components/CricketNumberPicker'
import { buildTournamentConfig, type TournamentConfig } from '../tournament/tournamentTypes'

const BEST_OF_OPTIONS = [1, 3, 5, 7] as const
type TournamentFormat = TournamentConfig['format']
type RosterList = 'users' | 'players'

interface RosterDropTarget {
  readonly list: RosterList
  readonly beforeId?: string
}

interface TournamentSetupScreenProps {
  readonly onStart: (players: Player[], config: TournamentConfig) => void
  readonly initialPlayers?: Player[]
  /** Keeps the setup selection shared with the casual tab and return flows. */
  readonly onPlayersChange?: (players: Player[]) => void
}

export function TournamentSetupScreen({ onStart, initialPlayers, onPlayersChange }: TournamentSetupScreenProps) {
  const {
    availableUsers,
    players,
    newUserName,
    setNewUserName,
    addUser,
    deleteUser,
    renameUser,
    placeInGame,
    removeFromGame,
  } = useRosterSelection(initialPlayers)

  const [mode, setMode] = useState<GameMode>('x01')
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)
  const [cricketConfig, setCricketConfig] = useState<CricketConfig>(standardCricketConfig)
  const [bestOf, setBestOf] = useState<(typeof BEST_OF_OPTIONS)[number]>(3)
  const [format, setFormat] = useState<TournamentFormat>('knockout')
  const [matchesPerPair, setMatchesPerPair] = useState<1 | 2>(1)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<RosterDropTarget | null>(null)
  const dropTargetRef = useRef<RosterDropTarget | null>(null)

  useEffect(() => {
    onPlayersChange?.(players)
  }, [onPlayersChange, players])

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (players.length < 2 || (mode === 'cricket' && cricketConfig.targets.length === 0)) return
    const legsToWin = Math.ceil(bestOf / 2)
    const modeConfig = mode === 'x01' ? { mode, x01: { startingScore, doubleOut }, legsToWin } : { mode, cricket: cricketConfig, legsToWin }
    const formatConfig = format === 'round_robin' ? { format, matchesPerPair } : { format }
    onStart(players, buildTournamentConfig(modeConfig, formatConfig))
  }

  function handleDragStart(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
    const dragImage = event.currentTarget.cloneNode(true) as HTMLElement
    const { width, height } = event.currentTarget.getBoundingClientRect()
    Object.assign(dragImage.style, {
      position: 'fixed',
      top: '-9999px',
      left: '-9999px',
      width: `${width}px`,
      height: `${height}px`,
      opacity: '0.6',
      pointerEvents: 'none',
    })
    document.body.append(dragImage)
    event.dataTransfer.setDragImage(dragImage, width / 2, height / 2)
    setTimeout(() => dragImage.remove(), 0)
    dropTargetRef.current = null
    setDraggedId(id)
  }

  function handleDragOver(event: DragEvent<HTMLElement>, target: RosterDropTarget) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    dropTargetRef.current = target
    setDropTarget(target)
  }

  function handleDrop(event: DragEvent<HTMLElement>, target: RosterDropTarget) {
    event.preventDefault()
    event.stopPropagation()
    const id = draggedId ?? event.dataTransfer.getData('text/plain')
    const resolvedTarget = dropTargetRef.current?.list === target.list ? dropTargetRef.current : target
    if (id) {
      if (resolvedTarget.list === 'players') placeInGame(id, resolvedTarget.beforeId)
      else removeFromGame(id)
    }
    setDraggedId(null)
    dropTargetRef.current = null
    setDropTarget(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    dropTargetRef.current = null
    setDropTarget(null)
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    dropTargetRef.current = null
    setDropTarget(null)
  }

  // Reordering within Players shows an insertion line, never the whole-zone
  // highlight - that cue is reserved for dragging someone in from Users.
  const isReorderingPlayers = players.some((player) => player.id === draggedId)

  function handlePlayersListDragOver(event: DragEvent<HTMLElement>) {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-roster-id]'))
    const isAddingPlayer = !isReorderingPlayers

    if (isAddingPlayer) {
      if (rows.length > 1) {
        const beforeRow = rows.find((row) => {
          const { top, height } = row.getBoundingClientRect()
          return event.clientY < top + height / 2
        })
        if (beforeRow) {
          handleDragOver(event, { list: 'players', beforeId: beforeRow.dataset.rosterId })
          return
        }
      }
      handleDragOver(event, { list: 'players' })
      return
    }

    const beforeRow = rows.find((row) => {
      const { top, height } = row.getBoundingClientRect()
      return event.clientY < top + height / 2
    })
    handleDragOver(event, { list: 'players', beforeId: beforeRow?.dataset.rosterId })
  }

  function insertionPreviewFor(playerId: string, index: number): 'before' | 'after' | undefined {
    if (dropTarget?.list !== 'players') return undefined
    if (dropTarget.beforeId === playerId) return 'before'
    return index === players.length - 1 && !dropTarget.beforeId ? 'after' : undefined
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr] lg:gap-6">
      <div className="relative h-full">
        <div
          aria-hidden="true"
          className={'absolute inset-x-0 -top-32 z-10 h-32 ' + (draggedId ? '' : 'pointer-events-none')}
          onDragOver={(event) => handleDragOver(event, { list: 'users' })}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'users' })}
        />
        <Panel
          title="Users"
          className={
            'flex h-full min-h-0 min-w-0 flex-col transition-colors ' +
            (dropTarget?.list === 'users' ? 'border-accent/60 bg-accent-soft/40' : '')
          }
          onDragOver={(event) => handleDragOver(event, { list: 'users' })}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'users' })}
        >
        <ScrollShadow
          className="min-h-40 flex-1"
          isDropTarget={dropTarget?.list === 'users' && !dropTarget.beforeId}
          onDragOver={(event) => handleDragOver(event, { list: 'users' })}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'users' })}
        >
          {availableUsers.length === 0 && <li className="text-ink-muted">No saved users yet.</li>}
          {availableUsers.map((user) => (
            <RosterRow
              key={user.id}
              id={user.id}
              name={user.name}
              onMove={() => placeInGame(user.id)}
              onDelete={() => deleteUser(user.id, user.name)}
              onRename={(name) => renameUser(user.id, name)}
              draggable
              isDragging={draggedId === user.id}
              isDropTarget={dropTarget?.list === 'users' && dropTarget.beforeId === user.id}
              onDragStart={(event) => handleDragStart(event, user.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(event) => handleDragOver(event, { list: 'users', beforeId: user.id })}
              onDragLeave={handleDragLeave}
              onDrop={(event) => handleDrop(event, { list: 'users', beforeId: user.id })}
            />
          ))}
        </ScrollShadow>
        <div className="flex gap-2">
          <input
            className={inputClass + ' min-w-0 flex-1'}
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addUser()
              }
            }}
            placeholder="New user name"
          />
          <Button onClick={addUser}>Add</Button>
        </div>
        </Panel>
        <div
          aria-hidden="true"
          className={'absolute inset-x-0 -bottom-32 z-10 h-32 ' + (draggedId ? '' : 'pointer-events-none')}
          onDragOver={(event) => handleDragOver(event, { list: 'users' })}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'users' })}
        />
      </div>

      <div className="relative h-full">
        <div
          aria-hidden="true"
          className={'absolute inset-x-0 -top-32 z-10 h-32 ' + (draggedId ? '' : 'pointer-events-none')}
          onDragOver={(event) => handleDragOver(event, { list: 'players', beforeId: players[0]?.id })}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'players', beforeId: players[0]?.id })}
        />
        <Panel
          title={`Players (${players.length})`}
          className={
            'flex h-full min-h-0 min-w-0 flex-col transition-colors ' +
            (dropTarget?.list === 'players' ? 'border-accent/60 bg-accent-soft/40' : '')
          }
          onDragOver={handlePlayersListDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'players' })}
        >
        <p className="mb-2 text-xs text-ink-muted">Drag people between lists or reorder the player order.</p>
        <ScrollShadow
          className="min-h-40 flex-1"
          isDropTarget={dropTarget?.list === 'players' && !dropTarget.beforeId && !isReorderingPlayers}
          onDragOver={handlePlayersListDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'players' })}
        >
          {players.length === 0 && <li className="text-ink-muted">Click a user to add them here. Need 2+.</li>}
          {players.map((player, index) => (
            <RosterRow
              key={player.id}
              id={player.id}
              name={player.name}
              selected
              onMove={() => removeFromGame(player.id)}
              onRename={(name) => renameUser(player.id, name)}
              draggable
              isDragging={draggedId === player.id}
              insertionPreview={insertionPreviewFor(player.id, index)}
              onDragStart={(event) => handleDragStart(event, player.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ScrollShadow>
        </Panel>
        <div
          aria-hidden="true"
          className={'absolute inset-x-0 -bottom-32 z-10 h-32 ' + (draggedId ? '' : 'pointer-events-none')}
          onDragOver={(event) => handleDragOver(event, { list: 'players' })}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'players' })}
        />
      </div>

      <Panel title="Tournament settings" className="flex min-w-0 flex-col gap-5">
        <TournamentFormatToggle format={format} onChange={setFormat} />

        <GameModeToggle mode={mode} onChange={setMode} />

        {format === 'round_robin' && (
          <fieldset className="m-0 border-none p-0">
            <legend className="mb-2 p-0 text-sm font-medium">Play each opponent</legend>
            <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
              {(
                [
                  [1, 'Once'],
                  [2, 'Twice'],
                ] as const
              ).map(([count, label]) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={matchesPerPair === count}
                  onClick={() => setMatchesPerPair(count)}
                  className={
                    'h-10 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-base font-semibold transition-colors ' +
                    (matchesPerPair === count
                      ? 'bg-card text-ink shadow-sm'
                      : 'bg-transparent text-ink-muted hover:text-ink')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {mode === 'x01' && (
          <fieldset className="m-0 border-none p-0">
            <legend className="mb-2 p-0 text-sm font-medium">Starting score</legend>
            <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
              {([501, 301] as const).map((score) => (
                <button
                  key={score}
                  type="button"
                  aria-pressed={startingScore === score}
                  onClick={() => setStartingScore(score)}
                  className={
                    'h-10 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-base font-semibold transition-colors ' +
                    (startingScore === score
                      ? 'bg-card text-ink shadow-sm'
                      : 'bg-transparent text-ink-muted hover:text-ink')
                  }
                >
                  {score}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {mode === 'cricket' && (
          <CricketNumberPicker targets={cricketConfig.targets} onChange={(targets) => setCricketConfig({ targets })} />
        )}

        <fieldset className="m-0 border-none p-0">
          <legend className="mb-2 p-0 text-sm font-medium">Best of (per matchup)</legend>
          <div className="flex gap-1 rounded-(--radius-md) bg-sunken p-1">
            {BEST_OF_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={bestOf === option}
                onClick={() => setBestOf(option)}
                className={
                  'h-10 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-base font-semibold transition-colors ' +
                  (bestOf === option ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
                }
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === 'x01' && (
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-(--accent)"
              checked={doubleOut}
              onChange={(e) => setDoubleOut(e.target.checked)}
            />
            <span>Double out</span>
          </label>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={players.length < 2 || (mode === 'cricket' && cricketConfig.targets.length === 0)}
        >
          Start Tournament
        </Button>
      </Panel>
    </form>
  )
}
