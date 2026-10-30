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

  // 10. Custom Section Heading & Instructions updated in Exam Setup
  it('renders customized section headings and instructions from exam settings on paper', () => {
    const customSettings: ExamSettings = {
      ...baseSettings,
      sections: [
        {
          id: 'sec_a',
          name: 'Section A',
          title: 'खंड-A: वस्तुनिष्ठ प्रश्न (20 MCQ)',
          instructions: 'वस्तुनिष्ठ प्रश्न किन्हीं दस प्रश्नों के उत्तर दें --',
          totalQuestions: 20,
          marksPerQuestion: 1,
          targetTypes: ['mcq'],
          enabled: true
        },
        {
          id: 'sec_b',
          name: 'Section B',
          title: 'खंड-B: लघु उत्तरीय प्रश्न (10)',
          instructions: 'लघु उत्तरीय प्रश्न किन्हीं दस प्रश्नों के उत्तर दें-',
          totalQuestions: 10,
          marksPerQuestion: 2,
          targetTypes: ['short_answer'],
          enabled: true
        }
      ]
    }

    // Suppose content.sections still had the default English placeholder title
    const content: PaperContent = {
      id: 'cnt_custom',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A: Multiple Choice Questions (1 Mark Each)',
          instructions: 'Choose the correct option for each question.',
          questions: [
            { id: 'q1', sectionId: 'sec_a', orderNumber: 1, type: 'mcq', prompt: 'प्रश्न 1', marks: 1, difficulty: 'easy', tags: [] }
          ]
        },
        {
          sectionId: 'sec_b',
          title: 'Section B: Short Answer Type I (2 Marks Each)',
          instructions: 'Answer briefly.',
          questions: [
            { id: 'q2', sectionId: 'sec_b', orderNumber: 2, type: 'short_answer', prompt: 'प्रश्न 2', marks: 2, difficulty: 'medium', tags: [] }
          ]
        }
      ],
      totalCalculatedMarks: 3,
      totalCalculatedQuestions: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = paginatePaper({
      settings: customSettings,
      content,
      layout: baseLayout
    })

    const sectionElements = result.pages.flatMap(p => p.elements.filter(e => e.type === 'section_header')) as any[]
    expect(sectionElements.length).toBe(2)

    // Verify Section A header on paper has the user's updated Hindi heading and instructions
    expect(sectionElements[0].title).toBe('खंड-A: वस्तुनिष्ठ प्रश्न (20 MCQ)')
    expect(sectionElements[0].instructions).toBe('वस्तुनिष्ठ प्रश्न किन्हीं दस प्रश्नों के उत्तर दें --')

    // Verify Section B header on paper has the user's updated Hindi heading and instructions
    expect(sectionElements[1].title).toBe('खंड-B: लघु उत्तरीय प्रश्न (10)')
    expect(sectionElements[1].instructions).toBe('लघु उत्तरीय प्रश्न किन्हीं दस प्रश्नों के उत्तर दें-')
  })

  // 11. No Logo Placement
  it('correctly adapts header height and omits logo when No Logo is chosen', () => {
    const content: PaperContent = {
      id: 'cnt_logo_test',
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

    const noLogoLayout: VisualLayout = {
      ...baseLayout,
      showInstituteLogo: false,
      logoPlacement: 'none',
      headerFooter: {
        ...baseLayout.headerFooter,
        logoPlacement: 'none'
      }
    }

    const result = paginatePaper({
      settings: {
        ...baseSettings,
        institute: {
          ...baseSettings.institute,
          logoUrl: 'https://example.com/logo.png'
        }
      },
      content,
      layout: noLogoLayout
    })

    const headerEl = result.pages[0].elements.find(e => e.type === 'header')
    expect(headerEl).toBeDefined()
    // When logo is disabled, fullHeaderHeight dynamically excludes logo height (31mm vs 55mm)
    expect(headerEl?.heightMm).toBe(31)
  })

  // 12. Running Footer Disabled
  it('correctly computes layout when running footer is disabled or cleared', () => {
    const content: PaperContent = {
      id: 'cnt_footer_test',
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

    const noFooterLayout: VisualLayout = {
      ...baseLayout,
      footerNote: '',
      showPageNumbers: false,
      headerFooter: {
        ...baseLayout.headerFooter,
        showRunningFooter: false,
        footerCustomText: '',
        showPageNumbers: false,
        showExamNameInFooter: false
      }
    }

    const result = paginatePaper({
      settings: baseSettings,
      content,
      layout: noFooterLayout
    })

    // Net usable height increases because footerHeight is 0 when all footer elements are disabled
    expect(result.pages[0].availableHeightMm).toBeGreaterThan(baseLayout.pageSize === 'A4' ? 245 : 200)
  })

  // 13. Header Typography, Sizing & Alignment
  it('correctly adapts header dimensions when custom font sizes and alignments are applied', () => {
    const content: PaperContent = {
      id: 'cnt_typo_test',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A',
          questions: [
            {
              id: 'q1',
              sectionId: 'sec_a',
              orderNumber: 1,
              difficulty: 'easy',
              tags: [],
              type: 'mcq',
              prompt: 'Sample question prompt?',
              marks: 1
            }
          ]
        }
      ],
      totalCalculatedMarks: 1,
      totalCalculatedQuestions: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const customHeaderLayout: VisualLayout = {
      ...baseLayout,
      logoWidthMm: 35,
      headerFooter: {
        ...baseLayout.headerFooter,
        logoWidthMm: 35,
        institutionNameSizePt: 28,
        institutionNameAlign: 'center',
        taglineSizePt: 14,
        taglineAlign: 'right',
        addressSizePt: 12,
        addressAlign: 'center'
      }
    }

    const result = paginatePaper({
      settings: baseSettings,
      content,
      layout: customHeaderLayout
    })

    const headerEl = result.pages[0].elements.find(e => e.type === 'header')
    expect(headerEl).toBeDefined()
    expect(headerEl?.layout?.headerFooter?.taglineAlign).toBe('right')
    expect(headerEl?.layout?.headerFooter?.institutionNameAlign).toBe('center')
    expect(headerEl?.layout?.headerFooter?.institutionNameSizePt).toBe(28)
    expect(headerEl?.layout?.headerFooter?.logoWidthMm).toBe(35)
    // Dynamic typography scaling calculates accurate header bounds
    expect(headerEl!.heightMm).toBeGreaterThanOrEqual(35)
  })

  // 14. Full-Width Header Banner Mode
  it('correctly accommodates full-width header banner (e.g. 180mm) without inflating square height', () => {
    const content: PaperContent = {
      id: 'cnt_banner_test',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'Section A',
          questions: [
            { id: 'q1', sectionId: 'sec_a', orderNumber: 1, type: 'mcq', prompt: 'Banner question 1', marks: 1, difficulty: 'easy', tags: [] }
          ]
        }
      ],
      totalCalculatedMarks: 1,
      totalCalculatedQuestions: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const bannerLayout: VisualLayout = {
      ...baseLayout,
      showInstituteLogo: true,
      logoWidthMm: 180,
      headerFooter: {
        ...baseLayout.headerFooter,
        logoPlacement: 'center',
        logoWidthMm: 180,
        showInstitutionName: false
      }
    }

    const result = paginatePaper({
      settings: {
        ...baseSettings,
        institute: {
          ...baseSettings.institute,
          logoUrl: 'https://example.com/wide-banner.png'
        }
      },
      content,
      layout: bannerLayout
    })

    const headerEl = result.pages[0].elements.find(e => e.type === 'header')
    expect(headerEl).toBeDefined()
    expect(headerEl?.layout?.headerFooter?.logoWidthMm).toBe(180)
    // The banner's allocated height is proportional (~50-80mm) and does NOT balloon to 180mm square
    expect(headerEl!.heightMm).toBeLessThan(100)
    expect(headerEl!.heightMm).toBeGreaterThan(45)
  })

  // 15. A4 Physical Sheet Height Containment & No Overflow
  it('guarantees all pages strictly stay within physical A4 height (297mm) without spillover', () => {
    // 20 realistic Hindi/English MCQs in two-column mode with 4 options each
    const questions: Question[] = Array.from({ length: 20 }, (_, i) => ({
      id: `q_${i + 1}`,
      sectionId: 'sec_a',
      orderNumber: i + 1,
      type: 'mcq',
      prompt: `प्रश्न ${i + 1}. निम्नलिखित में से कौन-सा कथन इस विषय के संदर्भ में पूर्णतः सत्य है?`,
      marks: 1,
      difficulty: 'medium',
      tags: [],
      options: [
        { id: '1', label: 'A', text: 'पहला विकल्प विवरण' },
        { id: '2', label: 'B', text: 'दूसरा विकल्प विवरण' },
        { id: '3', label: 'C', text: 'तीसरा विकल्प विवरण' },
        { id: '4', label: 'D', text: 'चौथा विकल्प विवरण' }
      ]
    }))

    const testContent: PaperContent = {
      id: 'cnt_a4_strict',
      paperId: 'paper_1',
      sections: [
        {
          sectionId: 'sec_a',
          title: 'खण्ड-अ: वस्तुनिष्ठ प्रश्न (MCQ)',
          instructions: 'सभी प्रश्नों के उत्तर अनिवार्य हैं। प्रत्येक प्रश्न 1 अंक का है।',
          questions
        }
      ],
      totalCalculatedMarks: 20,
      totalCalculatedQuestions: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const realisticA4Layout: VisualLayout = {
      ...baseLayout,
      pageSize: 'A4',
      orientation: 'portrait',
      columnLayout: 'two_column',
      pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
      logoWidthMm: 60,
      headerFooter: {
        ...baseLayout.headerFooter,
        logoPlacement: 'center',
        logoWidthMm: 60,
        institutionNameSizePt: 30,
        taglineSizePt: 11,
        addressSizePt: 14
      }
    }

    const result = paginatePaper({
      settings: {
        ...baseSettings,
        institute: {
          ...baseSettings.institute,
          logoUrl: 'https://example.com/logo.png',
          tagline: 'एक अद्भुत शिक्षण शैली',
          address: 'Bikrampur, Samastipur'
        },
        generalInstructions: [
          'All questions are compulsory.',
          'Section A comprises 20 MCQs carrying 1 mark each.',
          'Write all answers clearly.'
        ]
      },
      content: testContent,
      layout: realisticA4Layout
    })

    // Verify all pages strictly adhere to physical A4 constraint
    result.pages.forEach(p => {
      // Content height used must fit comfortably inside available height
      expect(p.usedHeightMm).toBeLessThanOrEqual(p.availableHeightMm)
      // Total physical height (content + top margin + bottom margin + footer) <= 297mm
      const marginsTotal = realisticA4Layout.pageMarginsMm.top + realisticA4Layout.pageMarginsMm.bottom
      const totalPhysicalHeight = p.usedHeightMm + marginsTotal + 16 // 16mm footer
      expect(totalPhysicalHeight).toBeLessThanOrEqual(297)
    })
  })

  // 16. Reproduction of user's 3-section exam paper pagination
  it('correctly paginates user paper without leaving huge blank areas', () => {
    const secAQuestions: Question[] = [
      { id: 'a1', sectionId: 'sec_a', orderNumber: 1, type: 'mcq', prompt: "'तिरिछ' कहानी के लेखक कौन हैं?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'उदय प्रकाश' }, { id: '2', label: 'B', text: 'प्रेमचंद' }, { id: '3', label: 'C', text: 'फणीश्वरनाथ रेणु' }, { id: '4', label: 'D', text: 'मोहन राकेश' }] },
      { id: 'a2', sectionId: 'sec_a', orderNumber: 2, type: 'mcq', prompt: "'शिक्षा' पाठ के लेखक कौन हैं?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'महात्मा गांधी' }, { id: '2', label: 'B', text: 'जे. कृष्णमूर्ति' }, { id: '3', label: 'C', text: 'रामधारी सिंह दिनकर' }, { id: '4', label: 'D', text: 'बनारसी प्रसाद द्विवेदी' }] },
      { id: 'a3', sectionId: 'sec_a', orderNumber: 3, type: 'mcq', prompt: "'कड़बक' के रचनाकार कौन हैं?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'सूरदास' }, { id: '2', label: 'B', text: 'तुलसीदास' }, { id: '3', label: 'C', text: 'मलिक मुहम्मद जायसी' }, { id: '4', label: 'D', text: 'कबीरदास' }] },
      { id: 'a4', sectionId: 'sec_a', orderNumber: 4, type: 'mcq', prompt: "'सूरदास के पद' में मुख्य रूप से किसका वर्णन मिलता है?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'वीर रस का' }, { id: '2', label: 'B', text: 'कृष्ण की बाल-लीलाओं एवं वात्सल्य का' }, { id: '3', label: 'C', text: 'प्रकृति के विनाश का' }, { id: '4', label: 'D', text: 'युद्ध का' }] },
      { id: 'a5', sectionId: 'sec_a', orderNumber: 5, type: 'mcq', prompt: "'तिरिछ' किस विधा की रचना है?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'कहानी' }, { id: '2', label: 'B', text: 'नाटक' }, { id: '3', label: 'C', text: 'निबंध' }, { id: '4', label: 'D', text: 'आत्मकथा' }] },
      { id: 'a6', sectionId: 'sec_a', orderNumber: 6, type: 'mcq', prompt: 'जे. कृष्णमूर्ति के अनुसार शिक्षा का उद्देश्य क्या होना चाहिए?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'केवल धन कमाना' }, { id: '2', label: 'B', text: 'केवल परीक्षा में अंक प्राप्त करना' }, { id: '3', label: 'C', text: 'व्यक्ति का समग्र विकास' }, { id: '4', label: 'D', text: 'केवल नौकरी प्राप्त करना' }] },
      { id: 'a7', sectionId: 'sec_a', orderNumber: 7, type: 'mcq', prompt: "'कड़बक' किस काव्य-परंपरा से संबंधित रचना है?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'प्रेमाख्यानक काव्य परंपरा' }, { id: '2', label: 'B', text: 'ज्ञानाश्रयी शाखा' }, { id: '3', label: 'C', text: 'कृष्णभक्ति शाखा' }, { id: '4', label: 'D', text: 'रामभक्ति शाखा' }] },
      { id: 'a8', sectionId: 'sec_a', orderNumber: 8, type: 'mcq', prompt: 'सूरदास किस भक्ति धारा के प्रमुख कवि हैं?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'सगुण भक्ति धारा' }, { id: '2', label: 'B', text: 'निर्गुण भक्ति धारा' }, { id: '3', label: 'C', text: 'सूफी काव्य धारा' }, { id: '4', label: 'D', text: 'रीति काव्य धारा' }] },
      { id: 'a9', sectionId: 'sec_a', orderNumber: 9, type: 'mcq', prompt: 'उदय प्रकाश किस काल के साहित्यकार हैं?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'आधुनिक काल' }, { id: '2', label: 'B', text: 'भक्तिकाल' }, { id: '3', label: 'C', text: 'रीतिकाल' }, { id: '4', label: 'D', text: 'आदिकाल' }] },
      { id: 'a10', sectionId: 'sec_a', orderNumber: 10, type: 'mcq', prompt: "'शिक्षा' निबंध में किस प्रकार की शिक्षा पर बल दिया गया है?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'व्यावसायिक' }, { id: '2', label: 'B', text: 'क्रांतिकारी व जीवनोपयोगी' }, { id: '3', label: 'C', text: 'धार्मिक' }, { id: '4', label: 'D', text: 'पारंपरिक' }] },
      { id: 'a11', sectionId: 'sec_a', orderNumber: 11, type: 'mcq', prompt: 'जायसी किस भाषा में प्रमुख रूप से काव्य रचना के लिए प्रसिद्ध हैं?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'अवधी' }, { id: '2', label: 'B', text: 'ब्रजभाषा' }, { id: '3', label: 'C', text: 'भोजपुरी' }, { id: '4', label: 'D', text: 'मैथिली' }] },
      { id: 'a12', sectionId: 'sec_a', orderNumber: 12, type: 'mcq', prompt: 'सूरदास की काव्य-भाषा मुख्यतः कौन-सी है?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'अवधी' }, { id: '2', label: 'B', text: 'ब्रजभाषा' }, { id: '3', label: 'C', text: 'खड़ी बोली' }, { id: '4', label: 'D', text: 'संस्कृत' }] },
      { id: 'a13', sectionId: 'sec_a', orderNumber: 13, type: 'mcq', prompt: "'तिरिछ' कहानी के लेखक उदय प्रकाश किस साहित्यिक विधा के लिए भी प्रसिद्ध हैं?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'कहानी' }, { id: '2', label: 'B', text: 'कविता' }, { id: '3', label: 'C', text: 'संस्मरण नाटक' }, { id: '4', label: 'D', text: 'दोनों विधा' }] },
      { id: 'a14', sectionId: 'sec_a', orderNumber: 14, type: 'mcq', prompt: 'कृष्ण की बाल-लीलाओं के वर्णन में कौन-सा रस प्रमुख रूप से मिलता है?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'वात्सल्य रस' }, { id: '2', label: 'B', text: 'शांत रस' }, { id: '3', label: 'C', text: 'श्रृंगार रस' }, { id: '4', label: 'D', text: 'वीभत्स रस' }] },
      { id: 'a15', sectionId: 'sec_a', orderNumber: 15, type: 'mcq', prompt: 'शिक्षा को केवल परीक्षा और प्रमाणपत्र तक सीमित करने से क्या समस्या होती है?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'व्यक्ति का सर्वांगीण विकास बाधित होता है' }, { id: '2', label: 'B', text: 'व्यक्ति का ज्ञान अपने आप बढ़ता है' }, { id: '3', label: 'C', text: 'रचनात्मक क्षमता बढ़ती है' }, { id: '4', label: 'D', text: 'ज्ञानवान समाज बनता है' }] },
      { id: 'a16', sectionId: 'sec_a', orderNumber: 16, type: 'mcq', prompt: "'कड़बक' के कवि मलिक मुहम्मद जायसी किस काल के प्रमुख कवि माने जाते हैं?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'आदिकाल' }, { id: '2', label: 'B', text: 'भक्तिकाल' }, { id: '3', label: 'C', text: 'रीतिकाल' }, { id: '4', label: 'D', text: 'आधुनिक काल' }] },
      { id: 'a17', sectionId: 'sec_a', orderNumber: 17, type: 'mcq', prompt: 'सूरदास के काव्य का प्रमुख आश्रय कौन है?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'श्रीकृष्ण' }, { id: '2', label: 'B', text: 'श्रीराम' }, { id: '3', label: 'C', text: 'शिव' }, { id: '4', label: 'D', text: 'विष्णु' }] },
      { id: 'a18', sectionId: 'sec_a', orderNumber: 18, type: 'mcq', prompt: "'शिक्षा' पाठ में स्वतंत्र चिंतन का क्या महत्व है?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'सत्य की खोज में सहायक' }, { id: '2', label: 'B', text: 'भ्रम पैदा करना' }, { id: '3', label: 'C', text: 'अहंकार बढ़ाना' }, { id: '4', label: 'D', text: 'समय बर्बाद करना' }] },
      { id: 'a19', sectionId: 'sec_a', orderNumber: 19, type: 'mcq', prompt: 'साहित्य में सामाजिक यथार्थ का क्या अर्थ है?', marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'काल्पनिक संसार का ही वर्णन' }, { id: '2', label: 'B', text: 'समाज की वास्तविक परिस्थितियों का चित्रण' }, { id: '3', label: 'C', text: 'केवल देवताओं का वर्णन' }, { id: '4', label: 'D', text: 'केवल प्रकृति का चित्रण' }] },
      { id: 'a20', sectionId: 'sec_a', orderNumber: 20, type: 'mcq', prompt: "'सूरदास के पद' में भक्ति-भाव के साथ किसका सुंदर मिश्रण मिलता है?", marks: 1, difficulty: 'easy', tags: [], options: [{ id: '1', label: 'A', text: 'कृष्ण के प्रति प्रेम और वात्सल्य' }, { id: '2', label: 'B', text: 'युद्ध की रणनीति' }, { id: '3', label: 'C', text: 'दैनिक अधिकार' }, { id: '4', label: 'D', text: 'राजनीतिक भाषण' }] }
    ]

    const secBQuestions: Question[] = [
      { id: 'b1', sectionId: 'sec_b', orderNumber: 21, type: 'short_answer', prompt: "'तिरिछ' कहानी के शीर्षक की सार्थकता स्पष्ट कीजिए।", marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b2', sectionId: 'sec_b', orderNumber: 22, type: 'short_answer', prompt: "'तिरिछ' कहानी के माध्यम से लेखक ने समाज की किन वास्तविकताओं को उजागर किया है?", marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b3', sectionId: 'sec_b', orderNumber: 23, type: 'short_answer', prompt: "'तिरिछ' कहानी में भय और असुरक्षा की भावना किस प्रकार व्यक्त हुई है?", marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b4', sectionId: 'sec_b', orderNumber: 24, type: 'short_answer', prompt: 'जे. कृष्णमूर्ति के अनुसार शिक्षा का वास्तविक उद्देश्य क्या है?', marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b5', sectionId: 'sec_b', orderNumber: 25, type: 'short_answer', prompt: 'शिक्षा में स्वतंत्र चिंतन और आलस्य का क्या महत्व है?', marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b6', sectionId: 'sec_b', orderNumber: 26, type: 'short_answer', prompt: 'मलिक मुहम्मद जायसी के काव्य की दो प्रमुख विशेषताएं लिखिए।', marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b7', sectionId: 'sec_b', orderNumber: 27, type: 'short_answer', prompt: "'कड़बक' के आधार पर जायसी की काव्य-दृष्टि पर प्रकाश डालिए।", marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b8', sectionId: 'sec_b', orderNumber: 28, type: 'short_answer', prompt: 'सूरदास के पदों में वात्सल्य भाव का चित्रण किस प्रकार हुआ है?', marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b9', sectionId: 'sec_b', orderNumber: 29, type: 'short_answer', prompt: 'सूरदास की काव्य-भाषा की प्रमुख विशेषताएं लिखिए।', marks: 2, difficulty: 'medium', tags: [] },
      { id: 'b10', sectionId: 'sec_b', orderNumber: 30, type: 'short_answer', prompt: "'तिरिछ' और 'शिक्षा' पाठों में व्यक्त जीवन-संबंधी संदेशों की तुलना कीजिए।", marks: 2, difficulty: 'medium', tags: [] }
    ]

    const secCQuestions: Question[] = [
      { id: 'c1', sectionId: 'sec_c', orderNumber: 31, type: 'long_answer', prompt: "'तिरिछ' कहानी की कथावस्तु का वर्णन करते हुए उसके उद्देश्य और सामाजिक संदेश को स्पष्ट कीजिए।", marks: 5, difficulty: 'hard', tags: [] },
      { id: 'c2', sectionId: 'sec_c', orderNumber: 32, type: 'long_answer', prompt: "जे. कृष्णमूर्ति के 'शिक्षा' पाठ के आधार पर बताइए कि वास्तविक शिक्षा मनुष्य के व्यक्तित्व और विचारों को किस प्रकार विकसित करती है?", marks: 5, difficulty: 'hard', tags: [] },
      { id: 'c3', sectionId: 'sec_c', orderNumber: 33, type: 'long_answer', prompt: "मलिक मुहम्मद जायसी की काव्यगत विशेषताओं का वर्णन 'कड़बक' के आधार पर कीजिए।", marks: 5, difficulty: 'hard', tags: [] },
      { id: 'c4', sectionId: 'sec_c', orderNumber: 34, type: 'long_answer', prompt: 'सूरदास के पदों में कृष्ण की बाल-लीलाओं, वात्सल्य भाव और भक्ति भावना का वर्णन कीजिए।', marks: 5, difficulty: 'hard', tags: [] }
    ]

    const userExamSettings: ExamSettings = {
      ...baseSettings,
      examName: 'Unit Test',
      academicSession: '2026-27',
      className: 'Class 12',
      subject: 'Hindi',
      date: '28-10-2026',
      durationMinutes: 60,
      totalMarks: 30,
      institute: {
        name: 'OMEGA EDUCATION CENTER',
        tagline: 'एक अद्भुत शिक्षण शैली',
        address: 'Bikrampur, Vyaspur, Samastipur, Bihar(848505)',
        contact: 'Phone: +91 62991 76109 | omegaedu.helpdesk@gmail.com',
        logoUrl: '/omega-logo.png'
      },
      sections: [
        { id: 'sec_a', name: 'Section A', title: 'खंड-A : वस्तुनिष्ठ प्रश्न (20 MCQ)', instructions: 'प्रत्येक प्रश्न 1 अंक का है', totalQuestions: 20, marksPerQuestion: 1, targetTypes: ['mcq'], enabled: true },
        { id: 'sec_b', name: 'Section B', title: 'खंड-B: लघु उत्तरीय प्रश्न (10)', instructions: 'किन्हीं 5 प्रश्नों के उत्तर दें', totalQuestions: 10, marksPerQuestion: 2, targetTypes: ['short_answer'], enabled: true },
        { id: 'sec_c', name: 'Section C', title: 'खंड-C: दीर्घ उत्तरीय प्रश्न (5)', instructions: 'किन्हीं दो प्रश्नों के उत्तर दें', totalQuestions: 4, marksPerQuestion: 5, targetTypes: ['long_answer'], enabled: true }
      ],
      studentFields: { showName: true, showRollNo: true, showSection: false, showDate: false, showSignature: false, showInvigilatorSign: false },
      generalInstructions: [
        '1. All questions are compulsory.',
        '2. Section A comprises 10 MCQs carrying 1 mark each.',
        '3. Section B comprises 5 Short Answer questions carrying 4 marks each.',
        '4. Section C comprises 2 Long Answer questions carrying 10 marks each.'
      ]
    }

    const userVisualLayout: VisualLayout = {
      ...baseLayout,
      pageSize: 'A4',
      orientation: 'portrait',
      columnLayout: 'two_column',
      fontSizePt: 10,
      lineSpacing: 1.25,
      questionSpacingPt: 6,
      optionSpacingPt: 3,
      pageMarginsMm: { top: 10, bottom: 10, left: 10, right: 10 },
      logoWidthMm: 60,
      headerFooter: {
        ...baseLayout.headerFooter,
        logoPlacement: 'center',
        logoWidthMm: 60,
        institutionNameSizePt: 33,
        taglineSizePt: 9,
        addressSizePt: 16.5,
        showRunningFooter: true,
        footerCustomText: 'Omega Education Center — All Rights Reserved — Best of Luck!',
        showPageNumbers: true
      }
    }

    const userPaperContent: PaperContent = {
      id: 'cnt_user_exact',
      paperId: 'c858516e-2b49-4ae3-9430-9c45c14299ad',
      sections: [
        { sectionId: 'sec_a', title: 'खंड-A : वस्तुनिष्ठ प्रश्न (20 MCQ)', instructions: 'प्रत्येक प्रश्न 1 अंक का है', questions: secAQuestions },
        { sectionId: 'sec_b', title: 'खंड-B: लघु उत्तरीय प्रश्न (10)', instructions: 'किन्हीं 5 प्रश्नों के उत्तर दें', questions: secBQuestions },
        { sectionId: 'sec_c', title: 'खंड-C: दीर्घ उत्तरीय प्रश्न (5)', instructions: 'किन्हीं दो प्रश्नों के उत्तर दें', questions: secCQuestions }
      ],
      totalCalculatedMarks: 30,
      totalCalculatedQuestions: 34,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = paginatePaper({
      settings: userExamSettings,
      content: userPaperContent,
      layout: userVisualLayout
    })

    // Verify that with compact settings (e.g. 10mm margins, 10pt/11pt font, 6pt question spacing),
    // all 34 questions fit neatly across 2 pages without leaving a half-blank page or stranding 2-3 questions onto Page 3
    const compactResult = paginatePaper({
      settings: userExamSettings,
      content: userPaperContent,
      layout: {
        ...userVisualLayout,
        columnLayout: 'single',
        fontSizePt: 10,
        questionSpacingPt: 6,
        optionSpacingPt: 3,
        pageMarginsMm: { top: 10, bottom: 10, left: 10, right: 10 }
      }
    })

    expect(compactResult.pages.length).toBe(2)
    compactResult.pages.forEach(p => {
      expect(p.usedHeightMm).toBeLessThanOrEqual(p.availableHeightMm)
      const qCount = p.elements.filter(e => e.type === 'question').length
      expect(qCount).toBeGreaterThanOrEqual(10)
    })

    expect(result.pages.length).toBeLessThanOrEqual(2)
    result.pages.forEach(p => {
      // Content height used must strictly fit inside available height
      expect(p.usedHeightMm).toBeLessThanOrEqual(p.availableHeightMm)
      // Every page must have questions
      const qCount = p.elements.filter(e => e.type === 'question').length
      expect(qCount).toBeGreaterThan(0)
    })
    // Page 1 holds substantial questions (at least 8) instead of leaving blank area
    const p1Questions = result.pages[0].elements.filter(e => e.type === 'question')
    expect(p1Questions.length).toBeGreaterThanOrEqual(8)
  })
})
