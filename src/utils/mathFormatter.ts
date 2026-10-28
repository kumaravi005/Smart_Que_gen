/**
 * Utility for recognizing, cleaning, and structuring mathematical, scientific,
 * and bilingual (Hindi/English) expressions pasted from websites, PDFs, or OCR.
 *
 * Converts raw LaTeX macros, KaTeX/MathJax tokens, and escaped symbols into
 * clean, human-readable Unicode text suitable for display, editing, and printing.
 */

// Mapping of common superscript characters
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'n': 'ⁿ',
  'i': 'ⁱ',
  'x': 'ˣ',
  'y': 'ʸ'
}

// Mapping of common subscript characters
const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'o': 'ₒ',
  'x': 'ₓ',
  'n': 'ₙ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ'
}

function toSuperscript(str: string): string {
  return str
    .split('')
    .map(ch => SUPERSCRIPT_MAP[ch] || ch)
    .join('')
}

function toSubscript(str: string): string {
  return str
    .split('')
    .map(ch => SUBSCRIPT_MAP[ch] || ch)
    .join('')
}

/**
 * Extracts balanced curly braces content starting at a specific index '{'.
 */
function extractBalancedBraces(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null
  let depth = 0
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) {
        return { content: str.slice(startIndex + 1, i), endIndex: i }
      }
    }
  }
  return null
}

/**
 * Checks if a string has + or - at the top level (outside parentheses, brackets, or braces).
 */
function hasTopLevelAdditionOrSubtraction(str: string): boolean {
  let depth = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') depth--
    else if (depth === 0 && (ch === '+' || ch === '-' || ch === '=')) {
      return true
    }
  }
  return false
}

/**
 * Strips outer enclosing parentheses if they enclose the entire expression and are redundant.
 */
function unwrapRedundantParens(str: string): string {
  let s = str.trim()
  while (s.startsWith('(') && s.endsWith(')')) {
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
    if (!closesAtEnd) break
    s = s.slice(1, -1).trim()
  }
  return s
}

/**
 * Resolves LaTeX fractions (including nested, unbraced, and with roots/functions) into readable 'a/b'.
 */
function resolveFractions(text: string): string {
  // Normalize single-token unbraced arguments: e.g. \frac1{\cot A} -> \frac{1}{\cot A}, \frac12 -> \frac{1}{2}
  text = text.replace(/\\(?:frac|dfrac|tfrac)\s*([0-9a-zA-Z])\s*\{/g, '\\frac{$1}{')
  text = text.replace(/\\(?:frac|dfrac|tfrac)\s*\{([^{}]+)\}\s*([0-9a-zA-Z])(?![a-zA-Z])/g, '\\frac{$1}{$2}')
  text = text.replace(/\\(?:frac|dfrac|tfrac)\s*([0-9a-zA-Z])\s*([0-9a-zA-Z])(?![a-zA-Z])/g, '\\frac{$1}{$2}')

  const fracRegex = /\\(?:frac|dfrac|tfrac)\s*\{/
  let match = fracRegex.exec(text)
  while (match) {
    const fracStart = match.index
    const openBrace1 = fracStart + match[0].length - 1
    const brace1 = extractBalancedBraces(text, openBrace1)
    if (!brace1) break

    const rest = text.slice(brace1.endIndex + 1)
    const nextNonSpace = rest.search(/\S/)
    if (nextNonSpace === -1) break

    let denRaw = ''
    let replaceEndIndex = brace1.endIndex

    if (rest[nextNonSpace] === '{') {
      const openBrace2 = brace1.endIndex + 1 + nextNonSpace
      const brace2 = extractBalancedBraces(text, openBrace2)
      if (!brace2) break
      denRaw = brace2.content
      replaceEndIndex = brace2.endIndex
    } else if (/[0-9a-zA-Z]/.test(rest[nextNonSpace])) {
      denRaw = rest[nextNonSpace]
      replaceEndIndex = brace1.endIndex + 1 + nextNonSpace
    } else {
      break
    }

    const num = resolveFractions(cleanMathAndStructuredText(brace1.content)).trim()
    const den = resolveFractions(cleanMathAndStructuredText(denRaw)).trim()

    const unwrappedNum = unwrapRedundantParens(num)
    const numNeedsParen = hasTopLevelAdditionOrSubtraction(unwrappedNum)
    const finalNum = numNeedsParen ? `(${unwrappedNum})` : unwrappedNum

    const unwrappedDen = unwrapRedundantParens(den)
    const denNeedsParen = hasTopLevelAdditionOrSubtraction(unwrappedDen)
    const finalDen = denNeedsParen ? `(${unwrappedDen})` : unwrappedDen

    text = text.slice(0, fracStart) + `${finalNum}/${finalDen}` + text.slice(replaceEndIndex + 1)
    match = fracRegex.exec(text)
  }
  return text
}

/**
 * Resolves LaTeX roots: \sqrt[3]{...} -> ∛..., \sqrt{...} -> √(x² + y²) or √x.
 */
function resolveRoots(text: string): string {
  text = text.replace(/\\sqrt\s*\[\s*3\s*\]\s*\{([^{}]+)\}/g, '∛$1')
  text = text.replace(/\\sqrt\s*\[\s*4\s*\]\s*\{([^{}]+)\}/g, '∜$1')
  text = text.replace(/\\sqrt\s*\[\s*([a-zA-Z0-9]+)\s*\]\s*\{([^{}]+)\}/g, '[$1]√$2')

  const sqrtRegex = /\\sqrt\s*\{/
  let match = sqrtRegex.exec(text)
  while (match) {
    const sqrtStart = match.index
    const openBrace = sqrtStart + match[0].length - 1
    const brace = extractBalancedBraces(text, openBrace)
    if (!brace) break

    const inner = cleanMathAndStructuredText(brace.content).trim()
    const needsParens = /[+\-=\s]/.test(inner) && !inner.startsWith('(')
    const formatted = needsParens ? `√(${inner})` : `√${inner}`

    text = text.slice(0, sqrtStart) + formatted + text.slice(brace.endIndex + 1)
    match = sqrtRegex.exec(text)
  }

  text = text.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1')
  text = text.replace(/\bsqrt\s*\(([^)]+)\)/gi, '√$1')
  return text
}

/**
 * Normalizes and cleans raw math/LaTeX text into clean, structured, human-readable text.
 * Handles fractions, geometry (△, ~, ≅, ⊥, ∥), roots, superscripts/subscripts,
 * Greek letters, comparison operators, and LaTeX wrappers like \(...\), \[...\], $$...$$.
 */
export function cleanMathAndStructuredText(input: string): string {
  if (!input) return ''

  let text = input

  // 1. Remove outer math block delimiters: \( ... \), \[ ... \], $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$1')
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$1')
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, '$1')

  // Remove stray escaped math parenthesis delimiters if any remain
  text = text.replace(/\\\(|\\\)|\\\[|\\\]/g, '')

  // Remove inline single-dollar math wrappers when containing formula chars
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, inner) => {
    if (/^\s*\d+(?:\.\d+)?\s*$/.test(inner)) {
      return `$${inner}`
    }
    return inner
  })

  // 2. Unpack text and styling wrappers: \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}
  let prevText = ''
  while (prevText !== text) {
    prevText = text
    text = text.replace(
      /\\(?:text|mathrm|mathbf|mathit|textbf|textit|textsf|mathtt|boldsymbol|bm)\s*\{([^{}]+)\}/g,
      '$1'
    )
  }

  // 3. Remove \left and \right modifiers
  text = text.replace(/\\left\s*([(\[{|])/g, '$1')
  text = text.replace(/\\right\s*([)\]}|])/g, '$1')
  text = text.replace(/\\left\./g, '')
  text = text.replace(/\\right\./g, '')

  // 4. Geometry and Similarity Symbols (e.g. \triangle ABC \sim \triangle PQR -> △ABC ~ △PQR)
  text = text.replace(/\\(?:triangle|bigtriangleup)(?![a-zA-Z])\s*/g, '△')
  text = text.replace(/\\sim(?![a-zA-Z])/g, '~')
  text = text.replace(/\\cong(?![a-zA-Z])/g, '≅')
  text = text.replace(/\\perp(?![a-zA-Z])/g, '⊥')
  text = text.replace(/\\parallel(?![a-zA-Z])/g, '∥')
  text = text.replace(/\\angle(?![a-zA-Z])\s*/g, '∠')
  text = text.replace(/\\measuredangle(?![a-zA-Z])\s*/g, '∡')
  text = text.replace(/\\square(?![a-zA-Z])\s*/g, '□')
  text = text.replace(/\\odot(?![a-zA-Z])\s*/g, '⊙')

  // Degrees: ^\circ, ^{\circ}, \degree
  text = text.replace(/\^\s*\{\s*\\circ\s*\}/g, '°')
  text = text.replace(/\^\s*\\circ(?![a-zA-Z])/g, '°')
  text = text.replace(/\\degree(?![a-zA-Z])/g, '°')
  text = text.replace(/\\circ(?![a-zA-Z])/g, '°')

  // 5. Trigonometric and standard function prefixes
  // Matches \sin29 -> sin 29, \cos61 -> cos 61, \tan45 -> tan 45
  text = text.replace(/\\(sin|cos|tan|cot|sec|csc|cosec|log|ln|lim|exp|max|min)(?![a-zA-Z])\s*([0-9]+)/gi, '$1 $2')
  text = text.replace(/\\(sin|cos|tan|cot|sec|csc|cosec|log|ln|lim|exp|max|min)(?![a-zA-Z])/gi, '$1')
  // Clean if already without backslash but squished to digits: e.g. "sin29°" -> "sin 29°", "cos61°" -> "cos 61°"
  text = text.replace(/\b(sin|cos|tan|cot|sec|csc|cosec|log|ln|lim|exp|max|min)\s*([0-9]+)/gi, '$1 $2')

  // 6. Fractions & Roots (balanced braces)
  text = resolveFractions(text)
  text = resolveRoots(text)

  // 7. Superscripts and Subscripts
  // Curly brace superscripts: e.g. x^{2} -> x²
  text = text.replace(/\^\s*\{([^{}]+)\}/g, (_m, content) => {
    const trimmed = content.trim()
    const converted = toSuperscript(trimmed)
    return converted !== trimmed ? converted : `^(${trimmed})`
  })

  // Single char superscripts: e.g. x^2 -> x², x^3 -> x³
  text = text.replace(/\^([0-9+\-=()nixy])/g, (_m, ch) => SUPERSCRIPT_MAP[ch] || `^${ch}`)

  // Curly brace subscripts: e.g. x_{1} -> x₁
  text = text.replace(/_\s*\{([^{}]+)\}/g, (_m, content) => {
    const trimmed = content.trim()
    const converted = toSubscript(trimmed)
    return converted !== trimmed ? converted : `_(${trimmed})`
  })

  // Single char subscripts: e.g. x_1 -> x₁, x_2 -> x₂
  text = text.replace(/_([0-9+\-=()aeoxnijk])/g, (_m, ch) => SUBSCRIPT_MAP[ch] || `_${ch}`)

  // 8. Arithmetic & Comparison Operators
  text = text.replace(/\\times(?![a-zA-Z])/g, '×')
  text = text.replace(/\\div(?![a-zA-Z])/g, '÷')
  text = text.replace(/\\pm(?![a-zA-Z])/g, '±')
  text = text.replace(/\\mp(?![a-zA-Z])/g, '∓')
  text = text.replace(/\\cdot(?![a-zA-Z])/g, '·')
  text = text.replace(/\\bullet(?![a-zA-Z])/g, '•')
  text = text.replace(/\\ast(?![a-zA-Z])/g, '*')
  text = text.replace(/\\leq(?![a-zA-Z])|\\le(?!(?:ft|q|arn)[a-zA-Z])\s*/g, ' ≤ ')
  text = text.replace(/\\geq(?![a-zA-Z])|\\ge(?!(?:q|t)[a-zA-Z])\s*/g, ' ≥ ')
  text = text.replace(/\\neq(?![a-zA-Z])|\\neq\s*/g, ' ≠ ')
  text = text.replace(/\\ne(?!(?:g|arrow|wline)[a-zA-Z])\s*/g, ' ≠ ')
  text = text.replace(/\\approx(?![a-zA-Z])/g, '≈')
  text = text.replace(/\\equiv(?![a-zA-Z])/g, '≡')
  text = text.replace(/\\propto(?![a-zA-Z])/g, '∝')
  text = text.replace(/\\infty(?![a-zA-Z])/g, '∞')

  // Arrows
  text = text.replace(/\\rightarrow(?![a-zA-Z])|\\to(?![a-zA-Z])/g, '→')
  text = text.replace(/\\leftarrow(?![a-zA-Z])/g, '←')
  text = text.replace(/\\Rightarrow(?![a-zA-Z])/g, '⇒')
  text = text.replace(/\\Leftarrow(?![a-zA-Z])/g, '⇐')
  text = text.replace(/\\Leftrightarrow(?![a-zA-Z])/g, '⇔')

  // Calculus & Set Theory
  text = text.replace(/\\sum(?![a-zA-Z])/g, '∑')
  text = text.replace(/\\prod(?![a-zA-Z])/g, '∏')
  text = text.replace(/\\int(?![a-zA-Z])/g, '∫')
  text = text.replace(/\\partial(?![a-zA-Z])/g, '∂')
  text = text.replace(/\\nabla(?![a-zA-Z])/g, '∇')
  text = text.replace(/\\subset(?![a-zA-Z])/g, '⊂')
  text = text.replace(/\\supset(?![a-zA-Z])/g, '⊃')
  text = text.replace(/\\subseteq(?![a-zA-Z])/g, '⊆')
  text = text.replace(/\\supseteq(?![a-zA-Z])/g, '⊇')
  text = text.replace(/\\in(?![a-zA-Z])/g, '∈')
  text = text.replace(/\\notin(?![a-zA-Z])/g, '∉')
  text = text.replace(/\\cup(?![a-zA-Z])/g, '∪')
  text = text.replace(/\\cap(?![a-zA-Z])/g, '∩')
  text = text.replace(/\\emptyset(?![a-zA-Z])/g, '∅')

  // 9. Greek Letters (common in CBSE/State board physics & maths)
  text = text.replace(/\\alpha(?![a-zA-Z])/g, 'α')
  text = text.replace(/\\beta(?![a-zA-Z])/g, 'β')
  text = text.replace(/\\gamma(?![a-zA-Z])/g, 'γ')
  text = text.replace(/\\delta(?![a-zA-Z])/g, 'δ')
  text = text.replace(/\\epsilon(?![a-zA-Z])|\\varepsilon(?![a-zA-Z])/g, 'ε')
  text = text.replace(/\\zeta(?![a-zA-Z])/g, 'ζ')
  text = text.replace(/\\eta(?![a-zA-Z])/g, 'η')
  text = text.replace(/\\theta(?![a-zA-Z])|\\vartheta(?![a-zA-Z])/g, 'θ')
  text = text.replace(/\\iota(?![a-zA-Z])/g, 'ι')
  text = text.replace(/\\kappa(?![a-zA-Z])/g, 'κ')
  text = text.replace(/\\lambda(?![a-zA-Z])/g, 'λ')
  text = text.replace(/\\mu(?![a-zA-Z])/g, 'μ')
  text = text.replace(/\\nu(?![a-zA-Z])/g, 'ν')
  text = text.replace(/\\xi(?![a-zA-Z])/g, 'ξ')
  text = text.replace(/\\pi(?![a-zA-Z])|\\varpi(?![a-zA-Z])/g, 'π')
  text = text.replace(/\\rho(?![a-zA-Z])|\\varrho(?![a-zA-Z])/g, 'ρ')
  text = text.replace(/\\sigma(?![a-zA-Z])|\\varsigma(?![a-zA-Z])/g, 'σ')
  text = text.replace(/\\tau(?![a-zA-Z])/g, 'τ')
  text = text.replace(/\\upsilon(?![a-zA-Z])/g, 'υ')
  text = text.replace(/\\phi(?![a-zA-Z])|\\varphi(?![a-zA-Z])/g, 'φ')
  text = text.replace(/\\chi(?![a-zA-Z])/g, 'χ')
  text = text.replace(/\\psi(?![a-zA-Z])/g, 'ψ')
  text = text.replace(/\\omega(?![a-zA-Z])/g, 'ω')

  // Capital Greek
  text = text.replace(/\\Gamma(?![a-zA-Z])/g, 'Γ')
  text = text.replace(/\\Delta(?![a-zA-Z])/g, 'Δ')
  text = text.replace(/\\Theta(?![a-zA-Z])/g, 'Θ')
  text = text.replace(/\\Lambda(?![a-zA-Z])/g, 'Λ')
  text = text.replace(/\\Xi(?![a-zA-Z])/g, 'Ξ')
  text = text.replace(/\\Pi(?![a-zA-Z])/g, 'Π')
  text = text.replace(/\\Sigma(?![a-zA-Z])/g, 'Σ')
  text = text.replace(/\\Upsilon(?![a-zA-Z])/g, 'Υ')
  text = text.replace(/\\Phi(?![a-zA-Z])/g, 'Φ')
  text = text.replace(/\\Psi(?![a-zA-Z])/g, 'Ψ')
  text = text.replace(/\\Omega(?![a-zA-Z])/g, 'Ω')

  // 10. Clean escaped formatting symbols like \% -> %, \& -> &, \_ -> _
  text = text.replace(/\\([%&$#_{}])/g, '$1')

  // Clean LaTeX spacing commands: \,, \;, \!, \quad, \qquad, \enspace
  text = text.replace(/\\[,;!]|\\quad(?![a-zA-Z])|\\qquad(?![a-zA-Z])|\\enspace(?![a-zA-Z])/g, ' ')

  // 11. Smart mathematical spacing normalization
  // Space around addition + when missing: e.g. "cot A+1/cot A" -> "cot A + 1/cot A", "tan² A+1" -> "tan² A + 1"
  text = text.replace(/([a-zA-Z0-9\u0900-\u097Fα-ωΑ-Ω²³⁴⁰¹⁵⁶⁷⁸⁹\)])\s*\+\s*([a-zA-Z0-9\u0900-\u097Fα-ωΑ-Ω\\(√])/g, '$1 + $2')

  // Space around subtraction - when between terms
  text = text.replace(/([a-zA-Z0-9α-ωΑ-Ω²³⁴⁰¹⁵⁶⁷⁸⁹\)])\s*-\s*([a-zA-Z0-9α-ωΑ-Ω\\(√])/g, '$1 - $2')

  // Space around equals when missing spaces: e.g. "AB=10" -> "AB = 10", "A=2" -> "A = 2"
  text = text.replace(/([^\s=])\s*(?<!=)=(?!=)\s*([^\s=])/g, '$1 = $2')

  // Space around inequality ≠, ≤, ≥
  text = text.replace(/([^\s≠≤≥])\s*(≠|≤|≥)\s*([^\s≠≤≥])/g, '$1 $2 $3')

  // Clean unescaped 'ne' when attached to subscripts, superscripts, or closing brackets: e.g. a₁/a₂neb₁/b₂ -> a₁/a₂ ≠ b₁/b₂
  text = text.replace(
    /([\u2080-\u2089\u2090-\u209C\u00B2\u00B3\u2070-\u2079\/\)\]])\s*ne\s*([a-zA-Z0-9\u2080-\u2089\u00B2\u00B3\u2074\u00B9\u2070\\(])/g,
    (_m, p1, p2) => `${p1} ≠ ${p2}`
  )

  // Standalone whole word 'ne' between math variables or numbers: e.g. "a ne 0" -> "a ≠ 0", "x ne y" -> "x ≠ y"
  text = text.replace(
    /(^|[\s,(=])([a-zA-Z0-9\u2080-\u2089])\s+\bne\b\s+([a-zA-Z0-9\u2080-\u2089])(?=[\s,).—:-]|$)/g,
    (_m, p0, p1, p2) => `${p0}${p1} ≠ ${p2}`
  )

  // Space after commas: e.g. "= 2,तो" -> "= 2, तो"
  text = text.replace(/,([a-zA-Z0-9\u0900-\u097F])/g, ', $1')

  // Space around similarity operator ~: e.g. "△ABC~△PQR" -> "△ABC ~ △PQR"
  text = text.replace(/([a-zA-Z0-9\u0900-\u097F])\s*~\s*([a-zA-Z0-9\u0900-\u097F△])/g, '$1 ~ $2')
  text = text.replace(/([△][a-zA-Z0-9]+)\s*~\s*([△][a-zA-Z0-9]+)/g, '$1 ~ $2')

  // Space before Devanagari words after math symbols / numbers if squished
  // e.g. "10सेमी" -> "10 सेमी", "40/3सेमी" -> "40/3 सेमी", "61°का" -> "61° का"
  text = text.replace(/([0-9⁰¹²³⁴⁵⁶⁷⁸⁹°])([\u0900-\u097F])/g, '$1 $2')

  // Remove any remaining stray backslashes before plain alphanumeric words
  text = text.replace(/\\([a-zA-Z]+)(?![a-zA-Z])/g, '$1')

  // Collapse multiple spaces into single space, preserving newlines
  text = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim()

  return text
}
