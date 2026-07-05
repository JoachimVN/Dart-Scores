import type { Tournament } from '../tournament/tournamentTypes'
import { loadRoot, saveRoot } from './storage'

export function loadActiveTournament(): Tournament | null {
  return loadRoot().activeTournament
}

export function saveActiveTournament(tournament: Tournament): void {
  saveRoot({ ...loadRoot(), activeTournament: tournament })
}

export function clearActiveTournament(): void {
  saveRoot({ ...loadRoot(), activeTournament: null })
}
