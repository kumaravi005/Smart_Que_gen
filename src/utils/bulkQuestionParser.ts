import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'
import { cleanMathAndStructuredText } from './mathFormatter'


export interface BulkParsedQuestion {
  id: string
  prompt: string
  type: QuestionType
  marks: number
  difficulty: DifficultyLevel
  options?: { id: string; label: string; text: string; isCorrect?: boolean }[]
  solutionText?: string
  answerKey?: string
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
 * Handles English and Hindi (Devanagari), inline/multiline options, marks tags, and answers.
 */
export function parseBulkQuestions(
  rawText: string,
  defaults: BulkParseDefaults = {}
): BulkParsedQuestion[] {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const questions: BulkParsedQuestion[] = []

  // Question start pattern:
  // e.g. "1.", "1)", "(1)", "Q1.", "Q. 1", "Question 1:", "प्रश्न 1.", "प्र. 1", "1 - "
  const qStartRegex = /^(?:(?:Q(?:uestion)?|प्रश्न|प्र)\.?\s*(\d+)[:.)-]?|\((\d+)\)|(\d+)[:.)-])\s*(.*)$/i

  // Option pattern:
  // e.g. o (A) 1, • (B) 2, *o (C) 3, (A) 1, [A] 1, A) 1, A. 1, (क) 1, etc.
  const optPattern = /(?:^|[\s\r\n]+)(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Da-d1-4]|[\u0915-\u0918])\)|\[([A-Da-d1-4]|[\u0915-\u0918])\]|(?:([A-Da-d]|[\u0915-\u0918])|([1-4])(?!\.\d))[:.)\]\-]\s+)([\s\S]*?)(?=(?:[\s\r\n]+(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Da-d1-4]|[\u0915-\u0918])\)|\[([A-Da-d1-4]|[\u0915-\u0918])\]|(?:([A-Da-d]|[\u0915-\u0918])|([1-4])(?!\.\d))[:.)\]\-]\s+))|$)/g

  // Answer key regex: e.g. "Ans: (B)", "Answer: C", "उत्तर: (ख)", "Ans: 4"
  const ansRegex = /(?:Ans(?:wer)?|उत्तर|हल)\s*[:=-]\s*(?:\(?([A-Da-d1-4]|[\u0915-\u0918])\)?|([^\r\n]+))/i

  interface QuestionBlock {
    detectedNumber?: string
    marks?: number
    lines: string[]
  }

  const blocks: QuestionBlock[] = []
  let currentBlock: QuestionBlock | null = null

  for (const line of lines) {
    const qMatch = line.match(qStartRegex)
    if (qMatch) {
      if (currentBlock && currentBlock.lines.length > 0) {
        blocks.push(currentBlock)
      }
      const detectedNum = qMatch[1] || qMatch[2] || qMatch[3]
      const promptRest = qMatch[4] || ''
      const marksMatch = line.match(/\[(\d+)\s*(?:Marks?|M|अंक)\]|\((\d+)\s*(?:Marks?|M|अंक)\)/i)

      currentBlock = {
        detectedNumber: detectedNum,
        marks: marksMatch ? parseInt(marksMatch[1] || marksMatch[2], 10) : undefined,
        lines: promptRest ? [promptRest] : []
      }
    } else {
      if (!currentBlock) {
        currentBlock = {
          lines: []
        }
      }
      const marksMatch = line.match(/\[(\d+)\s*(?:Marks?|M|अंक)\]|\((\d+)\s*(?:Marks?|M|अंक)\)/i)
      if (marksMatch && !currentBlock.marks) {
        currentBlock.marks = parseInt(marksMatch[1] || marksMatch[2], 10)
      }
      currentBlock.lines.push(line)
    }
  }

  if (currentBlock && currentBlock.lines.length > 0) {
    blocks.push(currentBlock)
  }

  for (const block of blocks) {
    let fullText = block.lines.join('\n').trim()
    if (!fullText) continue

    // Check for Answer Key or Solution at end of block
    let answerKey: string | undefined
    let solutionText: string | undefined

    const ansMatch = fullText.match(ansRegex)
    if (ansMatch) {
      const rawAns = (ansMatch[1] || ansMatch[2] || '').trim().toUpperCase()
      if (['1', '2', '3', '4'].includes(rawAns)) {
        answerKey = ['A', 'B', 'C', 'D'][parseInt(rawAns, 10) - 1]
      } else if (['\u0915', '\u0916', '\u0917', '\u0918'].includes(rawAns)) {
        const idx = ['\u0915', '\u0916', '\u0917', '\u0918'].indexOf(rawAns)
        answerKey = ['A', 'B', 'C', 'D'][idx]
      } else if (['A', 'B', 'C', 'D'].includes(rawAns)) {
        answerKey = rawAns
      } else {
        solutionText = rawAns
      }
      // Remove Answer line from fullText
      fullText = fullText.replace(ansMatch[0], '').trim()
    }

    optPattern.lastIndex = 0
    const firstMatch = optPattern.exec(fullText)
    let prompt = fullText
    let options: { id: string; label: string; text: string; isCorrect?: boolean }[] = []

    if (firstMatch) {
      const optMatches = [firstMatch]
      let nextMatch: RegExpExecArray | null
      while ((nextMatch = optPattern.exec(fullText)) !== null) {
        optMatches.push(nextMatch)
      }

      if (optMatches.length >= 2) {
        prompt = fullText.slice(0, firstMatch.index).trim()
        options = optMatches.map(m => {
          let rawLabel = (m[1] || m[2] || m[3] || m[4] || '').trim().toUpperCase()
          if (['1', '2', '3', '4'].includes(rawLabel)) {
            rawLabel = ['A', 'B', 'C', 'D'][parseInt(rawLabel, 10) - 1]
          } else if (['\u0915', '\u0916', '\u0917', '\u0918'].includes(rawLabel)) {
            const idx = ['\u0915', '\u0916', '\u0917', '\u0918'].indexOf(rawLabel)
            rawLabel = ['A', 'B', 'C', 'D'][idx]
          }
          const rawCleanText = (m[5] || '')
            .replace(/^[:.)\]\-\s]+/, '')
            .replace(/[\s\r\n]+/g, ' ')
            .trim()
          const cleanText = cleanMathAndStructuredText(rawCleanText)

          const isCorrect = answerKey ? rawLabel === answerKey : false

          return {
            id: generateId('opt_'),
            label: rawLabel,
            text: cleanText,
            isCorrect
          }
        })
      }
    }

    const rawCleanPrompt = prompt
      .replace(/\s*\[\d+\s*(?:Marks?|M|अंक)\]\s*$/i, '')
      .replace(/\s*\(\d+\s*(?:Marks?|M|अंक)\)\s*$/i, '')
      .trim()
    const cleanPrompt = cleanMathAndStructuredText(rawCleanPrompt || fullText)

    const isMcq = options.length >= 2
    const determinedType: QuestionType = isMcq
      ? 'mcq'
      : defaults.defaultType || (block.marks && block.marks >= 5 ? 'long_answer' : 'short_answer')

    questions.push({
      id: generateId('qb_parsed_'),
      prompt: cleanPrompt,
      type: determinedType,
      marks: block.marks || defaults.defaultMarks || (isMcq ? 1 : 2),
      difficulty: defaults.defaultDifficulty || 'medium',
      options: isMcq ? options : undefined,
      answerKey,
      solutionText: solutionText ? cleanMathAndStructuredText(solutionText) : undefined,
      rawText: fullText,
      isSelected: true
    })
  }

  // Fallback: If no explicit numbered questions matched, treat double newlines as separation
  if (questions.length === 0 && rawText.trim().length > 0) {
    const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    for (const para of paragraphs) {
      questions.push({
        id: generateId('qb_parsed_'),
        prompt: cleanMathAndStructuredText(para),
        type: defaults.defaultType || 'short_answer',
        marks: defaults.defaultMarks || 2,
        difficulty: defaults.defaultDifficulty || 'medium',
        rawText: para,
        isSelected: true
      })
    }
  }

  return questions
}
