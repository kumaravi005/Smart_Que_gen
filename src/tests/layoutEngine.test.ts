import { describe, it, expect } from 'vitest'
import { paginatePaper, estimateQuestionHeightMm, getPhysicalPageDimensions } from '../utils/paginationEngine'
import type { ExamSettings, PaperContent, VisualLayout, Question } from '../types'

describe('Automatic Paper Layout Engine & Pagination Test Suite', () => {
  const baseSettings: ExamSettings = {
    id: 'set_1',
    paperId: 'paper_1',
    institute: {
      name: 'Omega Education Center',
      tagline: 'Committed to Excellence',
      address: '123 Academic Street, Delhi'
    },
    examName: 'Mid-Term Examination 2026',
    academicSession: '2026-2027',
    className: 'Class X',
    subject: 'Science',
    durationMinutes: 180,
    totalMarks: 80,
    generalInstructions: ['Attempt all questions.', 'Write answers clearly.'],
    sections: [
      {
        id: 'sec_a',
        name: 'Section A',
        title: 'Section A: Multiple Choice Questions',
        totalQuestions: 5,
        marksPerQuestion: 1,
        targetTypes: ['mcq'],
        enabled: true
      },
      {
        id: 'sec_b',
        name: 'Section B',
        title: 'Section B: Short & Long Answer Questions',
        totalQuestions: 3,
        marksPerQuestion: 3,
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

  const baseLayout: VisualLayout = {
    id: 'lay_1',
    paperId: 'paper_1',
    pageSize: 'A4',
    orientation: 'portrait',
    columnLayout: 'single',
    fontFamily: 'serif',
    fontSizePt: 11,
    lineSpacing: 1.25,
    pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
    headerStyle: 'classic',
    showInstituteLogo: false,
    logoPlacement: 'center',
    logoWidthMm: 25,
    showWatermark: false,
    watermarkOpacity: 0.08,
    dividerBetweenQuestions: true,
    questionSpacingPt: 10,
    optionSpacingPt: 4,
    mcqOptionLayout: 'auto',
    pageCountStrategy: 'auto',
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

  // 1. Dimensions check: Portrait vs Landscape
  it('respects page dimensions and orientation', () => {
    const a4Portrait = getPhysicalPageDimensions('A4', 'portrait')
    expect(a4Portrait.width).toBe(210)
    expect(a4Portrait.height).toBe(297)

    const a4Landscape = getPhysicalPageDimensions('A4', 'landscape')
    expect(a4Landscape.width).toBe(297)
    expect(a4Landscape.height).toBe(210)

    const letter = getPhysicalPageDimensions('Letter', 'portrait')
    expect(letter.width).toBe(215.9)
    expect(letter.height).toBe(279.4)
  })

  // 2. Short MCQ questions height estimation
  it('correctly calculates compact height for short MCQs', () => {
    const shortMcq: Question = {
      id: 'q_short',
      sectionId: 'sec_a',
      orderNumber: 1,
      type: 'mcq',
      prompt: 'What is 2 + 2?',
      marks: 1,
      difficulty: 'easy',
      tags: [],
      options: [
        { id: '1', label: 'A', text: '1' },
        { id: '2', label: 'B', text: '2' },
        { id: '3', label: 'C', text: '3' },
        { id: '4', label: 'D', text: '4' }
      ]
    }

    const heightSingle = estimateQuestionHeightMm(shortMcq, false, 11, 1.25, 10)
    expect(heightSingle).toBeLessThan(25) // Takes ~16-20mm
  })

  // 3. Long MCQ options height estimation
  it('allocates proper height for long MCQ options to avoid clipping', () => {
    const longMcq: Question = {
      id: 'q_long',
      sectionId: 'sec_a',
      orderNumber: 2,
      type: 'mcq',
      prompt: 'Which statement accurately describes the second law of thermodynamics in an isolated physical system?',
      marks: 1,
      difficulty: 'hard',
      tags: [],
      options: [
        { id: '1', label: 'A', text: 'The entropy of any isolated system always increases over time towards thermodynamic equilibrium.' },
        { id: '2', label: 'B', text: 'Energy can neither be created nor destroyed in an isolated conservative system.' },
        { id: '3', label: 'C', text: 'The absolute entropy of a pure crystalline substance at absolute zero is exactly zero.' },
        { id: '4', label: 'D', text: 'Heat flows spontaneously from a colder body to a hotter reservoir without external work.' }
      ]
    }

    const height = estimateQuestionHeightMm(longMcq, false, 11, 1.25, 10)
    expect(height).toBeGreaterThan(35) // Takes ~38-45mm because options stack vertically
  })

  // 4. Questions containing images / diagrams
  it('adds dedicated vertical clearance for questions containing diagrams', () => {
    const diagramQ: Question = {
      id: 'q_diagram',
      sectionId: 'sec_b',
      orderNumber: 3,
      type: 'short_answer',
      prompt: 'Identify parts labeled A, B, and C in the given diagram of the human eye.',
      diagramUrl: 'https://example.com/eye_diagram.png',
      marks: 3,
      difficulty: 'medium',
      tags: []
    }

    const withoutDiagram = estimateQuestionHeightMm({ ...diagramQ, diagramUrl: undefined }, false)
    const withDiagram = estimateQuestionHeightMm(diagramQ, false)
    expect(withDiagram - withoutDiagram).toBeGreaterThanOrEqual(40)
  })

  // 5. Fits on one page when content is concise
  it('generates exactly 1 page when content is concise', () => {
    const compactContent: PaperContent = {
      id: 'cnt_1',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A: Quiz',
          questions: [
            { id: 'q1', sectionId: 'sec_a', orderNumber: 1, type: 'mcq', prompt: 'Capital of France?', marks: 1, difficulty: 'easy', tags: [] },
            { id: 'q2', sectionId: 'sec_a', orderNumber: 2, type: 'mcq', prompt: 'Symbol of Gold?', marks: 1, difficulty: 'easy', tags: [] },
            { id: 'q3', sectionId: 'sec_a', orderNumber: 3, type: 'short_answer', prompt: 'Define acceleration.', marks: 2, difficulty: 'easy', tags: [] }
          ]
        }
      ],
      totalCalculatedMarks: 4,
      totalCalculatedQuestions: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = paginatePaper({
      settings: baseSettings,
      content: compactContent,
      layout: baseLayout
    })

    expect(result.totalPages).toBe(1)
    expect(result.pages[0].pageNumber).toBe(1)
  })

  // 6. Spans multiple pages cleanly when question count is large
  it('automatically paginates into multiple pages when content exceeds single page', () => {
    const manyQuestions: Question[] = Array.from({ length: 25 }, (_, i) => ({
      id: `q_${i + 1}`,
      sectionId: 'sec_a',
      orderNumber: i + 1,
      type: 'mcq',
      prompt: `Question ${i + 1}: Which of the following is a fundamental chemical property of transition metals in group ${i + 1}?`,
      marks: 1,
      difficulty: 'medium',
      tags: [],
      options: [
        { id: '1', label: 'A', text: 'Variable oxidation states' },
        { id: '2', label: 'B', text: 'High electropositivity' },
        { id: '3', label: 'C', text: 'Formation of colorless ions' },
        { id: '4', label: 'D', text: 'Diamagnetic behavior' }
      ]
    }))

    const largeContent: PaperContent = {
      id: 'cnt_large',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A: Comprehensive Objective Questions',
          questions: manyQuestions
        }
      ],
      totalCalculatedMarks: 25,
      totalCalculatedQuestions: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = paginatePaper({
      settings: baseSettings,
      content: largeContent,
      layout: baseLayout
    })

    expect(result.totalPages).toBeGreaterThan(1)
    expect(result.pages.length).toBe(result.totalPages)
    // Verify each page contains elements and valid page numbers
    result.pages.forEach((page, idx) => {
      expect(page.pageNumber).toBe(idx + 1)
      expect(page.elements.length).toBeGreaterThan(0)
    })
  })

  // 7. Two-column layout increases content density
  it('two-column layout packs more content per page than single column', () => {
    const questions: Question[] = Array.from({ length: 16 }, (_, i) => ({
      id: `q_${i + 1}`,
      sectionId: 'sec_a',
      orderNumber: i + 1,
      type: 'mcq',
      prompt: `Short question ${i + 1}?`,
      marks: 1,
      difficulty: 'easy',
      tags: [],
      options: [
        { id: '1', label: 'A', text: 'Option A' },
        { id: '2', label: 'B', text: 'Option B' }
      ]
    }))

    const testContent: PaperContent = {
      id: 'cnt_2col',
      paperId: 'paper_1',
      sections: [{ sectionId: 'sec_a', title: 'Section A', questions }],
      totalCalculatedMarks: 16,
      totalCalculatedQuestions: 16,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const singleColResult = paginatePaper({
      settings: baseSettings,
      content: testContent,
      layout: { ...baseLayout, columnLayout: 'single' }
    })

    const twoColResult = paginatePaper({
      settings: baseSettings,
      content: testContent,
      layout: { ...baseLayout, columnLayout: 'two_column' }
    })

    // Two column layout accommodates more content per page
    expect(twoColResult.totalPages).toBeLessThanOrEqual(singleColResult.totalPages)
  })

  // 8. Section Page Breaks
  it('respects sectionBreakNewPage layout setting', () => {
    const twoSectionsContent: PaperContent = {
      id: 'cnt_sec_break',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A',
          questions: [
            { id: 'q1', sectionId: 'sec_a', orderNumber: 1, type: 'mcq', prompt: 'Question 1', marks: 1, difficulty: 'easy', tags: [] }
          ]
        },
        {
          sectionId: 'sec_b',
          title: 'Section B',
          questions: [
            { id: 'q2', sectionId: 'sec_b', orderNumber: 2, type: 'short_answer', prompt: 'Question 2', marks: 2, difficulty: 'easy', tags: [] }
          ]
        }
      ],
      totalCalculatedMarks: 3,
      totalCalculatedQuestions: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const withoutBreak = paginatePaper({
      settings: baseSettings,
      content: twoSectionsContent,
      layout: { ...baseLayout, sectionBreakNewPage: false }
    })
    expect(withoutBreak.totalPages).toBe(1)

    const withBreak = paginatePaper({
      settings: baseSettings,
      content: twoSectionsContent,
      layout: { ...baseLayout, sectionBreakNewPage: true }
    })
    expect(withBreak.totalPages).toBe(2)
  })

  // 9. Separate Cover Page Mode
  it('generates a dedicated cover page on page 1 when coverPageMode is separate_cover', () => {
    const content: PaperContent = {
      id: 'cnt_cover',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A',
          questions: [
            { id: 'q1', sectionId: 'sec_a', orderNumber: 1, type: 'mcq', prompt: 'Question 1', marks: 1, difficulty: 'easy', tags: [] }
          ]
        }
      ],
      totalCalculatedMarks: 1,
      totalCalculatedQuestions: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = paginatePaper({
      settings: { ...baseSettings, coverPageMode: 'separate_cover' },
      content,
      layout: baseLayout
    })

    expect(result.pages[0].isCoverPage).toBe(true)
    expect(result.pages[1].isCoverPage).toBe(false)
    expect(result.totalPages).toBe(2)
  })
})
