import { useApp } from '../context/AppContext'

export function SyncBadge() {
  const { online, syncing, pendingCount } = useApp()

  if (online && !syncing && pendingCount === 0) return null

  if (syncing) {
    return (
      <div className="fixed top-safe left-1/2 -translate-x-1/2 z-50 mt-2">
        <div className="flex items-center gap-1.5 bg-primary/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Syncing…
        </div>
      </div>
    )
  }

  if (!online) {
    return (
      <div className="fixed top-safe left-1/2 -translate-x-1/2 z-50 mt-2">
        <div className="flex items-center gap-1.5 bg-zinc-800/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          Offline{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
        </div>
      </div>
    )
  }

  // Online but has pending (edge case: push in flight)
  if (pendingCount > 0) {
    return (
      <div className="fixed top-safe left-1/2 -translate-x-1/2 z-50 mt-2">
        <div className="flex items-center gap-1.5 bg-warn/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Syncing {pendingCount}…
        </div>
      </div>
    )
  }

  return null
}
