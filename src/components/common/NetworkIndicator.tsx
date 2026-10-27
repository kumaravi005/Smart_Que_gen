import React from 'react'
import { Wifi, WifiOff, RotateCw, AlertCircle, UploadCloud } from 'lucide-react'
import { useSync } from '../../hooks/useSync'

export const NetworkIndicator: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { status, pendingCount, lastError, lastSyncedAt, syncNow } = useSync()
  const [isTriggering, setIsTriggering] = React.useState(false)

  const handleManualSync = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (status === 'syncing' || isTriggering) return
    setIsTriggering(true)
    try {
      await syncNow()
    } finally {
      setIsTriggering(false)
    }
  }

  // Format last synced time if available
  const formattedLastSync = React.useMemo(() => {
    if (!lastSyncedAt) return 'Never'
    try {
      const date = new Date(lastSyncedAt)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return 'Recent'
    }
  }, [lastSyncedAt])

  if (compact) {
    if (status === 'offline') {
      return (
        <span
          title="Offline Mode — All changes are saved locally to IndexedDB and will sync once reconnected."
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Offline
        </span>
      )
    }

    if (status === 'syncing' || isTriggering) {
      return (
        <span
          title="Syncing changes with Supabase cloud..."
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
        >
          <RotateCw className="w-2.5 h-2.5 animate-spin text-blue-600" />
          Syncing
        </span>
      )
    }

    if (status === 'error') {
      return (
        <button
          type="button"
          onClick={handleManualSync}
          title={`Sync error: ${lastError || 'Unknown error'}. Click to retry.`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
        >
          <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
          Retry Sync
        </button>
      )
    }

    if (pendingCount > 0) {
      return (
        <button
          type="button"
          onClick={handleManualSync}
          title={`${pendingCount} pending local changes. Click to sync now.`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
        >
          <UploadCloud className="w-2.5 h-2.5 text-amber-600" />
          {pendingCount} Pending
        </button>
      )
    }

    return (
      <span
        title={`Cloud Synced (${formattedLastSync})`}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Synced
      </span>
    )
  }

  // Full indicator for Header
  if (status === 'offline') {
    return (
      <div
        title="Offline Mode — All changes are preserved locally in IndexedDB and will automatically sync when online."
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-amber-50/90 text-amber-900 border-amber-300 shadow-xs cursor-default"
      >
        <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="font-semibold hidden sm:inline">Offline (IDB Active)</span>
        <span className="font-semibold sm:hidden">Offline</span>
      </div>
    )
  }

  if (status === 'syncing' || isTriggering) {
    return (
      <div
        title="Synchronizing local changes and fetching shared updates from Supabase cloud..."
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border bg-blue-50/90 text-blue-700 border-blue-200 shadow-xs cursor-default"
      >
        <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
        <span className="font-medium hidden sm:inline">
          {pendingCount > 0 ? `Syncing (${pendingCount})...` : 'Syncing...'}
        </span>
        <span className="font-medium sm:hidden">Syncing</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        title={`Sync error: ${lastError || 'Network or server issue'}. Click to retry.`}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 transition-colors shadow-xs"
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span className="font-medium hidden sm:inline">Sync Error (Retry)</span>
        <span className="font-medium sm:hidden">Retry</span>
      </button>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={handleManualSync}
        title={`${pendingCount} pending local changes waiting to upload. Click to sync now.`}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-amber-50/90 text-amber-800 border-amber-300 hover:bg-amber-100 transition-colors shadow-xs"
      >
        <UploadCloud className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="font-semibold">{pendingCount} Pending</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleManualSync}
      title={`Cloud Synced at ${formattedLastSync}. Click to refresh shared institute data.`}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60 transition-colors shadow-xs"
    >
      <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="hidden sm:inline">Synced</span>
      <span className="text-[10px] text-emerald-600/80 font-normal hidden md:inline">({formattedLastSync})</span>
    </button>
  )
}
