import { createWorker } from 'tesseract.js'
import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'

export interface ExtractedOcrQuestion {
  id: string
  detectedNumber?: string // e.g. "7", "9"
  prompt: string
  type: QuestionType
  marks: number
  difficulty: DifficultyLevel
  options?: { id: string; label: string; text: string; isCorrect?: boolean }[]
  instructions?: string
  diagramUrl?: string
  answerKey?: string
  explanation?: string
  rawText: string
  confidence?: number // 0-100
  uncertainNotationWarnings: string[]
  isSelected: boolean
}

/**
 * Checks for common mathematical notation distortion or OCR noise.
 */
export function detectMathAndOcrUncertainties(text: string): string[] {
  const warnings: string[] = []

  // Check for broken mathematical expressions or special symbols
  if (/[\\_{}^~]/.test(text)) {
    warnings.push('Contains LaTeX or subscript/superscript markup that may require manual verification.')
  }
  if (/\b(?:pi|theta|alpha|beta|gamma|sqrt|delta)\b/i.test(text)) {
    warnings.push('Mathematical or Greek symbol detected. Verify exponentiation and square root boundaries.')
  }
  // Check for ambiguous character replacements like 'l' and '1' or 'O' and '0'
  if (/\b[lI]O\b|\b[lI]O0\b/i.test(text)) {
    warnings.push('Possible ambiguous numeric characters (1 vs l or 0 vs O).')
  }
  // Check for unbalanced parentheses
  const openParens = (text.match(/\(/g) || []).length
  const closeParens = (text.match(/\)/g) || []).length
  if (openParens !== closeParens) {
    warnings.push('Unbalanced parentheses detected in equation.')
  }

  return warnings
}

/**
 * Runs client-side OCR using Tesseract.js worker with progress callback.
 */
export async function runOcrRecognition(
  imageSource: string,
  onProgress?: (progressPercent: number, status: string) => void
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && typeof m.progress === 'number') {
        const pct = Math.round(m.progress * 100)
        onProgress(pct, m.status || 'Processing')
      }
    }
  })

  try {
    const result = await worker.recognize(imageSource)
    await worker.terminate()
    return result.data.text || ''
  } catch (err: any) {
    await worker.terminate()
    throw new Error(`OCR processing failed: ${err.message || 'Worker error'}`)
  }
}

/**
 * Parses raw OCR text into structured candidate questions with detected question numbers.
 */
export function parseOcrQuestions(rawText: string): ExtractedOcrQuestion[] {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const questions: ExtractedOcrQuestion[] = []

  // Question start patterns: e.g. "Q7.", "Question 9:", "7.", "(9)", "Q. 7"
  const qStartRegex = /^(?:Q(?:uestion)?\.?\s*(\d+)[:.)-]?|\((\d+)\)|(\d+)[:.)-])\s*(.*)$/i
  const optRegex = /^[([{\s]*([A-Da-d1-4])[.)\]}\s]+\s*(.*)$/

  let current: Partial<ExtractedOcrQuestion> | null = null
  let currentOptions: { id: string; label: string; text: string; isCorrect?: boolean }[] = []
  let currentRawLines: string[] = []

  const commit = () => {
    if (current && current.prompt) {
      const fullPrompt = current.prompt.trim()
      const warnings = detectMathAndOcrUncertainties(fullPrompt)
      const isMcq = currentOptions.length >= 2

      questions.push({
        id: generateId('q_ocr_'),
        detectedNumber: current.detectedNumber,
        prompt: fullPrompt,
        type: isMcq ? 'mcq' : 'short_answer',
        marks: current.marks || (isMcq ? 1 : 2),
        difficulty: 'medium',
        options: isMcq ? currentOptions : undefined,
        rawText: currentRawLines.join('\n'),
        uncertainNotationWarnings: warnings,
        isSelected: true
      })
    }
    current = null
    currentOptions = []
    currentRawLines = []
  }

  for (const line of lines) {
    const qMatch = line.match(qStartRegex)
    if (qMatch) {
      commit()
      const detectedNum = qMatch[1] || qMatch[2] || qMatch[3]
      const promptRest = qMatch[4] || ''
      const lineMarksMatch = line.match(/\[(\d+)\s*(?:Marks?|M)\]/i)

      current = {
        detectedNumber: detectedNum,
        prompt: promptRest,
        marks: lineMarksMatch ? parseInt(lineMarksMatch[1], 10) : 1
      }
      currentRawLines.push(line)
      continue
    }

    if (current) {
      const optMatch = line.match(optRegex)
      if (optMatch) {
        const rawLabel = optMatch[1].toUpperCase()
        const label = ['1', '2', '3', '4'].includes(rawLabel)
          ? ['A', 'B', 'C', 'D'][parseInt(rawLabel) - 1]
          : rawLabel
        const text = optMatch[2] || ''

        currentOptions.push({
          id: generateId('opt_'),
          label,
          text
        })
        currentRawLines.push(line)
        continue
      }

      // Check if line specifies marks like [3 Marks]
      const marksMatch = line.match(/\[(\d+)\s*(?:Marks?|M)\]/i)
      if (marksMatch) {
        current.marks = parseInt(marksMatch[1], 10)
      }

      // Append to prompt
      current.prompt = `${current.prompt} ${line}`.trim()
      currentRawLines.push(line)
    }
  }

  commit()

  // Fallback: If no explicit numbered questions matched, treat entire text as single question
  if (questions.length === 0 && rawText.trim().length > 0) {
    const cleanText = rawText.trim()
    questions.push({
      id: generateId('q_ocr_'),
      prompt: cleanText,
      type: 'short_answer',
      marks: 2,
      difficulty: 'medium',
      rawText: cleanText,
      uncertainNotationWarnings: detectMathAndOcrUncertainties(cleanText),
      isSelected: true
    })
  }

  return questions
}

/**
 * Filters extracted questions by specific question numbers (e.g. "Q7, Q9" or "7, 9").
 */
export function filterExtractedQuestions(
  questions: ExtractedOcrQuestion[],
  filterQuery: string
): ExtractedOcrQuestion[] {
  const trimmed = filterQuery.trim()
  if (!trimmed || trimmed.toLowerCase() === 'all') {
    return questions
  }

  // Extract all numbers mentioned in query
  const matches = trimmed.match(/\d+/g)
  if (!matches || matches.length === 0) {
    return questions
  }

  const requestedNumbers = new Set(matches.map(n => String(parseInt(n, 10))))

  return questions.filter(q => {
    if (!q.detectedNumber) return false
    return requestedNumbers.has(String(parseInt(q.detectedNumber, 10)))
  })
}

/**
 * Crops a bounding region from an image data URL using an HTML5 Canvas.
 */
export function cropImageRegion(
  sourceDataUrl: string,
  rect: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(10, Math.round(rect.width))
        canvas.height = Math.max(10, Math.round(rect.height))

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'))
          return
        }

        ctx.drawImage(
          img,
          rect.x,
          rect.y,
          rect.width,
          rect.height,
          0,
          0,
          canvas.width,
          canvas.height
        )

        resolve(canvas.toDataURL('image/jpeg', 0.88))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image for cropping'))
    img.src = sourceDataUrl
  })
}
