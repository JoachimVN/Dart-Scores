import { useEffect, useRef, useState, type DragEvent, type SubmitEvent } from 'react'
import type { NewGameParams, Player } from '../game/types'
import type { X01Config } from '../game/x01/x01Types'
import { standardCricketConfig, type CricketConfig } from '../game/cricket/cricketTypes'
import { useRosterSelection } from '../players/useRosterSelection'
import { Button } from '../components/ui/Button'
import { GameModeToggle } from '../components/GameModeToggle'
import { Panel, inputClass } from '../components/ui/Panel'
import { RosterRow, ScrollShadow } from '../components/RosterPicker'
import { CricketNumberPicker } from '../components/CricketNumberPicker'

interface SetupScreenProps {
  readonly onStart: (params: NewGameParams) => void
  /** Pre-selects these into the Players list (e.g. a rematch after "New game"), instead of starting empty. */
  readonly initialPlayers?: Player[]
  /** Pre-selects the last-used mode/config (e.g. after "New game"), instead of always resetting to X01/501/double-out. */
  readonly initialMode?: NewGameParams['mode']
  readonly initialX01Config?: X01Config
  readonly initialCricketConfig?: CricketConfig
  /** Keeps the setup selection shared with the tournament tab and return flows. */
  readonly onPlayersChange?: (players: Player[]) => void
}

type RosterList = 'users' | 'players'

interface RosterDropTarget {
  readonly list: RosterList
  readonly beforeId?: string
}

export function SetupScreen({
  onStart,
  initialPlayers,
  initialMode = 'x01',
  initialX01Config,
  initialCricketConfig,
  onPlayersChange,
}: SetupScreenProps) {
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

  const [mode, setMode] = useState<NewGameParams['mode']>(initialMode)
  const [startingScore, setStartingScore] = useState<301 | 501>((initialX01Config?.startingScore as 301 | 501) ?? 501)
  const [doubleOut, setDoubleOut] = useState(initialX01Config?.doubleOut ?? true)
  const [cricketConfig, setCricketConfig] = useState<CricketConfig>(initialCricketConfig ?? standardCricketConfig())
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<RosterDropTarget | null>(null)
  const dropTargetRef = useRef<RosterDropTarget | null>(null)

  useEffect(() => {
    onPlayersChange?.(players)
  }, [onPlayersChange, players])

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (players.length === 0 || (mode === 'cricket' && cricketConfig.targets.length === 0)) return
    onStart(mode === 'x01' ? { mode, config: { startingScore, doubleOut }, players } : { mode, config: cricketConfig, players })
  }

  function handleDragStart(event: DragEvent<HTMLLIElement>, id: string) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
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

  function handlePlayersListDragOver(event: DragEvent<HTMLElement>) {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-roster-id]'))
    const isAddingPlayer = !players.some((player) => player.id === draggedId)

    if (isAddingPlayer) {
      if (rows.length > 1 && event.clientY < rows[0].getBoundingClientRect().top) {
        handleDragOver(event, { list: 'players', beforeId: rows[0].dataset.rosterId })
        return
      }
      for (let index = 0; index < rows.length - 1; index++) {
        const current = rows[index].getBoundingClientRect()
        const next = rows[index + 1].getBoundingClientRect()
        if (event.clientY > current.bottom && event.clientY < next.top) {
          handleDragOver(event, { list: 'players', beforeId: rows[index + 1].dataset.rosterId })
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

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr] lg:gap-6"
    >
      <Panel
        title="Users"
        className={
          'flex min-h-0 min-w-0 flex-col transition-colors ' +
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
              // Without this, Enter here bubbles up to the outer form and
              // triggers "Start Game" instead (the only submit button on the
              // page), rather than adding the user like clicking Add would.
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

      <Panel
        title={`Players (${players.length})`}
        className={
          'flex min-h-0 min-w-0 flex-col transition-colors ' +
          (dropTarget?.list === 'players' ? 'border-accent/60 bg-accent-soft/40' : '')
        }
        onDragOver={handlePlayersListDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => handleDrop(event, { list: 'players' })}
      >
        <p className="mb-2 text-xs text-ink-muted">Drag people between lists or reorder the throw order.</p>
        <ScrollShadow
          className="min-h-40 flex-1"
          isDropTarget={dropTarget?.list === 'players' && !dropTarget.beforeId}
          onDragOver={handlePlayersListDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'players' })}
        >
          {players.length === 0 && <li className="text-ink-muted">Click a user to add them here.</li>}
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
              insertionPreview={
                dropTarget?.list === 'players'
                  ? dropTarget.beforeId === player.id
                    ? 'before'
                    : index === players.length - 1 && !dropTarget.beforeId
                      ? 'after'
                      : undefined
                  : undefined
              }
              onDragStart={(event) => handleDragStart(event, player.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ScrollShadow>
      </Panel>

      <Panel title="Game settings" className="flex min-w-0 flex-col gap-5">
        <GameModeToggle mode={mode} onChange={setMode} />

        {mode === 'x01' ? (
          <>
            <fieldset className="m-0 border-none p-0">
              <legend className="mb-2 p-0 text-sm font-medium">Starting score</legend>
              {/* Segmented control on top of the same radio state. */}
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

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-(--accent)"
                checked={doubleOut}
                onChange={(e) => setDoubleOut(e.target.checked)}
              />
              <span>Double out</span>
            </label>
          </>
        ) : (
          <CricketNumberPicker
            targets={cricketConfig.targets}
            onChange={(targets) => setCricketConfig({ targets })}
          />
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={players.length === 0 || (mode === 'cricket' && cricketConfig.targets.length === 0)}
        >
          Start Game
        </Button>
      </Panel>
    </form>
  )
}
