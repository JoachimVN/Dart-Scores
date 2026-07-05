import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  function dismiss() {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  return { needRefresh, offlineReady, updateServiceWorker, dismiss }
}
