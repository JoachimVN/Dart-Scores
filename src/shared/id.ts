/** Generates a unique id, preferring the platform UUID API where available. */
export function generateId(): string {
  return crypto.randomUUID()
}
