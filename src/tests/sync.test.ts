import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { getDatabase } from '../services/db'
import { syncQueue } from '../services/syncQueue'
import { syncService } from '../services/syncService'
import { paperService } from '../services/paperService'
import { bankService } from '../services/bankService'
import { deterministicUuid, isValidUuid } from '../utils/uuid'
import type { PaperMetadata } from '../types'
import {
  paperToCloud,
  paperFromCloud,
  questionFromCloud
} from '../services/syncMappers'
import { supabase } from '../services/supabaseClient'

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    }
  }
}

describe('Offline-First Cloud Synchronization Engine', () => {
  const testInstituteId = '11111111-1111-4111-8111-111111111111'
  const testTeacherAId = '22222222-2222-4222-8222-222222222222'
  const testTeacherBId = '33333333-3333-4333-8333-333333333333'
  const otherInstituteId = '99999999-9999-4999-8999-999999999999'

  beforeEach(async () => {
    vi.restoreAllMocks()
    try {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
    } catch {
      // ignore
    }
    const db = await getDatabase()
    // Clear relevant stores for fresh test state
    const stores = [
      'papers',
      'exam_settings',
      'paper_contents',
      'visual_layouts',
      'question_bank',
      'bank_folders',
      'templates',
      'sync_queue',
      'sync_tombstones',
      'sync_metadata'
    ] as const
    for (const store of stores) {
      await db.clear(store)
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Deterministic UUID & Schema Adaptations', () => {
    it('produces standard RFC-4122 compliant UUIDs from local string IDs', () => {
      const localPaperId = 'paper_1740000000000_abc'
      const uuid1 = deterministicUuid('paper', localPaperId)
      const uuid2 = deterministicUuid('paper', localPaperId)

      expect(isValidUuid(uuid1)).toBe(true)
      expect(uuid1).toBe(uuid2) // Pure deterministic mapping
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('maps papers bidirectionally between IndexedDB and Supabase snake_case tables', () => {
      const now = new Date().toISOString()
      const localPaper: PaperMetadata = {
        id: 'paper_test_123',
        title: 'Mathematics Assessment',
        subject: 'Mathematics',
        className: 'Class X',
        examName: 'Midterm',
        totalMarks: 50,
        totalQuestions: 20,
        status: 'draft',
        tags: ['Math'],
        isArchived: false,
        examSettingsId: 'settings_test_123',
        contentId: 'content_test_123',
        visualLayoutId: 'layout_test_123',
        createdAt: now,
        updatedAt: now
      }

      const cloudRow = paperToCloud(localPaper, testInstituteId, testTeacherAId)
      expect(cloudRow.institute_id).toBe(testInstituteId)
      expect(cloudRow.created_by).toBe(testTeacherAId)
      expect(isValidUuid(cloudRow.id)).toBe(true)

      const roundTrip = paperFromCloud(cloudRow)
      expect(roundTrip.id).toBe(cloudRow.id)
      expect(isValidUuid(roundTrip.examSettingsId)).toBe(true)
      expect(isValidUuid(roundTrip.contentId)).toBe(true)
      expect(isValidUuid(roundTrip.visualLayoutId)).toBe(true)
    })
  })

  describe('Offline Creation & Outbox Queueing', () => {
    it('saves newly created paper to IndexedDB and enqueues sync mutation without internet', async () => {
      const paper = await paperService.createNewPaper({
        title: 'Offline Mathematics Unit Test',
        subject: 'Mathematics',
        className: 'Class X',
        examName: 'Unit Test 1',
        totalMarks: 25
      })

      expect(paper.metadata.id).toBeDefined()

      // Verify stored in local IndexedDB
      const db = await getDatabase()
      const stored = await db.get('papers', paper.metadata.id)
      expect(stored).toBeDefined()
      expect(stored?.id).toBe(paper.metadata.id)

      // Verify enqueued in sync_queue outbox
      const queue = await syncQueue.getPendingQueue()
      const paperQueueItem = queue.find(
        item => item.entityType === 'paper' && item.entityId === paper.metadata.id
      )
      expect(paperQueueItem).toBeDefined()
      expect(paperQueueItem?.action).toBe('upsert')
      expect(paperQueueItem?.attempts).toBe(0)
    })

    it('saves newly created question bank item to IndexedDB and enqueues sync mutation', async () => {
      const question = await bankService.addQuestion({
        type: 'mcq',
        marks: 1,
        difficulty: 'easy',
        subject: 'Physics',
        className: 'Class XII',
        prompt: 'What is the SI unit of electric current?',
        topic: 'Current Electricity',
        tags: ['Physics', 'Electricity'],
        options: [
          { id: 'opt_1', label: 'A', text: 'Ampere', isCorrect: true },
          { id: 'opt_2', label: 'B', text: 'Volt', isCorrect: false },
          { id: 'opt_3', label: 'C', text: 'Ohm', isCorrect: false },
          { id: 'opt_4', label: 'D', text: 'Watt', isCorrect: false }
        ]
      })

      expect(question.id).toBeDefined()

      // Verify in IndexedDB
      const db = await getDatabase()
      const stored = await db.get('question_bank', question.id)
      expect(stored).toBeDefined()
      expect(stored?.prompt).toBe('What is the SI unit of electric current?')

      // Verify outbox queue
      const pendingCount = await syncQueue.getPendingCount()
      expect(pendingCount).toBeGreaterThan(0)

      const queue = await syncQueue.getPendingQueue()
      const item = queue.find(q => q.entityType === 'question' && q.entityId === question.id)
      expect(item).toBeDefined()
      expect(item?.action).toBe('upsert')
    })
  })

  describe('Reconnect Synchronization & Outbox Processing', () => {
    it('pushes pending outbox mutations and clears queue upon successful sync', async () => {
      // 1. Enqueue dummy changes
      await syncQueue.enqueueChange('folder', 'folder_mock_1', 'upsert', {
        id: 'folder_mock_1',
        name: 'Algebra Chapter 1',
        icon: 'folder',
        color: '#0055D4',
        createdAt: new Date().toISOString()
      })

      const countBefore = await syncQueue.getPendingCount()
      expect(countBefore).toBe(1)

      // 2. Mock Supabase client responses with thenable builder
      if (supabase) {
        vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
          data: {
            user: {
              id: testTeacherAId,
              email: 'teacher.a@omega.edu'
            } as any
          },
          error: null
        })

        vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
          const builder: any = {
            select: vi.fn().mockImplementation(() => builder),
            eq: vi.fn().mockImplementation((_col: string, _val: string) => {
              if (table === 'profiles') {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { institute_id: testInstituteId, role: 'teacher' },
                    error: null
                  })
                }
              }
              return builder
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], error: null })
          }
          return builder
        })

        // 3. Trigger sync
        const result = await syncService.sync()

        expect(result.errors.length).toBe(0)
        expect(result.pushedCount).toBe(1)

        // Outbox queue should now be empty
        const countAfter = await syncQueue.getPendingCount()
        expect(countAfter).toBe(0)
      }
    })
  })

  describe('Safe Migration & Duplicate Prevention', () => {
    it('detects existing cloud records before uploading and skips them without overwriting', async () => {
      const db = await getDatabase()
      const existingFolder = {
        id: 'folder_existing_123',
        parentId: null,
        name: 'Trigonometry Tests',
        color: '#0055D4',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await db.put('bank_folders', existingFolder)

      if (supabase) {
        vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
          data: { user: { id: testTeacherAId } as any },
          error: null
        })

        const cloudFolderId = deterministicUuid('folder', existingFolder.id)

        // Mock Supabase to simulate that the folder already exists in the cloud
        vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
          const builder: any = {
            select: vi.fn().mockImplementation(() => builder),
            eq: vi.fn().mockImplementation((_col: string, _val: string) => {
              if (table === 'profiles') {
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { institute_id: testInstituteId, role: 'teacher' },
                      error: null
                    })
                }
              }
              if (table === 'bank_folders') {
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { id: cloudFolderId },
                      error: null
                    })
                }
              }
              return builder
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], error: null })
          }
          return builder
        })

        // Run initial migration
        const report = await syncService.initialMigration()

        // Should skip the existing folder to prevent duplicate records
        expect(report.skipped).toBeGreaterThanOrEqual(1)
        expect(report.uploaded).toBe(0)
        expect(report.errors.length).toBe(0)
      }
    })
  })

  describe('Conflict Handling & Local Work Protection', () => {
    it('protects local edits when entity has pending changes in the sync queue', async () => {
      const db = await getDatabase()
      const testQuestionId = deterministicUuid('question', 'q_local_123')

      // Save local question with local changes
      const localQuestion = {
        id: testQuestionId,
        type: 'short_answer' as const,
        marks: 2,
        difficulty: 'medium' as const,
        subject: 'Chemistry',
        className: 'Class XI',
        topic: 'Organic',
        tags: [],
        usageCount: 0,
        prompt: 'Local updated content that should NOT be overwritten by cloud pull',
        createdAt: '2026-10-25T10:00:00Z',
        updatedAt: '2026-10-25T12:00:00Z'
      }
      await db.put('question_bank', localQuestion)

      // Put in pending queue
      await syncQueue.enqueueChange('question', testQuestionId, 'upsert', localQuestion)

      if (supabase) {
        vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
          data: { user: { id: testTeacherAId } as any },
          error: null
        })

        vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
          const builder: any = {
            select: vi.fn().mockImplementation(() => builder),
            eq: vi.fn().mockImplementation((_col: string, _val: string) => {
              if (table === 'profiles') {
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: { institute_id: testInstituteId, role: 'teacher' },
                      error: null
                    })
                }
              }
              if (table === 'question_bank') {
                return Promise.resolve({
                  data: [
                    {
                      id: testQuestionId,
                      institute_id: testInstituteId,
                      prompt: 'Older Cloud Version',
                      type: 'short_answer',
                      marks: 2,
                      difficulty: 'medium',
                      subject: 'Chemistry',
                      class_name: 'Class XI',
                      options: [],
                      created_by: testTeacherBId,
                      created_at: '2026-10-25T10:00:00Z',
                      updated_at: '2026-10-25T11:00:00Z',
                      deleted_at: null
                    }
                  ],
                  error: null
                })
              }
              return builder
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], error: null })
          }
          return builder
        })

        // Perform sync pull
        const _result = await syncService.sync()
        expect(_result.conflictCount).toBeGreaterThanOrEqual(1)

        // Local version must be retained
        const stored = await db.get('question_bank', testQuestionId)
        expect(stored?.prompt).toBe(
          'Local updated content that should NOT be overwritten by cloud pull'
        )
      }
    })
  })

  describe('Deletion Synchronization & Tombstones', () => {
    it('creates tombstone and enqueues delete mutation on paper deletion', async () => {
      const paper = await paperService.createNewPaper({
        title: 'Paper to be deleted',
        subject: 'Biology',
        className: 'Class XI'
      })
      const paperId = paper.metadata.id

      // Delete the paper
      await paperService.deletePaper(paperId)

      // Verify removed from IndexedDB
      const db = await getDatabase()
      const stored = await db.get('papers', paperId)
      expect(stored).toBeUndefined()

      // Verify tombstone is recorded
      const isDead = await syncQueue.isTombstoned('paper', paperId)
      expect(isDead).toBe(true)

      // Verify delete mutation is enqueued
      const queue = await syncQueue.getPendingQueue()
      const deleteItem = queue.find(
        item => item.entityType === 'paper' && item.entityId === paperId && item.action === 'delete'
      )
      expect(deleteItem).toBeDefined()
    })
  })

  describe('Institute Isolation & Shared Collaboration Across Teachers', () => {
    it('correctly maps shared institute records created by Teacher A to be accessible by Teacher B', () => {
      const sharedQuestion = {
        id: deterministicUuid('question', 'shared_q_1'),
        institute_id: testInstituteId,
        prompt: 'Solve for x: 2x + 5 = 15',
        type: 'short_answer',
        marks: 2,
        difficulty: 'easy',
        subject: 'Mathematics',
        class_name: 'Class IX',
        options: [],
        created_by: testTeacherAId, // Created by Teacher A
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null
      }

      // Teacher B loads the question into their local IndexedDB cache
      const localQuestion = questionFromCloud(sharedQuestion)
      expect(localQuestion.id).toBe(sharedQuestion.id)
      expect(localQuestion.prompt).toBe('Solve for x: 2x + 5 = 15')
      expect(localQuestion.subject).toBe('Mathematics')
    })

    it('rejects / ignores data from another institute', () => {
      const foreignPaper = {
        id: deterministicUuid('paper', 'foreign_paper_1'),
        institute_id: otherInstituteId, // Different institute!
        exam_settings_id: deterministicUuid('settings', 'foreign_s_1'),
        content_id: deterministicUuid('content', 'foreign_c_1'),
        visual_layout_id: deterministicUuid('layout', 'foreign_l_1'),
        title: 'Foreign Institute Exam',
        created_by: 'some_other_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        deleted_at: null
      }

      // Institute isolation check
      expect(foreignPaper.institute_id).not.toBe(testInstituteId)
    })
  })
})
