import { getDatabase } from './db'
import type { PaperMetadata, ExamSettings, PaperContent, VisualLayout, FullPaper, ExamSectionConfig } from '../types'
import { generateId } from '../utils/id'

export const paperService = {
  // Get list of all paper drafts/metadata
  async getAllPapers(): Promise<PaperMetadata[]> {
    const db = await getDatabase()
    const papers = await db.getAllFromIndex('papers', 'by-updated')
    return papers.reverse() // Most recent first
  },

  // Get paper metadata by ID
  async getPaperMetadata(id: string): Promise<PaperMetadata | undefined> {
    const db = await getDatabase()
    return db.get('papers', id)
  },

  // Get aggregated full paper
  async getFullPaper(paperId: string): Promise<FullPaper | null> {
    const db = await getDatabase()
    const metadata = await db.get('papers', paperId)
    if (!metadata) return null

    const settings = await db.get('exam_settings', metadata.examSettingsId)
    const content = await db.get('paper_contents', metadata.contentId)
    const layout = await db.get('visual_layouts', metadata.visualLayoutId)

    if (!settings || !content || !layout) {
      console.warn(`Paper ${paperId} has missing linked records:`, { settings, content, layout })
      return null
    }

    return { metadata, settings, content, layout }
  },

  // Create a brand new paper draft with default linked models
  async createNewPaper(params?: {
    title?: string
    subject?: string
    className?: string
    examName?: string
    totalMarks?: number
    durationMinutes?: number
    sections?: ExamSectionConfig[]
  }): Promise<FullPaper> {
    const db = await getDatabase()
    const now = new Date().toISOString()

    const paperId = generateId('paper')
    const examSettingsId = generateId('setting')
    const contentId = generateId('content')
    const visualLayoutId = generateId('layout')

    const subject = params?.subject || 'General Knowledge'
    const className = params?.className || 'Class X'
    const examName = params?.examName || 'Assessment Test 2026'
    const totalMarks = params?.totalMarks || 50
    const title = params?.title || `${className} - ${subject} ${examName}`

    // Fetch default institute profile from app settings or fallback
    const instituteSetting = await db.get('app_settings', 'institute_profile')
    const institute = instituteSetting?.value || {
      name: 'OMEGA EDUCATION CENTER',
      tagline: 'Empowering Minds, Shaping Futures',
      affiliation: 'Center Code: OEC-2026',
      address: 'Knowledge Park, Phase 2',
      contact: 'Phone: +91 98765 43210'
    }

    const defaultSections: ExamSectionConfig[] = params?.sections || [
      {
        id: 'sec_a',
        name: 'Section A',
        title: 'Section A: Multiple Choice Questions (1 Mark Each)',
        totalQuestions: 10,
        marksPerQuestion: 1,
        targetTypes: ['mcq']
      },
      {
        id: 'sec_b',
        name: 'Section B',
        title: 'Section B: Descriptive Questions',
        totalQuestions: 5,
        marksPerQuestion: 4,
        targetTypes: ['short_answer', 'long_answer']
      }
    ]

    const settings: ExamSettings = {
      id: examSettingsId,
      paperId,
      institute,
      examName,
      academicSession: '2026-2027',
      className,
      subject,
      durationMinutes: params?.durationMinutes || 90,
      totalMarks,
      date: new Date().toISOString().split('T')[0],
      generalInstructions: [
        'Read all instructions and questions carefully before answering.',
        'Write your Name, Roll Number, and Section clearly on the answer sheet.',
        'Section A contains MCQs. Choose the single most appropriate option.',
        'Section B contains descriptive questions with internal choice.',
        'Keep your answers neat, legible, and clearly numbered.'
      ],
      sections: defaultSections,
      createdAt: now,
      updatedAt: now
    }

    const content: PaperContent = {
      id: contentId,
      paperId,
      sections: defaultSections.map(sec => ({
        sectionId: sec.id,
        title: sec.title,
        questions: []
      })),
      totalCalculatedMarks: 0,
      totalCalculatedQuestions: 0,
      createdAt: now,
      updatedAt: now
    }

    const layout: VisualLayout = {
      id: visualLayoutId,
      paperId,
      pageSize: 'A4',
      orientation: 'portrait',
      columnLayout: 'single',
      fontFamily: 'sans',
      fontSizePt: 11,
      lineSpacing: 1.25,
      pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
      headerStyle: 'modern',
      showInstituteLogo: true,
      logoPlacement: 'center',
      logoWidthMm: 24,
      showWatermark: true,
      watermarkText: 'OMEGA EDUCATION CENTER',
      watermarkOpacity: 0.08,
      dividerBetweenQuestions: true,
      questionSpacingPt: 12,
      sectionBreakNewPage: false,
      showMarksPerQuestion: true,
      marksAlignment: 'right',
      footerNote: 'Omega Education Center — Academic Excellence',
      showPageNumbers: true,
      pageNumberPosition: 'bottom_center',
      createdAt: now,
      updatedAt: now
    }

    const metadata: PaperMetadata = {
      id: paperId,
      title,
      subject,
      className,
      examName,
      totalMarks,
      totalQuestions: 0,
      status: 'draft',
      examSettingsId,
      contentId,
      visualLayoutId,
      createdAt: now,
      updatedAt: now,
      tags: [subject, className]
    }

    const tx = db.transaction(['papers', 'exam_settings', 'paper_contents', 'visual_layouts'], 'readwrite')
    await tx.objectStore('papers').put(metadata)
    await tx.objectStore('exam_settings').put(settings)
    await tx.objectStore('paper_contents').put(content)
    await tx.objectStore('visual_layouts').put(layout)
    await tx.done

    return { metadata, settings, content, layout }
  },

  // Update paper metadata
  async updateMetadata(metadata: PaperMetadata): Promise<void> {
    const db = await getDatabase()
    metadata.updatedAt = new Date().toISOString()
    await db.put('papers', metadata)
  },

  // Update exam settings
  async updateExamSettings(settings: ExamSettings): Promise<void> {
    const db = await getDatabase()
    settings.updatedAt = new Date().toISOString()
    await db.put('exam_settings', settings)

    // Also touch paper metadata updatedAt
    const meta = await db.get('papers', settings.paperId)
    if (meta) {
      meta.subject = settings.subject
      meta.className = settings.className
      meta.examName = settings.examName
      meta.totalMarks = settings.totalMarks
      meta.updatedAt = settings.updatedAt
      await db.put('papers', meta)
    }
  },

  // Update paper content
  async updateContent(content: PaperContent): Promise<void> {
    const db = await getDatabase()
    content.updatedAt = new Date().toISOString()

    // Recalculate totals
    let totalMarks = 0
    let totalQuestions = 0
    for (const sec of content.sections) {
      for (const q of sec.questions) {
        totalQuestions += 1
        totalMarks += q.marks || 0
      }
    }
    content.totalCalculatedMarks = totalMarks
    content.totalCalculatedQuestions = totalQuestions

    await db.put('paper_contents', content)

    const meta = await db.get('papers', content.paperId)
    if (meta) {
      meta.totalQuestions = totalQuestions
      meta.updatedAt = content.updatedAt
      await db.put('papers', meta)
    }
  },

  // Update visual layout
  async updateVisualLayout(layout: VisualLayout): Promise<void> {
    const db = await getDatabase()
    layout.updatedAt = new Date().toISOString()
    await db.put('visual_layouts', layout)
  },

  // Delete a paper and all associated data
  async deletePaper(paperId: string): Promise<boolean> {
    const db = await getDatabase()
    const metadata = await db.get('papers', paperId)
    if (!metadata) return false

    const tx = db.transaction(['papers', 'exam_settings', 'paper_contents', 'visual_layouts'], 'readwrite')
    await tx.objectStore('papers').delete(paperId)
    await tx.objectStore('exam_settings').delete(metadata.examSettingsId)
    await tx.objectStore('paper_contents').delete(metadata.contentId)
    await tx.objectStore('visual_layouts').delete(metadata.visualLayoutId)
    await tx.done
    return true
  }
}
