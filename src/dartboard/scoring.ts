import type { HitResult } from './dartboard.types'

export interface ScoredHit {
  label: string
  value: number
}

/** Maps a resolved board hit to the score it's worth and a display label (e.g. "T20", "D16", "25", "50", "MISS"). */
export function scoreHit(hit: HitResult): ScoredHit {
  switch (hit.ring) {
    case 'bullseye':
      return { label: '50', value: 50 }
    case 'outerBull':
      return { label: '25', value: 25 }
    case 'double':
      return { label: `D${hit.segment}`, value: hit.segment! * 2 }
    case 'treble':
      return { label: `T${hit.segment}`, value: hit.segment! * 3 }
    case 'innerSingle':
    case 'outerSingle':
      return { label: String(hit.segment), value: hit.segment! }
    case 'miss':
      return { label: 'MISS', value: 0 }
  }
}
