import { useState, type SubmitEvent } from 'react'
import type { NewGameParams, Player } from '../game/types'
import { useRosterSelection } from '../players/useRosterSelection'
import { Button } from '../components/ui/Button'
import { GameModeToggle } from '../components/GameModeToggle'
import { Panel, inputClass } from '../components/ui/Panel'
import { RosterRow, ScrollShadow } from '../components/RosterPicker'

interface SetupScreenProps {
  readonly onStart: (params: NewGameParams) => void
  /** Pre-selects these into the Players list (e.g. a rematch after "New game"), instead of starting empty. */
  readonly initialPlayers?: Player[]
}

export function SetupScreen({ onStart, initialPlayers }: SetupScreenProps) {
  const { availableUsers, players, newUserName, setNewUserName, addUser, deleteUser, addToGame, removeFromGame } =
    useRosterSelection(initialPlayers)

  const [mode, setMode] = useState<NewGameParams['mode']>('x01')
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (players.length === 0) return
    onStart(mode === 'x01' ? { mode, config: { startingScore, doubleOut }, players } : { mode, players })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr] lg:gap-6"
    >
      <Panel title="Users" className="min-w-0">
        <ScrollShadow>
          {availableUsers.length === 0 && <li className="text-ink-muted">No saved users yet.</li>}
          {availableUsers.map((user) => (
            <RosterRow
              key={user.id}
              name={user.name}
              onMove={() => addToGame(user.id)}
              onDelete={() => deleteUser(user.id, user.name)}
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

      <Panel title={`Players (${players.length})`} className="min-w-0">
        <ScrollShadow>
          {players.length === 0 && <li className="text-ink-muted">Click a user to add them here.</li>}
          {players.map((player) => (
            <RosterRow key={player.id} name={player.name} selected onMove={() => removeFromGame(player.id)} />
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
          <p className="m-0 text-sm text-ink-muted">
            Standard Cricket: 20 down to 15, plus the bull. Close each number with 3 marks, then keep hitting it to
            score points off opponents who haven't closed it yet.
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={players.length === 0}>
          Start Game
        </Button>
      </Panel>
    </form>
  )
}
