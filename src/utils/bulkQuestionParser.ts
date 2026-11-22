import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'
import {
  parseRawQuestionsCore,
  type CoreParseDefaults
} from './questionParserCore'

export interface BulkParsedQuestion {
  id: string
  prompt: string
  type: QuestionType
  marks: number
  difficulty: DifficultyLevel
  options?: { id: string; label: string; text: string; isCorrect?: boolean }[]
  solutionText?: string
  answerKey?: string
  comment?: string
  rawText: string
  isSelected: boolean
}

export interface BulkParseDefaults {
  defaultMarks?: number
  defaultDifficulty?: DifficultyLevel
  defaultType?: QuestionType
}

/**
 * Parses raw text containing multiple questions pasted by teachers.
 * Handles English and Hindi (Devanagari), unnumbered questions, inline/multiline options,
 * marks tags, and answers.
 */
export function parseBulkQuestions(
  rawText: string,
  defaults: BulkParseDefaults = {}
): BulkParsedQuestion[] {
  if (!rawText || !rawText.trim()) return []

  const coreDefaults: CoreParseDefaults = {
    defaultMarks: defaults.defaultMarks,
    defaultDifficulty: defaults.defaultDifficulty,
    defaultType: defaults.defaultType
  }

  const { questions: coreQuestions } = parseRawQuestionsCore(rawText, coreDefaults)

  const result: BulkParsedQuestion[] = coreQuestions.map(q => {
    const isMcq = q.type === 'mcq' && q.options && q.options.length >= 2
    return {
      id: generateId('qb_parsed_'),
      prompt: q.prompt,
      type: q.type,
      marks: q.marks ?? defaults.defaultMarks ?? (isMcq ? 1 : 2),
      difficulty: q.difficulty || defaults.defaultDifficulty || 'medium',
      options: q.options?.map(opt => ({
        id: opt.id || generateId('opt_'),
        label: opt.label,
        text: opt.text,
        isCorrect: opt.isCorrect
      })),
      solutionText: q.explanation,
      answerKey: q.answerKey,
      comment: q.comment,
      rawText: q.rawText,
      isSelected: true
    }
  })

  // Fallback: If no structured questions matched at all, treat each paragraph as a subjective question
  if (result.length === 0 && rawText.trim().length > 0) {
    const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    for (const para of paragraphs) {
      result.push({
        id: generateId('qb_parsed_'),
        prompt: para,
        type: defaults.defaultType || 'short_answer',
        marks: defaults.defaultMarks || 2,
        difficulty: defaults.defaultDifficulty || 'medium',
        rawText: para,
        isSelected: true
      })
    }
  }

  return result
}
