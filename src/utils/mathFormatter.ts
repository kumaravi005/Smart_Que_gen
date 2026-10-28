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
 * Resolves LaTeX fractions (including nested and with roots) into readable 'a/b' or '(a)/b'.
 */
function resolveFractions(text: string): string {
  const fracRegex = /\\(?:frac|dfrac|tfrac)\s*\{/
  let match = fracRegex.exec(text)
  while (match) {
    const fracStart = match.index
    const openBrace1 = fracStart + match[0].length - 1
    const brace1 = extractBalancedBraces(text, openBrace1)
    if (!brace1) break

    const rest = text.slice(brace1.endIndex + 1)
    const openBrace2Offset = rest.search(/\S/)
    if (openBrace2Offset === -1 || rest[openBrace2Offset] !== '{') break
    const openBrace2 = brace1.endIndex + 1 + openBrace2Offset
    const brace2 = extractBalancedBraces(text, openBrace2)
    if (!brace2) break

    const num = resolveFractions(cleanMathAndStructuredText(brace1.content)).trim()
    const den = resolveFractions(cleanMathAndStructuredText(brace2.content)).trim()

    const numNeedsParen = /[+\-=\s]/.test(num) && !num.startsWith('(')
    const denNeedsParen = /[+\-=\s]/.test(den) && !den.startsWith('(')

    const finalNum = numNeedsParen ? `(${num})` : num
    const finalDen = denNeedsParen ? `(${den})` : den

    text = text.slice(0, fracStart) + `${finalNum}/${finalDen}` + text.slice(brace2.endIndex + 1)
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
  text = text.replace(/\\(?:triangle|bigtriangleup)\b\s*/g, '△')
  text = text.replace(/\\sim\b/g, '~')
  text = text.replace(/\\cong\b/g, '≅')
  text = text.replace(/\\perp\b/g, '⊥')
  text = text.replace(/\\parallel\b/g, '∥')
  text = text.replace(/\\angle\b\s*/g, '∠')
  text = text.replace(/\\measuredangle\b\s*/g, '∡')
  text = text.replace(/\\square\b\s*/g, '□')
  text = text.replace(/\\odot\b\s*/g, '⊙')

  // Degrees: ^\circ, ^{\circ}, \degree
  text = text.replace(/\^\s*\{\s*\\circ\s*\}/g, '°')
  text = text.replace(/\^\s*\\circ\b/g, '°')
  text = text.replace(/\\degree\b/g, '°')
  text = text.replace(/\\circ\b/g, '°')

  // 5. Fractions & Roots (balanced braces)
  text = resolveFractions(text)
  text = resolveRoots(text)

  // 6. Superscripts and Subscripts
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

  // 7. Arithmetic & Comparison Operators
  text = text.replace(/\\times\b/g, '×')
  text = text.replace(/\\div\b/g, '÷')
  text = text.replace(/\\pm\b/g, '±')
  text = text.replace(/\\mp\b/g, '∓')
  text = text.replace(/\\cdot\b/g, '·')
  text = text.replace(/\\bullet\b/g, '•')
  text = text.replace(/\\ast\b/g, '*')
  text = text.replace(/\\star\b/g, '*')
  text = text.replace(/\\le\b|\\leq\b/g, '≤')
  text = text.replace(/\\ge\b|\\geq\b/g, '≥')
  text = text.replace(/\\neq\b|\\ne\b/g, '≠')
  text = text.replace(/\\approx\b/g, '≈')
  text = text.replace(/\\equiv\b/g, '≡')
  text = text.replace(/\\propto\b/g, '∝')
  text = text.replace(/\\infty\b/g, '∞')

  // Arrows
  text = text.replace(/\\rightarrow\b|\\to\b/g, '→')
  text = text.replace(/\\leftarrow\b/g, '←')
  text = text.replace(/\\Rightarrow\b/g, '⇒')
  text = text.replace(/\\Leftarrow\b/g, '⇐')
  text = text.replace(/\\Leftrightarrow\b/g, '⇔')

  // Calculus & Set Theory
  text = text.replace(/\\sum\b/g, '∑')
  text = text.replace(/\\prod\b/g, '∏')
  text = text.replace(/\\int\b/g, '∫')
  text = text.replace(/\\partial\b/g, '∂')
  text = text.replace(/\\nabla\b/g, '∇')
  text = text.replace(/\\subset\b/g, '⊂')
  text = text.replace(/\\supset\b/g, '⊃')
  text = text.replace(/\\subseteq\b/g, '⊆')
  text = text.replace(/\\supseteq\b/g, '⊇')
  text = text.replace(/\\in\b/g, '∈')
  text = text.replace(/\\notin\b/g, '∉')
  text = text.replace(/\\cup\b/g, '∪')
  text = text.replace(/\\cap\b/g, '∩')
  text = text.replace(/\\emptyset\b/g, '∅')

  // 8. Greek Letters (common in CBSE/State board physics & maths)
  text = text.replace(/\\alpha\b/g, 'α')
  text = text.replace(/\\beta\b/g, 'β')
  text = text.replace(/\\gamma\b/g, 'γ')
  text = text.replace(/\\delta\b/g, 'δ')
  text = text.replace(/\\epsilon\b|\\varepsilon\b/g, 'ε')
  text = text.replace(/\\zeta\b/g, 'ζ')
  text = text.replace(/\\eta\b/g, 'η')
  text = text.replace(/\\theta\b|\\vartheta\b/g, 'θ')
  text = text.replace(/\\iota\b/g, 'ι')
  text = text.replace(/\\kappa\b/g, 'κ')
  text = text.replace(/\\lambda\b/g, 'λ')
  text = text.replace(/\\mu\b/g, 'μ')
  text = text.replace(/\\nu\b/g, 'ν')
  text = text.replace(/\\xi\b/g, 'ξ')
  text = text.replace(/\\pi\b|\\varpi\b/g, 'π')
  text = text.replace(/\\rho\b|\\varrho\b/g, 'ρ')
  text = text.replace(/\\sigma\b|\\varsigma\b/g, 'σ')
  text = text.replace(/\\tau\b/g, 'τ')
  text = text.replace(/\\upsilon\b/g, 'υ')
  text = text.replace(/\\phi\b|\\varphi\b/g, 'φ')
  text = text.replace(/\\chi\b/g, 'χ')
  text = text.replace(/\\psi\b/g, 'ψ')
  text = text.replace(/\\omega\b/g, 'ω')

  // Capital Greek
  text = text.replace(/\\Gamma\b/g, 'Γ')
  text = text.replace(/\\Delta\b/g, 'Δ')
  text = text.replace(/\\Theta\b/g, 'Θ')
  text = text.replace(/\\Lambda\b/g, 'Λ')
  text = text.replace(/\\Xi\b/g, 'Ξ')
  text = text.replace(/\\Pi\b/g, 'Π')
  text = text.replace(/\\Sigma\b/g, 'Σ')
  text = text.replace(/\\Upsilon\b/g, 'Υ')
  text = text.replace(/\\Phi\b/g, 'Φ')
  text = text.replace(/\\Psi\b/g, 'Ψ')
  text = text.replace(/\\Omega\b/g, 'Ω')

  // 9. Trigonometric and standard function prefixes
  text = text.replace(/\\(sin|cos|tan|cot|sec|csc|cosec|log|ln|lim|max|min)\b/g, '$1')

  // 10. Clean escaped formatting symbols like \% -> %, \& -> &, \_ -> _
  text = text.replace(/\\([%&$#_{}])/g, '$1')

  // Clean LaTeX spacing commands: \,, \;, \!, \quad, \qquad, \enspace
  text = text.replace(/\\[,;!]|\\quad\b|\\qquad\b|\\enspace\b/g, ' ')

  // 11. Smart mathematical spacing normalization
  // Space around equals when missing spaces: e.g. "AB=10" -> "AB = 10", "x=5" -> "x = 5"
  text = text.replace(/([a-zA-Z0-9\u0900-\u097Fα-ωΑ-Ω])=([a-zA-Z0-9\u0900-\u097Fα-ωΑ-Ω])/g, '$1 = $2')

  // Space around similarity operator ~: e.g. "△ABC~△PQR" -> "△ABC ~ △PQR"
  text = text.replace(/([a-zA-Z0-9\u0900-\u097F])~([a-zA-Z0-9\u0900-\u097F△])/g, '$1 ~ $2')
  text = text.replace(/([△][a-zA-Z0-9]+)~([△][a-zA-Z0-9]+)/g, '$1 ~ $2')

  // Space before Devanagari words after math symbols / numbers if squished
  // e.g. "10सेमी" -> "10 सेमी", "40/3सेमी" -> "40/3 सेमी"
  text = text.replace(/([0-9⁰¹²³⁴⁵⁶⁷⁸⁹])([\u0900-\u097F])/g, '$1 $2')

  // Remove any remaining stray backslashes before plain alphanumeric words
  text = text.replace(/\\([a-zA-Z]+)\b/g, '$1')

  // Collapse multiple spaces into single space, preserving newlines
  text = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim()

  return text
}
