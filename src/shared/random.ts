/** Fisher-Yates shuffle; does not mutate the input. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Random reordering where nobody keeps their previous seat - used for rematches so the
 * same player can't stay first (or anyone else stay put) two games running. Rejection-
 * sampled: darts rosters are small enough that this converges in a handful of tries.
 */
export function derangement<T>(items: T[]): T[] {
  if (items.length < 2) return [...items]
  let candidate = shuffle(items)
  while (candidate.some((item, index) => item === items[index])) {
    candidate = shuffle(items)
  }
  return candidate
}
