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
})
