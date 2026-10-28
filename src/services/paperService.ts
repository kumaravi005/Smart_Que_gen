import { getDatabase } from './db'
import type {
  PaperMetadata,
  ExamSettings,
  PaperContent,
  VisualLayout,
  FullPaper,
  ExamSectionConfig,
  PaperSetupTemplate
} from '../types'
import { generateUuid } from '../utils/uuid'
import { syncQueue } from './syncQueue'
import { syncService } from './syncService'
import { supabase, isSupabaseConfigured } from './supabaseClient'

export const paperService = {
  // Get list of all paper drafts/metadata
  async getAllPapers(): Promise<PaperMetadata[]> {
    const db = await getDatabase()
    let papers = await db.getAllFromIndex('papers', 'by-updated')

    // Filter out deleted papers
    try {
      if (db.objectStoreNames.contains('sync_tombstones')) {
        const tombstones = await db.getAllFromIndex('sync_tombstones', 'by-entity-type', 'paper')
        const deletedIds = new Set(tombstones.map(t => t.id))
        const pendingDeletes = await db.getAllFromIndex('sync_queue', 'by-entity', 'paper')
        for (const pd of pendingDeletes) {
          if (pd.action === 'delete') {
            deletedIds.add(pd.entityId)
          }
        }
        if (deletedIds.size > 0) {
          papers = papers.filter(p => !deletedIds.has(p.id))
        }
      }
    } catch {
      // Fallback
    }

    return papers.reverse() // Most recent first
  },

  // Get paper metadata by ID
  async getPaperMetadata(id: string): Promise<PaperMetadata | undefined> {
    const db = await getDatabase()
    return db.get('papers', id)
  },

  // Get aggregated full paper with safe fallback defaults
  async getFullPaper(paperId: string): Promise<FullPaper | null> {
    const db = await getDatabase()
    const metadata = await db.get('papers', paperId)
    if (!metadata) return null

    const rawSettings = await db.get('exam_settings', metadata.examSettingsId)
    const content = await db.get('paper_contents', metadata.contentId)
    const rawLayout = await db.get('visual_layouts', metadata.visualLayoutId)

    if (!rawSettings || !content || !rawLayout) {
      console.warn(`Paper ${paperId} has missing linked records:`, { rawSettings, content, rawLayout })
      return null
    }

    // Hydrate safe defaults for settings if older record
    const settings: ExamSettings = {
      ...rawSettings,
      studentFields: rawSettings.studentFields || {
        showName: true,
        showRollNo: true,
        showDate: true,
        showSection: true,
        showSignature: true,
        showInvigilatorSign: true
      },
      coverPageMode: rawSettings.coverPageMode || 'first_page_top',
      generalInstructions: rawSettings.generalInstructions || [],
      sections: (rawSettings.sections || []).map((sec, idx) => ({
        ...sec,
        enabled: sec.enabled ?? true,
        numberingStyle: sec.numberingStyle || 'continuous',
        targetTypes: sec.targetTypes || (idx === 0 ? ['mcq'] : ['short_answer'])
      }))
    }

    // Hydrate safe defaults for layout if older record
    const layout: VisualLayout = {
      ...rawLayout,
      optionSpacingPt: rawLayout.optionSpacingPt ?? 6,
      mcqOptionLayout: rawLayout.mcqOptionLayout || 'auto',
      pageCountStrategy: rawLayout.pageCountStrategy || 'auto',
      targetPageCount: rawLayout.targetPageCount ?? 2,
      headerFooter: rawLayout.headerFooter || {
        logoPlacement: (rawLayout.logoPlacement as any) || 'center',
        showInstitutionName: true,
        showAddress: true,
        showContact: true,
        headerCustomText: '',
        footerCustomText: rawLayout.footerNote || 'Omega Education Center — Academic Excellence',
        showPageNumbers: rawLayout.showPageNumbers ?? true,
        pageNumberPosition: rawLayout.pageNumberPosition || 'bottom_center',
        showExamNameInFooter: true,
        separatorLineStyle: 'single',
        borderStyle: 'none',
        differentFirstPage: false,
        firstPageHeaderStyle: 'full'
      }
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

    const paperId = generateUuid()
    const examSettingsId = generateUuid()
    const contentId = generateUuid()
    const visualLayoutId = generateUuid()

    const subject = params?.subject || 'Mathematics'
    const className = params?.className || 'Class X'
    const examName = params?.examName || 'Assessment Test 2026'
    const totalMarks = params?.totalMarks || 80
    const title = params?.title || `${className} - ${subject} ${examName}`

    // Fetch default institute profile from app settings or fallback
    const instituteSetting = await db.get('app_settings', 'institute_profile')
    const institute = instituteSetting?.value || {
      name: 'OMEGA EDUCATION CENTRE',
      tagline: 'एक अद्भुत शिक्षण शैली... | BOARD • JNV • CHS • OLYMPIAD',
      affiliation: 'BOARD | JNV | CHS | OLYMPIAD | NAVODAYA | SAINIK SCHOOL',
      address: 'Knowledge Park, Phase 2, Near City Center',
      contact: 'Phone: +91 98765 43210 | info@omegaedu.org',
      logoUrl: '/omega-logo.png'
    }

    const defaultSections: ExamSectionConfig[] = params?.sections || [
      {
        id: 'sec_a',
        name: 'Section A',
        title: 'Section A: Multiple Choice Questions (1 Mark Each)',
        instructions: 'Choose the single most appropriate option for each question.',
        totalQuestions: 20,
        marksPerQuestion: 1,
        targetTypes: ['mcq'],
        enabled: true,
        numberingStyle: 'continuous'
      },
      {
        id: 'sec_b',
        name: 'Section B',
        title: 'Section B: Short Answer Type I (2 Marks Each)',
        instructions: 'Very short answer questions. Show basic steps.',
        totalQuestions: 5,
        marksPerQuestion: 2,
        targetTypes: ['short_answer'],
        enabled: true,
        numberingStyle: 'continuous'
      },
      {
        id: 'sec_c',
        name: 'Section C',
        title: 'Section C: Short Answer Type II (3 Marks Each)',
        instructions: 'Short answer questions with working where applicable.',
        totalQuestions: 6,
        marksPerQuestion: 3,
        targetTypes: ['short_answer'],
        enabled: true,
        numberingStyle: 'continuous'
      },
      {
        id: 'sec_d',
        name: 'Section D',
        title: 'Section D: Long Answer Questions (5 Marks Each)',
        instructions: 'Detailed analytical problem solving with diagrams.',
        totalQuestions: 4,
        marksPerQuestion: 5,
        targetTypes: ['long_answer'],
        enabled: true,
        numberingStyle: 'continuous'
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
      durationMinutes: params?.durationMinutes || 180,
      totalMarks,
      date: new Date().toISOString().split('T')[0],
      generalInstructions: [
        'This question paper contains structured sections as configured.',
        'All Questions are compulsory unless internal choice is specified.',
        'Write your Name, Roll Number, and Section clearly on the answer sheet.',
        'Section A comprises MCQs. Choose the single most appropriate option.',
        'Use of calculators or unauthorized electronic devices is strictly prohibited.'
      ],
      sections: defaultSections,
      studentFields: {
        showName: true,
        showRollNo: true,
        showDate: true,
        showSection: true,
        showSignature: true,
        showInvigilatorSign: true
      },
      coverPageMode: 'first_page_top',
      customCoverText: '',
      createdAt: now,
      updatedAt: now
    }

    const content: PaperContent = {
      id: contentId,
      paperId,
      sections: defaultSections.map(sec => ({
        sectionId: sec.id,
        title: sec.title,
        instructions: sec.instructions,
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
      questionSpacingPt: 10,
      optionSpacingPt: 6,
      mcqOptionLayout: 'auto',
      pageCountStrategy: 'auto',
      targetPageCount: 2,
      sectionBreakNewPage: false,
      showMarksPerQuestion: true,
      marksAlignment: 'right',
      footerNote: 'Omega Education Center — Academic Excellence',
      showPageNumbers: true,
      pageNumberPosition: 'bottom_center',
      headerFooter: {
        logoPlacement: 'center',
        showInstitutionName: true,
        showAddress: true,
        showContact: true,
        headerCustomText: '',
        footerCustomText: 'Omega Education Center — Academic Excellence',
        showPageNumbers: true,
        pageNumberPosition: 'bottom_center',
        showExamNameInFooter: true,
        separatorLineStyle: 'single',
        borderStyle: 'none',
        differentFirstPage: false,
        firstPageHeaderStyle: 'full'
      },
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

    await syncQueue.enqueueChange('paper', paperId, 'upsert', metadata)
    syncService.triggerDebouncedSync()

    return { metadata, settings, content, layout }
  },

  // Update paper metadata
  async updateMetadata(metadata: PaperMetadata): Promise<void> {
    const db = await getDatabase()
    metadata.updatedAt = new Date().toISOString()
    await db.put('papers', metadata)

    await syncQueue.enqueueChange('paper', metadata.id, 'upsert', metadata)
    syncService.triggerDebouncedSync()
  },

  // Update exam settings
  async updateExamSettings(settings: ExamSettings): Promise<void> {
    const db = await getDatabase()
    settings.updatedAt = new Date().toISOString()
    await db.put('exam_settings', settings)

    // Sync paper metadata
    const meta = await db.get('papers', settings.paperId)
    if (meta) {
      meta.subject = settings.subject
      meta.className = settings.className
      meta.examName = settings.examName
      meta.totalMarks = settings.totalMarks
      // Preserve custom paper title if set; only set fallback if empty
      if (!meta.title || meta.title.trim() === '') {
        meta.title = `${settings.className} - ${settings.subject} ${settings.examName}`
      }
      meta.updatedAt = settings.updatedAt
      await db.put('papers', meta)
      await syncQueue.enqueueChange('paper', meta.id, 'upsert', meta)
    }

    await syncQueue.enqueueChange('settings', settings.id, 'upsert', settings)
    syncService.triggerDebouncedSync()
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
      await syncQueue.enqueueChange('paper', meta.id, 'upsert', meta)
    }

    await syncQueue.enqueueChange('content', content.id, 'upsert', content)
    syncService.triggerDebouncedSync()
  },

  // Update visual layout
  async updateVisualLayout(layout: VisualLayout): Promise<void> {
    const db = await getDatabase()
    layout.updatedAt = new Date().toISOString()
    await db.put('visual_layouts', layout)

    await syncQueue.enqueueChange('layout', layout.id, 'upsert', layout)
    syncService.triggerDebouncedSync()
  },

  // Duplicate an existing paper setup
  async duplicatePaper(paperId: string): Promise<FullPaper | null> {
    const original = await this.getFullPaper(paperId)
    if (!original) return null

    const db = await getDatabase()
    const now = new Date().toISOString()

    const newPaperId = generateUuid()
    const newSettingsId = generateUuid()
    const newContentId = generateUuid()
    const newLayoutId = generateUuid()

    const newSettings: ExamSettings = {
      ...original.settings,
      id: newSettingsId,
      paperId: newPaperId,
      examName: `${original.settings.examName} (Copy)`,
      createdAt: now,
      updatedAt: now
    }

    const newContent: PaperContent = {
      ...original.content,
      id: newContentId,
      paperId: newPaperId,
      sections: original.content.sections.map(s => ({
        ...s,
        questions: s.questions.map(q => ({ ...q, id: generateUuid() }))
      })),
      createdAt: now,
      updatedAt: now
    }

    const newLayout: VisualLayout = {
      ...original.layout,
      id: newLayoutId,
      paperId: newPaperId,
      createdAt: now,
      updatedAt: now
    }

    const newMetadata: PaperMetadata = {
      ...original.metadata,
      id: newPaperId,
      title: `${original.metadata.title} (Copy)`,
      examSettingsId: newSettingsId,
      contentId: newContentId,
      visualLayoutId: newLayoutId,
      createdAt: now,
      updatedAt: now
    }

    const tx = db.transaction(['papers', 'exam_settings', 'paper_contents', 'visual_layouts'], 'readwrite')
    await tx.objectStore('papers').put(newMetadata)
    await tx.objectStore('exam_settings').put(newSettings)
    await tx.objectStore('paper_contents').put(newContent)
    await tx.objectStore('visual_layouts').put(newLayout)
    await tx.done

    await syncQueue.enqueueChange('paper', newPaperId, 'upsert', newMetadata)
    syncService.triggerDebouncedSync()

    return { metadata: newMetadata, settings: newSettings, content: newContent, layout: newLayout }
  },

  // Apply a reusable template to an existing or new paper
  async applyTemplate(paperId: string, template: PaperSetupTemplate): Promise<void> {
    const full = await this.getFullPaper(paperId)
    if (!full) return

    const now = new Date().toISOString()
    const {
      subject: _tplSub,
      className: _tplClass,
      examName: _tplExam,
      totalMarks: _tplMarks,
      durationMinutes: _tplDur,
      sections: _tplSec,
      ...templateSettingsStyle
    } = template.settings || {}

    const updatedSettings: ExamSettings = {
      ...full.settings,
      ...templateSettingsStyle,
      id: full.settings.id,
      paperId,
      subject: full.settings.subject,
      className: full.settings.className,
      examName: full.settings.examName,
      totalMarks: full.settings.totalMarks,
      durationMinutes: full.settings.durationMinutes,
      sections: full.settings.sections,
      updatedAt: now
    }

    const updatedLayout: VisualLayout = {
      ...full.layout,
      ...template.layout,
      id: full.layout.id,
      paperId,
      updatedAt: now
    }

    await this.updateExamSettings(updatedSettings)
    await this.updateVisualLayout(updatedLayout)
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

    await syncQueue.enqueueChange('paper', paperId, 'delete')
    if (supabase && isSupabaseConfigured) {
      supabase
        .from('papers')
        .delete()
        .eq('id', paperId)
        .then(() => {}, () => {})
    }
    syncService.triggerDebouncedSync()

    return true
  }
}
