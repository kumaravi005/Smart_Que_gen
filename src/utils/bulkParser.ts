import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'

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

// Regex patterns for matching question prompts and option indicators
const QUESTION_START_REGEX = /^(?:Q(?:uestion)?\.?\s*(\d+)?[:.)-]?|\((\d+)\)|(\d+)[:.)-])\s*(.*)$/i
const OPTION_START_REGEX = /^(?:[([{\s]*([A-Da-d1-4])[.)\]}\s]+)\s*(.*)$/
const HORIZONTAL_OPTIONS_REGEX = /(?:\(|\[|^|\s)([A-Da-d])[.)\]]\s*([^(]*?)(?=(?:\(|\[|\s)[A-Da-d][.)\]]|$)/g
const ANSWER_KEY_REGEX = /^(?:Ans(?:wer)?|Key|Correct(?:\s*Option)?|Sol(?:ution)?)\s*[:=-]\s*(.*)$/i
const MARKS_REGEX = /(?:\[|\()?\s*(\d+)\s*(?:Marks?|M|Pts?|Points?)\s*(?:\]|\))?/i
const INSTRUCTION_REGEX = /^(?:Note|Instruction|Hint)\s*[:=-]\s*(.*)$/i

export function parseBulkQuestionText(
  rawInput: string,
  defaultMarks: number = 1,
  defaultType: QuestionType = 'mcq'
): BulkParseResult {
  const lines = rawInput.split(/\r?\n/)
  const questions: ParsedQuestion[] = []
  const unrecognizedLines: string[] = []

  let currentQuestion: Partial<ParsedQuestion> | null = null
  let currentOptions: ParsedOption[] = []
  let currentRawLines: string[] = []

  const commitCurrentQuestion = () => {
    if (!currentQuestion || !currentQuestion.prompt?.trim()) {
      if (currentRawLines.length > 0) {
        unrecognizedLines.push(...currentRawLines)
      }
      currentQuestion = null
      currentOptions = []
      currentRawLines = []
      return
    }

    const warnings: string[] = []
    let detectedType = currentQuestion.type || defaultType

    // Infer type based on options presence
    if (currentOptions.length >= 2) {
      detectedType = 'mcq'
      // Normalize labels to A, B, C, D...
      const alphabet = ['A', 'B', 'C', 'D', 'E', 'F']
      currentOptions = currentOptions.map((opt, i) => ({
        ...opt,
        label: opt.label ? opt.label.toUpperCase() : (alphabet[i] || `${i + 1}`)
      }))

      // If answerKey specified (e.g. "B"), mark that option as correct
      if (currentQuestion.answerKey) {
        const key = currentQuestion.answerKey.trim().toUpperCase()
        let matched = false
        currentOptions = currentOptions.map(opt => {
          const match = opt.label.toUpperCase() === key || opt.text.trim().toLowerCase() === key.toLowerCase()
          if (match) matched = true
          return { ...opt, isCorrect: match }
        })
        if (!matched && key) {
          warnings.push(`Answer key "${key}" could not be matched directly to any option.`)
        }
      }

      // Check if at least one option is marked correct
      if (!currentOptions.some(o => o.isCorrect)) {
        warnings.push('No correct option marked for this MCQ.')
      }
    } else if (currentOptions.length === 1) {
      warnings.push('Only 1 option was detected; consider adding more options or converting to subjective.')
    } else {
      // 0 options - detect if True/False or subjective
      const promptLower = currentQuestion.prompt.toLowerCase()
      if (promptLower.includes('true or false') || promptLower.includes('true/false')) {
        detectedType = 'true_false'
        currentOptions = [
          { label: 'A', text: 'True', isCorrect: false },
          { label: 'B', text: 'False', isCorrect: false }
        ]
      } else if (detectedType === 'mcq') {
        // Defaulted to MCQ but has no options -> convert to short answer
        detectedType = (currentQuestion.marks || defaultMarks) > 3 ? 'long_answer' : 'short_answer'
      }
    }

    questions.push({
      id: generateId('q'),
      tempId: generateId('tmp'),
      prompt: currentQuestion.prompt.trim(),
      type: detectedType,
      marks: currentQuestion.marks ?? defaultMarks,
      difficulty: 'medium',
      instructions: currentQuestion.instructions,
      options: currentOptions.length > 0 ? currentOptions : undefined,
      answerKey: currentQuestion.answerKey,
      explanation: currentQuestion.explanation,
      rawText: currentRawLines.join('\n'),
      warnings,
      isIncluded: true
    })

    currentQuestion = null
    currentOptions = []
    currentRawLines = []
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    if (!line) {
      // Empty line may signify question break if we already have options or prompt
      if (currentQuestion && currentOptions.length >= 2) {
        const nextNonEmpty = lines.slice(i + 1).find(l => l.trim().length > 0)
        if (nextNonEmpty && (QUESTION_START_REGEX.test(nextNonEmpty.trim()) || ANSWER_KEY_REGEX.test(nextNonEmpty.trim()))) {
          // Break ahead
        }
      }
      continue
    }

    // Check for marks in brackets anywhere in the line e.g. "Explain gravity. [3 Marks]"
    let marksInLine: number | undefined
    const marksMatch = line.match(MARKS_REGEX)
    if (marksMatch) {
      marksInLine = parseInt(marksMatch[1], 10)
    }

    // Check for Answer Key line
    const ansMatch = line.match(ANSWER_KEY_REGEX)
    if (ansMatch) {
      if (currentQuestion) {
        currentQuestion.answerKey = ansMatch[1].trim()
        currentRawLines.push(rawLine)
        continue
      }
    }

    // Check for Explanation / Hint line
    const expMatch = line.match(/^(?:Explanation|Solution|Exp)\s*[:=-]\s*(.*)$/i)
    if (expMatch) {
      if (currentQuestion) {
        currentQuestion.explanation = expMatch[1].trim()
        currentRawLines.push(rawLine)
        continue
      }
    }

    // Check for Instruction line
    const instMatch = line.match(INSTRUCTION_REGEX)
    if (instMatch) {
      if (currentQuestion) {
        currentQuestion.instructions = instMatch[1].trim()
        currentRawLines.push(rawLine)
        continue
      }
    }

    // Check for Question start pattern
    const qMatch = line.match(QUESTION_START_REGEX)
    const looksLikeExplicitQuestion = qMatch && (
      /^Q(?:uestion)?/i.test(line) ||
      (qMatch[1] || qMatch[2] || qMatch[3]) !== undefined
    )

    if (looksLikeExplicitQuestion) {
      // Commit previous question if exists
      if (currentQuestion) {
        commitCurrentQuestion()
      }

      let promptText = (qMatch[4] || line).trim()
      // Remove marks suffix if present
      if (marksInLine !== undefined) {
        promptText = promptText.replace(MARKS_REGEX, '').trim()
      }

      currentQuestion = {
        prompt: promptText,
        marks: marksInLine ?? defaultMarks,
        type: defaultType
      }
      currentOptions = []
      currentRawLines = [rawLine]
      continue
    }

    // Check if line contains horizontal options: e.g. "(a) Apple (b) Banana (c) Cherry (d) Date"
    const horizontalMatches = Array.from(line.matchAll(HORIZONTAL_OPTIONS_REGEX))
    if (horizontalMatches.length >= 2 && currentQuestion) {
      horizontalMatches.forEach(m => {
        currentOptions.push({
          label: m[1].toUpperCase(),
          text: m[2].trim(),
          isCorrect: false
        })
      })
      currentRawLines.push(rawLine)
      continue
    }

    // Check for single option pattern: e.g. "A. Option Text" or "a) Option Text"
    const optMatch = line.match(OPTION_START_REGEX)
    if (optMatch && currentQuestion) {
      const label = optMatch[1].toUpperCase()
      const text = optMatch[2].trim()

      currentOptions.push({
        label,
        text,
        isCorrect: false
      })
      currentRawLines.push(rawLine)
      continue
    }

    // If we have an active question, but no options yet, this might be a multiline prompt
    if (currentQuestion && currentOptions.length === 0) {
      currentQuestion.prompt = `${currentQuestion.prompt} ${line}`
      if (marksInLine !== undefined && !currentQuestion.marks) {
        currentQuestion.marks = marksInLine
        currentQuestion.prompt = currentQuestion.prompt.replace(MARKS_REGEX, '').trim()
      }
      currentRawLines.push(rawLine)
      continue
    }

    // If we have an active question with options, but line doesn't match an option:
    if (currentQuestion && currentOptions.length > 0) {
      unrecognizedLines.push(rawLine)
      continue
    }

    // Otherwise, line is outside any recognizable question
    unrecognizedLines.push(rawLine)
  }

  // Commit last question
  commitCurrentQuestion()

  return {
    questions,
    unrecognizedText: unrecognizedLines,
    totalParsed: questions.length
  }
}
