import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { paperService } from '../services/paperService'
import { bankService } from '../services/bankService'
import { generateId } from '../utils/id'
import { getDatabase, seedInitialDataIfEmpty } from '../services/db'

describe('Domain Data Modeling & Stable IDs Architecture', () => {
  beforeEach(async () => {
    // Reset or seed
    await seedInitialDataIfEmpty()
  })

  it('generates unique stable IDs with prefix', () => {
    const id1 = generateId('paper')
    const id2 = generateId('paper')
    expect(id1).toMatch(/^paper_/)
    expect(id2).toMatch(/^paper_/)
    expect(id1).not.toBe(id2)
  })

  it('creates a paper with separated settings, content, and visual layout linked by stable IDs', async () => {
    const paper = await paperService.createNewPaper({
      title: 'Class XII Physics Periodic Test',
      subject: 'Physics',
      className: 'Class XII',
      examName: 'Periodic Test 1',
      totalMarks: 70
    })

    expect(paper).toBeDefined()
    expect(paper.metadata).toBeDefined()
    expect(paper.settings).toBeDefined()
    expect(paper.content).toBeDefined()
    expect(paper.layout).toBeDefined()

    // Verify stable ID linkages
    expect(paper.metadata.examSettingsId).toBe(paper.settings.id)
    expect(paper.metadata.contentId).toBe(paper.content.id)
    expect(paper.metadata.visualLayoutId).toBe(paper.layout.id)

    expect(paper.settings.paperId).toBe(paper.metadata.id)
    expect(paper.content.paperId).toBe(paper.metadata.id)
    expect(paper.layout.paperId).toBe(paper.metadata.id)

    expect(paper.settings.subject).toBe('Physics')
    expect(paper.settings.className).toBe('Class XII')
    expect(paper.settings.totalMarks).toBe(70)
  })

  it('retrieves full paper with all separated components aggregated', async () => {
    const created = await paperService.createNewPaper({
      subject: 'Chemistry',
      className: 'Class XI'
    })

    const fetched = await paperService.getFullPaper(created.metadata.id)
    expect(fetched).not.toBeNull()
    expect(fetched?.metadata.id).toBe(created.metadata.id)
    expect(fetched?.settings.id).toBe(created.settings.id)
    expect(fetched?.content.id).toBe(created.content.id)
    expect(fetched?.layout.id).toBe(created.layout.id)
  })

  it('recalculates total questions and total marks on content update', async () => {
    const paper = await paperService.createNewPaper({
      subject: 'Mathematics',
      className: 'Class X'
    })

    const sectionId = paper.content.sections[0]?.sectionId || 'sec_a'
    const updatedContent = {
      ...paper.content,
      sections: [
        {
          sectionId,
          title: 'Section A: Objective Questions',
          questions: [
            {
              id: generateId('q'),
              sectionId,
              orderNumber: 1,
              type: 'mcq' as const,
              prompt: 'What is the sum of angles in a triangle?',
              marks: 1,
              difficulty: 'easy' as const,
              tags: ['Geometry']
            },
            {
              id: generateId('q'),
              sectionId,
              orderNumber: 2,
              type: 'short_answer' as const,
              prompt: 'State Pythagoras theorem and prove it.',
              marks: 4,
              difficulty: 'medium' as const,
              tags: ['Geometry', 'Pythagoras']
            }
          ]
        }
      ]
    }

    await paperService.updateContent(updatedContent)

    const refreshed = await paperService.getFullPaper(paper.metadata.id)
    expect(refreshed?.content.totalCalculatedQuestions).toBe(2)
    expect(refreshed?.content.totalCalculatedMarks).toBe(5)
    expect(refreshed?.metadata.totalQuestions).toBe(2)
  })

  it('deletes a paper and removes all its linked records', async () => {
    const created = await paperService.createNewPaper({
      subject: 'Biology',
      className: 'Class XII'
    })

    const db = await getDatabase()
    const deleteSuccess = await paperService.deletePaper(created.metadata.id)
    expect(deleteSuccess).toBe(true)

    // Verify all 4 stores no longer contain the records
    const metaCheck = await db.get('papers', created.metadata.id)
    const settingsCheck = await db.get('exam_settings', created.settings.id)
    const contentCheck = await db.get('paper_contents', created.content.id)
    const layoutCheck = await db.get('visual_layouts', created.layout.id)

    expect(metaCheck).toBeUndefined()
    expect(settingsCheck).toBeUndefined()
    expect(contentCheck).toBeUndefined()
    expect(layoutCheck).toBeUndefined()
  })

  it('stores and retrieves items from question bank', async () => {
    const item = await bankService.addQuestion({
      prompt: 'Define Ohm’s Law and write its mathematical formula.',
      subject: 'Physics',
      className: 'Class X',
      topic: 'Electricity',
      difficulty: 'medium',
      marks: 2,
      type: 'short_answer',
      tags: ['Ohm Law', 'Electricity', 'Formula']
    })

    expect(item.id).toBeDefined()
    expect(item.id.length).toBeGreaterThan(0)

    const searchResults = await bankService.getQuestions({ searchQuery: 'Ohm' })
    expect(searchResults.some(q => q.id === item.id)).toBe(true)

    const subjectResults = await bankService.getQuestions({ subject: 'Physics' })
    expect(subjectResults.some(q => q.id === item.id)).toBe(true)
  })
})
