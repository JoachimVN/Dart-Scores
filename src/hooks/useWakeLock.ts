import { useEffect } from 'react'

/**
 * Keeps the screen awake while the calling component is mounted (e.g. during
 * active play, since this is a scoring app people prop up on a table). Silently
 * no-ops where the Wake Lock API is unsupported or denied - there's no fallback
 * worth building for that. The lock is released by the browser whenever the tab
 * is hidden, so it's re-acquired on visibilitychange rather than just once.
 */
export function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      if (!('wakeLock' in navigator)) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        lock = sentinel
      } catch {
        // Request can reject (e.g. no user gesture yet, battery saver) - ignore.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && !lock) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void lock?.release()
    }
  }, [])
}
