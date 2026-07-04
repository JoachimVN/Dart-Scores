type CandidateRing = 'treble' | 'double' | 'bullseye' | 'outerBull' | 'single'

interface Candidate {
  value: number
  label: string
  ring: CandidateRing
}

function descending20(): number[] {
  return Array.from({ length: 20 }, (_, i) => 20 - i)
}

/**
 * Search order: trebles first, then bullseye, then doubles, then outer bull,
 * then singles - all descending by value. This isn't the only valid ordering,
 * but it's the one that reproduces conventional checkout suggestions (e.g.
 * 170 -> T20, T20, Bull rather than some equivalent-scoring oddity).
 */
const CANDIDATES: Candidate[] = [
  ...descending20().map((n): Candidate => ({ value: n * 3, label: `T${n}`, ring: 'treble' })),
  { value: 50, label: 'Bull', ring: 'bullseye' },
  ...descending20().map((n): Candidate => ({ value: n * 2, label: `D${n}`, ring: 'double' })),
  { value: 25, label: '25', ring: 'outerBull' },
  ...descending20().map((n): Candidate => ({ value: n, label: `${n}`, ring: 'single' })),
]

function isFinishingRing(ring: CandidateRing): boolean {
  return ring === 'double' || ring === 'bullseye'
}

/** Finds a sequence of exactly `darts` throws that reaches exactly 0, or null if none exists. */
function findExactFinish(remaining: number, darts: number, doubleOut: boolean): string[] | null {
  if (darts === 1) {
    for (const candidate of CANDIDATES) {
      if (candidate.value !== remaining) continue
      if (doubleOut && !isFinishingRing(candidate.ring)) continue
      return [candidate.label]
    }
    return null
  }

  for (const candidate of CANDIDATES) {
    const rest = remaining - candidate.value
    // rest <= 0 covers both an overshoot (bust) and finishing early on a dart
    // that wasn't the required final double (also a bust) - neither is a
    // valid step toward an exact `darts`-throw finish.
    if (rest <= 0) continue
    if (doubleOut && rest === 1) continue

    const sub = findExactFinish(rest, darts - 1, doubleOut)
    if (sub) return [candidate.label, ...sub]
  }
  return null
}

/**
 * Suggests a dart-by-dart checkout using at most `dartsAvailable` darts,
 * preferring the fewest darts possible, or null if no finish exists within
 * that many darts (including scores above the 170 maximum 3-dart checkout,
 * and "bogey" numbers like 169 that have no valid double-out finish at all).
 */
export function getCheckoutSuggestion(
  remaining: number,
  dartsAvailable: number,
  doubleOut: boolean,
): string[] | null {
  if (remaining <= 0 || dartsAvailable <= 0) return null

  for (let darts = 1; darts <= dartsAvailable; darts++) {
    const result = findExactFinish(remaining, darts, doubleOut)
    if (result) return result
  }
  return null
}
