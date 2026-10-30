import type { ExamSettings, VisualLayout, ExamSectionConfig } from '../types'

export interface PageEstimateResult {
  estimatedPages: number
  targetPages?: number
  fitsTarget: boolean
  warningMessage?: string
  suggestions: string[]
  totalHeightMm: number
  usableHeightPerPageMm: number
}

export function estimatePageFit(
  settings: ExamSettings,
  layout: VisualLayout
): PageEstimateResult {
  // Page dimensions in mm
  const isLandscape = layout.orientation === 'landscape'
  const rawPageHeight = isLandscape ? 210 : 297
  const topMargin = layout.pageMarginsMm?.top ?? 15
  const bottomMargin = layout.pageMarginsMm?.bottom ?? 15
  const usableHeightPerPageMm = Math.max(100, rawPageHeight - (topMargin + bottomMargin))

  let totalHeightMm = 0
  let coverPageCount = 0

  if (settings.coverPageMode === 'separate_cover') {
    coverPageCount = 1
  } else {
    // Header block
    totalHeightMm += 35 // Institute title, exam name, meta
    if (settings.studentFields?.showName || settings.studentFields?.showRollNo) {
      totalHeightMm += 12 // Student name & roll no box
    }
    // Instructions block
    if (settings.generalInstructions && settings.generalInstructions.length > 0) {
      totalHeightMm += Math.min(45, 8 + settings.generalInstructions.length * 4)
    }
  }

  // Multiplier for font size and line spacing
  const fontRatio = (layout.fontSizePt || 11) / 11
  const lineSpacing = layout.lineSpacing || 1.25
  const qSpacingMm = (layout.questionSpacingPt || 10) * 0.3527 // pt to mm
  const optSpacingMm = (layout.optionSpacingPt || 6) * 0.3527

  // Iterate over enabled sections
  const enabledSections = (settings.sections || []).filter(s => s.enabled ?? true)

  for (const sec of enabledSections) {
    // Section Header height
    totalHeightMm += (sec.instructions && sec.instructions.trim()) ? 16 : 10

    const qCount = sec.totalQuestions || 0
    const primaryType = sec.targetTypes?.[0] || 'mcq'

    let heightPerQ = 14 * fontRatio * lineSpacing + qSpacingMm

    if (primaryType === 'mcq') {
      // Prompt
      heightPerQ = 10 * fontRatio * lineSpacing + qSpacingMm
      // Option rows
      let optionRows = 2
      if (layout.mcqOptionLayout === 'four_per_row') optionRows = 1
      else if (layout.mcqOptionLayout === 'two_per_row') optionRows = 2
      else if (layout.mcqOptionLayout === 'one_per_row') optionRows = 4
      else {
        // Auto: 2 rows standard
        optionRows = layout.columnLayout === 'two_column' ? 4 : 2
      }
      heightPerQ += optionRows * (5 * fontRatio + optSpacingMm)
    } else if (primaryType === 'short_answer' || primaryType === 'very_short_answer') {
      heightPerQ = 18 * fontRatio * lineSpacing + qSpacingMm
    } else if (primaryType === 'long_answer') {
      heightPerQ = 36 * fontRatio * lineSpacing + qSpacingMm
    } else {
      heightPerQ = 15 * fontRatio * lineSpacing + qSpacingMm
    }

    // Apply column layout divisor
    let secTotalHeight = qCount * heightPerQ
    if (layout.columnLayout === 'two_column') {
      secTotalHeight = secTotalHeight * 0.58 // ~42% space saving in 2 columns
    }

    totalHeightMm += secTotalHeight
  }

  // Footer allowance
  totalHeightMm += 10

  const contentPages = Math.max(1, Math.ceil(totalHeightMm / usableHeightPerPageMm))
  const estimatedPages = contentPages + coverPageCount

  const target =
    layout.pageCountStrategy === 'target_pages'
      ? layout.targetPageCount || 2
      : layout.pageCountStrategy === 'prefer_one_page'
      ? 1
      : undefined

  const fitsTarget = target ? estimatedPages <= target : true
  const suggestions: string[] = []

  let warningMessage: string | undefined

  if (target && estimatedPages > target) {
    warningMessage = `Content requires approximately ${estimatedPages} page${
      estimatedPages > 1 ? 's' : ''
    } with current settings, exceeding your target of ${target} page${target > 1 ? 's' : ''}.`

    if (layout.columnLayout === 'single') {
      suggestions.push('Switch to "Two-Column" layout to reduce printed height by up to 40%.')
    }
    if ((layout.fontSizePt || 11) > 10.5) {
      suggestions.push(`Reduce font size from ${layout.fontSizePt}pt to 10.5pt (clean & highly legible for print).`)
    }
    if ((layout.lineSpacing || 1.25) > 1.15) {
      suggestions.push('Reduce line spacing from 1.25x to 1.15x.')
    }
    if ((layout.pageMarginsMm?.top || 15) > 10) {
      suggestions.push('Change page margins to Compact (10mm).')
    }
    if ((layout.questionSpacingPt || 10) > 8) {
      suggestions.push('Reduce question spacing to 8pt.')
    }
    if (layout.mcqOptionLayout === 'one_per_row' || layout.mcqOptionLayout === 'two_per_row') {
      suggestions.push('Set MCQ options layout to "Four options per row" or "Automatic".')
    }
    if (settings.coverPageMode === 'separate_cover') {
      suggestions.push('Change instruction layout from "Separate Cover Page" to "Top of First Question Page".')
    }
  }

  return {
    estimatedPages,
    targetPages: target,
    fitsTarget,
    warningMessage,
    suggestions,
    totalHeightMm,
    usableHeightPerPageMm
  }
}

// Calculates expected marks from enabled sections and compares with configured total marks
export function calculateMarksFromSections(sections: ExamSectionConfig[]): {
  totalConfiguredMarks: number
  totalConfiguredQuestions: number
  marksPerSection: Record<string, number>
} {
  let totalConfiguredMarks = 0
  let totalConfiguredQuestions = 0
  const marksPerSection: Record<string, number> = {}

  for (const sec of sections) {
    if (sec.enabled ?? true) {
      const qCount = Number(sec.totalQuestions) || 0
      const marksEach = Number(sec.marksPerQuestion) || 0
      const secTotal = qCount * marksEach

      marksPerSection[sec.id] = secTotal
      totalConfiguredMarks += secTotal
      totalConfiguredQuestions += qCount
    }
  }

  return {
    totalConfiguredMarks,
    totalConfiguredQuestions,
    marksPerSection
  }
}
