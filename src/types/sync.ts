export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export type SyncEntityType =
  | 'paper'
  | 'settings'
  | 'content'
  | 'layout'
  | 'question'
  | 'folder'
  | 'template'
  | 'institute'

export type SyncAction = 'upsert' | 'delete'

export interface SyncQueueItem {
  id: string
  entityType: SyncEntityType
  entityId: string
  action: SyncAction
  data?: any
  timestamp: string
  attempts: number
  lastError?: string
}

export interface SyncMetadata {
  id: string // local entity ID
  entityType: SyncEntityType
  cloudId: string // UUID in Supabase
  localVersion: number
  cloudVersion: number
  lastSyncedAt: string
  isDeleted?: boolean
}

export interface SyncTombstone {
  id: string // entity ID
  entityType: SyncEntityType
  deletedAt: string
}

export interface SyncResult {
  success: boolean
  pushedCount: number
  pulledCount: number
  conflictCount: number
  errors: string[]
  timestamp: string
}

export interface SyncState {
  status: SyncStatus
  pendingCount: number
  lastSyncedAt: string | null
  lastError: string | null
}
