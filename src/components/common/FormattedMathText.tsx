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
  type: 'bracketed_frac' | 'fraction' | 'text'
  start?: number
  end?: number
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
 * Tokenizes text into mathematical structures:
 * - Bracketed fractions with exponents: [n(n+1)/2]², (a/b)^2
 * - Standard fractions: n(n+1)(2n+1)/6, 1/2, a₁/a₂, (a+b)/(c+d)
 * - Plain and inline mathematical text
 */
function tokenizeMathText(text: string): MathToken[] {
  if (!text) return []

  // Clean raw LaTeX delimiters or escaped characters if present
  const cleaned = cleanMathAndStructuredText(text)

  // 1. Bracketed fractions with optional powers: e.g. [n(n + 1)/2]² or (n(n + 1)/2)^2
  const bracketedFracRegex =
    /([\[\(])\s*([^/\[\]\(\)]+(?:\([^)]*\)[^/\[\]\(\)]*)*)\s*\/\s*([^/\[\]\(\)]+(?:\([^)]*\)[^/\[\]\(\)]*)*)\s*([\]\)])(?:\s*([\^²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉\d+n-]+))?/g

  // 2. Standard fractions: e.g. n(n + 1)(2n + 1)/6, n(n + 1)/2, 1/2, a₁/a₂, (a + b)/(c + d)
  const fractionRegex =
    /(?:(\([^)]+\)|[a-zA-Z0-9\u0900-\u097F²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ√]+(?:\([^)]*\))*[a-zA-Z0-9\u0900-\u097F²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ√]*))\s*\/\s*(?:(\([^)]+\)|[a-zA-Z0-9\u0900-\u097F²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ√]+))/g

  const matches: MathToken[] = []

  let m: RegExpExecArray | null
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

  while ((m = fractionRegex.exec(cleaned)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    const overlaps = matches.some(x => !(end <= (x.start || 0) || start >= (x.end || 0)))
    if (!overlaps) {
      matches.push({
        type: 'fraction',
        start,
        end,
        num: m[1].trim(),
        den: m[2].trim()
      })
    }
  }

  matches.sort((a, b) => (a.start || 0) - (b.start || 0))

  const tokens: MathToken[] = []
  let cursor = 0
  for (const match of matches) {
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

/**
 * Renders an inline text segment, italicizing isolated math variables (e.g. n, x, ax, bx, a, b, c)
 * and styling superscripts, subscripts, and comparison symbols cleanly.
 */
const InlineTextSegment: React.FC<{ content: string; mathSerif?: boolean }> = ({ content, mathSerif = true }) => {
  const parts = useMemo(() => {
    // Matches:
    // 1. Math variable sequences (1-2 Latin letters in math context): e.g. "ax", "bx", "a", "b", "c", "x", "n"
    // 2. Superscript characters: e.g. "²", "³"
    // 3. Subscript characters: e.g. "₁", "₂"
    // 4. Comparison/Inequality operators: e.g. "≠", "≤", "≥"
    const tokenRegex =
      /(?:(?<=^|[\s\u0900-\u097F,\(=≠<>+\-])([a-zA-Z]{1,2})(?=[\s\u0900-\u097F,\)\.\—\:\-=≠<>+\-₀₁₂₃₄₅₆₇₈₉²³⁴¹⁰⁵⁶⁷⁸⁹]|$)|([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+)|([₀₁₂₃₄₅₆₇₈₉ₐₑₒₓₙᵢⱼₖ]+)|(≠|≤|≥))/g

    const res: Array<{ type: 'var' | 'sup' | 'sub' | 'op' | 'plain'; text: string }> = []
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        res.push({ type: 'plain', text: content.slice(lastIdx, match.index) })
      }
      if (match[1]) {
        res.push({ type: 'var', text: match[1] })
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
        if (p.type === 'var') {
          return (
            <span
              key={idx}
              className={`inline-block ${
                mathSerif ? 'font-serif italic font-medium' : 'font-sans italic'
              } text-[1.05em] px-0.5`}
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
            <sup key={idx} className="font-sans font-bold text-[0.78em] leading-none -top-1 ml-0.5">
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
            <sub key={idx} className="font-sans font-medium text-[0.78em] leading-none align-sub ml-px">
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
 * Renders vertical stacked fractions (numerator over denominator with horizontal bar)
 * identical to actual exam question papers and textbooks.
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
        <sup className="font-sans font-bold text-[0.8em] text-slate-900 leading-none -top-2 ml-0.5">
          {normalPower}
        </sup>
      )}
    </span>
  )
}

/**
 * FormattedMathText
 *
 * Automatically recognizes mathematical fractions, powers, roots, variables,
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
        isOption ? 'inline-flex items-center flex-wrap gap-x-1 min-h-[36px]' : ''
      } ${className}`}
    >
      {tokens.map((token, idx) => {
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
