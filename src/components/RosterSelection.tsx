import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { Player } from '../game/types'
import { useRosterSelection } from '../players/useRosterSelection'
import { RosterRow, ScrollShadow } from './RosterPicker'
import { Button } from './ui/Button'
import { Panel, inputClass } from './ui/Panel'

type RosterList = 'users' | 'players'

interface RosterDropTarget {
  readonly list: RosterList
  readonly beforeId?: string
}

interface RosterSelectionProps {
  readonly initialPlayers?: Player[]
  readonly onPlayersChange: (players: Player[]) => void
  readonly playerInstructions: string
  readonly emptyPlayersMessage: string
}

/** The shared saved-user picker and drag-and-drop player-order control. */
export function RosterSelection({
  initialPlayers,
  onPlayersChange,
  playerInstructions,
  emptyPlayersMessage,
}: RosterSelectionProps) {
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
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<RosterDropTarget | null>(null)
  const dropTargetRef = useRef<RosterDropTarget | null>(null)

  useEffect(() => {
    onPlayersChange(players)
  }, [onPlayersChange, players])

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

  const isReorderingPlayers = players.some((player) => player.id === draggedId)

  function handlePlayersListDragOver(event: DragEvent<HTMLElement>) {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-roster-id]'))
    if (!isReorderingPlayers) {
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
    <>
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
          className={'flex h-full min-h-0 min-w-0 flex-col transition-colors ' + (dropTarget?.list === 'users' ? 'border-accent/60 bg-accent-soft/40' : '')}
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
              onChange={(event) => setNewUserName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
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
          className={'flex h-full min-h-0 min-w-0 flex-col transition-colors ' + (dropTarget?.list === 'players' ? 'border-accent/60 bg-accent-soft/40' : '')}
          onDragOver={handlePlayersListDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, { list: 'players' })}
        >
          <p className="mb-2 text-xs text-ink-muted">{playerInstructions}</p>
          <ScrollShadow
            className="min-h-40 flex-1"
            isDropTarget={dropTarget?.list === 'players' && !dropTarget.beforeId && !isReorderingPlayers}
            onDragOver={handlePlayersListDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(event) => handleDrop(event, { list: 'players' })}
          >
            {players.length === 0 && <li className="text-ink-muted">{emptyPlayersMessage}</li>}
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
    </>
  )
}
