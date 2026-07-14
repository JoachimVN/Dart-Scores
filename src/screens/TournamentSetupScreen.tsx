import { useState, type SubmitEvent } from 'react'
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

interface TournamentSetupScreenProps {
  readonly onStart: (players: Player[], config: TournamentConfig) => void
}

export function TournamentSetupScreen({ onStart }: TournamentSetupScreenProps) {
  const {
    availableUsers,
    players,
    newUserName,
    setNewUserName,
    addUser,
    deleteUser,
    renameUser,
    addToGame,
    removeFromGame,
  } = useRosterSelection()

  const [mode, setMode] = useState<GameMode>('x01')
  const [startingScore, setStartingScore] = useState<301 | 501>(501)
  const [doubleOut, setDoubleOut] = useState(true)
  const [cricketConfig, setCricketConfig] = useState<CricketConfig>(standardCricketConfig)
  const [bestOf, setBestOf] = useState<(typeof BEST_OF_OPTIONS)[number]>(3)
  const [format, setFormat] = useState<TournamentFormat>('knockout')
  const [matchesPerPair, setMatchesPerPair] = useState<1 | 2>(1)

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (players.length < 2 || (mode === 'cricket' && cricketConfig.targets.length === 0)) return
    const legsToWin = Math.ceil(bestOf / 2)
    const modeConfig = mode === 'x01' ? { mode, x01: { startingScore, doubleOut }, legsToWin } : { mode, cricket: cricketConfig, legsToWin }
    const formatConfig = format === 'round_robin' ? { format, matchesPerPair } : { format }
    onStart(players, buildTournamentConfig(modeConfig, formatConfig))
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
              onRename={(name) => renameUser(user.id, name)}
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
          {players.length === 0 && <li className="text-ink-muted">Click a user to add them here. Need 2+.</li>}
          {players.map((player) => (
            <RosterRow
              key={player.id}
              name={player.name}
              selected
              onMove={() => removeFromGame(player.id)}
              onRename={(name) => renameUser(player.id, name)}
            />
          ))}
        </ScrollShadow>
      </Panel>

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
