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
 * 170 -> T20, T20, Bull rather than some equivalent-scoring oddity) as the
 * first option found.
 */
const CANDIDATES: Candidate[] = [
  ...descending20().map((n): Candidate => ({ value: n * 3, label: `T${n}`, ring: 'treble' })),
  { value: 50, label: 'Bull', ring: 'bullseye' },
  ...descending20().map((n): Candidate => ({ value: n * 2, label: `D${n}`, ring: 'double' })),
  { value: 25, label: '25', ring: 'outerBull' },
  ...descending20().map((n): Candidate => ({ value: n, label: `${n}`, ring: 'single' })),
]

const DEFAULT_OPTION_LIMIT = 5

function isFinishingRing(ring: CandidateRing): boolean {
  return ring === 'double' || ring === 'bullseye'
}

/** Same darts in a different order aren't a meaningfully different suggestion. */
function comboSignature(combo: string[]): string {
  return [...combo].sort().join(',')
}

/** Collects up to `rawLimit` throw sequences (order matters) that reach exactly 0 in exactly `darts` throws. May include sequences that are reorderings of each other; callers dedupe. */
function findFinishesRaw(remaining: number, darts: number, doubleOut: boolean, rawLimit: number, results: string[][]): void {
  if (results.length >= rawLimit) return

  if (darts === 1) {
    for (const candidate of CANDIDATES) {
      if (results.length >= rawLimit) return
      if (candidate.value !== remaining) continue
      if (doubleOut && !isFinishingRing(candidate.ring)) continue
      results.push([candidate.label])
    }
    return
  }

  for (const candidate of CANDIDATES) {
    if (results.length >= rawLimit) return
    const rest = remaining - candidate.value
    // rest <= 0 covers both an overshoot (bust) and finishing early on a dart
    // that wasn't the required final double (also a bust) - neither is a
    // valid step toward an exact `darts`-throw finish.
    if (rest <= 0) continue
    if (doubleOut && rest === 1) continue

    const before = results.length
    findFinishesRaw(rest, darts - 1, doubleOut, rawLimit, results)
    for (let i = before; i < results.length; i++) {
      results[i] = [candidate.label, ...results[i]]
    }
  }
}

/**
 * Suggests up to `limit` distinct dart-by-dart checkouts using at most
 * `dartsAvailable` darts, preferring the fewest darts possible (options using
 * more darts than necessary aren't included once any fewer-dart option
 * exists). Returns an empty array if no finish exists within that many darts
 * (including scores above the 170 maximum 3-dart checkout, and "bogey"
 * numbers like 169 that have no valid double-out finish at all).
 */
export function getCheckoutOptions(
  remaining: number,
  dartsAvailable: number,
  doubleOut: boolean,
  limit = DEFAULT_OPTION_LIMIT,
): string[][] {
  if (remaining <= 0 || dartsAvailable <= 0) return []

  // Search wider than `limit` so deduping same-darts-different-order results
  // (e.g. "Bull, D5" vs "D5, Bull") still leaves `limit` genuinely distinct options.
  const rawLimit = limit * 4

  for (let darts = 1; darts <= dartsAvailable; darts++) {
    const raw: string[][] = []
    findFinishesRaw(remaining, darts, doubleOut, rawLimit, raw)
    if (raw.length === 0) continue

    const seen = new Set<string>()
    const distinct: string[][] = []
    for (const combo of raw) {
      const signature = comboSignature(combo)
      if (seen.has(signature)) continue
      seen.add(signature)
      distinct.push(combo)
      if (distinct.length >= limit) break
    }
    return distinct
  }
  return []
}
