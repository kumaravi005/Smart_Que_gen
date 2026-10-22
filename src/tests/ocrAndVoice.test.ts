import { describe, it, expect } from 'vitest'
import {
  parseOcrQuestions,
  filterExtractedQuestions,
  detectMathAndOcrUncertainties
} from '../utils/ocrService'

describe('OCR Service - Parsing & Detection', () => {
  it('parses questions and detects question numbers and options from OCR text', () => {
    const rawText = `
Q7. What is total internal reflection? State two conditions for it. [2 Marks]
Q8. The potential difference across a 4 ohm resistor carrying 3A current is: [1 Mark]
(A) 12V
(B) 24V
(C) 6V
(D) 0V
Q9. A metallic sphere of radius 4.2 cm is melted into a cylinder of radius 6 cm. Find height. [3 Marks]
    `

    const questions = parseOcrQuestions(rawText)

    expect(questions.length).toBe(3)

    // Check Question 7
    expect(questions[0].detectedNumber).toBe('7')
    expect(questions[0].prompt).toContain('total internal reflection')
    expect(questions[0].marks).toBe(2)
    expect(questions[0].type).toBe('short_answer')

    // Check Question 8 (MCQ)
    expect(questions[1].detectedNumber).toBe('8')
    expect(questions[1].type).toBe('mcq')
    expect(questions[1].options?.length).toBe(4)
    expect(questions[1].options?.[0].label).toBe('A')
    expect(questions[1].options?.[0].text).toBe('12V')
    expect(questions[1].options?.[1].label).toBe('B')
    expect(questions[1].options?.[1].text).toBe('24V')

    // Check Question 9
    expect(questions[2].detectedNumber).toBe('9')
    expect(questions[2].prompt).toContain('metallic sphere')
    expect(questions[2].marks).toBe(3)
  })

  it('filters specific question numbers such as Q7 and Q9', () => {
    const rawText = `
Q1. Introduction to science.
Q7. Specific physics question 7.
Q8. Intermediate question 8.
Q9. Specific chemistry question 9.
Q10. Final question 10.
    `

    const allQuestions = parseOcrQuestions(rawText)
    expect(allQuestions.length).toBe(5)

    // Request specifically Q7 and Q9
    const filtered = filterExtractedQuestions(allQuestions, 'Q7, Q9')
    expect(filtered.length).toBe(2)
    expect(filtered[0].detectedNumber).toBe('7')
    expect(filtered[1].detectedNumber).toBe('9')

    // Also supports numeric query "7, 9"
    const numericFiltered = filterExtractedQuestions(allQuestions, '7, 9')
    expect(numericFiltered.length).toBe(2)

    // Supports 'all' or empty string
    const allFiltered = filterExtractedQuestions(allQuestions, 'all')
    expect(allFiltered.length).toBe(5)
  })

  it('detects mathematical notation and ambiguous OCR characters', () => {
    const mathText = 'Calculate the integral \\int x^2 dx where \\pi = 3.14 (unbalanced paren'
    const warnings = detectMathAndOcrUncertainties(mathText)

    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.includes('LaTeX'))).toBe(true)
    expect(warnings.some(w => w.includes('parentheses'))).toBe(true)
  })
})
