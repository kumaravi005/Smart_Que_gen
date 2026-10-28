import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'

import { bankService } from '../services/bankService'
import { parseBulkQuestions } from '../utils/bulkQuestionParser'


describe('Question Bank - Folders and Bulk Parser', () => {
  it('parses bulk pasted questions including MCQs, marks, and answers', () => {
    const rawPasted = `
1. What is the SI unit of electric current?
(A) Ampere (B) Volt (C) Ohm (D) Watt
Ans: (A)

2. State Ohm's Law and write its mathematical formula. [2 Marks]

3. किसी वृत्त पर बाह्य बिन्दु से कितनी स्पर्श रेखाएँ खींची जा सकती हैं?
o (A) 1
o (B) 2
o (C) अनंत (Infinite)
o (D) 0
Ans: B
    `

    const parsed = parseBulkQuestions(rawPasted)
    expect(parsed.length).toBe(3)

    // Question 1: MCQ with Ans: A
    expect(parsed[0].type).toBe('mcq')
    expect(parsed[0].options?.length).toBe(4)
    expect(parsed[0].options?.[0].label).toBe('A')
    expect(parsed[0].options?.[0].isCorrect).toBe(true)
    expect(parsed[0].options?.[1].isCorrect).toBe(false)
    expect(parsed[0].prompt).toContain('SI unit of electric current')

    // Question 2: Short answer with [2 Marks]
    expect(parsed[1].type).toBe('short_answer')
    expect(parsed[1].marks).toBe(2)
    expect(parsed[1].prompt).toContain("Ohm's Law")

    // Question 3: Hindi MCQ with Ans: B
    expect(parsed[2].type).toBe('mcq')
    expect(parsed[2].options?.length).toBe(4)
    expect(parsed[2].options?.[1].label).toBe('B')
    expect(parsed[2].options?.[1].isCorrect).toBe(true)
    expect(parsed[2].prompt).toContain('किसी वृत्त')
  })

  it('creates nested folders and resolves breadcrumbs', async () => {
    // 1. Create root folder: "Class 10th BSEB"
    const rootFolder = await bankService.createFolder({
      name: 'Class 10th BSEB',
      color: 'blue'
    })
    expect(rootFolder.id).toBeDefined()
    expect(rootFolder.parentId).toBeNull()

    // 2. Create subfolder inside root: "Maths"
    const subFolder = await bankService.createFolder({
      name: 'Maths',
      parentId: rootFolder.id,
      color: 'emerald'
    })
    expect(subFolder.parentId).toBe(rootFolder.id)

    // 3. Create subfolder inside Maths: "MCQ"
    const subSubFolder = await bankService.createFolder({
      name: 'MCQ',
      parentId: subFolder.id,
      color: 'purple'
    })
    expect(subSubFolder.parentId).toBe(subFolder.id)

    // 4. Test breadcrumbs trail
    const breadcrumbs = await bankService.getFolderBreadcrumbs(subSubFolder.id)
    expect(breadcrumbs.length).toBe(3)
    expect(breadcrumbs[0].name).toBe('Class 10th BSEB')
    expect(breadcrumbs[1].name).toBe('Maths')
    expect(breadcrumbs[2].name).toBe('MCQ')

    // 5. Add questions to this sub-subfolder
    const q1 = await bankService.addQuestion({
      prompt: 'Value of sin 90 degree?',
      type: 'mcq',
      marks: 1,
      difficulty: 'easy',
      subject: 'Maths',
      className: 'Class 10th',
      topic: 'Trigonometry',
      tags: ['Maths'],
      folderId: subSubFolder.id
    })

    // 6. Query questions in sub-subfolder
    const folderQuestions = await bankService.getQuestions({ folderId: subSubFolder.id })
    expect(folderQuestions.some(q => q.id === q1.id)).toBe(true)

    // 7. Query questions including descendants from root
    const rootTreeQuestions = await bankService.getQuestions({
      folderId: rootFolder.id,
      includeSubfolders: true
    })
    expect(rootTreeQuestions.some(q => q.id === q1.id)).toBe(true)
  })

  it('recognizes and structures mathematical LaTeX questions into human-readable text', () => {
    const rawInput = `5. \\(\\triangle ABC \\sim \\triangle PQR\\) तथा उनके परिमाप क्रमशः 32 सेमी और 24 सेमी हैं। यदि \\(AB=10\\) सेमी, तो \\(PQ\\) का मान है—

(a) 7 सेमी
(b) \\(\\frac{40}{3}\\) सेमी
(c) \\(\\frac{15}{2}\\) सेमी
(d) 15 सेमी`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.type).toBe('mcq')
    // No raw LaTeX markers \(\) or \triangle or \sim
    expect(q.prompt).not.toContain('\\(')
    expect(q.prompt).not.toContain('\\)')
    expect(q.prompt).not.toContain('\\triangle')
    expect(q.prompt).not.toContain('\\sim')
    // Clean geometry and equation format
    expect(q.prompt).toContain('△ABC ~ △PQR')
    expect(q.prompt).toContain('AB = 10')
    expect(q.prompt).toContain('PQ')
    expect(q.prompt).toContain('तथा उनके परिमाप क्रमशः 32 सेमी और 24 सेमी हैं')

    // Clean options
    expect(q.options?.length).toBe(4)
    expect(q.options?.[0].text).toBe('7 सेमी')
    expect(q.options?.[1].text).toBe('40/3 सेमी')
    expect(q.options?.[2].text).toBe('15/2 सेमी')
    expect(q.options?.[3].text).toBe('15 सेमी')
  })

  it('correctly cleans complex math formulas: fractions, roots, superscripts, trigonometry', () => {
    const rawInput = `1. If \\(\\sin^2 \\theta + \\cos^2 \\theta = 1\\), find \\(\\sqrt{x^2 + y^2}\\) when \\(x = \\frac{1}{2}\\) and \\(y = \\frac{\\sqrt{3}}{2}\\).
(A) 1 (B) 2 (C) \\frac{1}{4} (D) 0`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.prompt).toContain('sin² θ + cos² θ = 1')
    expect(q.prompt).toContain('√(x² + y²)')
    expect(q.prompt).toContain('x = 1/2')
    expect(q.prompt).toContain('y = √3/2')
    expect(q.options?.[2].text).toBe('1/4')
  })
})
