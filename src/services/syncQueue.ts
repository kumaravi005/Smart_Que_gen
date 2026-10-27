import { getDatabase } from './db'
import type { SyncQueueItem, SyncMetadata, SyncTombstone, SyncEntityType, SyncAction } from '../types'
import { generateUuid, deterministicUuid } from '../utils/uuid'

export const syncQueue = {
  /**
   * Enqueues a local entity mutation (create/update or delete) into the sync queue.
   * If there is already a pending change for this entity, coalesces them.
   */
  async enqueueChange(
    entityType: SyncEntityType,
    entityId: string,
    action: SyncAction,
    data?: any
  ): Promise<SyncQueueItem> {
    const db = await getDatabase()
    const now = new Date().toISOString()

    // 1. Update or initialize entity metadata
    let meta = await db.get('sync_metadata', entityId)
    const cloudId = meta?.cloudId || deterministicUuid(entityType, entityId)
    const localVersion = (meta?.localVersion || 0) + 1

    const updatedMeta: SyncMetadata = {
      id: entityId,
      entityType,
      cloudId,
      localVersion,
      cloudVersion: meta?.cloudVersion || 0,
      lastSyncedAt: meta?.lastSyncedAt || '',
      isDeleted: action === 'delete'
    }
    await db.put('sync_metadata', updatedMeta)

    // 2. If deletion, record tombstone
    if (action === 'delete') {
      const tombstone: SyncTombstone = {
        id: entityId,
        entityType,
        deletedAt: now
      }
      await db.put('sync_tombstones', tombstone)
    }

    // 3. Check for existing pending item for this entity to coalesce
    const existingItems = await db.getAllFromIndex('sync_queue', 'by-entity', entityType)
    const existing = existingItems.find(item => item.entityId === entityId)

    const queueItem: SyncQueueItem = {
      id: existing ? existing.id : generateUuid(),
      entityType,
      entityId,
      action,
      data,
      timestamp: now,
      attempts: existing ? existing.attempts : 0
    }

    await db.put('sync_queue', queueItem)
    return queueItem
  },

  /**
   * Retrieves all pending queue items ordered chronologically.
   */
  async getPendingQueue(): Promise<SyncQueueItem[]> {
    const db = await getDatabase()
    try {
      const items = await db.getAllFromIndex('sync_queue', 'by-timestamp')
      return items
    } catch {
      return db.getAll('sync_queue')
    }
  },

  /**
   * Removes a processed item from the queue upon successful cloud sync.
   */
  async removeQueueItem(id: string): Promise<void> {
    const db = await getDatabase()
    await db.delete('sync_queue', id)
  },

  /**
   * Records a failed sync attempt and error message.
   */
  async markQueueItemAttempt(id: string, error?: string): Promise<void> {
    const db = await getDatabase()
    const item = await db.get('sync_queue', id)
    if (item) {
      item.attempts += 1
      item.lastError = error || 'Sync failed'
      await db.put('sync_queue', item)
    }
  },

  /**
   * Gets total count of pending unpushed changes.
   */
  async getPendingCount(): Promise<number> {
    const db = await getDatabase()
    return db.count('sync_queue')
  },

  /**
   * Checks if an entity was deleted locally (tombstone exists).
   * Supports both isTombstoned(entityId) and isTombstoned(entityType, entityId).
   */
  async isTombstoned(arg1: string, arg2?: string): Promise<boolean> {
    const entityId = arg2 !== undefined ? arg2 : arg1
    const db = await getDatabase()
    const tombstone = await db.get('sync_tombstones', entityId)
    return !!tombstone
  },

  /**
   * Gets metadata for an entity.
   */
  async getMetadata(entityId: string): Promise<SyncMetadata | undefined> {
    const db = await getDatabase()
    return db.get('sync_metadata', entityId)
  },

  /**
   * Updates metadata for an entity (e.g. after cloud push or pull).
   */
  async saveMetadata(meta: SyncMetadata): Promise<void> {
    const db = await getDatabase()
    await db.put('sync_metadata', meta)
  },

  /**
   * Clears all items in the sync queue (used in testing or after complete sync).
   */
  async clearQueue(): Promise<void> {
    const db = await getDatabase()
    await db.clear('sync_queue')
  }
}
