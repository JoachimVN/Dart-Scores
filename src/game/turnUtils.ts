import type { Throw } from './types'

/** The most recently completed turn across all players (by last-dart timestamp), or null if none has finished yet. Shared by every game mode's engine - each mode's turn record just needs a `throws` array. */
export function mostRecentTurn<T extends { throws: Throw[] }>(playerStates: { turns: T[] }[]): T | null {
  let latest: T | null = null
  let latestTimestamp = -Infinity

  for (const playerState of playerStates) {
    const turn = playerState.turns.at(-1)
    const turnTimestamp = turn?.throws.at(-1)?.timestamp ?? -Infinity
    if (turn && turnTimestamp > latestTimestamp) {
      latest = turn
      latestTimestamp = turnTimestamp
    }
  }

  return latest
}
