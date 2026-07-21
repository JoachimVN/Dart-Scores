import { useCallback, useState, type SubmitEvent } from 'react'
import { CricketNumberPicker } from '../components/CricketNumberPicker'
import { GameModeToggle } from '../components/GameModeToggle'
import { RosterSelection } from '../components/RosterSelection'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { standardCricketConfig, type CricketConfig } from '../game/cricket/cricketTypes'
import type { NewGameParams, Player } from '../game/types'
import type { X01Config } from '../game/x01/x01Types'

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

export function SetupScreen({
  onStart,
  initialPlayers,
  initialMode = 'x01',
  initialX01Config,
  initialCricketConfig,
  onPlayersChange,
}: SetupScreenProps) {
  const [players, setPlayers] = useState<Player[]>(() => initialPlayers ?? [])
  const [mode, setMode] = useState<NewGameParams['mode']>(initialMode)
  const [startingScore, setStartingScore] = useState<301 | 501>((initialX01Config?.startingScore as 301 | 501) ?? 501)
  const [doubleOut, setDoubleOut] = useState(initialX01Config?.doubleOut ?? true)
  const [cricketConfig, setCricketConfig] = useState<CricketConfig>(initialCricketConfig ?? standardCricketConfig())

  const handlePlayersChange = useCallback(
    (nextPlayers: Player[]) => {
      setPlayers(nextPlayers)
      onPlayersChange?.(nextPlayers)
    },
    [onPlayersChange],
  )

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    if (players.length === 0 || (mode === 'cricket' && cricketConfig.targets.length === 0)) return
    onStart(mode === 'x01' ? { mode, config: { startingScore, doubleOut }, players } : { mode, config: cricketConfig, players })
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_2fr] lg:gap-6">
      <RosterSelection
        initialPlayers={initialPlayers}
        onPlayersChange={handlePlayersChange}
        playerInstructions="Drag people between lists or reorder the throw order."
        emptyPlayersMessage="Click a user to add them here."
      />

      <Panel title="Game settings" className="flex min-w-0 flex-col gap-5">
        <GameModeToggle mode={mode} onChange={setMode} />

        {mode === 'x01' ? (
          <>
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
                      (startingScore === score ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
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
                onChange={(event) => setDoubleOut(event.target.checked)}
              />
              <span>Double out</span>
            </label>
          </>
        ) : (
          <CricketNumberPicker targets={cricketConfig.targets} onChange={(targets) => setCricketConfig({ targets })} />
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
