import React, { useMemo } from 'react'
import { cleanMathAndStructuredText } from '../../utils/mathFormatter'

export interface FormattedMathTextProps {
  text?: string
  className?: string
  inline?: boolean
  isOption?: boolean
  mathSerif?: boolean
}

interface MathToken {
  type:
    | 'determinant'
    | 'matrix'
    | 'integral'
    | 'limit'
    | 'sum'
    | 'bracketed_frac'
    | 'fraction'
    | 'text'
  start?: number
  end?: number
  rows?: string[][]
  lower?: string
  upper?: string
  target?: string
  symbol?: '∑' | '∏'
  open?: string
  num?: string
  den?: string
  close?: string
  power?: string
  content?: string
}

const SUPERSCRIPT_CHARS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  'ⁿ': 'n',
  'ⁱ': 'i',
  '⁺': '+',
  '⁻': '-'
}

const SUBSCRIPT_CHARS: Record<string, string> = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  'ₐ': 'a',
  'ₑ': 'e',
  'ₒ': 'o',
  'ₓ': 'x',
  'ₙ': 'n',
  'ᵢ': 'i',
  'ⱼ': 'j',
  'ₖ': 'k',
  '₊': '+',
  '₋': '-'
}

/**
 * Splits a row string into individual column cell expressions.
 * Handles '&', tabs, 2+ spaces, commas, or simple space-separated tokens.
 */
function parseRowCells(rowStr: string): string[] {
  const trimmed = rowStr.trim()
  if (!trimmed) return []

  if (trimmed.includes('&')) {
    return trimmed.split('&').map(c => c.trim()).filter(Boolean)
  }
  if (trimmed.includes('\t')) {
    return trimmed.split('\t').map(c => c.trim()).filter(Boolean)
  }
  if (/\s{2,}/.test(trimmed)) {
    return trimmed.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
  }
  if (trimmed.includes(',')) {
    return trimmed.split(',').map(c => c.trim()).filter(Boolean)
  }

  // Single space between simple numbers/identifiers like "13 15", "-1 4", "a b c"
  const tokens = trimmed.split(/\s+/).map(c => c.trim()).filter(Boolean)
  if (tokens.length >= 2 && tokens.every(t => /^-?[0-9a-zA-Z\.]+$|^[√π]$/.test(t))) {
    return tokens
  }
  return [trimmed]
}

/**
 * Normalizes Unicode subscript/superscript limit characters into standard ascii.
 */
function normalizeLimitSubSup(str: string): string {
  if (!str) return ''
  return str
    .split('')
    .map(ch => SUBSCRIPT_CHARS[ch] || SUPERSCRIPT_CHARS[ch] || ch)
    .join('')
    .replace(/^\((.*)\)$/, '$1')
    .trim()
}

/**
 * Tokenizes text into rich mathematical structures:
 * - Determinants: | row1 ; row2 ; row3 |, \begin{vmatrix} ... \end{vmatrix}
 * - Matrices: [ 13 15 ; -1 4 ], \begin{bmatrix} ... \end{bmatrix}
 * - Definite Integrals with upper & lower limits: \int_{-1}^1, ∫_{-1}^{1}, ∫₍₋₁₎¹
 * - Limits: \lim_{x \to 0}, lim_{x → 0}
 * - Summations / Products: \sum_{i=1}^n, \prod_{i=1}^n
 * - Bracketed fractions with exponents: [n(n+1)/2]², (a/b)^2
 * - Standard fractions: n(n+1)(2n+1)/6, 1/2, a₁/a₂, 3/17
 * - Plain and inline mathematical text
 */
function tokenizeMathText(text: string): MathToken[] {
  if (!text) return []

  // Clean raw LaTeX delimiters or escaped characters if present
  const cleaned = cleanMathAndStructuredText(text)

  const matches: MathToken[] = []

  // 1. LaTeX Determinants & Matrices
  const latexEnvRegex = /\\begin\{(vmatrix|Vmatrix|bmatrix|pmatrix|matrix)\}([\s\S]*?)\\end\{\1\}/g
  let m: RegExpExecArray | null
  while ((m = latexEnvRegex.exec(cleaned)) !== null) {
    const isDet = m[1] === 'vmatrix' || m[1] === 'Vmatrix'
    const rows = m[2]
      .split(/\\\\|\\cr/)
      .map(r => r.trim())
      .filter(Boolean)
      .map(r => parseRowCells(r))
    if (rows.length > 0) {
      matches.push({
        type: isDet ? 'determinant' : 'matrix',
        start: m.index,
        end: m.index + m[0].length,
        rows
      })
    }
  }

  // 2. Text Determinants with semicolons: | row1 ; row2 ; ... |
  const detSemicolonRegex = /\|\s*([^|;]+(?:;[^|;]+)+)\s*\|/g
  while ((m = detSemicolonRegex.exec(cleaned)) !== null) {
    const rawRows = m[1].split(';').map(r => r.trim()).filter(Boolean)
    if (rawRows.length >= 2) {
      const rows = rawRows.map(r => parseRowCells(r))
      matches.push({
        type: 'determinant',
        start: m.index,
        end: m.index + m[0].length,
        rows
      })
    }
  }

  // 3. Multi-row Determinants: | row1 | | row2 | | row3 |
  const detMultiBarRegex = /\|\s*([^|\r\n;]+?)\s*\|\s*(?:[\r\n\s]*\|\s*([^|\r\n;]+?)\s*\|)+/g
  while ((m = detMultiBarRegex.exec(cleaned)) !== null) {
    const innerRows = Array.from(m[0].matchAll(/\|\s*([^|\r\n]+?)\s*\|/g))
      .map(x => x[1].trim())
      .filter(Boolean)
    if (innerRows.length >= 2) {
      const rows = innerRows.map(r => parseRowCells(r))
      matches.push({
        type: 'determinant',
        start: m.index,
        end: m.index + m[0].length,
        rows
      })
    }
  }

  // 4. Text Matrices with semicolons: [ 13 15 ; -1 4 ]
  const matSemicolonRegex = /\[\s*([^\];]+(?:;[^\];]+)+)\s*\]/g
  while ((m = matSemicolonRegex.exec(cleaned)) !== null) {
    // Avoid board citations like [BSEB, 2024 (A)]
    if (!/bseb|cbse|ncert|\b\d{4}\b/i.test(m[0])) {
      const rawRows = m[1].split(';').map(r => r.trim()).filter(Boolean)
      if (rawRows.length >= 1) {
        const rows = rawRows.map(r => parseRowCells(r))
        matches.push({
          type: 'matrix',
          start: m.index,
          end: m.index + m[0].length,
          rows
        })
      }
    }
  }

  // 5. 1D row vector matrices with 2+ spaces separating elements: [ 2a - 7  1 ]
  const matRowVectorRegex = /\[\s*([a-zA-Z0-9\-\+\.][^\]\r\n;]{2,}?\s{2,}[^\]\r\n;]+?)\s*\]/g
  while ((m = matRowVectorRegex.exec(cleaned)) !== null) {
    if (!/bseb|cbse|ncert|\b\d{4}\b/i.test(m[0])) {
      const cells = parseRowCells(m[1])
      if (cells.length >= 2) {
        matches.push({
          type: 'matrix',
          start: m.index,
          end: m.index + m[0].length,
          rows: [cells]
        })
      }
    }
  }

  // 6. Definite Integrals:
  // - LaTeX/Unicode: ∫_{lower}^{upper}, \int_{lower}^{upper}, ∫^{upper}_{lower}
  // - Unicode subscripts & superscripts: ∫₍₋₁₎¹, ∫₋₁¹, ∫₀¹
  // - Simple limits: \int_{-1}^1, ∫_a^b
  const defIntRegex =
    /(?:\\int|∫)\s*(?:_\{([^{}]+)\}|_\(([^)]+)\)|_([a-zA-Z0-9\-\+\\π]+)|₍([^₎]+)₎|([₀₁₂₃₄₅₆₇₈₉₋₊aeoxnijk]+))\s*(?:\^\{([^{}]+)\}|\^\(([^)]+)\)|\^([a-zA-Z0-9\-\+\\π]+)|⁽([^⁾]+)⁾|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+))/g
  while ((m = defIntRegex.exec(cleaned)) !== null) {
    const rawLower = m[1] || m[2] || m[3] || m[4] || m[5] || ''
    const rawUpper = m[6] || m[7] || m[8] || m[9] || m[10] || ''
    matches.push({
      type: 'integral',
      start: m.index,
      end: m.index + m[0].length,
      lower: normalizeLimitSubSup(rawLower),
      upper: normalizeLimitSubSup(rawUpper)
    })
  }

  // Reverse limit order: ∫^{upper}_{lower}
  const defIntReverseRegex =
    /(?:\\int|∫)\s*(?:\^\{([^{}]+)\}|\^\(([^)]+)\)|\^([a-zA-Z0-9\-\+\\π]+)|⁽([^⁾]+)⁾|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+))\s*(?:_\{([^{}]+)\}|_\(([^)]+)\)|_([a-zA-Z0-9\-\+\\π]+)|₍([^₎]+)₎|([₀₁₂₃₄₅₆₇₈₉₋₊aeoxnijk]+))/g
  while ((m = defIntReverseRegex.exec(cleaned)) !== null) {
    const rawUpper = m[1] || m[2] || m[3] || m[4] || m[5] || ''
    const rawLower = m[6] || m[7] || m[8] || m[9] || m[10] || ''
    matches.push({
      type: 'integral',
      start: m.index,
      end: m.index + m[0].length,
      lower: normalizeLimitSubSup(rawLower),
      upper: normalizeLimitSubSup(rawUpper)
    })
  }

  // 7. Limits: \lim_{x \to 0}, lim_{x → 0}, lim_(x->0), lim₍ₓ→₀₎
  const limitRegex = /(?:\\lim|lim)\s*(?:_\{([^{}]+)\}|_\(([^)]+)\)|₍([^₎]+)₎)/gi
  while ((m = limitRegex.exec(cleaned)) !== null) {
    let target = (m[1] || m[2] || m[3] || '').trim()
    target = target.replace(/\\(?:rightarrow|to)|->/g, '→')
    matches.push({
      type: 'limit',
      start: m.index,
      end: m.index + m[0].length,
      target: normalizeLimitSubSup(target)
    })
  }

  // 8. Summations and Products: \sum_{i=1}^n, ∑_{i=1}^{n}, \prod_{i=1}^n
  const sumRegex =
    /(?:\\sum|∑|\\prod|∏)\s*(?:_\{([^{}]+)\}|_([a-zA-Z0-9\-\+=]+)|₍([^₎]+)₎)?\s*(?:\^\{([^{}]+)\}|\^([a-zA-Z0-9\-\+]+)|⁽([^⁾]+)⁾|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+))?/g
  while ((m = sumRegex.exec(cleaned)) !== null) {
    if (m[1] || m[2] || m[3] || m[4] || m[5] || m[6] || m[7]) {
      const sym = m[0].startsWith('\\prod') || m[0].startsWith('∏') ? '∏' : '∑'
      const rawLower = m[1] || m[2] || m[3] || ''
      const rawUpper = m[4] || m[5] || m[6] || m[7] || ''
      matches.push({
        type: 'sum',
        symbol: sym,
        start: m.index,
        end: m.index + m[0].length,
        lower: normalizeLimitSubSup(rawLower),
        upper: normalizeLimitSubSup(rawUpper)
      })
    }
  }

  // 9. Bracketed fractions with optional powers: e.g. [n(n + 1)/2]² or (n(n + 1)/2)^2
  const bracketedFracRegex =
    /([\[\(])\s*([^/\[\]\(\)]+(?:\([^)]*\)[^/\[\]\(\)]*)*)\s*\/\s*([^/\[\]\(\)]+(?:\([^)]*\)[^/\[\]\(\)]*)*)\s*([\]\)])(?:\s*([\^²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉\d+n-]+))?/g
  while ((m = bracketedFracRegex.exec(cleaned)) !== null) {
    matches.push({
      type: 'bracketed_frac',
      start: m.index,
      end: m.index + m[0].length,
      open: m[1],
      num: m[2].trim(),
      den: m[3].trim(),
      close: m[4],
      power: (m[5] || '').trim()
    })
  }

  // 10. Standard fractions: e.g. n(n + 1)(2n + 1)/6, n(n + 1)/2, 1/2, a₁/a₂, 3/17, 14/3
  const fractionRegex =
    /(?:(\([^)]+\)|[a-zA-Z0-9\u0900-\u097F²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ√]+(?:\([^)]*\))*[a-zA-Z0-9\u0900-\u097F²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ√]*))\s*\/\s*(?:(\([^)]+\)|[a-zA-Z0-9\u0900-\u097F²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ√]+))/g
  while ((m = fractionRegex.exec(cleaned)) !== null) {
    matches.push({
      type: 'fraction',
      start: m.index,
      end: m.index + m[0].length,
      num: m[1].trim(),
      den: m[2].trim()
    })
  }

  // Filter overlapping matches, giving priority to higher level semantic structures (determinants, matrices, integrals)
  matches.sort((a, b) => {
    const diff = (a.start || 0) - (b.start || 0)
    if (diff !== 0) return diff
    return (b.end || 0) - (a.end || 0) // prefer wider match if starts at same pos
  })

  const nonOverlapping: MathToken[] = []
  let lastEnd = 0
  for (const match of matches) {
    const matchStart = match.start || 0
    const matchEnd = match.end || 0
    if (matchStart >= lastEnd) {
      nonOverlapping.push(match)
      lastEnd = matchEnd
    }
  }

  // Interleave with text tokens
  const tokens: MathToken[] = []
  let cursor = 0
  for (const match of nonOverlapping) {
    const matchStart = match.start || 0
    const matchEnd = match.end || 0
    if (matchStart > cursor) {
      tokens.push({ type: 'text', content: cleaned.slice(cursor, matchStart) })
    }
    tokens.push(match)
    cursor = matchEnd
  }
  if (cursor < cleaned.length) {
    tokens.push({ type: 'text', content: cleaned.slice(cursor) })
  }

  return tokens
}

/**
 * Strips outer enclosing parens if redundant, e.g. (n(n+1)) -> n(n+1).
 */
function cleanTerm(str: string): string {
  let s = str.trim()
  if (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0
    let closesAtEnd = true
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === '(') depth++
      else if (s[i] === ')') {
        depth--
        if (depth === 0) {
          closesAtEnd = false
          break
        }
      }
    }
    if (closesAtEnd) {
      s = s.slice(1, -1).trim()
    }
  }
  return s
}

const MATH_FN_REGEX = /^(?:sin|cos|tan|cot|sec|cosec|csc|log|ln|exp|arcsin|arccos|arctan)$/i
const DIFFERENTIAL_REGEX = /^d[a-zA-Zθ]$/

/**
 * Renders an inline text segment, styling variables italic, functions upright,
 * superscripts tightly attached, and operators cleanly spaced.
 */
const InlineTextSegment: React.FC<{ content: string; mathSerif?: boolean }> = ({ content, mathSerif = true }) => {
  const parts = useMemo(() => {
    const tokenRegex =
      /(?:(?<=^|[\s\u0900-\u097F,\(=≠<>+\-])([a-zA-Z]{1,5})(?=[\s\u0900-\u097F,\)\.\—\:\-=≠<>+\-₀₁₂₃₄₅₆₇₈₉²³⁴¹⁰⁵⁶⁷⁸⁹]|$)|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+)|([₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ]+)|(≠|≤|≥|∈|∉|→|⇒|×|·|±|∓|=))/g

    const res: Array<{ type: 'fn' | 'diff' | 'var' | 'sup' | 'sub' | 'op' | 'plain'; text: string }> = []
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        res.push({ type: 'plain', text: content.slice(lastIdx, match.index) })
      }
      if (match[1]) {
        const word = match[1]
        if (MATH_FN_REGEX.test(word)) {
          res.push({ type: 'fn', text: word })
        } else if (DIFFERENTIAL_REGEX.test(word)) {
          res.push({ type: 'diff', text: word })
        } else if (word.length <= 2) {
          res.push({ type: 'var', text: word })
        } else {
          res.push({ type: 'plain', text: word })
        }
      } else if (match[2]) {
        res.push({ type: 'sup', text: match[2] })
      } else if (match[3]) {
        res.push({ type: 'sub', text: match[3] })
      } else if (match[4]) {
        res.push({ type: 'op', text: match[4] })
      }
      lastIdx = match.index + match[0].length
    }
    if (lastIdx < content.length) {
      res.push({ type: 'plain', text: content.slice(lastIdx) })
    }
    return res
  }, [content])

  return (
    <>
      {parts.map((p, idx) => {
        if (p.type === 'fn') {
          return (
            <span
              key={idx}
              className={`inline-block ${mathSerif ? 'font-serif font-normal' : 'font-sans font-medium'} text-[0.98em] mx-0.5 select-text`}
            >
              {p.text}
            </span>
          )
        }
        if (p.type === 'diff') {
          return (
            <span
              key={idx}
              className={`inline-block ${mathSerif ? 'font-serif italic font-medium' : 'font-sans italic'} text-[1.02em] ml-1.5 mr-0.5 select-text`}
            >
              {p.text}
            </span>
          )
        }
        if (p.type === 'var') {
          return (
            <span
              key={idx}
              className={`inline-block ${
                mathSerif ? 'font-serif italic font-medium' : 'font-sans italic'
              } text-[1.05em] px-px select-text`}
            >
              {p.text}
            </span>
          )
        }
        if (p.type === 'sup') {
          const normalPower = p.text
            .split('')
            .map(ch => SUPERSCRIPT_CHARS[ch] || ch)
            .join('')
          return (
            <sup key={idx} className="font-serif font-semibold text-[0.74em] leading-none -top-1.5 ml-px select-text">
              {normalPower}
            </sup>
          )
        }
        if (p.type === 'sub') {
          const normalSub = p.text
            .split('')
            .map(ch => SUBSCRIPT_CHARS[ch] || ch)
            .join('')
          return (
            <sub key={idx} className="font-serif font-medium text-[0.74em] leading-none align-sub ml-px select-text">
              {normalSub}
            </sub>
          )
        }
        if (p.type === 'op') {
          return (
            <span key={idx} className="font-semibold text-slate-900 mx-1 select-text">
              {p.text}
            </span>
          )
        }
        return <span key={idx}>{p.text}</span>
      })}
    </>
  )
}

/**
 * Visual Math Fraction Component.
 * Renders vertical stacked fractions (numerator over denominator with horizontal bar).
 */
const VerticalFraction: React.FC<{ num: string; den: string; mathSerif?: boolean }> = ({
  num,
  den,
  mathSerif = true
}) => {
  const cleanNum = cleanTerm(num)
  const cleanDen = cleanTerm(den)

  return (
    <span
      className={`inline-flex flex-col items-center justify-center text-center align-middle mx-1 my-0.5 leading-none select-text ${
        mathSerif ? 'font-serif' : 'font-sans'
      }`}
    >
      <span className="border-b border-current px-1 pb-0.5 text-center text-[0.92em] font-medium leading-tight">
        <InlineTextSegment content={cleanNum} mathSerif={mathSerif} />
      </span>
      <span className="px-1 pt-0.5 text-center text-[0.92em] font-medium leading-tight">
        <InlineTextSegment content={cleanDen} mathSerif={mathSerif} />
      </span>
    </span>
  )
}

/**
 * Bracketed Fraction Component.
 * Renders tall brackets enclosing a vertical fraction, with an optional exponent (e.g. [n(n+1)/2]²).
 */
const BracketedFraction: React.FC<{
  open?: string
  num: string
  den: string
  close?: string
  power?: string
  mathSerif?: boolean
}> = ({ open = '[', num, den, close = ']', power, mathSerif = true }) => {
  const normalPower = power
    ? power
        .replace(/^\^/, '')
        .split('')
        .map(ch => SUPERSCRIPT_CHARS[ch] || ch)
        .join('')
    : ''

  return (
    <span className="inline-flex items-center align-middle mx-0.5 my-0.5 select-text leading-none">
      <span className="text-xl sm:text-2xl font-light text-slate-700 leading-none select-none inline-block -translate-y-[1px]">
        {open}
      </span>
      <VerticalFraction num={num} den={den} mathSerif={mathSerif} />
      <span className="text-xl sm:text-2xl font-light text-slate-700 leading-none select-none inline-block -translate-y-[1px]">
        {close}
      </span>
      {normalPower && (
        <sup className="font-serif font-bold text-[0.78em] text-slate-900 leading-none -top-2 ml-0.5">
          {normalPower}
        </sup>
      )}
    </span>
  )
}

/**
 * Determinant Component.
 * Renders authentic book-quality vertical straight bars | ... | enclosing an aligned 2D grid.
 */
const DeterminantDisplay: React.FC<{ rows: string[][]; mathSerif?: boolean }> = ({ rows, mathSerif = true }) => {
  return (
    <span className="inline-flex items-stretch align-middle mx-1.5 my-1 select-text">
      {/* Left straight solid vertical line */}
      <span className="w-[1.5px] bg-slate-900 self-stretch rounded-[0.5px]" />
      <table className={`mx-1 border-collapse text-center ${mathSerif ? 'font-serif' : 'font-sans'} text-[0.95em]`}>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2.5 py-0.5 whitespace-nowrap text-center">
                  <FormattedMathText text={cell} inline mathSerif={mathSerif} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Right straight solid vertical line */}
      <span className="w-[1.5px] bg-slate-900 self-stretch rounded-[0.5px]" />
    </span>
  )
}

/**
 * Matrix Component.
 * Renders authentic book-quality square brackets [ ... ] enclosing an aligned 2D grid.
 */
const MatrixDisplay: React.FC<{ rows: string[][]; mathSerif?: boolean }> = ({ rows, mathSerif = true }) => {
  return (
    <span className="inline-flex items-stretch align-middle mx-1.5 my-1 select-text">
      {/* Left square bracket [ */}
      <span className="w-1.5 border-l-[1.5px] border-t-[1.5px] border-b-[1.5px] border-slate-900 self-stretch rounded-l-[2px]" />
      <table className={`mx-1 border-collapse text-center ${mathSerif ? 'font-serif' : 'font-sans'} text-[0.95em]`}>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2 py-0.5 whitespace-nowrap text-center">
                  <FormattedMathText text={cell} inline mathSerif={mathSerif} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Right square bracket ] */}
      <span className="w-1.5 border-r-[1.5px] border-t-[1.5px] border-b-[1.5px] border-slate-900 self-stretch rounded-r-[2px]" />
    </span>
  )
}

/**
 * Definite Integral Component.
 * Renders textbook-quality integral sign ∫ with upper and lower limits vertically stacked.
 */
const DefiniteIntegral: React.FC<{
  lower?: string
  upper?: string
  mathSerif?: boolean
}> = ({ lower, upper, mathSerif = true }) => {
  if (!lower && !upper) {
    return (
      <span className="inline-block text-2xl font-light font-serif leading-none align-middle mx-0.5 select-text text-slate-900">
        ∫
      </span>
    )
  }

  return (
    <span className="inline-flex items-center align-middle mx-1 my-0.5 select-text font-serif">
      <span className="text-2xl sm:text-3xl font-light leading-none select-none text-slate-900 -translate-y-0.5">
        ∫
      </span>
      <span className="inline-flex flex-col text-[0.72em] font-medium leading-[0.85] -ml-1 justify-between h-[1.85em] select-text">
        <span className="leading-none text-left -translate-y-0.5">
          <FormattedMathText text={upper || ''} inline mathSerif={mathSerif} />
        </span>
        <span className="leading-none text-left translate-y-0.5">
          <FormattedMathText text={lower || ''} inline mathSerif={mathSerif} />
        </span>
      </span>
    </span>
  )
}

/**
 * Limit Component.
 * Renders textbook-quality lim with condition stacked directly beneath it.
 */
const LimitDisplay: React.FC<{ target: string; mathSerif?: boolean }> = ({ target, mathSerif = true }) => {
  return (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 select-text">
      <span className={`font-medium text-[1.05em] leading-none ${mathSerif ? 'font-serif italic' : 'font-sans'}`}>
        lim
      </span>
      <span className="text-[0.66em] font-medium leading-none text-slate-800 mt-0.5 whitespace-nowrap">
        <FormattedMathText text={target} inline mathSerif={mathSerif} />
      </span>
    </span>
  )
}

/**
 * Summation / Product Component.
 * Renders ∑ or ∏ with limits stacked above and below.
 */
const SummationDisplay: React.FC<{
  symbol?: '∑' | '∏'
  lower?: string
  upper?: string
  mathSerif?: boolean
}> = ({ symbol = '∑', lower, upper, mathSerif = true }) => {
  return (
    <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-serif select-text">
      {upper && (
        <span className="text-[0.68em] font-medium leading-none mb-0.5">
          <FormattedMathText text={upper} inline mathSerif={mathSerif} />
        </span>
      )}
      <span className="text-xl sm:text-2xl font-light leading-none text-slate-900 select-none">
        {symbol}
      </span>
      {lower && (
        <span className="text-[0.68em] font-medium leading-none mt-0.5">
          <FormattedMathText text={lower} inline mathSerif={mathSerif} />
        </span>
      )}
    </span>
  )
}

/**
 * FormattedMathText
 *
 * Automatically recognizes mathematical fractions, determinants, matrices,
 * definite integrals, limits, summations, powers, roots, variables,
 * and bilingual Hindi/English text, organizing them visually like actual
 * printed questions in real textbook exam papers.
 */
export const FormattedMathText: React.FC<FormattedMathTextProps> = ({
  text = '',
  className = '',
  inline = false,
  isOption = false,
  mathSerif = true
}) => {
  const tokens = useMemo(() => tokenizeMathText(text), [text])

  if (!text) return null

  const Container = inline ? 'span' : 'span'

  return (
    <Container
      className={`break-words select-text ${
        isOption ? 'inline-flex items-baseline flex-wrap gap-x-1' : ''
      } ${className}`}
    >
      {tokens.map((token, idx) => {
        if (token.type === 'determinant') {
          return <DeterminantDisplay key={idx} rows={token.rows || []} mathSerif={mathSerif} />
        }
        if (token.type === 'matrix') {
          return <MatrixDisplay key={idx} rows={token.rows || []} mathSerif={mathSerif} />
        }
        if (token.type === 'integral') {
          return (
            <DefiniteIntegral
              key={idx}
              lower={token.lower}
              upper={token.upper}
              mathSerif={mathSerif}
            />
          )
        }
        if (token.type === 'limit') {
          return <LimitDisplay key={idx} target={token.target || ''} mathSerif={mathSerif} />
        }
        if (token.type === 'sum') {
          return (
            <SummationDisplay
              key={idx}
              symbol={token.symbol}
              lower={token.lower}
              upper={token.upper}
              mathSerif={mathSerif}
            />
          )
        }
        if (token.type === 'bracketed_frac') {
          return (
            <BracketedFraction
              key={idx}
              open={token.open}
              num={token.num || ''}
              den={token.den || ''}
              close={token.close}
              power={token.power}
              mathSerif={mathSerif}
            />
          )
        }
        if (token.type === 'fraction') {
          return (
            <VerticalFraction
              key={idx}
              num={token.num || ''}
              den={token.den || ''}
              mathSerif={mathSerif}
            />
          )
        }
        return <InlineTextSegment key={idx} content={token.content || ''} mathSerif={mathSerif} />
      })}
    </Container>
  )
}

export default FormattedMathText
