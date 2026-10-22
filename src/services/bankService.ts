import { getDatabase } from './db'
import type { QuestionBankItem, BankFilter } from '../types'
import { generateId } from '../utils/id'

export const bankService = {
  // Get all question bank items with optional filtering
  async getQuestions(filter?: BankFilter): Promise<QuestionBankItem[]> {
    const db = await getDatabase()
    let items = await db.getAll('question_bank')

    if (!filter) return items

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
          item.tags.some(t => t.toLowerCase().includes(q))
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
  }
}
