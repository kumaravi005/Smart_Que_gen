import { getDatabase } from './db'
import type { QuestionBankItem, BankFilter, BankFolder } from '../types'
import { generateUuid, isValidUuid } from '../utils/uuid'
import { syncQueue } from './syncQueue'
import { syncService } from './syncService'
import { supabase, isSupabaseConfigured } from './supabaseClient'

export const bankService = {
  // --- Folder Management ---

  // Get all question bank folders (with automatic deduplication for legacy sync duplicates)
  async getFolders(): Promise<BankFolder[]> {
    const db = await getDatabase()
    let rawFolders: BankFolder[] = []
    try {
      if (db.objectStoreNames.contains('bank_folders')) {
        rawFolders = await db.getAll('bank_folders')
      }
    } catch {
      // Fallback
    }

    if (rawFolders.length === 0) {
      const setting = await db.get('app_settings', 'bank_folders_list')
      rawFolders = setting?.value || []
    }

    // Filter out any folders marked with tombstones or pending delete
    try {
      if (db.objectStoreNames.contains('sync_tombstones')) {
        const tombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'folder')
        const deletedIds = new Set(tombstones.map(t => t.id))
        const pendingDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'folder')
        for (const pd of pendingDeletes) {
          if (pd.action === 'delete') {
            deletedIds.add(pd.entityId)
          }
        }
        if (deletedIds.size > 0) {
          rawFolders = rawFolders.filter(f => !deletedIds.has(f.id))
        }
      }
    } catch {
      // Fallback
    }

    // Deduplicate folders by key: `${parentId || 'root'}:${name.trim().toLowerCase()}`
    const seen = new Map<string, BankFolder>()
    const duplicatesToDelete: string[] = []
    const migrations = new Map<string, string>() // discardedId -> keptId

    for (const f of rawFolders) {
      const key = `${f.parentId || 'root'}:${f.name.trim().toLowerCase()}`
      if (!seen.has(key)) {
        seen.set(key, f)
      } else {
        const existing = seen.get(key)!
        const existingIsUuid = isValidUuid(existing.id)
        const currentIsUuid = isValidUuid(f.id)

        let keep: BankFolder
        let discard: BankFolder

        if (currentIsUuid && !existingIsUuid) {
          keep = f
          discard = existing
          seen.set(key, f)
        } else if (!currentIsUuid && existingIsUuid) {
          keep = existing
          discard = f
        } else {
          // If both or neither are UUIDs, keep newer updatedAt
          const existingTime = new Date(existing.updatedAt || 0).getTime()
          const currentTime = new Date(f.updatedAt || 0).getTime()
          if (currentTime >= existingTime) {
            keep = f
            discard = existing
            seen.set(key, f)
          } else {
            keep = existing
            discard = f
          }
        }

        duplicatesToDelete.push(discard.id)
        migrations.set(discard.id, keep.id)
      }
    }

      // If duplicate folders were detected, clean up IndexedDB and re-point any questions
    if (duplicatesToDelete.length > 0) {
      try {
        const tx = db.transaction(['bank_folders', 'question_bank'], 'readwrite')
        for (const delId of duplicatesToDelete) {
          await tx.objectStore('bank_folders').delete(delId)
        }

        const allQuestions: QuestionBankItem[] = await tx.objectStore('question_bank').getAll()
        for (const q of allQuestions) {
          if (q.folderId && migrations.has(q.folderId)) {
            q.folderId = migrations.get(q.folderId)!
            await tx.objectStore('question_bank').put(q)
          }
        }
        await tx.done
      } catch (err) {
        console.warn('Error during folder deduplication:', err)
      }

      // Also ensure Supabase cloud is cleaned of discarded duplicates so they don't get pulled back
      for (const delId of duplicatesToDelete) {
        syncQueue.enqueueChange('folder', delId, 'delete').catch(() => {})
        if (supabase && isSupabaseConfigured) {
          supabase
            .from('bank_folders')
            .delete()
            .eq('id', delId)
            .then(() => {}, () => {})

          const keptId = migrations.get(delId)
          if (keptId) {
            supabase
              .from('question_bank')
              .update({ folder_id: keptId })
              .eq('folder_id', delId)
              .then(() => {}, () => {})
          }
        }
      }

      const deduplicatedList = Array.from(seen.values())
      await db.put('app_settings', { key: 'bank_folders_list', value: deduplicatedList })
      return deduplicatedList
    }

    return Array.from(seen.values())
  },

  // Get single folder by ID
  async getFolder(id: string): Promise<BankFolder | undefined> {
    const folders = await this.getFolders()
    return folders.find(f => f.id === id)
  },

  // Create a new folder
  async createFolder(data: {
    name: string
    parentId?: string | null
    color?: string
    description?: string
  }): Promise<BankFolder> {
    const db = await getDatabase()
    const now = new Date().toISOString()
    const trimmedName = data.name.trim()
    const parentId = data.parentId || null

    // Prevent creating duplicate folder with identical name inside the same parent
    const existingFolders = await this.getFolders()
    const existingDuplicate = existingFolders.find(
      f => f.name.trim().toLowerCase() === trimmedName.toLowerCase() && (f.parentId || null) === parentId
    )
    if (existingDuplicate) {
      return existingDuplicate
    }

    // Use standard UUID directly so local ID and cloud ID match 100%
    const newFolder: BankFolder = {
      id: generateUuid(),
      name: trimmedName,
      parentId,
      color: data.color || 'emerald',
      description: data.description?.trim(),
      createdAt: now,
      updatedAt: now
    }

    try {
      if (db.objectStoreNames.contains('bank_folders')) {
        await db.put('bank_folders', newFolder)
      }
    } catch {
      // Fallback
    }

    const folders = await this.getFolders()
    if (!folders.some(f => f.id === newFolder.id)) {
      folders.push(newFolder)
      await db.put('app_settings', { key: 'bank_folders_list', value: folders })
    }

    await syncQueue.enqueueChange('folder', newFolder.id, 'upsert', newFolder)
    syncService.triggerDebouncedSync()

    return newFolder
  },

  // Update folder properties
  async updateFolder(id: string, updates: Partial<BankFolder>): Promise<BankFolder | undefined> {
    const db = await getDatabase()
    const folders = await this.getFolders()
    const idx = folders.findIndex(f => f.id === id)
    if (idx === -1) return undefined

    const updated: BankFolder = {
      ...folders[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    try {
      if (db.objectStoreNames.contains('bank_folders')) {
        await db.put('bank_folders', updated)
      }
    } catch {
      // Fallback
    }

    folders[idx] = updated
    await db.put('app_settings', { key: 'bank_folders_list', value: folders })

    await syncQueue.enqueueChange('folder', updated.id, 'upsert', updated)
    syncService.triggerDebouncedSync()

    return updated
  },

  // Delete folder and its descendants
  async deleteFolder(id: string, deleteContents: boolean = true): Promise<boolean> {
    const db = await getDatabase()
    const folders = await this.getFolders()

    // Find all descendant folder IDs recursively
    const getDescendants = (parentId: string): string[] => {
      const children = folders.filter(f => f.parentId === parentId)
      let ids = children.map(c => c.id)
      for (const child of children) {
        ids = ids.concat(getDescendants(child.id))
      }
      return ids
    }

    const folderIdsToDelete = [id, ...getDescendants(id)]

    try {
      if (db.objectStoreNames.contains('bank_folders')) {
        const tx = db.transaction('bank_folders', 'readwrite')
        for (const fId of folderIdsToDelete) {
          await tx.store.delete(fId)
        }
        await tx.done
      }
    } catch {
      // Fallback
    }

    // Always update app_settings bank_folders_list to remove deleted folders
    const remaining = folders.filter(f => !folderIdsToDelete.includes(f.id))
    await db.put('app_settings', { key: 'bank_folders_list', value: remaining })

    // Handle questions in deleted folders
    const allQuestions = await db.getAll('question_bank')
    const txQ = db.transaction('question_bank', 'readwrite')
    for (const q of allQuestions) {
      if (q.folderId && folderIdsToDelete.includes(q.folderId)) {
        if (deleteContents) {
          await txQ.store.delete(q.id)
          syncQueue.enqueueChange('question', q.id, 'delete').catch(() => {})
        } else {
          // Unlink to root
          const unlinked = { ...q, folderId: null, updatedAt: new Date().toISOString() }
          await txQ.store.put(unlinked)
          syncQueue.enqueueChange('question', q.id, 'upsert', unlinked).catch(() => {})
        }
      }
    }
    await txQ.done

    for (const fId of folderIdsToDelete) {
      await syncQueue.enqueueChange('folder', fId, 'delete')
    }

    // Directly delete from Supabase cloud immediately if online
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('bank_folders')
        .delete()
        .in('id', folderIdsToDelete)
        .then(() => {}, () => {})
    }

    syncService.triggerDebouncedSync()

    return true
  },

  // Get breadcrumb trail: [ { id, name }, ... ]
  async getFolderBreadcrumbs(folderId: string | null): Promise<{ id: string; name: string }[]> {
    if (!folderId) return []
    const folders = await this.getFolders()
    const folderMap = new Map(folders.map(f => [f.id, f]))

    const breadcrumbs: { id: string; name: string }[] = []
    let currentId: string | null = folderId

    while (currentId) {
      const f = folderMap.get(currentId)
      if (!f) break
      breadcrumbs.unshift({ id: f.id, name: f.name })
      currentId = f.parentId
    }

    return breadcrumbs
  },

  // Get folder statistics (question count & direct subfolder count)
  async getFolderStats(): Promise<Map<string, { questionCount: number; subfolderCount: number }>> {
    const [folders, questions] = await Promise.all([
      this.getFolders(),
      (await getDatabase()).getAll('question_bank')
    ])

    const stats = new Map<string, { questionCount: number; subfolderCount: number }>()

    for (const f of folders) {
      stats.set(f.id, { questionCount: 0, subfolderCount: 0 })
    }

    for (const f of folders) {
      if (f.parentId && stats.has(f.parentId)) {
        stats.get(f.parentId)!.subfolderCount += 1
      }
    }

    for (const q of questions) {
      if (q.folderId && stats.has(q.folderId)) {
        stats.get(q.folderId)!.questionCount += 1
      }
    }

    return stats
  },

  // --- Question Management ---

  // Get all question bank items with optional filtering and folder hierarchy scoping
  async getQuestions(filter?: BankFilter): Promise<QuestionBankItem[]> {
    const db = await getDatabase()
    let items = await db.getAll('question_bank')

    // Filter out any questions marked with tombstones or pending delete
    try {
      if (db.objectStoreNames.contains('sync_tombstones')) {
        const tombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'question')
        const deletedIds = new Set(tombstones.map(t => t.id))
        const pendingDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'question')
        for (const pd of pendingDeletes) {
          if (pd.action === 'delete') {
            deletedIds.add(pd.entityId)
          }
        }
        if (deletedIds.size > 0) {
          items = items.filter(q => !deletedIds.has(q.id))
        }
      }
    } catch {
      // Fallback
    }

    if (!filter) return items

    // Filter by Folder
    if (filter.folderId !== undefined) {
      if (filter.folderId === null) {
        // Questions with no folder assigned
        items = items.filter(q => !q.folderId)
      } else if (filter.includeSubfolders) {
        // Find all descendant subfolders
        const folders = await this.getFolders()
        const getDescendants = (parentId: string): string[] => {
          const children = folders.filter(f => f.parentId === parentId)
          let ids = children.map(c => c.id)
          for (const child of children) {
            ids = ids.concat(getDescendants(child.id))
          }
          return ids
        }
        const allowedFolderIds = new Set([filter.folderId, ...getDescendants(filter.folderId)])
        items = items.filter(q => q.folderId && allowedFolderIds.has(q.folderId))
      } else {
        items = items.filter(q => q.folderId === filter.folderId)
      }
    }

    if (filter.subject) {
      items = items.filter(q => q.subject.toLowerCase() === filter.subject!.toLowerCase())
    }
    if (filter.className) {
      items = items.filter(q => q.className.toLowerCase() === filter.className!.toLowerCase())
    }
    if (filter.type) {
      items = items.filter(q => q.type === filter.type)
    }
    if (filter.difficulty) {
      items = items.filter(q => q.difficulty === filter.difficulty)
    }
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase()
      items = items.filter(
        item =>
          item.prompt.toLowerCase().includes(q) ||
          item.topic.toLowerCase().includes(q) ||
          item.tags?.some(t => t.toLowerCase().includes(q))
      )
    }

    return items
  },

  // Save new question to bank
  async addQuestion(item: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<QuestionBankItem> {
    const db = await getDatabase()
    const now = new Date().toISOString()
    const newItem: QuestionBankItem = {
      ...item,
      id: generateUuid(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    }
    await db.put('question_bank', newItem)

    await syncQueue.enqueueChange('question', newItem.id, 'upsert', newItem)
    syncService.triggerDebouncedSync()

    return newItem
  },

  // Add multiple questions in bulk
  async addQuestionsBulk(
    items: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[]
  ): Promise<QuestionBankItem[]> {
    const db = await getDatabase()
    const now = new Date().toISOString()
    const createdItems: QuestionBankItem[] = []

    const tx = db.transaction('question_bank', 'readwrite')
    for (const item of items) {
      const newItem: QuestionBankItem = {
        ...item,
        id: generateUuid(),
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      }
      await tx.store.put(newItem)
      createdItems.push(newItem)
    }
    await tx.done

    for (const created of createdItems) {
      await syncQueue.enqueueChange('question', created.id, 'upsert', created)
    }
    syncService.triggerDebouncedSync()

    return createdItems
  },

  // Update existing question
  async updateQuestion(id: string, updates: Partial<QuestionBankItem>): Promise<QuestionBankItem | undefined> {
    const db = await getDatabase()
    const item = await db.get('question_bank', id)
    if (!item) return undefined

    const updated: QuestionBankItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    await db.put('question_bank', updated)

    await syncQueue.enqueueChange('question', updated.id, 'upsert', updated)
    syncService.triggerDebouncedSync()

    return updated
  },

  // Move questions to another folder
  async moveQuestions(questionIds: string[], targetFolderId: string | null): Promise<void> {
    const db = await getDatabase()
    const tx = db.transaction('question_bank', 'readwrite')
    for (const qId of questionIds) {
      const item = await tx.store.get(qId)
      if (item) {
        item.folderId = targetFolderId
        item.updatedAt = new Date().toISOString()
        await tx.store.put(item)
        await syncQueue.enqueueChange('question', item.id, 'upsert', item)
      }
    }
    await tx.done
    syncService.triggerDebouncedSync()
  },

  // Increment usage count when imported into a paper
  async recordUsage(id: string): Promise<void> {
    const db = await getDatabase()
    const item = await db.get('question_bank', id)
    if (item) {
      item.usageCount += 1
      item.updatedAt = new Date().toISOString()
      await db.put('question_bank', item)
      await syncQueue.enqueueChange('question', item.id, 'upsert', item)
      syncService.triggerDebouncedSync()
    }
  },

  // Delete question from bank
  async deleteQuestion(id: string): Promise<boolean> {
    const db = await getDatabase()
    await db.delete('question_bank', id)
    await syncQueue.enqueueChange('question', id, 'delete')
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('question_bank')
        .delete()
        .eq('id', id)
        .then(() => {}, () => {})
    }
    syncService.triggerDebouncedSync()
    return true
  },

  // Delete multiple questions in bulk
  async deleteQuestionsBulk(ids: string[]): Promise<boolean> {
    const db = await getDatabase()
    const tx = db.transaction('question_bank', 'readwrite')
    for (const id of ids) {
      await tx.store.delete(id)
      await syncQueue.enqueueChange('question', id, 'delete')
    }
    await tx.done
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('question_bank')
        .delete()
        .in('id', ids)
        .then(() => {}, () => {})
    }
    syncService.triggerDebouncedSync()
    return true
  }
}
