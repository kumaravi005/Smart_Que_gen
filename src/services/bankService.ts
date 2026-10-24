import { getDatabase } from './db'
import type { QuestionBankItem, BankFilter, BankFolder } from '../types'
import { generateId } from '../utils/id'

export const bankService = {
  // --- Folder Management ---

  // Get all question bank folders
  async getFolders(): Promise<BankFolder[]> {
    const db = await getDatabase()
    try {
      if (db.objectStoreNames.contains('bank_folders')) {
        return await db.getAll('bank_folders')
      }
    } catch {
      // Fallback
    }
    const setting = await db.get('app_settings', 'bank_folders_list')
    return setting?.value || []
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
    const newFolder: BankFolder = {
      id: generateId('folder'),
      name: data.name.trim(),
      parentId: data.parentId || null,
      color: data.color || 'emerald',
      description: data.description?.trim(),
      createdAt: now,
      updatedAt: now
    }

    try {
      if (db.objectStoreNames.contains('bank_folders')) {
        await db.put('bank_folders', newFolder)
        return newFolder
      }
    } catch {
      // Fallback
    }

    const folders = await this.getFolders()
    folders.push(newFolder)
    await db.put('app_settings', { key: 'bank_folders_list', value: folders })
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
        return updated
      }
    } catch {
      // Fallback
    }

    folders[idx] = updated
    await db.put('app_settings', { key: 'bank_folders_list', value: folders })
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
      const remaining = folders.filter(f => !folderIdsToDelete.includes(f.id))
      await db.put('app_settings', { key: 'bank_folders_list', value: remaining })
    }

    // Handle questions in deleted folders
    const allQuestions = await db.getAll('question_bank')
    const txQ = db.transaction('question_bank', 'readwrite')
    for (const q of allQuestions) {
      if (q.folderId && folderIdsToDelete.includes(q.folderId)) {
        if (deleteContents) {
          await txQ.store.delete(q.id)
        } else {
          // Unlink to root
          await txQ.store.put({ ...q, folderId: null, updatedAt: new Date().toISOString() })
        }
      }
    }
    await txQ.done

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
      id: generateId('qb'),
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    }
    await db.put('question_bank', newItem)
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
        id: generateId('qb'),
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      }
      await tx.store.put(newItem)
      createdItems.push(newItem)
    }
    await tx.done

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
      }
    }
    await tx.done
  },

  // Increment usage count when imported into a paper
  async recordUsage(id: string): Promise<void> {
    const db = await getDatabase()
    const item = await db.get('question_bank', id)
    if (item) {
      item.usageCount += 1
      item.updatedAt = new Date().toISOString()
      await db.put('question_bank', item)
    }
  },

  // Delete question from bank
  async deleteQuestion(id: string): Promise<boolean> {
    const db = await getDatabase()
    await db.delete('question_bank', id)
    return true
  },

  // Delete multiple questions in bulk
  async deleteQuestionsBulk(ids: string[]): Promise<boolean> {
    const db = await getDatabase()
    const tx = db.transaction('question_bank', 'readwrite')
    for (const id of ids) {
      await tx.store.delete(id)
    }
    await tx.done
    return true
  }
}
