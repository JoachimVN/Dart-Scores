/**
 * Node 22+ defines its own global `localStorage` (backed by --localstorage-file,
 * unset in tests) which shadows jsdom's working implementation and isn't in
 * vitest's jsdom environment's copy-over list, leaving `localStorage` undefined
 * in tests. Replace it with a minimal in-memory Storage polyfill.
 */
class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
