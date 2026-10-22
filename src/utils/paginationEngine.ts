import type {
  ExamSettings,
  PaperContent,
  VisualLayout,
  Question,
  PageSize,
  PageOrientation
} from '../types'
import type {
  GeneratedPage,
  PaginationResult,
  QuestionPageElement,
  SectionHeaderPageElement,
  HeaderPageElement,
  CandidateBlockElement,
  InstructionsPageElement,
  CoverPageElement
} from '../types/pageLayout'
import { getDisplayQuestionNumber } from './numbering'
import { estimateMcqOptionGrid } from './mcqLayout'
import { generateId } from './id'

/**
 * Returns physical page dimensions in millimeters
 */
export function getPhysicalPageDimensions(size: PageSize, orientation: PageOrientation): { width: number; height: number } {
  let width = 210
  let height = 297

  switch (size) {
    case 'Letter':
      width = 215.9
      height = 279.4
      break
    case 'Legal':
      width = 215.9
      height = 355.6
      break
    case 'A4':
    default:
      width = 210
      height = 297
      break
  }

  if (orientation === 'landscape') {
    return { width: height, height: width }
  }

  return { width, height }
}

/**
 * Estimates the height in millimeters for a single question
 */
export function estimateQuestionHeightMm(
  q: Question,
  isTwoColumn: boolean,
  fontSizePt: number = 11,
  lineSpacing: number = 1.25,
  questionSpacingPt: number = 10
): number {
  const charsPerLine = isTwoColumn ? 42 : 82
  const promptLines = Math.max(1, Math.ceil((q.prompt || '').length / charsPerLine))
  const lineSpacingFactor = Math.max(1, lineSpacing) / 1.15
  const fontFactor = fontSizePt / 11

  let height = promptLines * 4.6 * lineSpacingFactor * fontFactor

  // Specific instructions
  if (q.instructions) {
    height += 6
  }

  // Diagram / Image
  if (q.diagramUrl) {
    height += 46
  }

  // MCQ Options
  if (q.options && q.options.length > 0) {
    const estimation = estimateMcqOptionGrid({
      options: q.options,
      mode: q.customLayoutMode || 'auto',
      columnLayout: isTwoColumn ? 'two_column' : 'single'
    })

    if (estimation.resolvedGridCols === 4) {
      height += 7.5
    } else if (estimation.resolvedGridCols === 2) {
      const rows = Math.ceil(q.options.length / 2)
      height += rows * 6.5
    } else {
      height += q.options.length * 6.5
    }
  }

  // Subjective Ruled Lines
  if (q.writingSpaceLines && q.writingSpaceLines > 0) {
    height += q.writingSpaceLines * 5.5
  }

  // Spacing and borders
  height += Math.max(3, questionSpacingPt * 0.35)

  return Math.round(height * 10) / 10
}

/**
 * Core Automatic Paper Pagination Engine
 */
export function paginatePaper({
  settings,
  content,
  layout
}: {
  settings: ExamSettings
  content: PaperContent
  layout: VisualLayout
}): PaginationResult {
  const warnings: string[] = []
  const dimensions = getPhysicalPageDimensions(layout.pageSize, layout.orientation)
  const isTwoColumn = layout.columnLayout === 'two_column'

  const margins = layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }
  const usablePageHeight = dimensions.height - margins.top - margins.bottom
  const footerHeight = 16

  // In two-column layout, content flows through column 1 then column 2
  const columnFactor = isTwoColumn ? 2 : 1
  const availableContentHeightPerPage = (usablePageHeight - footerHeight) * columnFactor

  const pages: GeneratedPage[] = []

  const createNewPage = (isCover = false): GeneratedPage => {
    return {
      pageNumber: pages.length + 1,
      isCoverPage: isCover,
      elements: [],
      usedHeightMm: 0,
      availableHeightMm: isCover ? usablePageHeight : availableContentHeightPerPage,
      hasTwoColumns: isTwoColumn && !isCover,
      columnLayout: isTwoColumn && !isCover ? 'two_column' : 'single'
    }
  }

  // 1. Separate Cover Page Mode
  if (settings.coverPageMode === 'separate_cover') {
    const coverPage = createNewPage(true)
    const coverEl: CoverPageElement = {
      id: generateId('cover'),
      type: 'cover',
      heightMm: usablePageHeight,
      settings,
      layout
    }
    coverPage.elements.push(coverEl)
    coverPage.usedHeightMm = usablePageHeight
    pages.push(coverPage)
  }

  let currentPage = createNewPage(false)

  // 2. First Content Page Header Blocks
  const isFirstContentPage = pages.length === (settings.coverPageMode === 'separate_cover' ? 1 : 0)
  if (isFirstContentPage) {
    // Header
    const fullHeaderHeight = settings.institute.logoUrl && layout.logoPlacement !== 'none' ? 44 : 36
    const headerEl: HeaderPageElement = {
      id: generateId('hdr'),
      type: 'header',
      heightMm: fullHeaderHeight,
      settings,
      layout,
      isCompact: false
    }
    currentPage.elements.push(headerEl)
    // Headers span across full width regardless of 2-column mode
    currentPage.usedHeightMm += fullHeaderHeight * (isTwoColumn ? 2 : 1)

    // Candidate Info Block (if enabled on top of questions)
    const sf = settings.studentFields || { showName: true, showRollNo: true }
    if (settings.coverPageMode !== 'separate_cover' && (sf.showName || sf.showRollNo)) {
      const candEl: CandidateBlockElement = {
        id: generateId('cand'),
        type: 'candidate_block',
        heightMm: 14,
        showName: sf.showName,
        showRollNo: sf.showRollNo,
        showSection: sf.showSection,
        showDate: sf.showDate,
        examDate: settings.date
      }
      currentPage.elements.push(candEl)
      currentPage.usedHeightMm += 14 * (isTwoColumn ? 2 : 1)
    }

    // General Instructions Block (if not separate cover)
    if (settings.coverPageMode !== 'separate_cover' && settings.generalInstructions && settings.generalInstructions.length > 0) {
      const instHeight = Math.min(32, 8 + settings.generalInstructions.length * 3.6)
      const instEl: InstructionsPageElement = {
        id: generateId('inst'),
        type: 'instructions',
        heightMm: instHeight,
        instructions: settings.generalInstructions
      }
      currentPage.elements.push(instEl)
      currentPage.usedHeightMm += instHeight * (isTwoColumn ? 2 : 1)
    }
  }

  // Helper to commit page and start fresh one
  const pushAndStartNewPage = () => {
    pages.push(currentPage)
    currentPage = createNewPage(false)

    // Running Header on subsequent pages
    if (layout.headerFooter?.differentFirstPage) {
      const runningHdrHeight = 12
      const runningHdrEl: HeaderPageElement = {
        id: generateId('rhdr'),
        type: 'header',
        heightMm: runningHdrHeight,
        settings,
        layout,
        isCompact: true
      }
      currentPage.elements.push(runningHdrEl)
      currentPage.usedHeightMm += runningHdrHeight * (isTwoColumn ? 2 : 1)
    }
  }

  // 3. Process Sections and Questions
  const allSections = content.sections || []
  let globalQuestionIndex = 0

  for (let sIdx = 0; sIdx < allSections.length; sIdx++) {
    const sec = allSections[sIdx]
    const secConfig = settings.sections.find(s => s.id === sec.sectionId)
    const questions = sec.questions || []

    // Check Section-Break-New-Page option
    const shouldStartOnNewPage =
      (secConfig?.startOnNewPage || layout.sectionBreakNewPage) &&
      currentPage.elements.some(e => e.type === 'question' || e.type === 'section_header')

    if (shouldStartOnNewPage) {
      pushAndStartNewPage()
    }

    // Section Header Element
    const sectionHeaderHeight = sec.instructions ? 16 : 11
    const sectionHeaderEl: SectionHeaderPageElement = {
      id: generateId('sec'),
      type: 'section_header',
      sectionId: sec.sectionId,
      title: sec.title,
      instructions: sec.instructions,
      numberingStyle: secConfig?.numberingStyle || 'continuous',
      heightMm: sectionHeaderHeight
    }

    // Orphan Section Header Prevention:
    // Ensure section header and at least the first question or 32mm can fit
    const firstQHeight = questions.length > 0
      ? estimateQuestionHeightMm(questions[0], isTwoColumn, layout.fontSizePt, layout.lineSpacing, layout.questionSpacingPt)
      : 20

    const remainingHeight = currentPage.availableHeightMm - currentPage.usedHeightMm
    if (remainingHeight < (sectionHeaderHeight + firstQHeight) && currentPage.elements.some(e => e.type === 'question')) {
      pushAndStartNewPage()
    }

    currentPage.elements.push(sectionHeaderEl)
    currentPage.usedHeightMm += sectionHeaderHeight * (isTwoColumn ? 2 : 1)

    // Questions in this Section
    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx]
      const qHeight = estimateQuestionHeightMm(
        q,
        isTwoColumn,
        layout.fontSizePt,
        layout.lineSpacing,
        layout.questionSpacingPt
      )

      const displayNumber = getDisplayQuestionNumber({
        globalIndex: globalQuestionIndex,
        sectionIndex: sIdx,
        questionIndexInSection: qIdx,
        style: secConfig?.numberingStyle || 'continuous',
        customNumber: q.customNumber
      })
      globalQuestionIndex++

      // Atomic Protection for Questions (especially MCQs with options):
      // If question does not fit on current page, move it to the top of the next page!
      const currentAvailable = currentPage.availableHeightMm - currentPage.usedHeightMm
      if (qHeight > currentAvailable && currentPage.elements.some(e => e.type === 'question')) {
        pushAndStartNewPage()
      }

      const qEl: QuestionPageElement = {
        id: generateId('pel_q'),
        type: 'question',
        question: q,
        displayNumber,
        sectionId: sec.sectionId,
        optionsLayout: q.customLayoutMode || layout.mcqOptionLayout || 'auto',
        showMarks: layout.showMarksPerQuestion ?? true,
        marksAlignment: layout.marksAlignment || 'right',
        resolvedOptions: q.options,
        heightMm: qHeight
      }

      currentPage.elements.push(qEl)
      currentPage.usedHeightMm += qHeight
    }
  }

  // Push final page if it contains elements
  if (currentPage.elements.length > 0) {
    pages.push(currentPage)
  }

  // Target Page Fit Evaluation & Helpful Suggestions
  const targetPages = layout.pageCountStrategy === 'prefer_one_page'
    ? 1
    : layout.pageCountStrategy === 'target_pages'
    ? (layout.targetPageCount || 1)
    : undefined

  let fitsTarget = true
  let targetFitExplanation: string | undefined

  if (targetPages !== undefined) {
    const contentPagesCount = pages.filter(p => !p.isCoverPage).length
    if (contentPagesCount > targetPages) {
      fitsTarget = false
      const overflowPages = contentPagesCount - targetPages
      warnings.push(`Content spans ${contentPagesCount} pages, exceeding target of ${targetPages} page${targetPages === 1 ? '' : 's'}.`)

      const suggestions: string[] = []
      if (!isTwoColumn) {
        suggestions.push('Switch to a Two-Column balanced layout (saves ~30-40% vertical space).')
      }
      if ((layout.fontSizePt || 11) > 10) {
        suggestions.push(`Reduce base font size from ${layout.fontSizePt || 11}pt to 10pt or 10.5pt.`)
      }
      if ((layout.pageMarginsMm?.top || 15) > 10) {
        suggestions.push('Select Compact (10mm) margins to expand usable printable height.')
      }
      if ((layout.lineSpacing || 1.25) > 1.15) {
        suggestions.push('Set line spacing to 1.15.')
      }

      targetFitExplanation = `Examination requires ${contentPagesCount} pages (+${overflowPages} page${overflowPages > 1 ? 's' : ''} over target). Practical adjustments: ${suggestions.join(' ')}`
    }
  }

  return {
    pages,
    totalPages: pages.length,
    targetPages,
    fitsTarget,
    targetFitExplanation,
    warnings,
    pageDimensionsMm: dimensions
  }
}
