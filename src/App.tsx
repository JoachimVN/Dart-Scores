import { lazy, Suspense, useState, type ReactNode } from 'react'
import { TopBar } from './components/TopBar'
import { UpdateToast } from './components/UpdateToast'
import type { GameMode, Player } from './game/types'
import type { X01Config } from './game/x01/x01Types'
import { useGame } from './hooks/useGame'
import { useTheme } from './hooks/useTheme'
import { useTournament } from './hooks/useTournament'
import { GameOverScreen } from './screens/GameOverScreen'
import { PlayScreen } from './screens/PlayScreen'
import { SetupScreen } from './screens/SetupScreen'
import { TournamentBracketScreen } from './screens/TournamentBracketScreen'
import { TournamentChampionScreen } from './screens/TournamentChampionScreen'
import { TournamentLegCompleteScreen } from './screens/TournamentLegCompleteScreen'
import { TournamentSetupScreen } from './screens/TournamentSetupScreen'
import { getSettings, updateSettings } from './settings/settingsRepository'
import type { Settings } from './storage/schema'
import { resetAllData } from './storage/storage'
import { findMatchupByLegGameId } from './tournament/tournamentEngine'

// Lazy-loaded so recharts (only needed here) doesn't bloat the main bundle.
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })))

function App() {
  const { game, startGame, throwDart, undo, redo, canRedo, newGame } = useGame()
  const { tournament, matchup, startTournament, abandonTournament } = useTournament(game)
  const [settings, setSettings] = useState<Settings>(() => getSettings())
  const [view, setView] = useState<'main' | 'stats'>('main')
  const [lastPlayers, setLastPlayers] = useState<Player[]>([])
  const [lastMode, setLastMode] = useState<GameMode>('x01')
  const [lastX01Config, setLastX01Config] = useState<X01Config>({ startingScore: 501, doubleOut: true })
  const [setupTab, setSetupTab] = useState<'casual' | 'tournament'>('casual')

  // Captures who just played (and the mode/config they played with) before
  // clearing the game, so Setup can pre-fill a quick rematch instead of
  // resetting to X01/501/double-out and making you re-pick everyone from
  // Users again. Only meaningful for casual play - a tournament leg's players
  // and config are already recorded in the bracket itself. Session-only (not
  // persisted), same as lastPlayers.
  function handleNewGame() {
    if (game && !tournament) {
      setLastPlayers(game.players)
      setLastMode(game.mode)
      if (game.mode === 'x01') setLastX01Config(game.x01.config)
    }
    newGame()
  }

  // Instantly starts a fresh game with the exact same players and settings,
  // skipping Setup entirely - "New game" above is for when you want to
  // change something first. Also used to replay a tournament leg from
  // scratch, since a leg's players/config are just the current game's.
  function handleRematch() {
    if (!game) return
    startGame(game.mode === 'x01' ? { mode: 'x01', config: game.x01.config, players: game.players } : { mode: 'cricket', players: game.players })
  }

  function handlePlayNextLeg() {
    if (!tournament || !matchup) return
    const ids = matchup.players.map((slot) => slot.playerId).filter((id): id is string => id !== null)
    const legPlayers = ids.map((id) => tournament.players.find((p) => p.id === id)!).filter(Boolean)
    const { config } = tournament
    startGame(config.mode === 'x01' ? { mode: 'x01', config: config.x01, players: legPlayers } : { mode: 'cricket', players: legPlayers })
  }

  function handleAbandonTournament() {
    abandonTournament()
    setSetupTab('tournament')
  }

  // Applies globally regardless of which screen renders below (including Play,
  // which has no top bar of its own).
  useTheme(settings.theme)

  function handleSettingsChange(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }))
    updateSettings(patch)
  }

  // Confirmation already happened in TopBar - just wipe storage and reload so
  // every piece of in-memory state (game, tournament, roster, settings) reverts
  // to its default in one shot instead of resetting each useState by hand.
  function handleResetAllData() {
    resetAllData()
    globalThis.location.reload()
  }

  const topBar = (modeLabel: string) => (
    <TopBar
      modeLabel={modeLabel}
      settings={settings}
      onSettingsChange={handleSettingsChange}
      onOpenStats={() => setView('stats')}
      onResetAllData={handleResetAllData}
    />
  )

  let mainContent: ReactNode
  if (tournament) {
    // Checked before tournament.status, so the leg that just clinched the
    // whole bracket still gets its recap screen (with the game's own darts)
    // instead of jumping straight to the champion screen on the same render.
    if (game?.status === 'complete') {
      const legMatchup = findMatchupByLegGameId(tournament, game.id)
      mainContent = legMatchup && (
        <>
          {topBar('Tournament')}
          <TournamentLegCompleteScreen
            game={game}
            matchup={legMatchup}
            tournament={tournament}
            useDartNotation={settings.useDartNotation}
            onContinue={handleNewGame}
          />
        </>
      )
    } else if (game) {
      mainContent = (
        <PlayScreen
          game={game}
          onThrow={throwDart}
          onUndo={undo}
          onRedo={redo}
          canRedo={canRedo}
          onNewGame={handleNewGame}
          onRestart={handleRematch}
          useDartNotation={settings.useDartNotation}
          showCheckoutSuggestions={settings.showCheckoutSuggestions}
        />
      )
    } else if (tournament.status === 'complete') {
      mainContent = (
        <>
          {topBar('Tournament')}
          <TournamentChampionScreen tournament={tournament} onNewTournament={handleAbandonTournament} />
        </>
      )
    } else {
      mainContent = (
        <>
          {topBar('Tournament')}
          <TournamentBracketScreen
            tournament={tournament}
            matchup={matchup}
            onPlayNextLeg={handlePlayNextLeg}
            onAbandon={handleAbandonTournament}
          />
        </>
      )
    }
  } else if (!game) {
    mainContent = (
      <>
        {topBar('Setup')}
        <div className="mb-4 flex w-full max-w-[220px] gap-1 self-start rounded-(--radius-md) bg-sunken p-1">
          {(['casual', 'tournament'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={setupTab === tab}
              onClick={() => setSetupTab(tab)}
              className={
                'h-9 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-sm font-semibold capitalize transition-colors ' +
                (setupTab === tab ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
              }
            >
              {tab}
            </button>
          ))}
        </div>
        {setupTab === 'casual' ? (
          <SetupScreen
            onStart={startGame}
            initialPlayers={lastPlayers}
            initialMode={lastMode}
            initialX01Config={lastX01Config}
          />
        ) : (
          <TournamentSetupScreen onStart={startTournament} />
        )}
      </>
    )
  } else if (game.status === 'complete') {
    mainContent = (
      <>
        {topBar(game.mode === 'x01' ? 'X01' : 'Cricket')}
        <GameOverScreen
          game={game}
          useDartNotation={settings.useDartNotation}
          onRematch={handleRematch}
          onNewGame={handleNewGame}
        />
      </>
    )
  } else {
    mainContent = (
      <PlayScreen
        game={game}
        onThrow={throwDart}
        onUndo={undo}
        onRedo={redo}
        canRedo={canRedo}
        onNewGame={handleNewGame}
        onRestart={handleRematch}
        useDartNotation={settings.useDartNotation}
        showCheckoutSuggestions={settings.showCheckoutSuggestions}
      />
    )
  }

  return (
    <main>
      {/* Kept mounted (just hidden), not unmounted, while viewing stats - so
          Setup's in-progress Players selection survives the round trip. */}
      <div style={{ display: view === 'main' ? 'contents' : 'none' }}>{mainContent}</div>
      {view === 'stats' && (
        <Suspense fallback={null}>
          <StatsScreen onBack={() => setView('main')} />
        </Suspense>
      )}
      <UpdateToast />
    </main>
  )
}

export default App
