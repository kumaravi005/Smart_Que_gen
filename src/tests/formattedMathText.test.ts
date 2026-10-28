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
})
