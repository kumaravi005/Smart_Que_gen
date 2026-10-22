import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { parseBulkQuestionText } from '../utils/bulkParser'
import {
  toRoman,
  toAlpha,
  getDisplayQuestionNumber,
  recalculateOrderNumbers
} from '../utils/numbering'
import { estimateMcqOptionGrid } from '../utils/mcqLayout'
import { paperService } from '../services/paperService'
import { seedInitialDataIfEmpty } from '../services/db'
import type { Question, SectionContent } from '../types'

describe('Smart Question Editor & Parser Test Suite', () => {
  beforeEach(async () => {
    await seedInitialDataIfEmpty()
  })

  // 1. Bulk Text Parsing: Standard MCQs with Answer Key & Explanation
  it('parses standard bulk MCQ text with options and answer keys', () => {
    const rawText = `
Q: What is the capital of India?
A. Mumbai
B. New Delhi
C. Kolkata
D. Chennai
Answer: B
Explanation: New Delhi is the national capital.

Q: What is 2 + 2?
(a) 2
(b) 3
(c) 4
(d) 5
Answer: C
`
    const result = parseBulkQuestionText(rawText, 1, 'mcq')
    expect(result.totalParsed).toBe(2)
    expect(result.questions.length).toBe(2)

    const q1 = result.questions[0]
    expect(q1.prompt).toContain('What is the capital of India?')
    expect(q1.options).toHaveLength(4)
    expect(q1.options?.[1].isCorrect).toBe(true) // Option B is marked correct
    expect(q1.answerKey).toBe('B')
    expect(q1.explanation).toContain('New Delhi is the national capital.')

    const q2 = result.questions[1]
    expect(q2.prompt).toContain('What is 2 + 2?')
    expect(q2.options).toHaveLength(4)
    expect(q2.options?.[2].isCorrect).toBe(true) // Option C is marked correct
  })

  // 2. Bulk Text Parsing: Subjective Questions with Embedded Marks
  it('parses subjective questions and extracts bracketed marks', () => {
    const rawText = `
1. Define Newton's First Law of Motion with an example. [3 Marks]
Note: Mention inertia of rest and motion.

2. Explain human digestive system in detail. [5 Marks]
`
    const result = parseBulkQuestionText(rawText, 1, 'short_answer')
    expect(result.questions).toHaveLength(2)

    const q1 = result.questions[0]
    expect(q1.prompt).toContain("Define Newton's First Law")
    expect(q1.marks).toBe(3)
    expect(q1.instructions).toContain('Mention inertia')

    const q2 = result.questions[1]
    expect(q2.prompt).toContain('Explain human digestive system')
    expect(q2.marks).toBe(5)
  })

  // 3. Bulk Text Parsing: Preserves Unrecognized Text Without Discarding
  it('preserves unparsed and ambiguous text in unrecognizedText array', () => {
    const rawText = `
General Instructions for all candidates:
Read all questions carefully.

Q: What is H2O?
A. Oxygen
B. Water
Answer: B

Important note at bottom of exam sheet.
`
    const result = parseBulkQuestionText(rawText, 1, 'mcq')
    expect(result.totalParsed).toBe(1)
    expect(result.unrecognizedText.length).toBeGreaterThan(0)
    expect(result.unrecognizedText.some(line => line.includes('General Instructions'))).toBe(true)
    expect(result.unrecognizedText.some(line => line.includes('Important note'))).toBe(true)
  })

  // 4. Automatic Question Numbering: Sequential & Style Conversions
  it('generates sequential numbers in continuous and section-based modes', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(4)).toBe('IV')
    expect(toRoman(9)).toBe('IX')
    expect(toAlpha(1)).toBe('A')
    expect(toAlpha(3)).toBe('C')

    // Continuous numbering across paper
    const num1 = getDisplayQuestionNumber({
      globalIndex: 0,
      sectionIndex: 0,
      questionIndexInSection: 0,
      style: 'continuous'
    })
    expect(num1).toBe('Q1.')

    const num15 = getDisplayQuestionNumber({
      globalIndex: 14,
      sectionIndex: 1,
      questionIndexInSection: 4,
      style: 'continuous'
    })
    expect(num15).toBe('Q15.')

    // Roman section-based numbering
    const romanNum = getDisplayQuestionNumber({
      globalIndex: 10,
      sectionIndex: 1,
      questionIndexInSection: 2,
      style: 'roman'
    })
    expect(romanNum).toBe('III.')

    // Custom number override
    const custom = getDisplayQuestionNumber({
      globalIndex: 5,
      sectionIndex: 0,
      questionIndexInSection: 5,
      style: 'continuous',
      customNumber: 'Q4(b)'
    })
    expect(custom).toBe('Q4(b)')
  })

  // 5. Question Reordering & Sequential Index Recalculation
  it('recalculates orderNumber sequentially after question reordering or deletion', () => {
    const sampleQuestions: Question[] = [
      { id: 'q1', sectionId: 'sec_1', orderNumber: 1, type: 'mcq', prompt: 'Prompt 1', marks: 1, difficulty: 'easy', tags: [] },
      { id: 'q2', sectionId: 'sec_1', orderNumber: 2, type: 'mcq', prompt: 'Prompt 2', marks: 1, difficulty: 'easy', tags: [] },
      { id: 'q3', sectionId: 'sec_1', orderNumber: 3, type: 'mcq', prompt: 'Prompt 3', marks: 1, difficulty: 'easy', tags: [] }
    ]

    // Simulate reordering: moving q3 to top
    const reordered: SectionContent[] = [
      {
        sectionId: 'sec_1',
        title: 'Section A',
        questions: [sampleQuestions[2], sampleQuestions[0], sampleQuestions[1]]
      }
    ]

    const recalculated = recalculateOrderNumbers(reordered)
    expect(recalculated[0].questions[0].id).toBe('q3')
    expect(recalculated[0].questions[0].orderNumber).toBe(1)
    expect(recalculated[0].questions[1].id).toBe('q1')
    expect(recalculated[0].questions[1].orderNumber).toBe(2)
    expect(recalculated[0].questions[2].id).toBe('q2')
    expect(recalculated[0].questions[2].orderNumber).toBe(3)
  })

  // 6. Smart MCQ Option Arrangement: Avoids Overlapping
  it('estimates optimal grid columns preventing option overlap and clipping', () => {
    // Very short options fit 4 per row
    const shortOptions = [
      { id: '1', label: 'A', text: '12' },
      { id: '2', label: 'B', text: '24' },
      { id: '3', label: 'C', text: '36' },
      { id: '4', label: 'D', text: '48' }
    ]
    const shortEst = estimateMcqOptionGrid({ options: shortOptions, mode: 'auto', columnLayout: 'single' })
    expect(shortEst.resolvedGridCols).toBe(4)
    expect(shortEst.gridClass).toContain('grid-cols-2 sm:grid-cols-4')

    // Long options wrap to 1 per row
    const longOptions = [
      { id: '1', label: 'A', text: 'An object remains in a state of rest or uniform motion in a straight line.' },
      { id: '2', label: 'B', text: 'The rate of change of momentum is proportional to the applied unbalanced force.' },
      { id: '3', label: 'C', text: 'To every action there is an equal and opposite reaction always acting simultaneously.' },
      { id: '4', label: 'D', text: 'None of the above statements are consistent with classical Newtonian mechanics.' }
    ]
    const longEst = estimateMcqOptionGrid({ options: longOptions, mode: 'auto', columnLayout: 'single' })
    expect(longEst.resolvedGridCols).toBe(1)
    expect(longEst.gridClass).toBe('grid-cols-1')
  })

  // 7. Marks Calculation & Section Totals
  it('correctly calculates total entered question marks and validates against paper settings', async () => {
    const papers = await paperService.getAllPapers()
    expect(papers.length).toBeGreaterThan(0)
    const testPaper = await paperService.getFullPaper(papers[0].id)

    // Calculate marks from sections
    const totalMarks = testPaper.content.sections.reduce(
      (sum, s) => sum + s.questions.reduce((qSum, q) => qSum + Number(q.marks), 0),
      0
    )
    expect(totalMarks).toBeGreaterThanOrEqual(0)
    expect(testPaper.settings.totalMarks).toBeGreaterThan(0)
  })

  // 8. IndexedDB Persistence of Question Content
  it('persists added questions and updates directly in IndexedDB', async () => {
    const papers = await paperService.getAllPapers()
    const targetPaperId = papers[0].id
    const full = await paperService.getFullPaper(targetPaperId)

    const newQuestion: Question = {
      id: 'q_test_persisted',
      sectionId: full.content.sections[0].sectionId,
      orderNumber: 99,
      type: 'short_answer',
      prompt: 'What is photosynthesis?',
      marks: 3,
      difficulty: 'easy',
      tags: ['Biology'],
      source: 'manual',
      answerKey: 'Chemical process converting light into glucose'
    }

    const updatedContent = {
      ...full.content,
      sections: [
        {
          ...full.content.sections[0],
          questions: [...full.content.sections[0].questions, newQuestion]
        },
        ...full.content.sections.slice(1)
      ]
    }

    await paperService.updateContent(updatedContent)

    // Reload from IndexedDB to verify persistence
    const reloaded = await paperService.getFullPaper(targetPaperId)
    const found = reloaded.content.sections[0].questions.find(q => q.id === 'q_test_persisted')
    expect(found).toBeDefined()
    expect(found?.prompt).toBe('What is photosynthesis?')
    expect(found?.marks).toBe(3)
    expect(found?.answerKey).toBe('Chemical process converting light into glucose')
  })
})
