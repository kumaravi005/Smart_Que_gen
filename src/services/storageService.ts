import { getDatabase } from './db'
import { syncService } from './syncService'

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
  },

  // Import JSON backup into IndexedDB
  async importBackup(jsonString: string): Promise<boolean> {
    const db = await getDatabase()
    const data = JSON.parse(jsonString)
    if (!data.stores) throw new Error('Invalid backup file format')

    const tx = db.transaction(['papers', 'exam_settings', 'paper_contents', 'visual_layouts', 'question_bank'], 'readwrite')
    
    if (Array.isArray(data.stores.papers)) {
      for (const p of data.stores.papers) await tx.objectStore('papers').put(p)
    }
    if (Array.isArray(data.stores.exam_settings)) {
      for (const s of data.stores.exam_settings) await tx.objectStore('exam_settings').put(s)
    }
    if (Array.isArray(data.stores.paper_contents)) {
      for (const c of data.stores.paper_contents) await tx.objectStore('paper_contents').put(c)
    }
    if (Array.isArray(data.stores.visual_layouts)) {
      for (const l of data.stores.visual_layouts) await tx.objectStore('visual_layouts').put(l)
    }
    if (Array.isArray(data.stores.question_bank)) {
      for (const b of data.stores.question_bank) await tx.objectStore('question_bank').put(b)
    }
    await tx.done
    // Non-blocking trigger to synchronize imported records
    try {
      syncService.triggerDebouncedSync()
    } catch {
      // ignore
    }
    return true
  }
}
