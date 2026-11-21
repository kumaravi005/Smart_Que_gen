import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'
import {
  parseRawQuestionsCore,
  type CoreParseDefaults
} from './questionParserCore'

export interface ParsedOption {
  label: string
  text: string
  isCorrect: boolean
}

export interface ParsedQuestion {
  id: string
  tempId: string
  prompt: string
  type: QuestionType
  marks: number
  difficulty: DifficultyLevel
  instructions?: string
  options?: ParsedOption[]
  answerKey?: string
  explanation?: string
  rawText: string
  warnings: string[]
  isIncluded: boolean
}

export interface BulkParseResult {
  questions: ParsedQuestion[]
  unrecognizedText: string[]
  totalParsed: number
}

export function parseBulkQuestionText(
  rawInput: string,
  defaultMarks: number = 1,
  defaultType: QuestionType = 'mcq'
): BulkParseResult {
  if (!rawInput || !rawInput.trim()) {
    return { questions: [], unrecognizedText: [], totalParsed: 0 }
  }

  const coreDefaults: CoreParseDefaults = {
    defaultMarks,
    defaultType
  }

  const { questions: coreQuestions, unrecognizedText } = parseRawQuestionsCore(rawInput, coreDefaults)

  const questions: ParsedQuestion[] = coreQuestions.map(q => ({
    id: generateId('q'),
    tempId: generateId('tmp'),
    prompt: q.prompt,
    type: q.type,
    marks: q.marks ?? defaultMarks,
    difficulty: q.difficulty || 'medium',
    instructions: q.instructions,
    options: q.options?.map(o => ({
      label: o.label,
      text: o.text,
      isCorrect: o.isCorrect
    })),
    answerKey: q.answerKey,
    explanation: q.explanation,
    rawText: q.rawText,
    warnings: q.warnings,
    isIncluded: true
  }))

  return {
    questions,
    unrecognizedText,
    totalParsed: questions.length
  }
}
