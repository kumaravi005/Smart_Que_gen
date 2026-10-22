import { getDatabase } from './db'
import type { PaperSetupTemplate, ExamSettings, VisualLayout } from '../types'
import { generateId } from '../utils/id'

export const templateService = {
  // Get all templates
  async getAllTemplates(): Promise<PaperSetupTemplate[]> {
    const db = await getDatabase()
    return db.getAll('templates')
  },

  // Save setup as a reusable template
  async saveAsTemplate(params: {
    name: string
    description?: string
    settings: ExamSettings
    layout: VisualLayout
  }): Promise<PaperSetupTemplate> {
    const db = await getDatabase()
    const now = new Date().toISOString()

    const { id: _sId, paperId: _spId, createdAt: _sc, updatedAt: _su, ...settingsData } = params.settings
    const { id: _lId, paperId: _lpId, createdAt: _lc, updatedAt: _lu, ...layoutData } = params.layout

    const template: PaperSetupTemplate = {
      id: generateId('tpl'),
      name: params.name.trim(),
      description: params.description?.trim(),
      subject: params.settings.subject,
      className: params.settings.className,
      totalMarks: params.settings.totalMarks,
      settings: settingsData,
      layout: layoutData,
      createdAt: now,
      updatedAt: now
    }

    await db.put('templates', template)
    return template
  },

  // Delete a template
  async deleteTemplate(id: string): Promise<boolean> {
    const db = await getDatabase()
    await db.delete('templates', id)
    return true
  }
}
