import { useCallback, useEffect, useRef, useState } from 'react'
import { winnerIdOf } from '../game/gameSelectors'
import type { GameState, Player } from '../game/types'
import {
  clearActiveTournament,
  loadActiveTournament,
  saveActiveTournament,
} from '../storage/tournamentRepository'
import { createTournament, findMatchupForPlayers, nextMatchup, recordLegResult } from '../tournament/tournamentEngine'
import type { Tournament, TournamentConfig } from '../tournament/tournamentTypes'

/**
 * Manages the persisted tournament bracket. Takes the *casual* useGame hook's
 * current leg (a plain GameState) as a parameter rather than wrapping useGame
 * itself, so the two hooks stay decoupled - useTournament only knows about
 * Tournament, useGame only knows about GameState. App.tsx composes both and
 * calls useGame's startGame directly to start each leg.
 */
export function useTournament(activeLeg: GameState | null) {
  const [tournament, setTournament] = useState<Tournament | null>(() => loadActiveTournament())

  const startTournament = useCallback((players: Player[], config: TournamentConfig) => {
    const next = createTournament(players, config)
    saveActiveTournament(next)
    setTournament(next)
  }, [])

  const abandonTournament = useCallback(() => {
    clearActiveTournament()
    setTournament(null)
  }, [])

  // Records a leg's result once its GameState completes. Matches by the leg's
  // player-id pair (not nextMatchup) since recordLegResult may already have
  // advanced the bracket pointer to a different matchup by the time this
  // runs. The legGameIds.includes check (not just the ref) makes this
  // self-healing across a full page reload between a leg finishing and this
  // effect running, not just React StrictMode's double-invoke - mirroring
  // useGame's recordedGameIds guard.
  const recordedLegIds = useRef(new Set<string>())
  useEffect(() => {
    if (!tournament || !activeLeg || activeLeg.status !== 'complete') return
    if (recordedLegIds.current.has(activeLeg.id)) return

    const matchup = findMatchupForPlayers(
      tournament,
      activeLeg.players.map((p) => p.id),
    )
    if (!matchup || matchup.status === 'complete' || matchup.legGameIds.includes(activeLeg.id)) return

    const winnerId = winnerIdOf(activeLeg)
    if (!winnerId) return

    recordedLegIds.current.add(activeLeg.id)
    const updated = recordLegResult(tournament, matchup.id, winnerId, activeLeg.id)
    saveActiveTournament(updated)
    setTournament(updated)
  }, [tournament, activeLeg])

  return {
    tournament,
    matchup: tournament ? nextMatchup(tournament) : null,
    startTournament,
    abandonTournament,
  }
}
