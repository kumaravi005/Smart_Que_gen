import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { validateStep1, validateStep2, validateStep3 } from '../utils/wizardValidation'
import { calculateMarksFromSections, estimatePageFit } from '../utils/layoutEstimator'
import { templateService } from '../services/templateService'
import { seedInitialDataIfEmpty } from '../services/db'
import type { ExamSettings, VisualLayout, ExamSectionConfig } from '../types'

describe('Paper Setup Wizard: Validation & Marks Calculations', () => {
  beforeEach(async () => {
    await seedInitialDataIfEmpty()
  })

  const mockSettings: ExamSettings = {
    id: 'setting_test',
    paperId: 'paper_test',
    institute: {
      name: 'OMEGA EDUCATION CENTER',
      address: 'Knowledge Park, Phase 2',
      tagline: 'Academic Excellence'
    },
    examName: 'Mid-Term Exam 2026',
    academicSession: '2026-2027',
    className: 'Class X',
    subject: 'Mathematics',
    durationMinutes: 180,
    totalMarks: 80,
    generalInstructions: ['Rule 1', 'Rule 2'],
    sections: [
      {
        id: 'sec_1',
        name: 'Section A',
        title: 'Section A: MCQs',
        totalQuestions: 20,
        marksPerQuestion: 1,
        targetTypes: ['mcq'],
        enabled: true
      },
      {
        id: 'sec_2',
        name: 'Section B',
        title: 'Section B: Short Answers',
        totalQuestions: 15,
        marksPerQuestion: 4,
        targetTypes: ['short_answer'],
        enabled: true
      }
    ],
    studentFields: {
      showName: true,
      showRollNo: true,
      showDate: true,
      showSection: true,
      showSignature: true,
      showInvigilatorSign: true
    },
    coverPageMode: 'first_page_top',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const mockLayout: VisualLayout = {
    id: 'layout_test',
    paperId: 'paper_test',
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
    watermarkText: 'OMEGA',
    watermarkOpacity: 0.08,
    dividerBetweenQuestions: true,
    questionSpacingPt: 10,
    optionSpacingPt: 6,
    mcqOptionLayout: 'auto',
    pageCountStrategy: 'target_pages',
    targetPageCount: 2,
    sectionBreakNewPage: false,
    showMarksPerQuestion: true,
    marksAlignment: 'right',
    showPageNumbers: true,
    pageNumberPosition: 'bottom_center',
    headerFooter: {
      logoPlacement: 'center',
      showInstitutionName: true,
      showAddress: true,
      showContact: true,
      showPageNumbers: true,
      pageNumberPosition: 'bottom_center',
      showExamNameInFooter: true,
      separatorLineStyle: 'single',
      borderStyle: 'none',
      differentFirstPage: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  it('validates Step 1: fails when required fields are missing', () => {
    const invalidSettings = {
      ...mockSettings,
      institute: { name: '' },
      examName: '',
      subject: '',
      durationMinutes: 0,
      totalMarks: -5
    }

    const res = validateStep1(invalidSettings)
    expect(res.isValid).toBe(false)
    expect(res.errors.instituteName).toBeDefined()
    expect(res.errors.examName).toBeDefined()
    expect(res.errors.subject).toBeDefined()
    expect(res.errors.durationMinutes).toBeDefined()
    expect(res.errors.totalMarks).toBeDefined()
  })

  it('validates Step 1: passes when all required fields are valid', () => {
    const res = validateStep1(mockSettings)
    expect(res.isValid).toBe(true)
    expect(Object.keys(res.errors).length).toBe(0)
  })

  it('calculates total marks accurately and ignores disabled sections', () => {
    const testSections: ExamSectionConfig[] = [
      {
        id: 's1',
        name: 'Section A',
        title: 'Section A',
        totalQuestions: 10,
        marksPerQuestion: 1,
        targetTypes: ['mcq'],
        enabled: true
      },
      {
        id: 's2',
        name: 'Section B',
        title: 'Section B',
        totalQuestions: 5,
        marksPerQuestion: 4,
        targetTypes: ['short_answer'],
        enabled: true
      },
      {
        id: 's3',
        name: 'Section C (Draft/Disabled)',
        title: 'Section C',
        totalQuestions: 2,
        marksPerQuestion: 10,
        targetTypes: ['long_answer'],
        enabled: false // disabled!
      }
    ]

    const result = calculateMarksFromSections(testSections)
    // 10*1 + 5*4 = 10 + 20 = 30 marks (Section C ignored)
    expect(result.totalConfiguredMarks).toBe(30)
    expect(result.totalConfiguredQuestions).toBe(15)
    expect(result.marksPerSection['s1']).toBe(10)
    expect(result.marksPerSection['s2']).toBe(20)
    expect(result.marksPerSection['s3']).toBeUndefined()
  })

  it('validates Step 2: detects marks blueprint mismatch with configured maximum marks', () => {
    // mockSettings has totalMarks = 80, but sections: 20*1 + 15*4 = 20 + 60 = 80
    const matchedRes = validateStep2(mockSettings)
    expect(matchedRes.isValid).toBe(true)
    expect(matchedRes.warnings.length).toBe(0)

    // Now change section counts so sum is 20*1 + 5*4 = 40 != 80
    const mismatchSettings = {
      ...mockSettings,
      sections: [
        {
          ...mockSettings.sections[0],
          totalQuestions: 20,
          marksPerQuestion: 1
        },
        {
          ...mockSettings.sections[1],
          totalQuestions: 5,
          marksPerQuestion: 4
        }
      ]
    }

    const mismatchRes = validateStep2(mismatchSettings)
    expect(mismatchRes.isValid).toBe(true)
    expect(mismatchRes.warnings.length).toBeGreaterThan(0)
    expect(mismatchRes.warnings[0]).toContain('Calculated section marks (40 Marks) differs from configured maximum marks (80 Marks)')
  })

  it('validates Step 3: enforces safe page margins', () => {
    const invalidLayout = {
      ...mockLayout,
      pageMarginsMm: { top: 2, bottom: 2, left: 15, right: 15 } // < 5mm
    }
    const res = validateStep3(invalidLayout)
    expect(res.isValid).toBe(false)
    expect(res.errors.margins).toBeDefined()
  })

  it('estimates page capacity and issues practical adjustments when exceeding target page count', () => {
    // 35 questions single column target 1 page -> will exceed
    const largeSettings = {
      ...mockSettings,
      sections: [
        {
          id: 's1',
          name: 'Section A',
          title: 'Section A',
          totalQuestions: 30,
          marksPerQuestion: 1,
          targetTypes: ['mcq'],
          enabled: true
        },
        {
          id: 's2',
          name: 'Section B',
          title: 'Section B',
          totalQuestions: 10,
          marksPerQuestion: 5,
          targetTypes: ['long_answer'],
          enabled: true
        }
      ]
    }

    const fitResult = estimatePageFit(largeSettings, {
      ...mockLayout,
      columnLayout: 'single',
      pageCountStrategy: 'target_pages',
      targetPageCount: 1
    })

    expect(fitResult.estimatedPages).toBeGreaterThan(1)
    expect(fitResult.fitsTarget).toBe(false)
    expect(fitResult.warningMessage).toBeDefined()
    expect(fitResult.suggestions).toContain('Switch to "Two-Column" layout to reduce printed height by up to 40%.')
  })

  it('persists and retrieves reusable templates via templateService in IndexedDB', async () => {
    const template = await templateService.saveAsTemplate({
      name: 'Class 10 Science Unit Test (25 Marks)',
      description: '10 MCQs + 3 Short Answers with 2-column format',
      settings: mockSettings,
      layout: mockLayout
    })

    expect(template.id).toMatch(/^tpl_/)
    expect(template.name).toBe('Class 10 Science Unit Test (25 Marks)')

    const all = await templateService.getAllTemplates()
    expect(all.some(t => t.id === template.id)).toBe(true)

    const deleted = await templateService.deleteTemplate(template.id)
    expect(deleted).toBe(true)

    // Verify template is truly removed from all templates
    const afterDelete = await templateService.getAllTemplates()
    expect(afterDelete.some(t => t.id === template.id)).toBe(false)
  })

  it('permanently deletes specific templates without affecting others', async () => {
    const tpl1 = await templateService.saveAsTemplate({
      name: 'Template To Keep',
      description: 'Keep this template',
      settings: mockSettings,
      layout: mockLayout
    })
    const tpl2 = await templateService.saveAsTemplate({
      name: 'Template To Delete',
      description: 'Delete this template',
      settings: mockSettings,
      layout: mockLayout
    })

    const initialList = await templateService.getAllTemplates()
    expect(initialList.some(t => t.id === tpl1.id)).toBe(true)
    expect(initialList.some(t => t.id === tpl2.id)).toBe(true)

    // Delete tpl2
    await templateService.deleteTemplate(tpl2.id)

    const updatedList = await templateService.getAllTemplates()
    expect(updatedList.some(t => t.id === tpl1.id)).toBe(true)
    expect(updatedList.some(t => t.id === tpl2.id)).toBe(false)

    // Clean up tpl1
    await templateService.deleteTemplate(tpl1.id)
  })
})
