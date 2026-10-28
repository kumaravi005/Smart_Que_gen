import { getDatabase } from './db'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { syncQueue } from './syncQueue'
import type {
  SyncState,
  SyncResult,
  SyncStatus,
  PaperMetadata,
  QuestionBankItem,
  BankFolder,
  PaperSetupTemplate
} from '../types'
import {
  paperToCloud,
  paperFromCloud,
  settingsToCloud,
  settingsFromCloud,
  contentToCloud,
  contentFromCloud,
  layoutToCloud,
  layoutFromCloud,
  questionToCloud,
  questionFromCloud,
  folderToCloud,
  folderFromCloud,
  templateToCloud,
  templateFromCloud,
  instituteFromCloud
} from './syncMappers'
import { deterministicUuid, isValidUuid } from '../utils/uuid'

type SyncListener = (state: SyncState) => void

class SyncService {
  private status: SyncStatus = 'idle'
  private pendingCount = 0
  private lastSyncedAt: string | null = null
  private lastError: string | null = null
  private listeners: Set<SyncListener> = new Set()
  private syncInProgress = false
  private realtimeChannel: any = null
  private autoSyncTimer: any = null

  constructor() {
    // Listen for browser connectivity changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateState({ status: 'idle' })
        this.sync().catch(console.error)
      })
      window.addEventListener('offline', () => {
        this.updateState({ status: 'offline' })
      })
    }
  }

  /**
   * Current snapshot of sync state
   */
  public getState(): SyncState {
    return {
      status: this.status,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError
    }
  }

  /**
   * Subscribe to sync state changes
   */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  /**
   * Initializes the synchronization engine: refreshes local outbox count,
   * sets up realtime listeners for the authenticated institute, and triggers
   * initial sync if online.
   */
  public async init(): Promise<void> {
    try {
      await this.refreshPendingCount()
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.updateState({ status: 'offline' })
        return
      }

      const authInfo = await this.getAuthInfo()
      if (authInfo?.instituteId) {
        this.setupRealtimeSubscription(authInfo.instituteId)
        // Background sync non-blocking
        this.sync().catch(err => {
          console.warn('Initial sync warning:', err)
        })
      }
    } catch (err: any) {
      console.warn('SyncService initialization error:', err)
    }
  }

  private updateState(updates: Partial<SyncState>): void {
    if (updates.status !== undefined) this.status = updates.status
    if (updates.pendingCount !== undefined) this.pendingCount = updates.pendingCount
    if (updates.lastSyncedAt !== undefined) this.lastSyncedAt = updates.lastSyncedAt
    if (updates.lastError !== undefined) this.lastError = updates.lastError

    const state = this.getState()
    this.listeners.forEach(fn => {
      try {
        fn(state)
      } catch (err) {
        console.error('Error in sync state listener:', err)
      }
    })
  }

  /**
   * Refreshes the pending queue count from IndexedDB
   */
  public async refreshPendingCount(): Promise<number> {
    const count = await syncQueue.getPendingCount()
    this.updateState({ pendingCount: count })
    return count
  }

  /**
   * Resolves current user and institute from Supabase session
   */
  private async getAuthInfo(): Promise<{ userId: string; instituteId: string } | null> {
    if (!supabase || !isSupabaseConfigured) return null

    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) return null

      // Fetch user's profile to retrieve institute_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('institute_id')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && profile.institute_id) {
        return {
          userId: user.id,
          instituteId: profile.institute_id
        }
      }

      // Fallback 1: check user_metadata for institute_id
      const metaInstId = (user.user_metadata as any)?.institute_id
      if (metaInstId) {
        return { userId: user.id, instituteId: metaInstId }
      }

      // Fallback 2: check cached profile in localStorage
      if (typeof localStorage !== 'undefined') {
        const cachedStr = localStorage.getItem(`omega_auth_profile_${user.id}`)
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr)
            if (cached.institute_id) {
              return { userId: user.id, instituteId: cached.institute_id }
            }
          } catch {}
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Main synchronization loop: Push local queue changes, then Pull shared cloud updates.
   */
  public async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: true,
        pushedCount: 0,
        pulledCount: 0,
        conflictCount: 0,
        errors: [],
        timestamp: new Date().toISOString()
      }
    }

    await this.refreshPendingCount()

    // 1. Check network
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState({ status: 'offline' })
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        conflictCount: 0,
        errors: ['Device is offline. Changes are saved locally in IndexedDB.'],
        timestamp: new Date().toISOString()
      }
    }

    if (!supabase || !isSupabaseConfigured) {
      this.updateState({ status: 'idle' })
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        conflictCount: 0,
        errors: ['Supabase is not configured.'],
        timestamp: new Date().toISOString()
      }
    }

    const authInfo = await this.getAuthInfo()
    if (!authInfo) {
      // User is not authenticated in cloud; remain offline/local-first
      this.updateState({ status: 'idle' })
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        conflictCount: 0,
        errors: ['User is not authenticated with an institute.'],
        timestamp: new Date().toISOString()
      }
    }

    this.syncInProgress = true
    this.updateState({ status: 'syncing', lastError: null })

    const result: SyncResult = {
      success: true,
      pushedCount: 0,
      pulledCount: 0,
      conflictCount: 0,
      errors: [],
      timestamp: new Date().toISOString()
    }

    try {
      // Setup Realtime listener if not already active
      this.setupRealtimeSubscription(authInfo.instituteId)

      // Phase 1: Push local queued changes to cloud
      await this.pushChanges(authInfo.userId, authInfo.instituteId, result)

      // Phase 2: Pull shared updates from cloud for the institute
      await this.pullUpdates(authInfo.instituteId, result)

      this.lastSyncedAt = new Date().toISOString()
      const remaining = await this.refreshPendingCount()
      this.updateState({
        status: remaining > 0 && result.errors.length > 0 ? 'error' : 'idle',
        lastSyncedAt: this.lastSyncedAt,
        lastError: result.errors.length > 0 ? result.errors[0] : null
      })
    } catch (err: any) {
      console.error('Synchronization failed:', err)
      const errorMsg = err?.message || 'Sync failed due to a network error.'
      result.success = false
      result.errors.push(errorMsg)
      await this.refreshPendingCount()
      this.updateState({ status: 'error', lastError: errorMsg })
    } finally {
      this.syncInProgress = false
    }

    return result
  }

  /**
   * PUSH PHASE: Process and upload local outbox items to Supabase
   */
  private async pushChanges(
    userId: string,
    instituteId: string,
    result: SyncResult
  ): Promise<void> {
    if (!supabase) return
    const queue = await syncQueue.getPendingQueue()
    const db = await getDatabase()

    for (const item of queue) {
      try {
        if (item.action === 'delete') {
          // Handle cloud deletion
          await this.pushDelete(item, instituteId)
          await syncQueue.removeQueueItem(item.id)
          result.pushedCount += 1
          continue
        }

        // Handle cloud upsert
        switch (item.entityType) {
          case 'paper': {
            const paper = await db.get('papers', item.entityId)
            if (paper) {
              const row = paperToCloud(paper, instituteId, userId)
              const { error } = await supabase.from('papers').upsert(row, { onConflict: 'id' })
              if (error) throw error

              if (row.id !== item.entityId) {
                const migratedPaper: PaperMetadata = { ...paper, id: row.id }
                await db.put('papers', migratedPaper)
                await db.delete('papers', item.entityId)
              }

              // Also ensure linked settings, content, layout are queued/synced
              const settings = (await db.get('exam_settings', paper.examSettingsId)) || (await db.get('exam_settings', paper.id))
              if (settings) {
                const sRow = settingsToCloud(settings, instituteId)
                await supabase.from('exam_settings').upsert(sRow, { onConflict: 'paper_id' })
              }
              const content = (await db.get('paper_contents', paper.contentId)) || (await db.get('paper_contents', paper.id))
              if (content) {
                const cRow = contentToCloud(content, instituteId)
                await supabase.from('paper_contents').upsert(cRow, { onConflict: 'paper_id' })
              }
              const layout = (await db.get('visual_layouts', paper.visualLayoutId)) || (await db.get('visual_layouts', paper.id))
              if (layout) {
                const lRow = layoutToCloud(layout, instituteId)
                await supabase.from('visual_layouts').upsert(lRow, { onConflict: 'paper_id' })
              }
            }
            break
          }

          case 'settings': {
            const settings = (await db.get('exam_settings', item.entityId)) || (await db.get('exam_settings', item.data?.paperId))
            if (settings) {
              const row = settingsToCloud(settings, instituteId)
              const { error } = await supabase.from('exam_settings').upsert(row, { onConflict: 'paper_id' })
              if (error) throw error
            }
            break
          }

          case 'content': {
            const content = (await db.get('paper_contents', item.entityId)) || (await db.get('paper_contents', item.data?.paperId))
            if (content) {
              const row = contentToCloud(content, instituteId)
              const { error } = await supabase.from('paper_contents').upsert(row, { onConflict: 'paper_id' })
              if (error) throw error
            }
            break
          }

          case 'layout': {
            const layout = (await db.get('visual_layouts', item.entityId)) || (await db.get('visual_layouts', item.data?.paperId))
            if (layout) {
              const row = layoutToCloud(layout, instituteId)
              const { error } = await supabase.from('visual_layouts').upsert(row, { onConflict: 'paper_id' })
              if (error) throw error
            }
            break
          }

          case 'question': {
            const question = await db.get('question_bank', item.entityId)
            if (question) {
              const row = questionToCloud(question, instituteId, userId)
              let { error } = await supabase.from('question_bank').upsert(row, { onConflict: 'id' })

              // Auto-recover foreign key violation on folder_id (e.g. folder deleted or only local)
              if (error && (error.code === '23503' || error.message?.includes('violates foreign key') || error.message?.includes('fk_question_folder_inst'))) {
                console.warn(`Foreign key violation on folder_id for question ${item.entityId}. Retrying with folder_id = null.`)
                row.folder_id = null
                const retryRes = await supabase.from('question_bank').upsert(row, { onConflict: 'id' })
                error = retryRes.error
                if (!error) {
                  question.folderId = null
                  await db.put('question_bank', question)
                }
              }

              // Auto-recover RLS policy restriction (e.g. usage_count increment on shared question)
              if (error && (error.code === '42501' || error.message?.includes('violates row-level security') || error.message?.includes('policy'))) {
                console.warn(`RLS policy restricted updating question ${item.entityId} in cloud. Preserving locally.`)
                error = null
              }

              if (error) throw error

              if (row.id !== item.entityId) {
                const migratedQ: QuestionBankItem = { ...question, id: row.id }
                await db.put('question_bank', migratedQ)
                await db.delete('question_bank', item.entityId)
              }
            }
            break
          }

          case 'folder': {
            const folder = (await db.get('bank_folders', item.entityId)) || item.data
            if (folder) {
              const row = folderToCloud(folder, instituteId, userId)
              const { error } = await supabase.from('bank_folders').upsert(row, { onConflict: 'id' })
              if (error) throw error

              if (row.id !== item.entityId) {
                const migratedFolder: BankFolder = { ...folder, id: row.id }
                await db.put('bank_folders', migratedFolder)
                await db.delete('bank_folders', item.entityId)

                // Reparent questions in question_bank pointing to legacy ID
                const questions: QuestionBankItem[] = await db.getAll('question_bank')
                for (const q of questions) {
                  if (q.folderId === item.entityId) {
                    q.folderId = row.id
                    await db.put('question_bank', q)
                  }
                }

                // Reparent subfolders pointing to legacy ID
                const childFolders: BankFolder[] = await db.getAll('bank_folders')
                for (const cf of childFolders) {
                  if (cf.parentId === item.entityId) {
                    cf.parentId = row.id
                    await db.put('bank_folders', cf)
                  }
                }
              }
            }
            break
          }

          case 'template': {
            const template = await db.get('templates', item.entityId)
            if (template) {
              const row = templateToCloud(template, instituteId, userId)
              const { error } = await supabase.from('templates').upsert(row, { onConflict: 'id' })
              if (error) throw error

              if (row.id !== item.entityId) {
                const migratedTpl: PaperSetupTemplate = { ...template, id: row.id }
                await db.put('templates', migratedTpl)
                await db.delete('templates', item.entityId)
              }
            }
            break
          }
        }

        // Successfully pushed
        await syncQueue.removeQueueItem(item.id)
        result.pushedCount += 1
      } catch (pushErr: any) {
        console.warn(`Failed to push queue item ${item.entityType}:${item.entityId}:`, pushErr)
        const attempts = (item.attempts || 0) + 1
        await syncQueue.markQueueItemAttempt(item.id, pushErr?.message)
        result.errors.push(`Failed to push ${item.entityType}: ${pushErr?.message || 'Error'}`)

        // If item has permanently failed after 3 attempts with schema/RLS constraint, dequeue it so the queue does not stay blocked forever
        if (attempts >= 3 && (pushErr?.code === '42501' || pushErr?.code === '23503' || pushErr?.message?.includes('row-level security') || pushErr?.message?.includes('foreign key'))) {
          console.warn(`Abandoning failed sync queue item ${item.id} (${item.entityType}) after ${attempts} attempts to unblock queue.`)
          await syncQueue.removeQueueItem(item.id)
        }
      }
    }
  }

  /**
   * Handles cloud soft-delete or deletion for a queued entity
   */
  private async pushDelete(item: any, instituteId: string): Promise<void> {
    if (!supabase) return
    const cloudId = isValidUuid(item.entityId)
      ? item.entityId
      : deterministicUuid(item.entityType, item.entityId)
    const now = new Date().toISOString()

    switch (item.entityType) {
      case 'paper': {
        const { error: delErr } = await supabase
          .from('papers')
          .delete()
          .eq('id', cloudId)
          .eq('institute_id', instituteId)
        if (delErr) {
          await supabase
            .from('papers')
            .update({ deleted_at: now })
            .eq('id', cloudId)
            .eq('institute_id', instituteId)
        }
        break
      }

      case 'question': {
        const { error: delErr } = await supabase
          .from('question_bank')
          .delete()
          .eq('id', cloudId)
          .eq('institute_id', instituteId)
        if (delErr) {
          await supabase
            .from('question_bank')
            .update({ deleted_at: now })
            .eq('id', cloudId)
            .eq('institute_id', instituteId)
        }
        break
      }

      case 'folder': {
        // Hard delete folder from Supabase so cascade removes subfolders and unlinks questions
        const { error: delErr } = await supabase
          .from('bank_folders')
          .delete()
          .eq('id', cloudId)
          .eq('institute_id', instituteId)
        if (delErr) {
          await supabase
            .from('bank_folders')
            .update({ deleted_at: now })
            .eq('id', cloudId)
            .eq('institute_id', instituteId)
        }
        break
      }

      case 'template': {
        const { error: delErr } = await supabase
          .from('templates')
          .delete()
          .eq('id', cloudId)
          .eq('institute_id', instituteId)
        if (delErr) {
          await supabase
            .from('templates')
            .update({ deleted_at: now })
            .eq('id', cloudId)
            .eq('institute_id', instituteId)
        }
        break
      }
    }
  }

  /**
   * PULL PHASE: Fetch all updated records from Supabase for this institute
   */
  private async pullUpdates(instituteId: string, result: SyncResult): Promise<void> {
    if (!supabase) return
    const db = await getDatabase()

    // 1. Pull Bank Folders
    try {
      // Load all folder tombstones & pending delete queue items
      const folderTombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'folder')
      const deletedFolderIds = new Set(folderTombstones.map(t => t.id))
      const pendingFolderDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'folder')
      for (const pd of pendingFolderDeletes) {
        if (pd.action === 'delete') {
          deletedFolderIds.add(pd.entityId)
        }
      }

      const { data: cloudFolders, error: folderErr } = await supabase
        .from('bank_folders')
        .select('*')
        .eq('institute_id', instituteId)

      if (!folderErr && cloudFolders) {
        // Group cloud folders to detect duplicates already present in the cloud database
        const cloudGroups = new Map<string, any[]>()
        for (const row of cloudFolders) {
          if (row.deleted_at || deletedFolderIds.has(row.id)) {
            await db.delete('bank_folders', row.id)
            if (deletedFolderIds.has(row.id)) {
              await supabase.from('bank_folders').delete().eq('id', row.id)
            }
            continue
          }
          const groupKey = `${row.parent_id || 'root'}:${(row.name || '').trim().toLowerCase()}`
          if (!cloudGroups.has(groupKey)) {
            cloudGroups.set(groupKey, [])
          }
          cloudGroups.get(groupKey)!.push(row)
        }

        // For each group, keep only the canonical (latest updated) folder
        for (const [_key, rows] of cloudGroups.entries()) {
          // Sort descending by updated_at
          rows.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
          const canonicalRow = rows[0]
          const duplicateRows = rows.slice(1)

          // If canonical folder has a tombstone, skip it
          if (deletedFolderIds.has(canonicalRow.id)) {
            await db.delete('bank_folders', canonicalRow.id)
            await supabase.from('bank_folders').delete().eq('id', canonicalRow.id)
            continue
          }

          // If there are duplicate folders in Supabase, delete them and purge locally
          for (const dup of duplicateRows) {
            await db.delete('bank_folders', dup.id)
            try {
              await supabase
                .from('bank_folders')
                .delete()
                .eq('id', dup.id)
              // In Supabase, reparent any questions that were attached to the duplicate folder
              await supabase
                .from('question_bank')
                .update({ folder_id: canonicalRow.id })
                .eq('folder_id', dup.id)
            } catch (err) {
              console.warn('Could not delete cloud duplicate folder:', dup.id, err)
            }
          }

          // Check if user has changes pending in outbox for this folder
          const isPending = await this.isEntityPendingInQueue('folder', canonicalRow.id)
          if (isPending) {
            result.conflictCount += 1
            continue
          }

          // Check local IndexedDB for any folder with matching name/parent or legacy ID
          const allLocalFolders: BankFolder[] = await db.getAll('bank_folders')
          const legacyDuplicate = allLocalFolders.find(
            f => f.id !== canonicalRow.id &&
                 (f.parentId || null) === (canonicalRow.parent_id || null) &&
                 f.name.trim().toLowerCase() === (canonicalRow.name || '').trim().toLowerCase()
          )
          if (legacyDuplicate) {
            // Delete legacy local duplicate from IndexedDB
            await db.delete('bank_folders', legacyDuplicate.id)
            // Reparent any local questions pointing to legacyDuplicate.id
            const allLocalQuestions: QuestionBankItem[] = await db.getAll('question_bank')
            for (const q of allLocalQuestions) {
              if (q.folderId === legacyDuplicate.id) {
                q.folderId = canonicalRow.id
                await db.put('question_bank', q)
              }
            }
          }

          // Check timestamp conflict on the canonical folder
          const existing = await db.get('bank_folders', canonicalRow.id)
          if (existing && existing.updatedAt && canonicalRow.updated_at) {
            if (new Date(existing.updatedAt).getTime() > new Date(canonicalRow.updated_at).getTime()) {
              result.conflictCount += 1
              continue
            }
          }

          const localFolder = folderFromCloud(canonicalRow)
          await db.put('bank_folders', localFolder)
          result.pulledCount += 1
        }
      }
    } catch (e: any) {
      result.errors.push(`Error pulling folders: ${e?.message}`)
    }

    // 2. Pull Question Bank
    try {
      const qTombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'question')
      const deletedQIds = new Set(qTombstones.map(t => t.id))
      const pendingQDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'question')
      for (const pd of pendingQDeletes) {
        if (pd.action === 'delete') {
          deletedQIds.add(pd.entityId)
        }
      }

      const { data: cloudQuestions, error: qErr } = await supabase
        .from('question_bank')
        .select('*')
        .eq('institute_id', instituteId)

      if (!qErr && cloudQuestions) {
        for (const row of cloudQuestions) {
          if (row.deleted_at || deletedQIds.has(row.id)) {
            await db.delete('question_bank', row.id)
            if (deletedQIds.has(row.id)) {
              await supabase.from('question_bank').delete().eq('id', row.id)
            }
          } else {
            const isPending = await this.isEntityPendingInQueue('question', row.id)
            if (isPending) {
              result.conflictCount += 1
              continue
            }

            // Clean up any legacy matching local question
            const allLocal: QuestionBankItem[] = await db.getAll('question_bank')
            const legacyMatch = allLocal.find(
              q => q.id !== row.id && (
                deterministicUuid('question', q.id) === row.id ||
                (q.prompt === (row.prompt || row.question) && q.subject === row.subject && q.className === row.class_name)
              )
            )
            if (legacyMatch) {
              await db.delete('question_bank', legacyMatch.id)
            }

            const existing = await db.get('question_bank', row.id)
            if (existing && existing.updatedAt && row.updated_at) {
              if (new Date(existing.updatedAt).getTime() > new Date(row.updated_at).getTime()) {
                result.conflictCount += 1
                continue
              }
            }

            const localQuestion = questionFromCloud(row)
            await db.put('question_bank', localQuestion)
            result.pulledCount += 1
          }
        }
      }
    } catch (e: any) {
      result.errors.push(`Error pulling questions: ${e?.message}`)
    }

    // 3. Pull Papers and their linked children (settings, contents, layouts)
    try {
      const pTombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'paper')
      const deletedPIds = new Set(pTombstones.map(t => t.id))
      const pendingPDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'paper')
      for (const pd of pendingPDeletes) {
        if (pd.action === 'delete') {
          deletedPIds.add(pd.entityId)
        }
      }

      const { data: cloudPapers, error: paperErr } = await supabase
        .from('papers')
        .select('*')
        .eq('institute_id', instituteId)

      if (!paperErr && cloudPapers) {
        for (const pRow of cloudPapers) {
          if (pRow.deleted_at || deletedPIds.has(pRow.id)) {
            // Delete locally
            const meta = await db.get('papers', pRow.id)
            if (meta) {
              await db.delete('papers', pRow.id)
              await db.delete('exam_settings', meta.examSettingsId)
              await db.delete('paper_contents', meta.contentId)
              await db.delete('visual_layouts', meta.visualLayoutId)
            }
            if (deletedPIds.has(pRow.id)) {
              await supabase.from('papers').delete().eq('id', pRow.id)
            }
            continue
          }

          const isPending = await this.isEntityPendingInQueue('paper', pRow.id)
          if (isPending) {
            result.conflictCount += 1
            continue
          }

          const existingPaper = await db.get('papers', pRow.id)
          if (existingPaper && existingPaper.updatedAt && pRow.updated_at) {
            if (new Date(existingPaper.updatedAt).getTime() > new Date(pRow.updated_at).getTime()) {
              result.conflictCount += 1
              continue
            }
          }

          const localPaper = paperFromCloud(pRow, undefined, existingPaper)
          await db.put('papers', localPaper)
          result.pulledCount += 1

          // Pull settings for this paper
          const isSettingsPending = await this.isEntityPendingInQueue('settings', existingPaper?.examSettingsId || pRow.id)
          if (!isSettingsPending) {
            const { data: sRow } = await supabase
              .from('exam_settings')
              .select('*')
              .eq('paper_id', pRow.id)
              .maybeSingle()
            if (sRow) {
              const existingSettings = existingPaper
                ? ((await db.get('exam_settings', existingPaper.examSettingsId)) || (await db.get('exam_settings', pRow.id)))
                : null
              const localSettings = settingsFromCloud(sRow, pRow.id, existingSettings)
              await db.put('exam_settings', localSettings)
            }
          }

          // Pull contents for this paper: NEVER overwrite local questions with empty cloud placeholder!
          const isContentPending = await this.isEntityPendingInQueue('content', existingPaper?.contentId || pRow.id)
          if (!isContentPending) {
            const { data: cRow } = await supabase
              .from('paper_contents')
              .select('*')
              .eq('paper_id', pRow.id)
              .maybeSingle()
            if (cRow) {
              const existingContent = existingPaper
                ? ((await db.get('paper_contents', existingPaper.contentId)) || (await db.get('paper_contents', pRow.id)))
                : null

              const cloudHasQuestions = (cRow.sections || []).some((s: any) => (s.questions || []).length > 0)
              const localHasQuestions = (existingContent?.sections || []).some(s => (s.questions || []).length > 0)
              const localIsNewer = existingContent?.updatedAt && cRow.updated_at &&
                new Date(existingContent.updatedAt).getTime() >= new Date(cRow.updated_at).getTime()

              if (localHasQuestions && !cloudHasQuestions) {
                // Safeguard: Never overwrite local paper questions with an empty cloud copy!
              } else if (localIsNewer) {
                // Local edits are newer than cloud
              } else {
                const localContent = contentFromCloud(cRow, pRow.id, existingContent)
                await db.put('paper_contents', localContent)
                if (localContent.id !== pRow.id) {
                  await db.put('paper_contents', { ...localContent, id: pRow.id })
                }
              }
            }
          }

          // Pull layout for this paper
          const isLayoutPending = await this.isEntityPendingInQueue('layout', existingPaper?.visualLayoutId || pRow.id)
          if (!isLayoutPending) {
            const { data: lRow } = await supabase
              .from('visual_layouts')
              .select('*')
              .eq('paper_id', pRow.id)
              .maybeSingle()
            if (lRow) {
              const existingLayout = existingPaper
                ? ((await db.get('visual_layouts', existingPaper.visualLayoutId)) || (await db.get('visual_layouts', pRow.id)))
                : null
              const localLayout = layoutFromCloud(lRow, pRow.id, existingLayout)
              await db.put('visual_layouts', localLayout)
            }
          }
        }
      }
    } catch (e: any) {
      result.errors.push(`Error pulling papers: ${e?.message}`)
    }

    // 4. Pull Templates
    try {
      const tplTombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'template')
      const deletedTplIds = new Set(tplTombstones.map(t => t.id))
      const pendingTplDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'template')
      for (const pd of pendingTplDeletes) {
        if (pd.action === 'delete') {
          deletedTplIds.add(pd.entityId)
        }
      }

      const { data: cloudTemplates, error: tplErr } = await supabase
        .from('templates')
        .select('*')
        .eq('institute_id', instituteId)

      if (!tplErr && cloudTemplates) {
        for (const row of cloudTemplates) {
          if (row.deleted_at || deletedTplIds.has(row.id)) {
            await db.delete('templates', row.id)
            if (deletedTplIds.has(row.id)) {
              await supabase.from('templates').delete().eq('id', row.id)
            }
          } else {
            const isPending = await this.isEntityPendingInQueue('template', row.id)
            if (isPending) {
              result.conflictCount += 1
              continue
            }

            const existingTpl = await db.get('templates', row.id)
            if (existingTpl && existingTpl.updatedAt && row.updated_at) {
              if (new Date(existingTpl.updatedAt).getTime() > new Date(row.updated_at).getTime()) {
                result.conflictCount += 1
                continue
              }
            }

            const localTemplate = templateFromCloud(row)
            await db.put('templates', localTemplate)
            result.pulledCount += 1
          }
        }
      }
    } catch (e: any) {
      result.errors.push(`Error pulling templates: ${e?.message}`)
    }

    // 5. Pull Institute Branding & Details
    try {
      const { data: instRow } = await supabase
        .from('institutes')
        .select('*')
        .eq('id', instituteId)
        .maybeSingle()

      if (instRow) {
        const inst = instituteFromCloud(instRow)
        await db.put('app_settings', {
          key: 'institute_profile',
          value: {
            name: inst.name,
            tagline: inst.tagline,
            affiliation: inst.affiliation,
            address: inst.address,
            contact: inst.contact,
            logoUrl: inst.logo_path || '/omega-logo.png'
          }
        })
      }
    } catch {
      // Non-critical
    }
  }

  /**
   * Checks if an entity is currently waiting in the outbox queue
   */
  private async isEntityPendingInQueue(entityType: string, entityId: string): Promise<boolean> {
    const db = await getDatabase()
    try {
      const items = await db.getAllFromIndex('sync_queue', 'by-entity', entityType)
      return items.some(item => item.entityId === entityId)
    } catch {
      return false
    }
  }

  /**
   * Initial Migration / Safe Upload:
   * Scans local IndexedDB and uploads local papers, questions, folders, and templates
   * to the shared institute without overwriting cloud records.
   */
  public async initialMigration(): Promise<{ uploaded: number; skipped: number; errors: string[] }> {
    return this.safeInitialUpload()
  }

  public async safeInitialUpload(): Promise<{ uploaded: number; skipped: number; errors: string[] }> {
    const authInfo = await this.getAuthInfo()
    if (!authInfo || !supabase) {
      return { uploaded: 0, skipped: 0, errors: ['Not authenticated with an institute.'] }
    }

    const db = await getDatabase()
    let uploaded = 0
    let skipped = 0
    const errors: string[] = []

    // 1. Upload local Folders
    try {
      const folders: BankFolder[] = await db.getAll('bank_folders')
      for (const folder of folders) {
        const cloudId = isValidUuid(folder.id) ? folder.id : deterministicUuid('folder', folder.id)
        const { data: existing } = await supabase
          .from('bank_folders')
          .select('id')
          .eq('id', cloudId)
          .maybeSingle()

        if (!existing) {
          const row = folderToCloud(folder, authInfo.instituteId, authInfo.userId)
          const { error } = await supabase.from('bank_folders').insert(row)
          if (!error) uploaded += 1
          else errors.push(`Folder ${folder.name}: ${error.message}`)
        } else {
          skipped += 1
        }

        if (cloudId !== folder.id) {
          const migratedFolder: BankFolder = { ...folder, id: cloudId }
          await db.put('bank_folders', migratedFolder)
          await db.delete('bank_folders', folder.id)
        }
      }
    } catch (e: any) {
      errors.push(`Folders initial upload error: ${e?.message}`)
    }

    // 2. Upload local Question Bank Items
    try {
      const questions: QuestionBankItem[] = await db.getAll('question_bank')
      for (const q of questions) {
        const cloudId = isValidUuid(q.id) ? q.id : deterministicUuid('question', q.id)
        const { data: existing } = await supabase
          .from('question_bank')
          .select('id')
          .eq('id', cloudId)
          .maybeSingle()

        if (!existing) {
          const row = questionToCloud(q, authInfo.instituteId, authInfo.userId)
          const { error } = await supabase.from('question_bank').insert(row)
          if (!error) uploaded += 1
          else errors.push(`Question ${q.id}: ${error.message}`)
        } else {
          skipped += 1
        }

        if (cloudId !== q.id) {
          const migratedQ: QuestionBankItem = { ...q, id: cloudId }
          await db.put('question_bank', migratedQ)
          await db.delete('question_bank', q.id)
        }
      }
    } catch (e: any) {
      errors.push(`Questions initial upload error: ${e?.message}`)
    }

    // 3. Upload local Papers
    try {
      const papers: PaperMetadata[] = await db.getAll('papers')
      for (const paper of papers) {
        const cloudId = isValidUuid(paper.id) ? paper.id : deterministicUuid('paper', paper.id)
        const { data: existing } = await supabase
          .from('papers')
          .select('id')
          .eq('id', cloudId)
          .maybeSingle()

        if (!existing) {
          const pRow = paperToCloud(paper, authInfo.instituteId, authInfo.userId)
          const { error: pErr } = await supabase.from('papers').insert(pRow)
          if (pErr) {
            errors.push(`Paper ${paper.title}: ${pErr.message}`)
            continue
          }

          if (cloudId !== paper.id) {
            const migratedPaper: PaperMetadata = { ...paper, id: cloudId }
            await db.put('papers', migratedPaper)
            await db.delete('papers', paper.id)
          }

          // Upload linked settings, content, and layout
          const settings = await db.get('exam_settings', paper.examSettingsId)
          if (settings) {
            const sRow = settingsToCloud(settings, authInfo.instituteId)
            await supabase.from('exam_settings').insert(sRow)
          }

          const content = await db.get('paper_contents', paper.contentId)
          if (content) {
            const cRow = contentToCloud(content, authInfo.instituteId)
            await supabase.from('paper_contents').insert(cRow)
          }

          const layout = await db.get('visual_layouts', paper.visualLayoutId)
          if (layout) {
            const lRow = layoutToCloud(layout, authInfo.instituteId)
            await supabase.from('visual_layouts').insert(lRow)
          }

          uploaded += 1
        } else {
          skipped += 1
        }
      }
    } catch (e: any) {
      errors.push(`Papers initial upload error: ${e?.message}`)
    }

    // 4. Upload local Templates
    try {
      const templates: PaperSetupTemplate[] = await db.getAll('templates')
      for (const tpl of templates) {
        const cloudId = isValidUuid(tpl.id) ? tpl.id : deterministicUuid('template', tpl.id)
        const { data: existing } = await supabase
          .from('templates')
          .select('id')
          .eq('id', cloudId)
          .maybeSingle()

        if (!existing) {
          const row = templateToCloud(tpl, authInfo.instituteId, authInfo.userId)
          const { error } = await supabase.from('templates').insert(row)
          if (!error) uploaded += 1
          else errors.push(`Template ${tpl.name}: ${error.message}`)
        } else {
          skipped += 1
        }
      }
    } catch (e: any) {
      errors.push(`Templates initial upload error: ${e?.message}`)
    }

    return { uploaded, skipped, errors }
  }

  /**
   * Sets up Supabase Realtime listeners for shared institute tables.
   */
  private setupRealtimeSubscription(instituteId: string): void {
    if (!supabase || this.realtimeChannel) return

    try {
      this.realtimeChannel = supabase
        .channel(`institute_sync_${instituteId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'papers',
            filter: `institute_id=eq.${instituteId}`
          },
          () => this.scheduleAutoSync()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'question_bank',
            filter: `institute_id=eq.${instituteId}`
          },
          () => this.scheduleAutoSync()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bank_folders',
            filter: `institute_id=eq.${instituteId}`
          },
          () => this.scheduleAutoSync()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'templates',
            filter: `institute_id=eq.${instituteId}`
          },
          () => this.scheduleAutoSync()
        )
        .subscribe()
    } catch (err) {
      console.warn('Realtime subscription could not be established:', err)
    }
  }

  /**
   * Triggers a debounced sync after local mutations or realtime updates
   */
  public triggerDebouncedSync(delayMs = 1500): void {
    if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer)
    this.autoSyncTimer = setTimeout(() => {
      this.sync().catch(console.error)
    }, delayMs)
  }

  /**
   * Debounced sync trigger for realtime notifications
   */
  private scheduleAutoSync(): void {
    this.triggerDebouncedSync(1500)
  }

  /**
   * Tears down realtime listeners
   */
  public unsubscribeRealtime(): void {
    if (this.realtimeChannel && supabase) {
      try {
        supabase.removeChannel(this.realtimeChannel)
      } catch {
        // ignore
      }
      this.realtimeChannel = null
    }
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
  }
}

export const syncService = new SyncService()
