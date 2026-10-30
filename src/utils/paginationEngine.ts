import type {
  ExamSettings,
  PaperContent,
  VisualLayout,
  Question,
  PageSize,
  PageOrientation,
  McqOptionLayoutMode
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
  questionSpacingPt: number = 10,
  optionsLayoutMode: McqOptionLayoutMode = 'auto',
  optionSpacingPt: number = 3
): number {
  // In 2-column mode, column width is ~85mm (fits ~42-45 chars at 11pt, including Devanagari/Hindi)
  // In single-column mode, column width is ~170mm-190mm (fits ~90-100 chars at 11pt)
  const charsPerLine = isTwoColumn ? 44 : 92
  const cleanPrompt = (q.prompt || '').trim()
  const promptLines = Math.max(1, Math.ceil(cleanPrompt.length / charsPerLine))
  const lineSpacingFactor = Math.max(1, lineSpacing) / 1.15
  const fontFactor = fontSizePt / 11
  const optSpacingMm = (optionSpacingPt || 3) * 0.3527

  // 1 prompt line in Hindi/English with marks and Q number is ~3.8mm at standard 11pt
  let height = promptLines * 3.8 * lineSpacingFactor * fontFactor

  // Specific instructions
  if (q.instructions) {
    height += 3.5
  }

  // Diagram / Image
  if (q.diagramUrl) {
    height += 40
  }

  // MCQ Options
  if (q.options && q.options.length > 0) {
    const estimation = estimateMcqOptionGrid({
      options: q.options,
      mode: q.customLayoutMode || optionsLayoutMode || 'auto',
      columnLayout: isTwoColumn ? 'two_column' : 'single'
    })

    if (estimation.resolvedGridCols === 4) {
      height += Math.max(4.0, 3.6 * fontFactor * lineSpacingFactor) + optSpacingMm * 0.3
    } else if (estimation.resolvedGridCols === 2) {
      const rows = Math.ceil(q.options.length / 2)
      // Check if any option wraps to 2 lines
      const maxOptLen = Math.max(...q.options.map(o => (o.text || '').trim().length), 0)
      const hasWrap = maxOptLen > (isTwoColumn ? 24 : 48)
      const effectiveRows = rows + (hasWrap ? 0.7 : 0)
      height += effectiveRows * (3.5 * fontFactor * lineSpacingFactor) + (rows - 1) * optSpacingMm + optSpacingMm * 0.3
    } else {
      // Stacked vertically: account for long option wrapping
      let optHeight = 0
      for (const opt of q.options) {
        const optLines = Math.max(1, Math.ceil((opt.text || '').trim().length / (isTwoColumn ? 38 : 78)))
        optHeight += optLines * (3.3 * fontFactor * lineSpacingFactor)
      }
      height += Math.max(q.options.length * 3.3 * fontFactor * lineSpacingFactor, optHeight) + (q.options.length - 1) * optSpacingMm + optSpacingMm * 0.3
    }
  }

  // Subjective Ruled Lines
  if (q.writingSpaceLines && q.writingSpaceLines > 0) {
    height += q.writingSpaceLines * 4.8
  }

  // Spacing between questions (already reflects user's questionSpacingPt slider)
  const qSpacingMm = (questionSpacingPt || 8) * 0.3527
  height += Math.max(1.2, qSpacingMm * 0.4)

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

  const rawFooterText =
    (layout.headerFooter?.footerCustomText !== undefined
      ? layout.headerFooter.footerCustomText
      : layout.footerNote) || ''
  const showRunningFooter =
    layout.headerFooter?.showRunningFooter !== false && rawFooterText.trim().length > 0
  const showExamName = Boolean(layout.headerFooter?.showExamNameInFooter)
  const showPageNumbers =
    layout.headerFooter?.showPageNumbers !== false && layout.showPageNumbers !== false
  const hasFooter = showRunningFooter || showExamName || showPageNumbers
  const footerHeight = hasFooter ? 16 : 0

  const safetyBuffer = 3.5 // Margin buffer to prevent content from touching the footer boundary
  const physicalAvailableHeight = Math.max(100, usablePageHeight - footerHeight)
  const targetUsableHeight = Math.max(90, physicalAvailableHeight - safetyBuffer)

  const pages: GeneratedPage[] = []

  const createNewPage = (isCover = false): GeneratedPage => {
    return {
      pageNumber: pages.length + 1,
      isCoverPage: isCover,
      elements: [],
      usedHeightMm: 0,
      availableHeightMm: isCover ? usablePageHeight : physicalAvailableHeight,
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
  let pendingCol0Height = 0 // Tracks height of pending item in left column (in 2-column grid)

  // 2. First Content Page Header Blocks
  const isFirstContentPage = pages.length === (settings.coverPageMode === 'separate_cover' ? 1 : 0)
  if (isFirstContentPage) {
    // Header
    const showLogo =
      layout.showInstituteLogo !== false &&
      layout.logoPlacement !== 'none' &&
      layout.headerFooter?.logoPlacement !== 'none'
    const logoSizeMm = layout.headerFooter?.logoWidthMm || layout.logoWidthMm || 24
    const instNamePt = layout.headerFooter?.institutionNameSizePt || 22
    const taglinePt = layout.headerFooter?.taglineSizePt || 11
    const addressPt = layout.headerFooter?.addressSizePt || 9.5

    // Base header: exam title & parameters bar (Subject, Class, Time, Marks) is ~12mm
    let textHeaderHeight = 12
    if (layout.headerFooter?.showInstitutionName !== false) {
      textHeaderHeight += (instNamePt * 0.3527 * 1.1)
    }
    if (settings.institute.tagline) {
      textHeaderHeight += (taglinePt * 0.3527 * 1.15 + 1)
    }
    if (layout.headerFooter?.showAddress !== false && settings.institute.address) {
      textHeaderHeight += (addressPt * 0.3527 * 1.15 + 1)
    }
    if (layout.headerFooter?.showContact && settings.institute.contact) {
      textHeaderHeight += (addressPt * 0.3527 * 1.1 + 1)
    }

    let fullHeaderHeight = textHeaderHeight
    if (showLogo && settings.institute.logoUrl) {
      const explicitLogoHeight = layout.headerFooter?.logoHeightMm || layout.logoHeightMm
      let effectiveLogoHeight: number
      if (explicitLogoHeight) {
        effectiveLogoHeight = explicitLogoHeight
      } else if (logoSizeMm <= 40) {
        effectiveLogoHeight = logoSizeMm * 0.5
      } else {
        effectiveLogoHeight = Math.min(32, Math.max(14, Math.round(14 + (logoSizeMm - 40) * 0.22)))
      }

      const isSideLogo =
        layout.headerFooter?.logoPlacement === 'left' ||
        layout.headerFooter?.logoPlacement === 'right' ||
        layout.logoPlacement === 'left' ||
        layout.logoPlacement === 'right'

      if (isSideLogo) {
        fullHeaderHeight = Math.max(textHeaderHeight, effectiveLogoHeight + 12)
      } else {
        fullHeaderHeight = textHeaderHeight + effectiveLogoHeight + 2
      }
    }
    fullHeaderHeight = Math.ceil(Math.max(24, fullHeaderHeight))
    const headerEl: HeaderPageElement = {
      id: generateId('hdr'),
      type: 'header',
      heightMm: fullHeaderHeight,
      settings,
      layout,
      isCompact: false
    }
    currentPage.elements.push(headerEl)
    currentPage.usedHeightMm += fullHeaderHeight

    // Candidate Info Block (if enabled on top of questions)
    const sf = settings.studentFields || { showName: true, showRollNo: true }
    if (settings.coverPageMode !== 'separate_cover' && (sf.showName || sf.showRollNo)) {
      const candEl: CandidateBlockElement = {
        id: generateId('cand'),
        type: 'candidate_block',
        heightMm: 11,
        showName: sf.showName,
        showRollNo: sf.showRollNo,
        showSection: sf.showSection,
        showDate: sf.showDate,
        examDate: settings.date
      }
      currentPage.elements.push(candEl)
      currentPage.usedHeightMm += (11 + 2.0)
    }

    // General Instructions Block (if not separate cover)
    if (settings.coverPageMode !== 'separate_cover' && settings.generalInstructions && settings.generalInstructions.length > 0) {
      const instHeight = Math.min(26, 7 + settings.generalInstructions.length * 3.2)
      const instEl: InstructionsPageElement = {
        id: generateId('inst'),
        type: 'instructions',
        heightMm: instHeight,
        instructions: settings.generalInstructions
      }
      currentPage.elements.push(instEl)
      currentPage.usedHeightMm += (instHeight + 2.0)
    }
  }

  // Helper to commit page and start fresh one
  const pushAndStartNewPage = () => {
    pages.push(currentPage)
    currentPage = createNewPage(false)
    pendingCol0Height = 0

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
      currentPage.usedHeightMm += runningHdrHeight
    }
  }

  // 3. Process Sections and Questions
  const contentSecs = [...(content.sections || [])]
  const settingSecs = settings.sections || []

  // Ensure any section configured in settings is represented
  for (const sConf of settingSecs) {
    if (!contentSecs.some(s => s.sectionId === sConf.id)) {
      contentSecs.push({
        sectionId: sConf.id,
        title: sConf.title,
        instructions: sConf.instructions,
        questions: []
      })
    }
  }

  // Filter out explicitly disabled sections, and prune empty dummy sections if there are other populated sections
  const allSections = contentSecs.filter(sec => {
    const secConfig = settingSecs.find(s => s.id === sec.sectionId)
    if (secConfig && secConfig.enabled === false) return false
    return (sec.questions && sec.questions.length > 0) || contentSecs.length === 1
  })

  const totalExamQuestions = allSections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
  let globalQuestionIndex = 0

  for (let sIdx = 0; sIdx < allSections.length; sIdx++) {
    const sec = allSections[sIdx]
    const secConfig = settingSecs.find(s => s.id === sec.sectionId)
    const questions = sec.questions || []

    const sectionTitle = (secConfig?.title && secConfig.title.trim()) || sec.title
    const sectionInstructions = secConfig?.instructions !== undefined ? secConfig.instructions : sec.instructions

    // Check Section-Break-New-Page option
    const shouldStartOnNewPage =
      (secConfig?.startOnNewPage || layout.sectionBreakNewPage) &&
      currentPage.elements.some(e => e.type === 'question' || e.type === 'section_header')

    if (shouldStartOnNewPage) {
      pushAndStartNewPage()
    }

    // Section Header Element (compact height reflecting true DOM render + bottom margin)
    const hasInstructions = Boolean(sectionInstructions && sectionInstructions.trim())
    const sectionHeaderHeight = hasInstructions ? 12 : 9
    const sectionHeaderEl: SectionHeaderPageElement = {
      id: generateId('sec'),
      type: 'section_header',
      sectionId: sec.sectionId,
      title: sectionTitle,
      instructions: sectionInstructions,
      numberingStyle: secConfig?.numberingStyle || 'continuous',
      heightMm: sectionHeaderHeight
    }

    // Section header spans across full width: reset 2-column pending state
    pendingCol0Height = 0

    // Orphan Section Header Prevention:
    // Ensure section header and at least the first question or 14mm can fit
    const firstQHeight = questions.length > 0
      ? estimateQuestionHeightMm(questions[0], isTwoColumn, layout.fontSizePt, layout.lineSpacing, layout.questionSpacingPt, layout.mcqOptionLayout, layout.optionSpacingPt)
      : 12

    const remainingHeight = targetUsableHeight - currentPage.usedHeightMm
    const minRequired = sectionHeaderHeight + Math.min(14, firstQHeight)
    if (remainingHeight < minRequired && currentPage.elements.some(e => e.type === 'question')) {
      pushAndStartNewPage()
    }

    currentPage.elements.push(sectionHeaderEl)
    currentPage.usedHeightMm += sectionHeaderHeight

    // Questions in this Section
    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx]
      const qHeight = estimateQuestionHeightMm(
        q,
        isTwoColumn,
        layout.fontSizePt,
        layout.lineSpacing,
        layout.questionSpacingPt,
        layout.mcqOptionLayout,
        layout.optionSpacingPt
      )

      const displayNumber = getDisplayQuestionNumber({
        globalIndex: globalQuestionIndex,
        sectionIndex: sIdx,
        questionIndexInSection: qIdx,
        style: secConfig?.numberingStyle || 'continuous',
        customNumber: q.customNumber
      })
      globalQuestionIndex++

      // Elasticity calculation:
      // When near the end of the paper (<=3 questions remaining), allow up to 3.0mm elasticity
      // into the margin safety buffer to avoid stranding 1-2 questions on a nearly blank page.
      // Standard elasticity is 1.5mm to absorb minor DOM line variances.
      const remainingQuestionsInPaper = totalExamQuestions - globalQuestionIndex
      const elasticityMm = remainingQuestionsInPaper <= 3 ? 3.0 : 1.5

      // Two-column row tracking vs Single-column tracking
      if (isTwoColumn) {
        if (pendingCol0Height === 0) {
          // Starting Col 0 (left column): check if full dual-column row fits on current page
          const nextQ = qIdx + 1 < questions.length ? questions[qIdx + 1] : undefined
          const nextQHeight = nextQ
            ? estimateQuestionHeightMm(nextQ, isTwoColumn, layout.fontSizePt, layout.lineSpacing, layout.questionSpacingPt, layout.mcqOptionLayout, layout.optionSpacingPt)
            : 0
          const expectedRowHeight = Math.max(qHeight, nextQHeight)

          const remaining = targetUsableHeight - currentPage.usedHeightMm
          if (expectedRowHeight > (remaining + elasticityMm) && currentPage.elements.some(e => e.type === 'question')) {
            pushAndStartNewPage()
          }
          pendingCol0Height = qHeight
          currentPage.usedHeightMm += qHeight
        } else {
          // Filling Col 1 (right column): shares the row with Col 0
          const extra = Math.max(0, qHeight - pendingCol0Height)
          currentPage.usedHeightMm += extra
          pendingCol0Height = 0 // Row is complete!
        }
      } else {
        // Single column: check if question fits on current page
        const remaining = targetUsableHeight - currentPage.usedHeightMm
        if (qHeight > (remaining + elasticityMm) && currentPage.elements.some(e => e.type === 'question')) {
          pushAndStartNewPage()
        }
        currentPage.usedHeightMm += qHeight
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
