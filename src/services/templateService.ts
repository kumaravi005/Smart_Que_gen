import { getDatabase } from './db'
import type { PaperSetupTemplate, ExamSettings, VisualLayout } from '../types'
import { generateUuid } from '../utils/uuid'
import { syncQueue } from './syncQueue'
import { syncService } from './syncService'

export const templateService = {
  // Get all templates (with auto-seeding on initial setup only)
  async getAllTemplates(): Promise<PaperSetupTemplate[]> {
    const db = await getDatabase()
    const seededRecord = await db.get('app_settings', 'templates_seeded')
    const seeded = seededRecord?.value === true
    let list = await db.getAll('templates')
    if (!seeded && list.length === 0) {
      await this.seedDefaultTemplates()
      list = await db.getAll('templates')
    } else if (!seeded && list.length > 0) {
      await db.put('app_settings', { key: 'templates_seeded', value: true })
    }
    return list
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
      id: generateUuid(),
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
    await syncQueue.enqueueChange('template', template.id, 'upsert', template)
    syncService.triggerDebouncedSync()
    return template
  },

  // Delete a template
  async deleteTemplate(id: string): Promise<boolean> {
    const db = await getDatabase()
    await db.delete('templates', id)
    await syncQueue.enqueueChange('template', id, 'delete')
    syncService.triggerDebouncedSync()
    return true
  },

  // Seed default coaching center templates
  async seedDefaultTemplates(): Promise<void> {
    const db = await getDatabase()
    await db.put('app_settings', { key: 'templates_seeded', value: true })
    const now = new Date().toISOString()

    const defaultInstitute = {
      name: 'OMEGA EDUCATION CENTER',
      tagline: 'Excellence in Coaching & Board Preparations',
      affiliation: 'Center Code: OEC-2026 / State & CBSE Curriculum',
      address: 'Knowledge Park, Phase 2, Near City Center',
      contact: 'Phone: +91 98765 43210 | info@omegaedu.org'
    }

    const defaultStudentFields = {
      showName: true,
      showRollNo: true,
      showDate: true,
      showSection: true,
      showSignature: true,
      showInvigilatorSign: true
    }

    const baseLayout = {
      pageSize: 'A4' as const,
      orientation: 'portrait' as const,
      columnLayout: 'single' as const,
      fontFamily: 'sans' as const,
      fontSizePt: 11,
      lineSpacing: 1.25,
      pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
      headerStyle: 'modern' as const,
      showInstituteLogo: true,
      logoPlacement: 'center' as const,
      logoWidthMm: 24,
      showWatermark: true,
      watermarkText: 'OMEGA EDUCATION CENTER',
      watermarkOpacity: 0.08,
      dividerBetweenQuestions: true,
      questionSpacingPt: 10,
      optionSpacingPt: 6,
      mcqOptionLayout: 'auto' as const,
      pageCountStrategy: 'auto' as const,
      targetPageCount: 2,
      sectionBreakNewPage: false,
      showMarksPerQuestion: true,
      marksAlignment: 'right' as const,
      footerNote: 'Omega Education Center — Academic Excellence',
      showPageNumbers: true,
      pageNumberPosition: 'bottom_center' as const,
      headerFooter: {
        logoPlacement: 'center' as const,
        showInstitutionName: true,
        showAddress: true,
        showContact: true,
        headerCustomText: '',
        footerCustomText: 'Omega Education Center — Academic Excellence',
        showPageNumbers: true,
        pageNumberPosition: 'bottom_center' as const,
        showExamNameInFooter: true,
        separatorLineStyle: 'single' as const,
        borderStyle: 'none' as const,
        differentFirstPage: false,
        firstPageHeaderStyle: 'full' as const
      }
    }

    const templatesToSeed: PaperSetupTemplate[] = [
      {
        id: 'tpl_weekly_25m',
        name: 'Weekly Coaching Test (25 Marks)',
        description: 'Ideal for chapter tests and weekend assessments (10 MCQs + 5 Short + 1 Long). Compact 1–2 page layout.',
        subject: 'General / All Subjects',
        className: 'Class X / IX',
        totalMarks: 25,
        settings: {
          institute: defaultInstitute,
          examName: 'Weekly Assessment Test',
          academicSession: '2026-2027',
          className: 'Class X',
          subject: 'Mathematics',
          durationMinutes: 45,
          totalMarks: 25,
          generalInstructions: [
            'All questions are compulsory.',
            'Section A has 10 MCQs of 1 mark each.',
            'Section B has 5 Short Answer questions of 2 marks each.',
            'Section C has 1 Long Answer question of 5 marks.'
          ],
          sections: [
            {
              id: 'sec_a',
              name: 'Section A',
              title: 'Section A: Multiple Choice Questions (1 Mark Each)',
              totalQuestions: 10,
              marksPerQuestion: 1,
              targetTypes: ['mcq'],
              enabled: true,
              numberingStyle: 'continuous'
            },
            {
              id: 'sec_b',
              name: 'Section B',
              title: 'Section B: Short Answer Questions (2 Marks Each)',
              totalQuestions: 5,
              marksPerQuestion: 2,
              targetTypes: ['short_answer'],
              enabled: true,
              numberingStyle: 'continuous'
            },
            {
              id: 'sec_c',
              name: 'Section C',
              title: 'Section C: Long Answer Question (5 Marks)',
              totalQuestions: 1,
              marksPerQuestion: 5,
              targetTypes: ['long_answer'],
              enabled: true,
              numberingStyle: 'continuous'
            }
          ],
          studentFields: defaultStudentFields,
          coverPageMode: 'first_page_top'
        },
        layout: {
          ...baseLayout,
          targetPageCount: 1,
          questionSpacingPt: 8
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl_unit_test_40m',
        name: 'Periodic Unit Assessment (40 Marks)',
        description: 'Standard monthly assessment (15 MCQs + 5 Short Answer + 2 Long Answer). Fits 2 pages.',
        subject: 'General / All Subjects',
        className: 'Class IX - XII',
        totalMarks: 40,
        settings: {
          institute: defaultInstitute,
          examName: 'Periodic Assessment Test',
          academicSession: '2026-2027',
          className: 'Class X',
          subject: 'Science',
          durationMinutes: 90,
          totalMarks: 40,
          generalInstructions: [
            'Questions 1 to 15 are MCQs of 1 mark each.',
            'Questions 16 to 20 are Short Answer questions of 3 marks each.',
            'Questions 21 and 22 are Long Answer questions of 5 marks each.'
          ],
          sections: [
            {
              id: 'sec_a',
              name: 'Section A',
              title: 'Section A: Objective Questions (1 Mark Each)',
              totalQuestions: 15,
              marksPerQuestion: 1,
              targetTypes: ['mcq'],
              enabled: true,
              numberingStyle: 'continuous'
            },
            {
              id: 'sec_b',
              name: 'Section B',
              title: 'Section B: Short Answer Questions (3 Marks Each)',
              totalQuestions: 5,
              marksPerQuestion: 3,
              targetTypes: ['short_answer'],
              enabled: true,
              numberingStyle: 'continuous'
            },
            {
              id: 'sec_c',
              name: 'Section C',
              title: 'Section C: Long Answer Questions (5 Marks Each)',
              totalQuestions: 2,
              marksPerQuestion: 5,
              targetTypes: ['long_answer'],
              enabled: true,
              numberingStyle: 'continuous'
            }
          ],
          studentFields: defaultStudentFields,
          coverPageMode: 'first_page_top'
        },
        layout: {
          ...baseLayout,
          targetPageCount: 2
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl_board_midterm_80m',
        name: 'CBSE / Board Pattern Mid-Term (80 Marks)',
        description: 'Comprehensive 5-section examination blueprint (20 MCQs, 5 VSA, 6 SA, 4 LA, 3 Case Units).',
        subject: 'General / All Subjects',
        className: 'Class X / XII',
        totalMarks: 80,
        settings: {
          institute: defaultInstitute,
          examName: 'Mid-Term Examination 2026-27',
          academicSession: '2026-2027',
          className: 'Class X',
          subject: 'Mathematics',
          durationMinutes: 180,
          totalMarks: 80,
          generalInstructions: [
            'This question paper contains 5 Sections: A, B, C, D, and E.',
            'Section A has 20 MCQs carrying 1 mark each.',
            'Section B has 5 Short Answer Questions of 2 marks each.',
            'Section C has 6 Short Answer Questions of 3 marks each.',
            'Section D has 4 Long Answer Questions of 5 marks each.',
            'Section E has 3 Case-Based integrated units of 4 marks each.'
          ],
          sections: [
            {
              id: 'sec_a',
              name: 'Section A',
              title: 'Section A: Multiple Choice Questions (1 Mark Each)',
              totalQuestions: 20,
              marksPerQuestion: 1,
              targetTypes: ['mcq'],
              enabled: true,
              numberingStyle: 'continuous'
            },
            {
              id: 'sec_b',
              name: 'Section B',
              title: 'Section B: Short Answer Questions (2 Marks Each)',
              totalQuestions: 5,
              marksPerQuestion: 2,
              targetTypes: ['short_answer'],
              enabled: true,
              numberingStyle: 'continuous'
            },
            {
              id: 'sec_c',
              name: 'Section C',
              title: 'Section C: Short Answer Questions (3 Marks Each)',
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
              totalQuestions: 4,
              marksPerQuestion: 5,
              targetTypes: ['long_answer'],
              enabled: true,
              numberingStyle: 'continuous'
            }
          ],
          studentFields: defaultStudentFields,
          coverPageMode: 'first_page_top'
        },
        layout: {
          ...baseLayout,
          targetPageCount: 4
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'tpl_speed_mcq_50m',
        name: 'Speed Objective & MCQ Test (50 Marks)',
        description: 'Formatted in 2 dense columns to fit 50 questions onto minimum printed pages. Saves paper.',
        subject: 'Foundation / Competitive',
        className: 'Class IX - XII',
        totalMarks: 50,
        settings: {
          institute: defaultInstitute,
          examName: 'Objective Speed Test',
          academicSession: '2026-2027',
          className: 'Foundation',
          subject: 'Science',
          durationMinutes: 60,
          totalMarks: 50,
          generalInstructions: [
            'Each question has 4 options. Darken the correct choice.',
            'Each correct answer carries 1 mark. There is no negative marking.'
          ],
          sections: [
            {
              id: 'sec_a',
              name: 'Section A',
              title: 'Section A: Multiple Choice Questions (50 Questions)',
              totalQuestions: 50,
              marksPerQuestion: 1,
              targetTypes: ['mcq'],
              enabled: true,
              numberingStyle: 'continuous'
            }
          ],
          studentFields: defaultStudentFields,
          coverPageMode: 'first_page_top'
        },
        layout: {
          ...baseLayout,
          columnLayout: 'two_column',
          fontSizePt: 10,
          questionSpacingPt: 6,
          optionSpacingPt: 4,
          mcqOptionLayout: 'two_per_row'
        },
        createdAt: now,
        updatedAt: now
      }
    ]

    for (const tpl of templatesToSeed) {
      await db.put('templates', tpl)
    }
  }
}
