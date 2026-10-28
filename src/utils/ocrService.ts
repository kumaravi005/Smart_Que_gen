import { createWorker } from 'tesseract.js'
import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'
import { cleanMathAndStructuredText } from './mathFormatter'

export interface ExtractedOcrQuestion {
  id: string
  detectedNumber?: string // e.g. "7", "9", "20"
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

export type OcrLanguage = 'hin+eng' | 'eng' | 'hin' | 'san+hin+eng'

export interface OcrLanguageOption {
  code: OcrLanguage
  label: string
  description: string
}

export const OCR_SUPPORTED_LANGUAGES: OcrLanguageOption[] = [
  {
    code: 'hin+eng',
    label: 'Hindi + English (Bilingual / Devanagari)',
    description: 'Recommended for CBSE, State Boards (Bihar, UP, etc.), and bilingual papers'
  },
  {
    code: 'eng',
    label: 'English Only',
    description: 'Standard Latin script, mathematics, and English language exams'
  },
  {
    code: 'hin',
    label: 'Hindi Only (हिंदी)',
    description: 'Devanagari script for Hindi literature and pure Hindi papers'
  },
  {
    code: 'san+hin+eng',
    label: 'Sanskrit + Hindi + English',
    description: 'For Sanskrit and multilingual classical examination papers'
  }
]

export interface PreprocessOptions {
  invert?: 'auto' | 'always' | 'never'
  contrast?: number
  grayscale?: boolean
}

export interface PreprocessResult {
  dataUrl: string
  wasInverted: boolean
  avgBrightness: number
}

/**
 * Preprocesses an image via offscreen Canvas:
 * - Detects dark background (e.g. YouTube slides, smartboards, night mode) and inverts to dark text on light background
 * - Enhances contrast for clearer character edge recognition in Tesseract
 */
export function preprocessOcrImage(
  imageSource: string,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const invertMode = options.invert ?? 'auto'
  const contrastFactor = options.contrast ?? 1.25
  const applyGrayscale = options.grayscale ?? true

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve({ dataUrl: imageSource, wasInverted: false, avgBrightness: 255 })
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || img.width || 800
        const height = img.naturalHeight || img.height || 600
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          return resolve({ dataUrl: imageSource, wasInverted: false, avgBrightness: 255 })
        }

        ctx.drawImage(img, 0, 0, width, height)
        const imgData = ctx.getImageData(0, 0, width, height)
        const data = imgData.data

        // Calculate average brightness
        let totalLuminance = 0
        const step = 4 * 4
        let samples = 0
        for (let i = 0; i < data.length; i += step) {
          totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          samples++
        }
        const avgBrightness = samples > 0 ? totalLuminance / samples : 255
        const shouldInvert =
          invertMode === 'always' || (invertMode === 'auto' && avgBrightness < 120)

        // Process pixel data
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i]
          let g = data[i + 1]
          let b = data[i + 2]

          if (shouldInvert) {
            r = 255 - r
            g = 255 - g
            b = 255 - b
          }

          if (applyGrayscale) {
            let gray = 0.299 * r + 0.587 * g + 0.114 * b
            if (contrastFactor !== 1.0) {
              gray = (gray - 128) * contrastFactor + 128
            }
            gray = Math.max(0, Math.min(255, gray))
            data[i] = gray
            data[i + 1] = gray
            data[i + 2] = gray
          } else if (contrastFactor !== 1.0) {
            data[i] = Math.max(0, Math.min(255, (r - 128) * contrastFactor + 128))
            data[i + 1] = Math.max(0, Math.min(255, (g - 128) * contrastFactor + 128))
            data[i + 2] = Math.max(0, Math.min(255, (b - 128) * contrastFactor + 128))
          }
        }

        ctx.putImageData(imgData, 0, 0)
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          wasInverted: shouldInvert,
          avgBrightness
        })
      } catch (err) {
        console.warn('Image preprocessing failed, using original:', err)
        resolve({ dataUrl: imageSource, wasInverted: false, avgBrightness: 255 })
      }
    }

    img.onerror = () => {
      resolve({ dataUrl: imageSource, wasInverted: false, avgBrightness: 255 })
    }

    img.src = imageSource
  })
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

export interface OcrRecognitionOptions {
  language?: OcrLanguage | string
  invertMode?: 'auto' | 'always' | 'never'
  enhanceContrast?: boolean
  onProgress?: (progressPercent: number, status: string) => void
}

export interface OcrRecognitionResult {
  text: string
  wasInverted: boolean
  preprocessedDataUrl?: string
}

/**
 * Runs client-side OCR using Tesseract.js worker with progress callback.
 * Supports bilingual recognition (Hindi + English) and auto-inversion of dark backgrounds.
 */
export async function runOcrRecognition(
  imageSource: string,
  optionsOrProgress?:
    | ((progressPercent: number, status: string) => void)
    | OcrRecognitionOptions,
  legacyProgress?: (progressPercent: number, status: string) => void
): Promise<OcrRecognitionResult> {
  let options: OcrRecognitionOptions = {}
  let onProgress: ((percent: number, status: string) => void) | undefined

  if (typeof optionsOrProgress === 'function') {
    onProgress = optionsOrProgress
  } else if (optionsOrProgress) {
    options = optionsOrProgress
    onProgress = options.onProgress || legacyProgress
  }

  const language = options.language || 'hin+eng'
  const invertMode = options.invertMode ?? 'auto'
  const enhanceContrast = options.enhanceContrast ?? true

  // 1. Preprocess image (inverting dark backgrounds if needed)
  if (onProgress) onProgress(5, 'Optimizing image contrast & orientation...')
  let targetImage = imageSource
  let wasInverted = false

  try {
    const preprocessed = await preprocessOcrImage(imageSource, {
      invert: invertMode,
      contrast: enhanceContrast ? 1.25 : 1.0,
      grayscale: true
    })
    targetImage = preprocessed.dataUrl
    wasInverted = preprocessed.wasInverted
  } catch (prepErr) {
    console.warn('Preprocessing skipped:', prepErr)
  }

  // 2. Initialize Tesseract Worker with selected language(s)
  const langTokens = language.includes('+') ? language.split('+') : language
  if (onProgress) onProgress(15, `Loading recognition models (${language})...`)

  let worker: any
  try {
    worker = await createWorker(langTokens, 1, {
      logger: (m) => {
        if (onProgress && typeof m.progress === 'number') {
          // Map Tesseract progress (0-1) to 20-95%
          const pct = 20 + Math.round(m.progress * 75)
          onProgress(pct, m.status || 'Recognizing characters...')
        }
      }
    })
  } catch (workerErr: any) {
    // If multi-language load fails (e.g. network timeout on hindi traineddata), attempt fallback to 'eng'
    console.warn('Primary language load failed, falling back to eng:', workerErr)
    if (Array.isArray(langTokens) && langTokens.length > 1) {
      if (onProgress) onProgress(20, 'Retrying with English standard model...')
      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (onProgress && typeof m.progress === 'number') {
            const pct = 20 + Math.round(m.progress * 75)
            onProgress(pct, m.status || 'Recognizing characters...')
          }
        }
      })
    } else {
      throw new Error(`Failed to initialize OCR language models: ${workerErr.message || 'Worker error'}`)
    }
  }

  try {
    const result = await worker.recognize(targetImage)
    await worker.terminate()
    if (onProgress) onProgress(100, 'Recognition complete')

    return {
      text: result.data.text || '',
      wasInverted,
      preprocessedDataUrl: targetImage
    }
  } catch (err: any) {
    try {
      await worker.terminate()
    } catch {
      // Ignore worker termination errors
    }
    throw new Error(`OCR processing failed: ${err.message || 'Worker error'}`)
  }
}

/**
 * Parses raw OCR text into structured candidate questions with detected question numbers and MCQ options.
 * Accurately handles bullet markers (o, •, *), inline/multiline options, and bilingual Hindi/English headers.
 */
export function parseOcrQuestions(rawText: string): ExtractedOcrQuestion[] {
  if (!rawText || !rawText.trim()) return []

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const questions: ExtractedOcrQuestion[] = []

  // Question start patterns: e.g. "Q7.", "Q. 20", "Question 9:", "7.", "(9)", "प्रश्न 20.", "प्र. 20"
  const qStartRegex = /^(?:(?:Q(?:uestion)?|प्रश्न|प्र)\.?\s*(\d+)[:.)-]?|\((\d+)\)|(\d+)[:.)-])\s*(.*)$/i

  // Option pattern that matches options across lines or inline:
  // e.g. o (A) 1, • (B) 2, *o (C) 3, (A) 1, [A] 1, A) 1, A. 1, (क) 1, etc.
  // Excludes decimal numbers like "1.5" from triggering an option match.
  const optPattern = /(?:^|[\s\r\n]+)(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Da-d1-4]|[\u0915-\u0918])\)|\[([A-Da-d1-4]|[\u0915-\u0918])\]|(?:([A-Da-d]|[\u0915-\u0918])|([1-4])(?!\.\d))[:.)\]\-]\s+)([\s\S]*?)(?=(?:[\s\r\n]+(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Da-d1-4]|[\u0915-\u0918])\)|\[([A-Da-d1-4]|[\u0915-\u0918])\]|(?:([A-Da-d]|[\u0915-\u0918])|([1-4])(?!\.\d))[:.)\]\-]\s+))|$)/g


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
      // Check if line contains marks notation like [3 Marks] or (2 अंक)
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
    const fullText = block.lines.join('\n').trim()
    if (!fullText) continue

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
        // Options found! Isolate prompt cleanly before the options
        prompt = fullText.slice(0, firstMatch.index).trim()
        options = optMatches.map(m => {
          let rawLabel = (m[1] || m[2] || m[3] || m[4] || '').trim().toUpperCase()
          // Map 1, 2, 3, 4 to A, B, C, D
          if (['1', '2', '3', '4'].includes(rawLabel)) {
            rawLabel = ['A', 'B', 'C', 'D'][parseInt(rawLabel, 10) - 1]
          } else if (['\u0915', '\u0916', '\u0917', '\u0918'].includes(rawLabel)) {
            // क -> A, ख -> B, ग -> C, घ -> D
            const idx = ['\u0915', '\u0916', '\u0917', '\u0918'].indexOf(rawLabel)
            rawLabel = ['A', 'B', 'C', 'D'][idx]
          }
          const rawCleanOpt = (m[5] || '')
            .replace(/^[:.)\]\-\s]+/, '')
            .replace(/[\s\r\n]+/g, ' ')
            .trim()
          const cleanText = /\\(?:frac|dfrac|tfrac|triangle|sim|cong|sqrt|alpha|beta|pm|times|div|\(|\)|\[|\])/.test(rawCleanOpt)
            ? cleanMathAndStructuredText(rawCleanOpt)
            : rawCleanOpt

          return {
            id: generateId('opt_'),
            label: rawLabel,
            text: cleanText
          }
        })
      }
    }


    // Clean up prompt: remove trailing marks tags like [2 Marks] or [1 Mark]
    const rawCleanPrompt = prompt
      .replace(/\s*\[\d+\s*(?:Marks?|M|अंक)\]\s*$/i, '')
      .replace(/\s*\(\d+\s*(?:Marks?|M|अंक)\)\s*$/i, '')
      .trim()
    const cleanPrompt = /\\(?:frac|dfrac|tfrac|triangle|sim|cong|sqrt|alpha|beta|pm|times|div|\(|\)|\[|\])/.test(rawCleanPrompt)
      ? cleanMathAndStructuredText(rawCleanPrompt || fullText)
      : (rawCleanPrompt || fullText)

    const isMcq = options.length >= 2
    const determinedType: QuestionType = isMcq
      ? 'mcq'
      : (block.marks && block.marks >= 5)
      ? 'long_answer'
      : 'short_answer'

    const warnings = detectMathAndOcrUncertainties(cleanPrompt)

    questions.push({
      id: generateId('q_ocr_'),
      detectedNumber: block.detectedNumber,
      prompt: cleanPrompt,
      type: determinedType,
      marks: block.marks || (isMcq ? 1 : 2),
      difficulty: 'medium',
      options: isMcq ? options : undefined,
      rawText: fullText,
      uncertainNotationWarnings: warnings,
      isSelected: true
    })
  }

  // Fallback: If no explicit numbered questions matched, treat entire text as single question
  if (questions.length === 0 && rawText.trim().length > 0) {
    const cleanText = /\\(?:frac|dfrac|tfrac|triangle|sim|cong|sqrt|alpha|beta|pm|times|div|\(|\)|\[|\])/.test(rawText)
      ? cleanMathAndStructuredText(rawText.trim())
      : rawText.trim()
    questions.push({
      id: generateId('q_ocr_'),
      prompt: cleanText,
      type: 'short_answer',
      marks: 2,
      difficulty: 'medium',
      rawText: rawText.trim(),
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
