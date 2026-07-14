import { lazy, Suspense, useState, type ReactNode } from 'react'
import { TopBar } from './components/TopBar'
import { UpdateToast } from './components/UpdateToast'
import type { GameMode, GameState, Player } from './game/types'
import type { X01Config } from './game/x01/x01Types'
import { standardCricketConfig, type CricketConfig } from './game/cricket/cricketTypes'
import { useGame } from './hooks/useGame'
import { useTheme } from './hooks/useTheme'
import { useTournament } from './hooks/useTournament'
import { GameOverScreen } from './screens/GameOverScreen'
import { PlayScreen } from './screens/PlayScreen'
import { SetupScreen } from './screens/SetupScreen'
import { TournamentBracketScreen } from './screens/TournamentBracketScreen'
import { TournamentChampionScreen } from './screens/TournamentChampionScreen'
import { TournamentLegCompleteScreen } from './screens/TournamentLegCompleteScreen'
import { TournamentRoundRobinScreen } from './screens/TournamentRoundRobinScreen'
import { TournamentSetupScreen } from './screens/TournamentSetupScreen'
import { getSettings, updateSettings } from './settings/settingsRepository'
import type { Settings } from './storage/schema'
import { resetAllData } from './storage/storage'
import { findMatchupByLegGameId } from './tournament/tournamentEngine'
import type { Matchup, Tournament } from './tournament/tournamentTypes'

// Lazy-loaded so recharts (only needed here) doesn't bloat the main bundle.
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })))

// Confirmation already happened in TopBar - just wipe storage and reload so
// every piece of in-memory state (game, tournament, roster, settings) reverts
// to its default in one shot instead of resetting each useState by hand.
function handleResetAllData() {
  resetAllData()
  globalThis.location.reload()
}

interface MainContentArgs {
  readonly tournament: Tournament | null
  readonly game: GameState | null
  readonly matchup: Matchup | null
  readonly settings: Settings
  readonly setupTab: 'casual' | 'tournament'
  readonly lastPlayers: Player[]
  readonly lastMode: GameMode
  readonly lastX01Config: X01Config
  readonly lastCricketConfig: CricketConfig
  readonly topBar: (modeLabel: string) => ReactNode
  readonly startGame: ReturnType<typeof useGame>['startGame']
  readonly startTournament: ReturnType<typeof useTournament>['startTournament']
  readonly onThrow: ReturnType<typeof useGame>['throwDart']
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly canRedo: boolean
  readonly onNewGame: () => void
  readonly onRematch: () => void
  readonly onPlayNextLeg: () => void
  readonly onAbandonTournament: () => void
  readonly onSetupTabChange: (tab: 'casual' | 'tournament') => void
}

/** The tab switcher plus whichever roster screen (casual/tournament) is currently selected. */
function SetupTabs(args: MainContentArgs): ReactNode {
  return (
    <>
      <div className="mb-4 flex w-full max-w-[220px] gap-1 self-start rounded-(--radius-md) bg-sunken p-1">
        {(['casual', 'tournament'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={args.setupTab === tab}
            onClick={() => args.onSetupTabChange(tab)}
            className={
              'h-9 flex-1 cursor-pointer rounded-[calc(var(--radius-md)-3px)] text-sm font-semibold capitalize transition-colors ' +
              (args.setupTab === tab ? 'bg-card text-ink shadow-sm' : 'bg-transparent text-ink-muted hover:text-ink')
            }
          >
            {tab}
          </button>
        ))}
      </div>
      {args.setupTab === 'casual' ? (
        <SetupScreen
          onStart={args.startGame}
          initialPlayers={args.lastPlayers}
          initialMode={args.lastMode}
          initialX01Config={args.lastX01Config}
          initialCricketConfig={args.lastCricketConfig}
        />
      ) : (
        <TournamentSetupScreen onStart={args.startTournament} />
      )}
    </>
  )
}

/** Main content once a tournament is active: leg recap, in-progress leg, champion screen, or the bracket/league view. */
function renderTournamentContent(args: MainContentArgs & { tournament: Tournament }): ReactNode {
  const { tournament, game, matchup, settings, topBar } = args

  // Checked before tournament.status, so the leg that just clinched the whole
  // bracket still gets its recap screen (with the game's own darts) instead
  // of jumping straight to the champion screen on the same render.
  if (game?.status === 'complete') {
    const legMatchup = findMatchupByLegGameId(tournament, game.id)
    if (!legMatchup) return null
    return (
      <>
        {topBar('Tournament')}
        <TournamentLegCompleteScreen
          game={game}
          matchup={legMatchup}
          tournament={tournament}
          useDartNotation={settings.useDartNotation}
          onContinue={args.onNewGame}
        />
      </>
    )
  }

  if (game) {
    return (
      <PlayScreen
        game={game}
        onThrow={args.onThrow}
        onUndo={args.onUndo}
        onRedo={args.onRedo}
        canRedo={args.canRedo}
        onNewGame={args.onNewGame}
        onRestart={args.onRematch}
        useDartNotation={settings.useDartNotation}
        showCheckoutSuggestions={settings.showCheckoutSuggestions}
      />
    )
  }

  if (tournament.status === 'complete') {
    return (
      <>
        {topBar('Tournament')}
        <TournamentChampionScreen tournament={tournament} onNewTournament={args.onAbandonTournament} />
      </>
    )
  }

  return (
    <>
      {topBar('Tournament')}
      {tournament.config.format === 'round_robin' ? (
        <TournamentRoundRobinScreen
          tournament={tournament}
          matchup={matchup}
          onPlayNextLeg={args.onPlayNextLeg}
          onAbandon={args.onAbandonTournament}
        />
      ) : (
        <TournamentBracketScreen
          tournament={tournament}
          matchup={matchup}
          onPlayNextLeg={args.onPlayNextLeg}
          onAbandon={args.onAbandonTournament}
        />
      )}
    </>
  )
}

/** Main content with no active tournament: roster setup, the game-over recap, or the live game. */
function renderCasualContent(args: MainContentArgs): ReactNode {
  const { game, settings, topBar } = args

  if (!game) {
    return (
      <>
        {topBar('Setup')}
        <SetupTabs {...args} />
      </>
    )
  }

  if (game.status === 'complete') {
    return (
      <>
        {topBar(game.mode === 'x01' ? 'X01' : 'Cricket')}
        <GameOverScreen
          game={game}
          useDartNotation={settings.useDartNotation}
          onRematch={args.onRematch}
          onNewGame={args.onNewGame}
        />
      </>
    )
  }

  return (
    <PlayScreen
      game={game}
      onThrow={args.onThrow}
      onUndo={args.onUndo}
      onRedo={args.onRedo}
      canRedo={args.canRedo}
      onNewGame={args.onNewGame}
      onRestart={args.onRematch}
      useDartNotation={settings.useDartNotation}
      showCheckoutSuggestions={settings.showCheckoutSuggestions}
    />
  )
}

/** Picks which screen fills the main content area. */
function renderMainContent(args: MainContentArgs): ReactNode {
  if (args.tournament) return renderTournamentContent({ ...args, tournament: args.tournament })
  return renderCasualContent(args)
}

function App() {
  const { game, startGame, throwDart, undo, redo, canRedo, newGame } = useGame()
  const { tournament, matchup, startTournament, abandonTournament } = useTournament(game)
  const [settings, setSettings] = useState<Settings>(() => getSettings())
  const [view, setView] = useState<'main' | 'stats'>('main')
  const [lastPlayers, setLastPlayers] = useState<Player[]>([])
  const [lastMode, setLastMode] = useState<GameMode>('x01')
  const [lastX01Config, setLastX01Config] = useState<X01Config>({ startingScore: 501, doubleOut: true })
  const [lastCricketConfig, setLastCricketConfig] = useState<CricketConfig>(standardCricketConfig)
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
      else setLastCricketConfig(game.cricket.config)
    }
    newGame()
  }

  // Instantly starts a fresh game with the exact same players and settings,
  // skipping Setup entirely - "New game" above is for when you want to
  // change something first. Also used to replay a tournament leg from
  // scratch, since a leg's players/config are just the current game's.
  function handleRematch() {
    if (!game) return
    startGame(
      game.mode === 'x01'
        ? { mode: 'x01', config: game.x01.config, players: game.players }
        : { mode: 'cricket', config: game.cricket.config, players: game.players },
    )
  }

  function handlePlayNextLeg() {
    if (!tournament || !matchup) return
    const ids = matchup.players.map((slot) => slot.playerId).filter((id): id is string => id !== null)
    const legPlayers = ids.map((id) => tournament.players.find((p) => p.id === id)!).filter(Boolean)
    const { config } = tournament
    startGame(
      config.mode === 'x01'
        ? { mode: 'x01', config: config.x01, players: legPlayers }
        : { mode: 'cricket', config: config.cricket, players: legPlayers },
    )
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

  const topBar = (modeLabel: string) => (
    <TopBar
      modeLabel={modeLabel}
      settings={settings}
      onSettingsChange={handleSettingsChange}
      onOpenStats={() => setView('stats')}
      onResetAllData={handleResetAllData}
    />
  )

  const mainContent = renderMainContent({
    tournament,
    game,
    matchup,
    settings,
    setupTab,
    lastPlayers,
    lastMode,
    lastX01Config,
    lastCricketConfig,
    topBar,
    startGame,
    startTournament,
    onThrow: throwDart,
    onUndo: undo,
    onRedo: redo,
    canRedo,
    onNewGame: handleNewGame,
    onRematch: handleRematch,
    onPlayNextLeg: handlePlayNextLeg,
    onAbandonTournament: handleAbandonTournament,
    onSetupTabChange: setSetupTab,
  })

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
