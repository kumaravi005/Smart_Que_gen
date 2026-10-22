import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  exportToDocx,
  exportToXlsx,
  generateExportFilename,
  sanitizeFilename
} from '../utils/exportManager'
import type { FullPaper } from '../types'

const mockSamplePaper: FullPaper = {
  metadata: {
    id: 'paper_test_101',
    title: 'Class X Mathematics Mid-Term Exam 2026',
    subject: 'Mathematics',
    className: 'Class X',
    examName: 'Mid-Term Examination',
    totalMarks: 50,
    totalQuestions: 4,
    status: 'ready',
    examSettingsId: 'settings_1',
    contentId: 'content_1',
    visualLayoutId: 'layout_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['Math', 'Midterm']
  },
  settings: {
    institute: {
      name: 'Omega Education Center',
      tagline: 'Empowering Minds, Achieving Excellence',
      address: 'Phase 2, Coaching Hub, City Center',
      contact: 'Phone: +91 9876543210'
    },
    examName: 'Mid-Term Examination',
    academicSession: '2026-2027',
    className: 'Class X',
    subject: 'Mathematics',
    totalMarks: 50,
    durationMinutes: 120,
    generalInstructions: [
      'All questions are compulsory.',
      'Section A comprises 2 objective MCQs of 1 mark each.',
      'Section B comprises 2 subjective problems of 2 marks each.'
    ],
    studentFields: {
      showName: true,
      showRollNo: true,
      showDate: true,
      showSection: true,
      showSignature: false,
      showInvigilatorSign: false
    },
    sections: [],
    coverPageMode: 'first_page_top',
    id: 'settings_1',
    paperId: 'paper_test_101',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: {
    id: 'content_1',
    paperId: 'paper_test_101',
    totalCalculatedMarks: 6,
    totalCalculatedQuestions: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      {
        sectionId: 'sec_a',
        title: 'Section A - Objective Questions',
        instructions: 'Select the correct option from the given choices',
        questions: [
          {
            id: 'q_1',
            sectionId: 'sec_a',
            orderNumber: 1,
            type: 'mcq',
            prompt: 'Which of the following is an irrational number?',
            marks: 1,
            difficulty: 'easy',
            topic: 'Real Numbers',
            tags: ['Algebra'],
            options: [
              { id: 'opt_1', label: 'A', text: '4/7' },
              { id: 'opt_2', label: 'B', text: '0.25' },
              { id: 'opt_3', label: 'C', text: 'sqrt(3)', isCorrect: true },
              { id: 'opt_4', label: 'D', text: '22/7' }
            ],
            answerKey: 'C',
            explanation: 'sqrt(3) cannot be expressed as a ratio of two integers.'
          },
          {
            id: 'q_2',
            sectionId: 'sec_a',
            orderNumber: 2,
            type: 'mcq',
            prompt: 'The discriminant of 2x^2 - 4x + 3 = 0 is:',
            marks: 1,
            difficulty: 'medium',
            topic: 'Quadratic Equations',
            tags: ['Algebra'],
            options: [
              { id: 'opt_2a', label: 'A', text: '-8', isCorrect: true },
              { id: 'opt_2b', label: 'B', text: '10' },
              { id: 'opt_2c', label: 'C', text: '16' },
              { id: 'opt_2d', label: 'D', text: '24' }
            ],
            answerKey: 'A'
          }
        ]
      },
      {
        sectionId: 'sec_b',
        title: 'Section B - Short Answer Problems',
        instructions: 'Solve with complete intermediate calculation steps',
        questions: [
          {
            id: 'q_3',
            sectionId: 'sec_b',
            orderNumber: 3,
            type: 'short_answer',
            prompt: 'Find the roots of the quadratic equation x^2 - 3x - 10 = 0 by factorization.',
            marks: 2,
            difficulty: 'medium',
            topic: 'Quadratic Equations',
            tags: ['Algebra'],
            writingSpaceLines: 4,
            solutionText: 'x = 5 and x = -2'
          },
          {
            id: 'q_4',
            sectionId: 'sec_b',
            orderNumber: 4,
            type: 'short_answer',
            prompt: 'Prove that tangent at any point of a circle is perpendicular to the radius through the point of contact.',
            marks: 2,
            difficulty: 'hard',
            topic: 'Circles',
            tags: ['Geometry'],
            diagramUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            writingSpaceLines: 6
          }
        ]
      }
    ]
  },
  layout: {
    id: 'layout_1',
    paperId: 'paper_test_101',
    pageSize: 'A4',
    orientation: 'portrait',
    columnLayout: 'single',
    fontSizePt: 11,
    lineSpacing: 1.25,
    fontFamily: 'serif',
    pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
    showWatermark: true,
    watermarkText: 'OMEGA EDUCATION'
  } as any
}

describe('ExportManager - Filename & Sanitization', () => {
  it('sanitizes strings removing illegal filesystem characters', () => {
    const raw = 'Math: Test / Class X * 2026? <Midterm>!'
    const cleaned = sanitizeFilename(raw)
    expect(cleaned).not.toContain('/')
    expect(cleaned).not.toContain(':')
    expect(cleaned).not.toContain('*')
    expect(cleaned).not.toContain('?')
    expect(cleaned).not.toContain('<')
    expect(cleaned).not.toContain('>')
  })

  it('generates descriptive export filenames', () => {
    const docxName = generateExportFilename(mockSamplePaper, 'docx')
    const xlsxName = generateExportFilename(mockSamplePaper, 'xlsx')
    const pdfName = generateExportFilename(mockSamplePaper, 'pdf')

    expect(docxName).toBe('Omega_Education_Mathematics_Class_X_Mid-Term_Examination.docx')
    expect(xlsxName).toBe('Omega_Education_Mathematics_Class_X_Mid-Term_Examination.xlsx')
    expect(pdfName).toBe('Omega_Education_Mathematics_Class_X_Mid-Term_Examination.pdf')
  })
})

describe('ExportManager - DOCX Generation', () => {
  it('generates a valid, non-empty Microsoft Word (.docx) document', async () => {
    const blob = await exportToDocx(mockSamplePaper)

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(1000) // Real docx zip package is > 1KB
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  it('handles landscape orientation and custom margins in DOCX', async () => {
    const landscapePaper: FullPaper = {
      ...mockSamplePaper,
      layout: {
        ...mockSamplePaper.layout,
        orientation: 'landscape',
        pageMarginsMm: { top: 20, bottom: 20, left: 20, right: 20 }
      }
    }

    const blob = await exportToDocx(landscapePaper)
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('handles embedded base64 diagrams in DOCX without crashing', async () => {
    const blob = await exportToDocx(mockSamplePaper)
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('handles paper with manual design mode notice in DOCX', async () => {
    const manualPaper: FullPaper = {
      ...mockSamplePaper,
      layout: {
        ...mockSamplePaper.layout,
        designData: {
          mode: 'manual',
          elements: []
        }
      }
    }

    const blob = await exportToDocx(manualPaper)
    expect(blob.size).toBeGreaterThan(1000)
  })
})

describe('ExportManager - XLSX Generation', () => {
  it('generates a valid Excel (.xlsx) workbook with Questions_Matrix and Exam_Summary', async () => {
    const blob = exportToXlsx(mockSamplePaper)

    expect(blob).toBeDefined()
    expect(blob.size).toBeGreaterThan(1000)
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    // Read the binary workbook back to verify structure
    const arrayBuffer = await blob.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'array' })

    expect(wb.SheetNames).toContain('Questions_Matrix')
    expect(wb.SheetNames).toContain('Exam_Summary')

    // Verify Questions Matrix rows
    const wsQuestions = wb.Sheets['Questions_Matrix']
    const data = XLSX.utils.sheet_to_json<any>(wsQuestions)

    expect(data.length).toBe(4) // 4 questions

    // Check Question 1 MCQ details
    const q1 = data[0]
    expect(q1['Question No']).toBe(1)
    expect(q1['Section']).toBe('Section A - Objective Questions')
    expect(q1['Question Type']).toBe('MCQ')
    expect(q1['Question Text']).toBe('Which of the following is an irrational number?')
    expect(q1['Option A']).toBe('4/7')
    expect(q1['Option B']).toBe('0.25')
    expect(q1['Option C']).toBe('sqrt(3)')
    expect(q1['Option D']).toBe('22/7')
    expect(q1['Correct Answer']).toBe('C')
    expect(q1['Marks']).toBe(1)
    expect(q1['Topic']).toBe('Real Numbers')

    // Check Question 3 Subjective details
    const q3 = data[2]
    expect(q3['Question No']).toBe(3)
    expect(q3['Section']).toBe('Section B - Short Answer Problems')
    expect(q3['Question Type']).toBe('SHORT ANSWER')
    expect(q3['Marks']).toBe(2)
  })

  it('includes complete exam summary statistics in Exam_Summary sheet', async () => {
    const blob = exportToXlsx(mockSamplePaper)
    const arrayBuffer = await blob.arrayBuffer()
    const wb = XLSX.read(arrayBuffer, { type: 'array' })

    const wsSummary = wb.Sheets['Exam_Summary']
    const summaryRows = XLSX.utils.sheet_to_json<any>(wsSummary, { header: 1 })

    const textJoined = JSON.stringify(summaryRows)
    expect(textJoined).toContain('Omega Education Center')
    expect(textJoined).toContain('Mid-Term Examination')
    expect(textJoined).toContain('Mathematics')
    expect(textJoined).toContain('Class X')
  })
})
