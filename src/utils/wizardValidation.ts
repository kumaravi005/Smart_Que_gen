import type { ExamSettings, VisualLayout } from '../types'
import { calculateMarksFromSections } from './layoutEstimator'

export interface StepValidationResult {
  isValid: boolean
  errors: Record<string, string>
  warnings: string[]
}

export function validateStep1(settings: ExamSettings): StepValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  if (!settings.institute.name?.trim()) {
    errors.instituteName = 'Institution name is required'
  }
  if (!settings.examName?.trim()) {
    errors.examName = 'Examination name is required'
  }
  if (!settings.subject?.trim()) {
    errors.subject = 'Subject is required'
  }
  if (!settings.className?.trim()) {
    errors.className = 'Class or Grade is required'
  }
  if (!settings.durationMinutes || settings.durationMinutes <= 0) {
    errors.durationMinutes = 'Duration must be greater than 0 minutes'
  }
  if (!settings.totalMarks || settings.totalMarks <= 0) {
    errors.totalMarks = 'Maximum marks must be greater than 0'
  }

  if (settings.durationMinutes < 15) {
    warnings.push('Duration is less than 15 minutes. Ensure this is intentional for short tests.')
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}

export function validateStep2(settings: ExamSettings): StepValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  const enabledSections = (settings.sections || []).filter(s => s.enabled ?? true)

  if (enabledSections.length === 0) {
    errors.sections = 'At least one question section must be enabled.'
  }

  enabledSections.forEach((sec, idx) => {
    if (!sec.title?.trim()) {
      errors[`section_${sec.id}_title`] = `Section ${sec.name || idx + 1} requires a title.`
    }
    if (!sec.totalQuestions || sec.totalQuestions < 1) {
      errors[`section_${sec.id}_count`] = `Section ${sec.name || idx + 1} must have at least 1 question.`
    }
    if (!sec.marksPerQuestion || sec.marksPerQuestion <= 0) {
      errors[`section_${sec.id}_marks`] = `Section ${sec.name || idx + 1} marks per question must be > 0.`
    }
  })

  // Check calculated marks match
  const { totalConfiguredMarks } = calculateMarksFromSections(settings.sections || [])
  if (totalConfiguredMarks !== settings.totalMarks) {
    warnings.push(
      `Calculated section marks (${totalConfiguredMarks} Marks) differs from configured maximum marks (${settings.totalMarks} Marks).`
    )
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}

export function validateStep3(layout: VisualLayout): StepValidationResult {
  const errors: Record<string, string> = {}
  const warnings: string[] = []

  const margins = layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }
  if (margins.top < 5 || margins.bottom < 5 || margins.left < 5 || margins.right < 5) {
    errors.margins = 'Page margins must be at least 5mm to prevent printer clipping.'
  }

  if ((layout.fontSizePt || 11) < 8.5) {
    warnings.push('Font size below 8.5pt may be difficult for students to read on printouts.')
  }
  if ((layout.fontSizePt || 11) > 14) {
    warnings.push('Large font size (>14pt) will significantly increase the total printed pages.')
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}
