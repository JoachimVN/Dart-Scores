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

function findLastDartFinishes(remaining: number, doubleOut: boolean, rawLimit: number): string[][] {
  const results: string[][] = []
  for (const candidate of CANDIDATES) {
    if (results.length >= rawLimit) break
    if (candidate.value !== remaining) continue
    if (doubleOut && !isFinishingRing(candidate.ring)) continue
    results.push([candidate.label])
  }
  return results
}

/** One group of continuations per viable first dart, in candidate order. */
function findContinuationGroups(
  remaining: number,
  darts: number,
  doubleOut: boolean,
  rawLimit: number,
): string[][][] {
  const groups: string[][][] = []
  for (const candidate of CANDIDATES) {
    const rest = remaining - candidate.value
    // rest <= 0 covers both an overshoot (bust) and finishing early on a dart
    // that wasn't the required final double (also a bust) - neither is a
    // valid step toward an exact `darts`-throw finish.
    if (rest <= 0) continue
    if (doubleOut && rest === 1) continue

    const tails = findFinishesRaw(rest, darts - 1, doubleOut, rawLimit)
    if (tails.length === 0) continue
    groups.push(tails.map((tail) => [candidate.label, ...tail]))
  }
  return groups
}

/**
 * Round-robins across groups rather than exhausting one group's continuations
 * before moving to the next - otherwise a first dart with many valid
 * continuations (T20 especially) would crowd out every other opening dart.
 */
function roundRobin(groups: string[][][], rawLimit: number): string[][] {
  const results: string[][] = []
  let round = 0
  while (results.length < rawLimit) {
    const before = results.length
    for (const group of groups) {
      if (results.length >= rawLimit) break
      if (round < group.length) results.push(group[round])
    }
    if (results.length === before) break // every group exhausted
    round++
  }
  return results
}

/**
 * Collects up to `rawLimit` throw sequences (order matters) that reach
 * exactly 0 in exactly `darts` throws. May include sequences that are
 * reorderings of each other; callers dedupe.
 */
function findFinishesRaw(remaining: number, darts: number, doubleOut: boolean, rawLimit: number): string[][] {
  if (darts === 1) return findLastDartFinishes(remaining, doubleOut, rawLimit)

  const groups = findContinuationGroups(remaining, darts, doubleOut, rawLimit)
  return roundRobin(groups, rawLimit)
}

/**
 * Suggests up to `limit` distinct dart-by-dart checkouts using at most
 * `dartsAvailable` darts, preferring fewer darts first: every option at the
 * minimal dart count is listed before any option that needs one dart more,
 * and so on up to `dartsAvailable`. This fills the list with genuinely
 * different checkouts rather than stopping once the minimal dart count runs
 * out of distinct options. Returns an empty array if no finish exists within
 * that many darts (including scores above the 170 maximum 3-dart checkout,
 * and "bogey" numbers like 169 that have no valid double-out finish at all).
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

  const seen = new Set<string>()
  const distinct: string[][] = []

  for (let darts = 1; darts <= dartsAvailable && distinct.length < limit; darts++) {
    const raw = findFinishesRaw(remaining, darts, doubleOut, rawLimit)

    for (const combo of raw) {
      if (distinct.length >= limit) break
      const signature = comboSignature(combo)
      if (seen.has(signature)) continue
      seen.add(signature)
      distinct.push(combo)
    }
  }
  return distinct
}
