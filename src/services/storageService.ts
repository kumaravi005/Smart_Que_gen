import { getDatabase } from './db'

export const storageService = {
  // Get storage counts for dashboard display
  async getStorageStats() {
    const db = await getDatabase()
    const papersCount = await db.count('papers')
    const bankCount = await db.count('question_bank')
    return {
      papersCount,
      bankCount
    }
  },

  // Export full IndexedDB as JSON for backup/restore
  async exportBackup(): Promise<string> {
    const db = await getDatabase()
    const papers = await db.getAll('papers')
    const settings = await db.getAll('exam_settings')
    const contents = await db.getAll('paper_contents')
    const layouts = await db.getAll('visual_layouts')
    const bank = await db.getAll('question_bank')

    const data = {
      app: 'Omega Education Center — Smart Question Paper Generator',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      stores: {
        papers,
        exam_settings: settings,
        paper_contents: contents,
        visual_layouts: layouts,
        question_bank: bank
      }
    }
    return JSON.stringify(data, null, 2)
  }
}
