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
  comment?: string
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

export const ANSWER_KEY_REGEX = /(?:^|[\s\r\n]+)(?:Ans(?:wer)?|Key|Correct(?:\s*(?:Option|Answer))?|उत्तर|हल|सही\s*उत्तर)(?:\s*[:=.\-–—]\s*(?:(?:\(([A-Ea-e1-5]|[\u0915-\u0919])\)|\[([A-Ea-e1-5]|[\u0915-\u0919])\]|([A-Ea-e1-5]|[\u0915-\u0919])(?=[\s:.)\]\-–—]|$))\s*(.*)|([^\r\n]+))|\s+(?:(?:\(([A-Ea-e1-5]|[\u0915-\u0919])\)|\[([A-Ea-e1-5]|[\u0915-\u0919])\]|([A-Ea-e1-5]|[\u0915-\u0919])(?=[\s:.)\]\-–—]|$))\s*(.*)))/i

export interface ParsedAnswerMatch {
  matchedText: string
  optionLetter?: string
  extraText?: string
  rawAnswerText?: string
}

export function parseAnswerKeyMatch(match: RegExpMatchArray): ParsedAnswerMatch {
  const matchedText = match[0]
  const optLetter = match[1] || match[2] || match[3] || match[6] || match[7] || match[8]
  const extra = (match[4] || match[9] || '').replace(/^[:\-–—.)\]\s]+/, '').trim()
  const rawAns = (match[5] || '').trim()

  return {
    matchedText,
    optionLetter: optLetter ? normalizeOptionLabel(optLetter) : undefined,
    extraText: extra || undefined,
    rawAnswerText: rawAns || undefined
  }
}

export const EXPLANATION_REGEX = /(?:^|[\s\r\n]+)(?:Explanation|Solution|Exp|व्याख्या|संकेत|Hint)\s*[:=-]\s*(.*)$/i

export const INSTRUCTION_REGEX = /(?:^|[\s\r\n]+)(?:Note|Instruction|निर्देश|सूचना)\s*[:=-]\s*(.*)$/i

export const COMMENT_REGEX = /(?:^|[\s\r\n]+)(?:Comment|Board|Ref|Citation|टिप्पणी)\s*[:=-]\s*(.*)$/i

export const OPT_REGEX = /(?:^|[\s\r\n]+)(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Ea-e1-5]|[\u0915-\u0919])\)\s*|\[([A-Ea-e1-5]|[\u0915-\u0919])\]\s*|(?:([A-E\u0915-\u0919])[:.)\-]|([a-e1-5])(?!\.\d)[:.)])\s*)([\s\S]*?)(?=(?:[\s\r\n]+(?:[•*·\-–—]\s*|[oO]\s+)?(?:\(([A-Ea-e1-5]|[\u0915-\u0919])\)\s*|\[([A-Ea-e1-5]|[\u0915-\u0919])\]\s*|(?:([A-E\u0915-\u0919])[:.)\-]|([a-e1-5])(?!\.\d)[:.)])\s*))|$)/g

// Matches board citation tags like [BSEB, 2024 (A)], [2023 A], (CBSE 2023, Set-A), [2024 (A)], 2024 (A)
const BOARD_TERMS = '(?:19\\d\\d|20\\d\\d|B\\.?S\\.?E\\.?B\\.?|C\\.?B\\.?S\\.?E\\.?|I\\.?C\\.?S\\.?E\\.?|I\\.?S\\.?C\\.?|N\\.?C\\.?E\\.?R\\.?T\\.?|J\\.?A\\.?C\\.?|U\\.?P\\.?\\s*Board|M\\.?P\\.?\\s*Board|R\\.?B\\.?S\\.?E\\.?|H\\.?B\\.?S\\.?E\\.?|N\\.?I\\.?O\\.?S\\.?|W\\.?B\\.?\\s*Board|Bihar(?:\\s*Board)?|Jharkhand(?:\\s*Board)?|Rajasthan(?:\\s*Board)?|Board(?:\\s*Exam)?|Annual|Compartment(?:al)?|Model\\s*(?:Paper|Set)|Sample\\s*Paper|Set[-\\s]*[A-Za-z0-9]|बिहार(?:\\s*बोर्ड)?|झारखंड(?:\\s*बोर्ड)?|उत्तर\\s*प्रदेश(?:\\s*बोर्ड)?|मध्य\\s*प्रदेश(?:\\s*बोर्ड)?|राजस्थान(?:\\s*बोर्ड)?|बोर्ड(?:\\s*परीक्षा)?|वार्षिक|प्रतिदर्श|मॉडल\\s*पेपर)'

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

// Multi-character bracketed expressions: matrices, vectors, intervals like [13 15; -1 4], [a b - 1], [-1, 1]
// Does NOT match single option labels like [A], [B], [1], [क], or [ A ]
export const MATH_BRACKET_REGEX = /\[(?!\s*[A-Ea-e1-5\u0915-\u0919]\s*\])[^\]\r\n]{2,150}\]/g

// Multi-character parenthesized expressions: tuples like (a, b), (1, 7), (2, 7) or formulas like (sin⁻¹ x + cos⁻¹ x), (-1/2)
// Does NOT match single option labels like (A), (B), (1), (क), or ( A )
export const MATH_PAREN_REGEX = /\((?!\s*[A-Ea-e1-5\u0915-\u0919]\s*\))[^()\r\n]{2,150}\)/g

// Determinant expressions: | x+1 x+2 x+a | or | a b ; c d |
export const MATH_DETERMINANT_REGEX = /\|(?!\s*\|)[^|\r\n]{2,200}\|/g

/**
 * Protects board exam citations (e.g. "[BSEB, 2024 (A)]") as well as mathematical matrices,
 * determinants, and tuples (e.g. "[2a - 7  1]", "| x+1 x+2 x+a |", "(a, b)") by replacing them with unique placeholders
 * so that numbers or letters inside matrices/formulas are never mistakenly parsed as question options.
 */
export function maskCitations(text: string): {
  maskedText: string
  restore: (str: string) => string
  citations: string[]
} {
  const map: { placeholder: string; original: string }[] = []
  const citations: string[] = []

  // 1. Board citations (e.g. [BSEB, 2024 (A)], (CBSE 2023, Set-A), [2023 A], 2024 (A))
  let maskedText = text.replace(BOARD_CITATION_REGEX, (m) => {
    const placeholder = `__BOARD_CITATION_${map.length}__`
    map.push({ placeholder, original: m })
    citations.push(m)
    return placeholder
  })

  // 2. Determinant expressions: | x+1 x+2 x+a | or | a b ; c d |
  maskedText = maskedText.replace(MATH_DETERMINANT_REGEX, (m) => {
    const placeholder = `__MATH_DET_${map.length}__`
    map.push({ placeholder, original: m })
    return placeholder
  })

  // 3. Multi-character parenthesized expressions: tuples like (a, b), (1, 7) or math formulas
  maskedText = maskedText.replace(MATH_PAREN_REGEX, (m) => {
    const placeholder = `__MATH_PAREN_${map.length}__`
    map.push({ placeholder, original: m })
    return placeholder
  })

  // 4. Multi-character bracketed expressions: matrices, vectors, intervals like [13 15; -1 4], [a b - 1], [-1, 1]
  maskedText = maskedText.replace(MATH_BRACKET_REGEX, (m) => {
    const placeholder = `__MATH_BRACKET_${map.length}__`
    map.push({ placeholder, original: m })
    return placeholder
  })

  const restore = (str: string) => {
    let res = str
    for (let i = map.length - 1; i >= 0; i--) {
      const { placeholder, original } = map[i]
      res = res.replaceAll(placeholder, original)
    }
    return res
  }
  return { maskedText, restore, citations }
}

function getOptionDelimiterStyle(match: RegExpExecArray): string {
  if (match[1]) return 'paren' // (A)
  if (match[2]) return 'bracket' // [A]
  const full = match[0].trim()
  if (full.endsWith('.')) return 'dot'
  if (full.endsWith(')')) return 'close_paren'
  if (full.endsWith(':')) return 'colon'
  if (full.endsWith('-') || full.endsWith('–') || full.endsWith('—')) return 'dash'
  return 'other'
}

/**
 * Validates and extracts the real consecutive MCQ options sequence (e.g. A, B, C, D)
 * preventing incidental single letters or false matches from contaminating options.
 */
export function findBestOptionMatches(matches: RegExpExecArray[]): RegExpExecArray[] {
  if (matches.length < 2) return []

  let bestSeq: RegExpExecArray[] = []

  // Check all positions where an option 'A' begins with delimiter style consistency
  for (let i = 0; i < matches.length - 1; i++) {
    const rawI = matches[i][1] || matches[i][2] || matches[i][3] || matches[i][4] || ''
    const labelI = normalizeOptionLabel(rawI)
    if (labelI !== 'A') continue

    const styleA = getOptionDelimiterStyle(matches[i])
    const seq = [matches[i]]
    const expected = ['A', 'B', 'C', 'D', 'E', 'F']
    let expIdx = 1

    for (let j = i + 1; j < matches.length; j++) {
      const rawJ = matches[j][1] || matches[j][2] || matches[j][3] || matches[j][4] || ''
      const lbl = normalizeOptionLabel(rawJ)
      const styleJ = getOptionDelimiterStyle(matches[j])

      if (lbl === expected[expIdx] && styleJ === styleA) {
        seq.push(matches[j])
        expIdx++
      }
    }

    if (seq.length >= 2 && seq.length > bestSeq.length) {
      bestSeq = seq
    }
  }

  if (bestSeq.length >= 2) return bestSeq

  // Fallback: check without strict style matching if styles differed slightly
  for (let i = 0; i < matches.length - 1; i++) {
    const rawI = matches[i][1] || matches[i][2] || matches[i][3] || matches[i][4] || ''
    const labelI = normalizeOptionLabel(rawI)
    if (labelI !== 'A') continue

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

    if (seq.length >= 2 && seq.length > bestSeq.length) {
      bestSeq = seq
    }
  }

  if (bestSeq.length >= 2) return bestSeq

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
  return /^(?:[•*·\-–—]\s*|[oO]\s+)?(?:\([Aa1\u0915]\)|\[[Aa1\u0915]\]|(?:[A\u0915])[:.)\-]\s*|(?:[a])[:.)]\s*)/.test(t)
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
  if (/^(?:[•*·\-–—]\s*|[oO]\s+)?(?:[A-E\u0915-\u0919][:.)\-]|[a-e][:.)])\s*/.test(t)) {
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
  return ANSWER_KEY_REGEX.test(t) || EXPLANATION_REGEX.test(t) || INSTRUCTION_REGEX.test(t) || COMMENT_REGEX.test(t)
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
  let rawAnswerText: string | undefined
  let explanation: string | undefined
  let instructions: string | undefined
  let comment: string | undefined
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

    // Answer Key check (handles formats like "Ans: A Ram", "उत्तर: (क) भारतेन्दु युग", "Ans: (B) 1", "Ans: सूरदास")
    // Only treat as standalone meta line if line is not an options line
    if (!containsHorizontalOptions(line) && !isOptionLine(line)) {
      const ansMatch = line.match(ANSWER_KEY_REGEX)
      if (ansMatch) {
        const parsedAns = parseAnswerKeyMatch(ansMatch)
        if (parsedAns.optionLetter && ['A', 'B', 'C', 'D', 'E'].includes(parsedAns.optionLetter)) {
          answerKey = parsedAns.optionLetter
          if (parsedAns.extraText && !explanation) {
            explanation = parsedAns.extraText
          }
        } else if (parsedAns.rawAnswerText) {
          const norm = normalizeOptionLabel(parsedAns.rawAnswerText)
          if (['A', 'B', 'C', 'D', 'E'].includes(norm)) {
            answerKey = norm
          } else {
            rawAnswerText = parsedAns.rawAnswerText
            if (!explanation) {
              explanation = parsedAns.rawAnswerText
            }
          }
        }
        continue
      }
    }

    // Explanation check
    const expMatch = line.match(EXPLANATION_REGEX)
    if (expMatch) {
      const newExp = expMatch[1].trim()
      explanation = explanation && explanation !== newExp ? `${explanation} - ${newExp}` : newExp
      continue
    }

    // Instruction check
    const instMatch = line.match(INSTRUCTION_REGEX)
    if (instMatch) {
      instructions = instMatch[1].trim()
      continue
    }

    // Comment / Board check
    const commentMatch = line.match(COMMENT_REGEX)
    if (commentMatch) {
      comment = commentMatch[1].trim()
      continue
    }

    contentLines.push(rawLine)
  }

  let textToParse = contentLines.join('\n').trim()
  if (!textToParse) {
    textToParse = promptFirstLine || rawText
  }

  // Check for inline answer key inside textToParse (mask citations first so citations aren't touched)
  const { maskedText, restore, citations } = maskCitations(textToParse)

  if (!comment && citations.length > 0) {
    comment = citations
      .map(c => {
        const t = c.trim()
        if ((t.startsWith('[') && t.endsWith(']')) || (t.startsWith('(') && t.endsWith(')'))) {
          return t.slice(1, -1).trim()
        }
        return t
      })
      .filter(Boolean)
      .join(', ')
  }

  let maskedParseText = maskedText
  const inlineAns = maskedParseText.match(ANSWER_KEY_REGEX)
  if (inlineAns) {
    const parsedAns = parseAnswerKeyMatch(inlineAns)
    if (parsedAns.optionLetter && ['A', 'B', 'C', 'D', 'E'].includes(parsedAns.optionLetter)) {
      if (!answerKey) answerKey = parsedAns.optionLetter
      if (parsedAns.extraText && !explanation) {
        explanation = parsedAns.extraText
      }
    } else if (parsedAns.rawAnswerText) {
      const norm = normalizeOptionLabel(parsedAns.rawAnswerText)
      if (['A', 'B', 'C', 'D', 'E'].includes(norm)) {
        if (!answerKey) answerKey = norm
      } else {
        if (!rawAnswerText) rawAnswerText = parsedAns.rawAnswerText
        if (!explanation) explanation = parsedAns.rawAnswerText
      }
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

      // Check if tail of option text has Answer Key: e.g. "(D) प्रतिगामी Ans: A Ram"
      const tailAns = optText.match(ANSWER_KEY_REGEX)
      if (tailAns) {
        const parsedAns = parseAnswerKeyMatch(tailAns)
        if (!answerKey && parsedAns.optionLetter) {
          answerKey = parsedAns.optionLetter
        }
        if (parsedAns.extraText && !explanation) {
          explanation = parsedAns.extraText
        }
        if (!answerKey && parsedAns.rawAnswerText) {
          const norm = normalizeOptionLabel(parsedAns.rawAnswerText)
          if (['A', 'B', 'C', 'D', 'E'].includes(norm)) {
            answerKey = norm
          } else {
            rawAnswerText = parsedAns.rawAnswerText
            if (!explanation) explanation = parsedAns.rawAnswerText
          }
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

    // If answerKey was not explicitly given as a letter, but rawAnswerText exists (e.g. "Ans: भारतेन्दु युग" or "Ans: Ram")
    if (!answerKey && rawAnswerText) {
      const rLower = rawAnswerText.trim().toLowerCase()
      const matchedByText = options.find(opt => {
        const oLower = opt.text.trim().toLowerCase()
        return (
          oLower === rLower ||
          (oLower.length >= 2 && rLower === oLower) ||
          (oLower.length > 2 && rLower.includes(oLower)) ||
          (rLower.length > 2 && oLower.includes(rLower))
        )
      })
      if (matchedByText) {
        answerKey = matchedByText.label
      }
    }

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

  // Remove board citations from prompt so the prompt remains clean
  if (citations.length > 0) {
    for (const c of citations) {
      prompt = prompt.replace(c, '').trim()
    }
    // Clean any trailing connector dashes before citation
    prompt = prompt.replace(/\s*[-–—]\s*$/, '').trim()
  }

  // Clean prompt: remove trailing marks tags
  prompt = prompt.replace(MARKS_REGEX, '').trim()

  let fallbackText = textToParse
  if (citations.length > 0) {
    for (const c of citations) {
      fallbackText = fallbackText.replace(c, '').trim()
    }
    fallbackText = fallbackText.replace(/\s*[-–—]\s*$/, '').trim()
  }
  const cleanPrompt = cleanMathAndStructuredText(prompt || fallbackText)

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
    comment: comment ? cleanMathAndStructuredText(comment) : undefined,
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
