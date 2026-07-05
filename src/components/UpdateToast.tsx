import { usePwaUpdate } from '../hooks/usePwaUpdate'
import { Button } from './ui/Button'

export function UpdateToast() {
  const { needRefresh, offlineReady, updateServiceWorker, dismiss } = usePwaUpdate()

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-(--radius-lg) border border-line bg-card p-4 shadow-lg">
        <span className="text-sm text-ink">
          {needRefresh ? 'An update is available.' : 'Dart Scores is ready to work offline.'}
        </span>
        {needRefresh && (
          <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
            Refresh
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
