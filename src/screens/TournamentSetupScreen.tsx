import { useState, type SubmitEvent } from 'react'
import type { GameMode, Player } from '../game/types'
import { useRosterSelection } from '../players/useRosterSelection'
import { Button } from '../components/ui/Button'
import { GameModeToggle } from '../components/GameModeToggle'
import { Panel, inputClass } from '../components/ui/Panel'
import { RosterRow, ScrollShadow } from '../components/RosterPicker'
import type { TournamentConfig } from '../tournament/tournamentTypes'

const BEST_OF_OPTIONS = [1, 3, 5, 7] as const

interface TournamentSetupScreenProps {
  readonly onStart: (players: Player[], config: TournamentConfig) => void
}

export function TournamentSetupScreen({ onStart }: TournamentSetupScreenProps) {
  const { availableUsers, players, newUserName, setNewUserName, addUser, deleteUser, addToGame, removeFromGame } =
    useRosterSelection()

  const [mode, setMode] = useState<GameMode>('x01')
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)
  const [bestOf, setBestOf] = useState<(typeof BEST_OF_OPTIONS)[number]>(3)

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (players.length < 3) return
    const legsToWin = Math.ceil(bestOf / 2)
    onStart(players, mode === 'x01' ? { mode, x01: { startingScore, doubleOut }, legsToWin } : { mode, legsToWin })
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr] lg:gap-6">
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
          {players.length === 0 && <li className="text-ink-muted">Click a user to add them here. Need 3+.</li>}
          {players.map((player) => (
            <RosterRow key={player.id} name={player.name} selected onMove={() => removeFromGame(player.id)} />
          ))}
        </ScrollShadow>
      </Panel>

      <Panel title="Tournament settings" className="flex min-w-0 flex-col gap-5">
        <GameModeToggle mode={mode} onChange={setMode} />

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

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={players.length < 3}>
          Start Tournament
        </Button>
      </Panel>
    </form>
  )
}
