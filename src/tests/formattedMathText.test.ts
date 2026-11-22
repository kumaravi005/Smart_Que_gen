import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { FormattedMathText } from '../components/common/FormattedMathText'

describe('FormattedMathText Component', () => {
  it('renders vertical fractions with numerator, denominator, and fraction bar', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: 'n(n + 1)(2n + 1)/6', isOption: true }))
    expect(html).toContain('border-b')
    expect(html).toContain('6')
    expect(html).toContain('+ 1)(2n + 1)')
  })

  it('renders bracketed fraction with superscript power', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: '[n(n + 1)/2]²', isOption: true }))
    expect(html).toContain('[')
    expect(html).toContain('border-b')
    expect(html).toContain('2')
    expect(html).toContain(']')
    expect(html).toContain('<sup')
    expect(html).toContain('2</sup>')
  })

  it('renders bilingual Hindi question prompt with styled math variable', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: '66. प्रथम n प्राकृतिक संख्याओं का योगफल है—' }))
    expect(html).toContain('प्रथम')
    expect(html).toContain('प्राकृतिक संख्याओं का योगफल है—')
    expect(html).toContain('font-serif italic')
    expect(html).toContain('n')
  })

  it('handles raw LaTeX fractions transparently', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: '\\frac{n(n+1)}2', isOption: true }))
    expect(html).toContain('border-b')
    expect(html).toContain('2')
    expect(html).toContain('+ 1)')
  })

  it('renders vertical fractions with subscripts and not equal operator (Screenshot 2)', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: 'a₁/a₂ ≠ b₁/b₂', isOption: true }))
    expect(html).toContain('border-b')
    expect(html).toContain('a')
    expect(html).toContain('b')
    expect(html).toContain('≠')
  })

  it('renders quadratic equation variables and inequality options (Screenshot 1)', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: 'ax² + bx + c = 0' }))
    expect(html).toContain('ax')
    expect(html).toContain('<sup')
    expect(html).toContain('2</sup>')
    expect(html).toContain('bx')
    expect(html).toContain('c')

    const optHtml = renderToString(React.createElement(FormattedMathText, { text: 'a ≠ 0', isOption: true }))
    expect(optHtml).toContain('a')
    expect(optHtml).toContain('≠')
    expect(optHtml).toContain('0')
  })

  it('renders definite integrals with upper and lower limits (Screenshot 1 & 2)', () => {
    // Test LaTeX definite integral: \int_{-1}^1 x^{17} \cos^4 x dx =
    const html1 = renderToString(React.createElement(FormattedMathText, { text: '\\int_{-1}^1 x^{17} \\cos^4 x dx =' }))
    expect(html1).toContain('∫')
    expect(html1).toContain('1')
    expect(html1).toContain('-1')
    expect(html1).toContain('cos')
    expect(html1).toContain('dx')

    // Test Unicode subscripts & superscripts from database/OCR: ∫₍₋₁₎¹ x ¹⁷ cos ⁴ x dx =
    const html2 = renderToString(React.createElement(FormattedMathText, { text: '∫₍₋₁₎¹ x ¹⁷ cos ⁴ x dx =' }))
    expect(html2).toContain('∫')
    expect(html2).toContain('1')
    expect(html2).toContain('-1')
    expect(html2).toContain('cos')
    expect(html2).toContain('dx')
  })

  it('renders 3x3 determinants with vertical bars and aligned rows/columns (Screenshot 3)', () => {
    // Question 58 from Screenshot 3
    const detText = 'If a, b, c are in A.P. then | x+1  x+2  x+a | | x+2  x+3  x+b | | x+3  x+4  x+c | ='
    const html = renderToString(React.createElement(FormattedMathText, { text: detText }))
    expect(html).toContain('table')
    expect(html).toContain('x')
    expect(html).toContain('+')
    expect(html).toContain('1')
    expect(html).toContain('a')
    expect(html).toContain('b')
    expect(html).toContain('c')
    // Check that it rendered 3 tr rows
    const trMatches = html.match(/<tr/g)
    expect(trMatches && trMatches.length).toBe(3)

    // Test LaTeX vmatrix syntax
    const latexDet = '\\begin{vmatrix} x+1 & x+2 & x+a \\\\ x+2 & x+3 & x+b \\\\ x+3 & x+4 & x+c \\end{vmatrix}'
    const htmlLatex = renderToString(React.createElement(FormattedMathText, { text: latexDet }))
    expect(htmlLatex).toContain('table')
    expect(htmlLatex).toContain('x')
    expect(htmlLatex).toContain('c')
  })

  it('renders matrices with brackets and aligned rows/columns (Screenshot 4)', () => {
    // 2x2 matrix from Screenshot 4: [13 15; -1 4]
    const html = renderToString(React.createElement(FormattedMathText, { text: '[13 15; -1 4]' }))
    expect(html).toContain('table')
    expect(html).toContain('13')
    expect(html).toContain('15')
    expect(html).toContain('-1')
    expect(html).toContain('4')
    expect(html).toContain('border-l-')

    // LaTeX matrix: \begin{bmatrix} 2 & 0 \\ 0 & 2 \end{bmatrix}
    const htmlLatex = renderToString(React.createElement(FormattedMathText, { text: '\\begin{bmatrix} 2 & 0 \\\\ 0 & 2 \\end{bmatrix}' }))
    expect(htmlLatex).toContain('table')
    expect(htmlLatex).toContain('2')
    expect(htmlLatex).toContain('0')
    expect(htmlLatex).toContain('border-l-')

    // Column vector: [2; 5]
    const htmlCol = renderToString(React.createElement(FormattedMathText, { text: '[2; 5]' }))
    expect(htmlCol).toContain('table')
    expect(htmlCol).toContain('2')
    expect(htmlCol).toContain('5')
  })

  it('renders limits with target condition stacked beneath lim', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' }))
    expect(html).toContain('lim')
    expect(html).toContain('x')
    expect(html).toContain('→')
    expect(html).toContain('0')
    expect(html).toContain('sin')
  })

  it('renders summations with upper and lower limits', () => {
    const html = renderToString(React.createElement(FormattedMathText, { text: '\\sum_{i=1}^n i' }))
    expect(html).toContain('∑')
    expect(html).toContain('i')
    expect(html).toContain('=')
    expect(html).toContain('1')
    expect(html).toContain('n')
  })
})
