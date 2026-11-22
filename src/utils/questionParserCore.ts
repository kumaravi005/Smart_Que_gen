import type { QuestionType, DifficultyLevel } from '../types'
import { generateId } from './id'
import { cleanMathAndStructuredText } from './mathFormatter'

export interface CoreParsedOption {
  id?: string
  label: string
  text: string
  isCorrect: boolean
}

export interface CoreParsedQuestion {
  detectedNumber?: string
  prompt: string
  type: QuestionType
  marks?: number
  difficulty?: DifficultyLevel
  options?: CoreParsedOption[]
  answerKey?: string
  explanation?: string
  instructions?: string
  rawText: string
  warnings: string[]
}

export interface CoreParseDefaults {
  defaultMarks?: number
  defaultDifficulty?: DifficultyLevel
  defaultType?: QuestionType
}

export interface CoreParseResult {
  questions: CoreParsedQuestion[]
  unrecognizedText: string[]
}

/**
 * Normalizes Devanagari numerals (०, १, २, etc.) to standard Arabic numerals (0, 1, 2, etc.)
 */
export function normalizeDevanagariDigits(str: string): string {
  const devDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  }
  return str.replace(/[०-९]/g, d => devDigits[d] || d)
}

/**
 * Normalizes option labels from formats like '1', 'क', 'a', '(A)', '[B]' to standard 'A', 'B', 'C', 'D', 'E'
 */
export function normalizeOptionLabel(raw: string): string {
  const clean = raw.replace(/[()[\]{}.:)\-\s]/g, '').trim().toUpperCase()
  if (['1', '2', '3', '4', '5'].includes(clean)) {
    return ['A', 'B', 'C', 'D', 'E'][parseInt(clean, 10) - 1]
  }
  const hindiLetters = ['\u0915', '\u0916', '\u0917', '\u0918', '\u0919'] // क, ख, ग, घ, ङ
  const hIdx = hindiLetters.indexOf(clean)
  if (hIdx !== -1) {
    return ['A', 'B', 'C', 'D', 'E'][hIdx]
  }
  if (['A', 'B', 'C', 'D', 'E', 'F'].includes(clean)) {
    return clean
  }
  return clean || 'A'
}

// Regex patterns
export const Q_START_REGEX = /^(?:(?:Q(?:uestion)?|Que(?:s)?|प्रश्न|प्र(?:०|\.)?(?:सं(?:०|\.)?)?)\.?\s*(?:[:\s]\s*)?(\d+|[ivx]+)?[:.)\-]?|(?:\((\d+|[ivx]+)\)|\[(\d+|[ivx]+)\]|(\d+|[ivx]+)[:.)\-])(?!\w))\s*(.*)$/i

export const MARKS_REGEX = /(?:\[|\()?\s*(\d+)\s*(?:Marks?|M|Pts?|Points?|अंक)\s*(?:\]|\))/i

export const ANSWER_KEY_REGEX = /(?:^|[\s\r\n]+)(?:Ans(?:wer)?|Key|Correct(?:\s*Option)?|उत्तर|हल|सही\s*उत्तर)\s*[:=-]\s*(?:\(?([A-Ea-e1-5]|[\u0915-\u0919])\)?|([^\r\n]+))/i

export const EXPLANATION_REGEX = /(?:^|[\s\r\n]+)(?:Explanation|Solution|Exp|व्याख्या|संकेत|Hint)\s*[:=-]\s*(.*)$/i

export const INSTRUCTION_REGEX = /(?:^|[\s\r\n]+)(?:Note|Instruction|निर्देश|सूचना)\s*[:=-]\s*(.*)$/i

export const OPT_REGEX = /(?:^|[\s\r\n]+)(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Ea-e1-5]|[\u0915-\u0919])\)\s*|\[([A-Ea-e1-5]|[\u0915-\u0919])\]\s*|(?:([A-Ea-e]|[\u0915-\u0919])|([1-5])(?!\.\d))[:.)\]\-]\s*)([\s\S]*?)(?=(?:[\s\r\n]+(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Ea-e1-5]|[\u0915-\u0919])\)\s*|\[([A-Ea-e1-5]|[\u0915-\u0919])\]\s*|(?:([A-Ea-e]|[\u0915-\u0919])|([1-5])(?!\.\d))[:.)\]\-]\s*))|$)/g

// Matches board citation tags like [BSEB, 2024 (A)], [2023 A], (CBSE 2023, Set-A), [2024 (A)], 2024 (A)
const BOARD_TERMS = '(?:19\\d\\d|20\\d\\d|B\\.?S\\.?E\\.?B\\.?|C\\.?B\\.?S\\.?E\\.?|I\\.?C\\.?S\\.?E\\.?|N\\.?C\\.?E\\.?R\\.?T\\.?|J\\.?A\\.?C\\.?|UP\\s*Board|MP\\s*Board|Bihar(?:\\s*Board)?|Board|Annual|Compartment(?:al)?|Model\\s*Paper|Set[-\\s]*[A-Za-z0-9]|बिहार(?:\\s*बोर्ड)?|झारखंड(?:\\s*बोर्ड)?|उत्तर\\s*प्रदेश|बोर्ड|वार्षिक)'

// Safe, non-backtracking regex for board citations:
export const BOARD_CITATION_REGEX = new RegExp(
  '(?:' +
    // 1. Square brackets: [BSEB, 2024 (A)], [2023 A], [NCERT], [Set-A]
    '\\[[^\\]\\r\\n]{0,60}?' + BOARD_TERMS + '[^\\]\\r\\n]{0,60}?\\]' +
    '|' +
    // 2. Nested parens: (CBSE 2023 (Set-A)), (BSEB 2024 (A)), (2024 (A))
    '\\([^()\\r\\n]{0,40}?' + BOARD_TERMS + '[^()\\r\\n]{0,30}\\([^()\\r\\n]{1,15}\\)[^()\\r\\n]{0,30}\\)' +
    '|' +
    // 3. Simple parens: (CBSE 2023, Set-A), (BSEB 2024), (2023 A)
    '\\([^()\\r\\n]{0,60}?' + BOARD_TERMS + '[^()\\r\\n]{0,60}?\\)' +
    '|' +
    // 4. Bare year with set letter like "2024 (A)" or "2023 A"
    '\\b(?:19\\d\\d|20\\d\\d)\\s*[,/]?\\s*(?:\\([A-Da-d1-4]\\)|\\b[A-Da-d]\\b)' +
  ')',
  'gi'
)

/**
 * Protects board exam citations (e.g. "[BSEB, 2024 (A)]") by replacing them with unique placeholders
 * so that citation set letters like "(A)" are never mistakenly parsed as question options.
 */
export function maskCitations(text: string): { maskedText: string; restore: (str: string) => string } {
  const map: { placeholder: string; original: string }[] = []
  const maskedText = text.replace(BOARD_CITATION_REGEX, (m) => {
    const placeholder = `__BOARD_CITATION_${map.length}__`
    map.push({ placeholder, original: m })
    return placeholder
  })
  const restore = (str: string) => {
    let res = str
    for (const { placeholder, original } of map) {
      res = res.replaceAll(placeholder, original)
    }
    return res
  }
  return { maskedText, restore }
}

/**
 * Validates and extracts the real consecutive MCQ options sequence (e.g. A, B, C, D)
 * preventing incidental single letters or false matches from contaminating options.
 */
export function findBestOptionMatches(matches: RegExpExecArray[]): RegExpExecArray[] {
  if (matches.length < 2) return []

  // Look from the end backwards for where option 'A' is followed by 'B'
  for (let i = matches.length - 2; i >= 0; i--) {
    const rawI = matches[i][1] || matches[i][2] || matches[i][3] || matches[i][4] || ''
    const rawNext = matches[i + 1][1] || matches[i + 1][2] || matches[i + 1][3] || matches[i + 1][4] || ''
    const labelI = normalizeOptionLabel(rawI)
    const labelNext = normalizeOptionLabel(rawNext)

    if (labelI === 'A' && labelNext === 'B') {
      const seq = [matches[i]]
      const expected = ['A', 'B', 'C', 'D', 'E', 'F']
      let expIdx = 1
      for (let j = i + 1; j < matches.length; j++) {
        const rawJ = matches[j][1] || matches[j][2] || matches[j][3] || matches[j][4] || ''
        const lbl = normalizeOptionLabel(rawJ)
        if (lbl === expected[expIdx]) {
          seq.push(matches[j])
          expIdx++
        }
      }
      if (seq.length >= 2) return seq
    }
  }

  // Fallback: check if labels have both A and B
  const labels = matches.map(m => normalizeOptionLabel(m[1] || m[2] || m[3] || m[4] || ''))
  const hasA = labels.includes('A')
  const hasB = labels.includes('B')
  if (hasA && hasB) {
    const firstAIdx = labels.indexOf('A')
    return matches.slice(firstAIdx)
  }

  return matches.length >= 2 ? matches : []
}

export function containsHorizontalOptions(line: string): boolean {
  const { maskedText } = maskCitations(line)
  OPT_REGEX.lastIndex = 0
  const matches = Array.from(maskedText.matchAll(OPT_REGEX))
  if (matches.length < 2) return false
  const best = findBestOptionMatches(matches)
  return best.length >= 2
}

export function startsWithOptionA(line: string): boolean {
  const { maskedText } = maskCitations(line)
  const t = maskedText.trim()
  return /^(?:[•*·\-–—]\s*|[oO]\s+)?(?:\([Aa1\u0915]\)|\[[Aa1\u0915]\]|(?:[Aa\u0915])[:.)\]\-]\s*)/i.test(t)
}

export function isOptionLine(line: string): boolean {
  const { maskedText } = maskCitations(line)
  const t = maskedText.trim()
  // Parenthesized or bracketed options: (A), (a), (1), (क), [A], [a], [1], [क]
  if (/^(?:[•*·\-–—]\s*|[oO]\s+)?(?:\([A-Ea-e1-5\u0915-\u0919]\)|\[[A-Ea-e1-5\u0915-\u0919]\])/i.test(t)) {
    return true
  }
  // Letter-based option prefix: A., B., A), a., a), क., क)
  // (Excludes bare numbers 1., 2. which are question numbers)
  if (/^(?:[•*·\-–—]\s*|[oO]\s+)?(?:[A-Ea-e\u0915-\u0919])[:.)\]\-]\s*/i.test(t)) {
    return true
  }
  return false
}

export function isExplicitQuestionStart(line: string): boolean {
  const norm = normalizeDevanagariDigits(line.trim())
  if (!Q_START_REGEX.test(norm)) return false

  // If the line also contains horizontal options, ensure it's not just an option line like:
  // "1. Option One  2. Option Two  3. Option Three"
  if (containsHorizontalOptions(line)) {
    // If it starts with Q / Question / प्रश्न, it's explicitly a question
    if (/^(?:Q(?:uestion)?|Que(?:s)?|प्रश्न|प्र(?:०|\.)?(?:सं(?:०|\.)?)?)/i.test(norm)) {
      return true
    }
    const { maskedText } = maskCitations(line)
    OPT_REGEX.lastIndex = 0
    const matches = Array.from(maskedText.matchAll(OPT_REGEX))
    const best = findBestOptionMatches(matches)
    if (best.length >= 2) {
      const firstOptIndex = best[0].index
      const prefixBeforeOpt = maskedText.slice(0, firstOptIndex).trim()
      // If there is meaningful question prompt text before the first option, it is a question
      if (prefixBeforeOpt.length > 5) {
        return true
      }
    }
    return false
  }

  return true
}

export function isMetaLine(line: string): boolean {
  const t = line.trim()
  return ANSWER_KEY_REGEX.test(t) || EXPLANATION_REGEX.test(t) || INSTRUCTION_REGEX.test(t)
}

export function isQuestionLike(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (t.endsWith('?') || t.endsWith('।') || t.endsWith('—') || t.endsWith('-')) return true
  if (MARKS_REGEX.test(t)) return true
  const questionWords = /^(?:What|Why|How|When|Where|Who|Which|Whose|Whom|Explain|Define|Differentiate|Calculate|Prove|State|Describe|Discuss|Evaluate|Determine|Identify|Find|Show|Compute|क्या|क्यों|कैसे|कब|कहाँ|किस|किसने|किसका|किनकी|कौन|व्याख्या|परिभाषित|सिद्ध|गणना|लिखें|कीजिए|निम्नलिखित|निम्न|बताइए|बताएं)/i
  return questionWords.test(t)
}

/**
 * Parses a block of lines into a single structured question
 */
export function extractQuestionDetails(
  blockLines: string[],
  defaults: CoreParseDefaults = {}
): CoreParsedQuestion | null {
  if (blockLines.length === 0) return null
  const rawText = blockLines.join('\n').trim()
  if (!rawText) return null

  let detectedNumber: string | undefined
  let marks: number | undefined
  let answerKey: string | undefined
  let explanation: string | undefined
  let instructions: string | undefined
  const warnings: string[] = []

  // Check first line for question prefix
  const firstLine = blockLines[0].trim()
  const normFirst = normalizeDevanagariDigits(firstLine)
  const qMatch = normFirst.match(Q_START_REGEX)
  let promptFirstLine = firstLine

  if (qMatch) {
    detectedNumber = qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4]
    promptFirstLine = (qMatch[5] || '').trim()
  }

  // Check first line for marks
  const mMatch0 = firstLine.match(MARKS_REGEX)
  if (mMatch0 && marks === undefined) {
    marks = parseInt(mMatch0[1], 10)
  }

  const contentLines: string[] = []
  if (promptFirstLine) {
    contentLines.push(promptFirstLine)
  }

  for (let idx = 1; idx < blockLines.length; idx++) {
    const rawLine = blockLines[idx]
    const line = rawLine.trim()
    if (!line) continue

    // Marks check
    const mMatch = line.match(MARKS_REGEX)
    if (mMatch && marks === undefined) {
      marks = parseInt(mMatch[1], 10)
    }

    // Answer Key check
    const ansMatch = line.match(ANSWER_KEY_REGEX)
    if (ansMatch) {
      const rawAns = (ansMatch[1] || ansMatch[2] || '').trim()
      const normAns = normalizeOptionLabel(rawAns)
      if (['A', 'B', 'C', 'D', 'E'].includes(normAns)) {
        answerKey = normAns
      } else if (!explanation) {
        explanation = rawAns
      }
      continue
    }

    // Explanation check
    const expMatch = line.match(EXPLANATION_REGEX)
    if (expMatch) {
      explanation = expMatch[1].trim()
      continue
    }

    // Instruction check
    const instMatch = line.match(INSTRUCTION_REGEX)
    if (instMatch) {
      instructions = instMatch[1].trim()
      continue
    }

    contentLines.push(rawLine)
  }

  let textToParse = contentLines.join('\n').trim()
  if (!textToParse) {
    textToParse = promptFirstLine || rawText
  }

  // Check for inline answer key inside textToParse (mask citations first so citations aren't touched)
  const { maskedText, restore } = maskCitations(textToParse)

  let maskedParseText = maskedText
  const inlineAns = maskedParseText.match(ANSWER_KEY_REGEX)
  if (inlineAns) {
    const rawAns = (inlineAns[1] || inlineAns[2] || '').trim()
    const normAns = normalizeOptionLabel(rawAns)
    if (['A', 'B', 'C', 'D', 'E'].includes(normAns)) {
      if (!answerKey) answerKey = normAns
    } else if (!explanation) {
      explanation = rawAns
    }
    maskedParseText = maskedParseText.replace(inlineAns[0], '').trim()
  }

  // Parse options
  OPT_REGEX.lastIndex = 0
  const rawOptMatches: RegExpExecArray[] = []
  let m: RegExpExecArray | null
  while ((m = OPT_REGEX.exec(maskedParseText)) !== null) {
    rawOptMatches.push(m)
  }
  const optMatches = findBestOptionMatches(rawOptMatches)

  let prompt = restore(maskedParseText)
  let options: CoreParsedOption[] | undefined

  if (optMatches.length >= 2) {
    const firstOpt = optMatches[0]
    prompt = restore(maskedParseText.slice(0, firstOpt.index).trim())

    options = optMatches.map(match => {
      const rawLabel = (match[1] || match[2] || match[3] || match[4] || '').trim()
      const label = normalizeOptionLabel(rawLabel)
      let optText = (match[5] || '')
        .replace(/^[:.)\]\s]+/, '')
        .replace(/[\s\r\n]+/g, ' ')
        .trim()

      optText = restore(optText)

      // Check if tail of option text has Answer Key: e.g. "(D) प्रतिगामी Ans: A"
      const tailAns = optText.match(ANSWER_KEY_REGEX)
      if (tailAns) {
        if (!answerKey) {
          answerKey = normalizeOptionLabel(tailAns[1] || tailAns[2] || '')
        }
        optText = optText.replace(tailAns[0], '').trim()
      }

      return {
        id: generateId('opt_'),
        label,
        text: cleanMathAndStructuredText(optText),
        isCorrect: false
      }
    })

    // Match answerKey with options
    if (answerKey) {
      let matched = false
      options = options.map(opt => {
        const isMatch = opt.label.toUpperCase() === answerKey!.toUpperCase() ||
          opt.text.trim().toLowerCase() === answerKey!.toLowerCase()
        if (isMatch) matched = true
        return { ...opt, isCorrect: isMatch }
      })
      if (!matched) {
        warnings.push(`Answer key "${answerKey}" could not be matched directly to any option.`)
      }
    } else {
      warnings.push('No correct option marked for this MCQ.')
    }
  }

  // Clean prompt: remove trailing marks tags
  prompt = prompt.replace(MARKS_REGEX, '').trim()
  const cleanPrompt = cleanMathAndStructuredText(prompt || textToParse)

  // Determine question type
  const isMcq = options !== undefined && options.length >= 2
  let determinedType: QuestionType = isMcq
    ? 'mcq'
    : defaults.defaultType || (marks && marks >= 5 ? 'long_answer' : 'short_answer')

  if (!isMcq && determinedType === 'mcq') {
    const promptLower = cleanPrompt.toLowerCase()
    if (promptLower.includes('true or false') || promptLower.includes('true/false')) {
      determinedType = 'true_false'
      options = [
        { id: generateId('opt_'), label: 'A', text: 'True', isCorrect: false },
        { id: generateId('opt_'), label: 'B', text: 'False', isCorrect: false }
      ]
    } else {
      determinedType = (marks || defaults.defaultMarks || 1) > 3 ? 'long_answer' : 'short_answer'
    }
  }

  return {
    detectedNumber,
    prompt: cleanPrompt,
    type: determinedType,
    marks: marks ?? defaults.defaultMarks ?? (isMcq ? 1 : 2),
    difficulty: defaults.defaultDifficulty || 'medium',
    options,
    answerKey,
    explanation: explanation ? cleanMathAndStructuredText(explanation) : undefined,
    instructions: instructions ? cleanMathAndStructuredText(instructions) : undefined,
    rawText,
    warnings
  }
}

/**
 * Intelligent segmenter: Partitions raw text into individual question line blocks.
 * Accurately detects boundaries between numbered, unnumbered, and inline questions.
 */
export function partitionRawTextIntoBlocks(rawText: string): string[][] {
  const rawLines = rawText.split(/\r?\n/)
  const blocks: string[][] = []
  let currentBlock: string[] = []
  let blockHasOptions = false
  let blockHasAnswerKey = false
  let hadEmptyLineBefore = false

  const commitBlock = () => {
    if (currentBlock.length > 0) {
      blocks.push([...currentBlock])
      currentBlock = []
      blockHasOptions = false
      blockHasAnswerKey = false
      hadEmptyLineBefore = false
    }
  }

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i]
    const line = rawLine.trim()

    if (!line) {
      hadEmptyLineBefore = true
      continue
    }

    if (currentBlock.length === 0) {
      currentBlock.push(rawLine)
      if (containsHorizontalOptions(line) || isOptionLine(line)) {
        blockHasOptions = true
      }
      if (ANSWER_KEY_REGEX.test(line)) {
        blockHasAnswerKey = true
      }
      hadEmptyLineBefore = false
      continue
    }

    // Condition 1: Explicit question start
    if (isExplicitQuestionStart(line)) {
      commitBlock()
      currentBlock.push(rawLine)
      if (containsHorizontalOptions(line)) {
        blockHasOptions = true
      }
      hadEmptyLineBefore = false
      continue
    }

    // Condition 2: Current block already has options or answer key
    if (blockHasOptions || blockHasAnswerKey) {
      if (isMetaLine(line)) {
        currentBlock.push(rawLine)
        if (ANSWER_KEY_REGEX.test(line)) {
          blockHasAnswerKey = true
        }
        hadEmptyLineBefore = false
        continue
      }

      // Check if this line starts a new option A for the NEXT question
      if (startsWithOptionA(line)) {
        commitBlock()
        currentBlock.push(rawLine)
        blockHasOptions = true
        hadEmptyLineBefore = false
        continue
      }

      // If it's a subsequent option for the current question (e.g. B, C, D)
      if (isOptionLine(line)) {
        currentBlock.push(rawLine)
        hadEmptyLineBefore = false
        continue
      }

      // If it's plain text (not option, not meta):
      // Look ahead to see if the next non-empty line has options
      let nextLineHasOptions = false
      for (let j = i + 1; j < Math.min(i + 4, rawLines.length); j++) {
        const next = rawLines[j].trim()
        if (!next) continue
        if (startsWithOptionA(next) || containsHorizontalOptions(next) || isOptionLine(next)) {
          nextLineHasOptions = true
        }
        break
      }

      if (hadEmptyLineBefore || nextLineHasOptions || line.endsWith('?') || line.endsWith('।')) {
        // This line is the prompt of a NEW QUESTION!
        commitBlock()
        currentBlock.push(rawLine)
        hadEmptyLineBefore = false
        continue
      }

      // Otherwise could be continuation of option text
      currentBlock.push(rawLine)
      hadEmptyLineBefore = false
      continue
    }

    // Condition 3: Current block has NO options yet
    // Check if line contains horizontal options or starts an option (even if preceded by blank line!)
    if (containsHorizontalOptions(line) || isOptionLine(line)) {
      blockHasOptions = true
      currentBlock.push(rawLine)
      hadEmptyLineBefore = false
      continue
    }

    // Check if this line is an Answer key
    if (ANSWER_KEY_REGEX.test(line)) {
      blockHasAnswerKey = true
      currentBlock.push(rawLine)
      hadEmptyLineBefore = false
      continue
    }

    // Check if subjective question separated by blank line
    if (hadEmptyLineBefore) {
      const prevText = currentBlock.join(' ').trim()
      const prevHasPunctuation = prevText.endsWith('?') || prevText.endsWith('।') || MARKS_REGEX.test(prevText)
      const currentLooksLikeQ = isQuestionLike(line)

      // Lookahead: does this line lead to an MCQ?
      let nextHasOptions = false
      for (let j = i + 1; j < Math.min(i + 4, rawLines.length); j++) {
        const next = rawLines[j].trim()
        if (!next) continue
        if (startsWithOptionA(next) || containsHorizontalOptions(next)) {
          nextHasOptions = true
        }
        break
      }

      if (prevHasPunctuation && (currentLooksLikeQ || nextHasOptions)) {
        commitBlock()
        currentBlock.push(rawLine)
        hadEmptyLineBefore = false
        continue
      }
    }

    // Continuation of prompt
    currentBlock.push(rawLine)
    hadEmptyLineBefore = false
  }

  commitBlock()
  return blocks
}

/**
 * Universal Core Parser function used across the app
 */
export function parseRawQuestionsCore(
  rawText: string,
  defaults: CoreParseDefaults = {}
): CoreParseResult {
  if (!rawText || !rawText.trim()) {
    return { questions: [], unrecognizedText: [] }
  }

  const blocks = partitionRawTextIntoBlocks(rawText)
  const questions: CoreParsedQuestion[] = []
  const unrecognizedText: string[] = []

  for (const block of blocks) {
    const parsed = extractQuestionDetails(block, defaults)
    if (parsed) {
      const hasOptions = parsed.options && parsed.options.length >= 2
      const hasNumber = Boolean(parsed.detectedNumber)
      const hasExplicitMarks = block.some(l => MARKS_REGEX.test(l))
      const isQuestion = hasOptions || hasNumber || hasExplicitMarks || isQuestionLike(parsed.prompt)

      const isOnlyBlock = blocks.length === 1

      if (isQuestion || isOnlyBlock) {
        // Check for general instruction lines
        const isGeneralInstruction = !hasOptions && !hasNumber &&
          /^(?:General\s*Instructions?|Instructions?:?|Note:|Important\s*note)/i.test(parsed.prompt)

        if (isGeneralInstruction) {
          unrecognizedText.push(...block)
        } else {
          questions.push(parsed)
        }
      } else {
        unrecognizedText.push(...block)
      }
    } else {
      unrecognizedText.push(...block)
    }
  }

  return { questions, unrecognizedText }
}
