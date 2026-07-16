// Hand-scripted (not randomized) dart sequences for the three README screenshots, run through the
// *real* X01 engine and tournament engine so every resulting GameState/Tournament is exactly as
// valid as one played through the UI. Nothing here is simulated data-shape guessing - applyThrow
// decides busts/wins/turn-completion itself, same as a live game.
import type { GameState, Player } from '../src/game/types'
import { applyThrow, createX01Game, type ThrowInput } from '../src/game/x01/x01Engine'
import type { X01Config } from '../src/game/x01/x01Types'
import { buildX01GameSummary } from '../src/stats/buildX01GameSummary'
import type { GameSummary } from '../src/stats/types'
import { createTournament, recordLegResult } from '../src/tournament/tournamentEngine'
import type { Tournament } from '../src/tournament/tournamentTypes'
import { defaultSettings, type PersistedRoot } from '../src/storage/schema'

// First names that read as ordinary in both the US and Norway.
export const ROSTER: Record<string, Player> = {
  erik: { id: 'erik', name: 'Erik' },
  anna: { id: 'anna', name: 'Anna' },
  daniel: { id: 'daniel', name: 'Daniel' },
  sara: { id: 'sara', name: 'Sara' },
  thomas: { id: 'thomas', name: 'Thomas' },
  emma: { id: 'emma', name: 'Emma' },
}

function T(n: number): ThrowInput {
  return { segment: n, ring: 'treble', value: n * 3, label: `T${n}` }
}
function D(n: number): ThrowInput {
  return { segment: n, ring: 'double', value: n * 2, label: `D${n}` }
}
function S(n: number): ThrowInput {
  return { segment: n, ring: 'outerSingle', value: n, label: `${n}` }
}
function Bull(): ThrowInput {
  return { segment: null, ring: 'bullseye', value: 50, label: 'Bull' }
}

/** Zips two players' per-turn dart plans into the flat, alternating throw order applyThrow expects. Player A may have one extra (finishing) turn that B never gets to answer. */
function interleaveTurns(a: ThrowInput[][], b: ThrowInput[][]): ThrowInput[] {
  const out: ThrowInput[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(...a[i])
    if (b[i]) out.push(...b[i])
  }
  return out
}

function playLeg(
  id: string,
  players: [Player, Player],
  config: X01Config,
  winnerTurns: ThrowInput[][],
  loserTurns: ThrowInput[][],
  createdAt: number,
): Extract<GameState, { mode: 'x01' }> {
  let x01 = createX01Game(config, players)
  for (const dart of interleaveTurns(winnerTurns, loserTurns)) x01 = applyThrow(x01, dart)
  if (!x01.winnerId) throw new Error(`Leg ${id} never finished - check the scripted dart sequence sums to exactly 0.`)
  return { id, status: 'complete', players, createdAt, updatedAt: createdAt, mode: 'x01', x01 }
}

const X01_301: X01Config = { startingScore: 301, doubleOut: true }
const X01_501: X01Config = { startingScore: 501, doubleOut: true }

/**
 * A 301 game mid-play: Erik (currently up) has thrown exactly one dart this
 * turn - a T20 leaving him on a live 40, checkoutable in one or two darts -
 * while Anna and Daniel sit at realistic, non-checkout mid-game scores.
 */
export function gamePersistedRoot(now: number): PersistedRoot {
  const players = [ROSTER.erik, ROSTER.anna, ROSTER.daniel]
  let x01 = createX01Game(X01_301, players)
  const completedTurns: ThrowInput[] = [
    [T(20), T(19), T(18)], [S(20), S(20), S(19)], [T(20), S(20), S(6)], // round 1: Erik, Anna, Daniel
    [S(20), S(5), S(5)], [T(10), S(1), S(1)], [S(20), S(19), S(1)], // round 2: Erik, Anna, Daniel
  ].flat()
  for (const dart of completedTurns) x01 = applyThrow(x01, dart)
  x01 = applyThrow(x01, T(20)) // Erik's 3rd-turn opener - left mid-turn on purpose

  const game: GameState = {
    id: 'screenshot-game', status: 'in_progress', players, createdAt: now, updatedAt: now, mode: 'x01', x01,
  }

  return {
    players: [],
    activeGame: game,
    settings: { ...defaultSettings(), theme: 'light' },
    history: [],
    activeTournament: null,
  }
}

/** A saved roster split between "Users" (not yet picked) and "Players" (already added), with Cricket mode selected. */
export function setupPersistedRoot(): PersistedRoot {
  return {
    players: [ROSTER.erik, ROSTER.anna, ROSTER.daniel, ROSTER.sara, ROSTER.thomas, ROSTER.emma],
    activeGame: null,
    settings: { ...defaultSettings(), theme: 'light' },
    history: [],
    activeTournament: null,
  }
}

/** A completed 4-player knockout: Erik beats Sara and Anna beats Daniel in the semis, then Erik beats Anna in the final. */
export function tournamentPersistedRoot(now: number): PersistedRoot {
  const players = [ROSTER.erik, ROSTER.anna, ROSTER.daniel, ROSTER.sara]
  let tournament: Tournament = createTournament(players, { mode: 'x01', x01: X01_501, legsToWin: 1, format: 'knockout' })
  const history: GameSummary[] = []

  const semi1 = tournament.rounds[0][0] // Erik vs Sara
  const leg1 = playLeg(
    'screenshot-leg-1', [ROSTER.erik, ROSTER.sara], X01_501,
    [[T(20), T(20), T(19)], [T(20), T(20), T(18)], [T(20), T(10), S(20)], [D(20)]], // Erik: 177, 174, 110, D20 finish (40 checkout)
    [[S(20), S(20), S(19)], [T(15), S(1), S(1)], [S(20), S(5), S(5)]], // Sara
    now,
  )
  history.push(buildX01GameSummary(leg1))
  tournament = recordLegResult(tournament, semi1.id, ROSTER.erik.id, leg1.id)

  const semi2 = tournament.rounds[0][1] // Anna vs Daniel
  const leg2 = playLeg(
    'screenshot-leg-2', [ROSTER.anna, ROSTER.daniel], X01_501,
    [[T(20), T(20), T(19)], [T(20), T(19), T(18)], [T(20), T(15), S(16)], [D(16)]], // Anna: 177, 171, 121, D16 finish (32 checkout)
    [[T(20), T(20), T(20)], [S(20), S(19), S(1)], [T(10), S(15), S(1)]], // Daniel - opens with a 180
    now,
  )
  history.push(buildX01GameSummary(leg2))
  tournament = recordLegResult(tournament, semi2.id, ROSTER.anna.id, leg2.id)

  const final = tournament.rounds[1][0] // Erik vs Anna
  const leg3 = playLeg(
    'screenshot-leg-3', [ROSTER.erik, ROSTER.anna], X01_501,
    [[T(20), T(20), T(19)], [T(20), T(18), S(20)], [T(10), T(10), T(10)], [Bull(), Bull()]], // Erik: 177, 134, 90, Bull+Bull finish (50 checkout)
    [[S(20), S(20), S(19)], [T(14), S(10), S(6)], [S(20), S(15), S(5)]], // Anna
    now,
  )
  history.push(buildX01GameSummary(leg3))
  tournament = recordLegResult(tournament, final.id, ROSTER.erik.id, leg3.id)

  return {
    players: [],
    activeGame: null,
    settings: { ...defaultSettings(), theme: 'dark' },
    history,
    activeTournament: tournament,
  }
}

export type { Throw } from '../src/game/types'
