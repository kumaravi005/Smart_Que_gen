import { useState, useEffect, useCallback } from 'react'
import { syncService } from '../services/syncService'
import type { SyncState, SyncResult } from '../types/sync'

export function useSync() {
  const [syncState, setSyncState] = useState<SyncState>(() => syncService.getState())

  useEffect(() => {
    // Subscribe to state updates from sync service
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state)
    })
    return unsubscribe
  }, [])

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    return syncService.sync()
  }, [])

  const initialMigration = useCallback(async () => {
    return syncService.initialMigration()
  }, [])

  return {
    ...syncState,
    syncNow,
    initialMigration
  }
}
