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

  it('correctly structures unbraced LaTeX fractions like \\frac1{\\cot A} and options with 0', () => {
    const rawInput = `19. यदि \\(\\cot A+\\frac1{\\cot A}=2\\), तो \\(\\tan^2 A+\\frac1{\\tan^2 A}\\) का मान है—

(a) 0
(b) 1
(c) 2
(d) 4`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.type).toBe('mcq')
    expect(q.prompt).toBe('यदि cot A + 1/cot A = 2, तो tan² A + 1/tan² A का मान है—')
    expect(q.options?.length).toBe(4)
    expect(q.options?.[0].label).toBe('A')
    expect(q.options?.[0].text).toBe('0')
    expect(q.options?.[1].label).toBe('B')
    expect(q.options?.[1].text).toBe('1')
    expect(q.options?.[2].label).toBe('C')
    expect(q.options?.[2].text).toBe('2')
    expect(q.options?.[3].label).toBe('D')
    expect(q.options?.[3].text).toBe('4')
  })

  it('correctly structures trigonometric degree fractions like \\frac{\\sin29^\\circ}{\\cos61^\\circ}', () => {
    const rawInput = `12. \\(\\frac{\\sin29^\\circ}{\\cos61^\\circ}\\) का मान है—

(a) 90
(b) 0
(c) 1
(d) 32`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.type).toBe('mcq')
    expect(q.prompt).toBe('sin 29°/cos 61° का मान है—')
    expect(q.options?.length).toBe(4)
    expect(q.options?.[0].label).toBe('A')
    expect(q.options?.[0].text).toBe('90')
    expect(q.options?.[1].label).toBe('B')
    expect(q.options?.[1].text).toBe('0')
    expect(q.options?.[2].label).toBe('C')
    expect(q.options?.[2].text).toBe('1')
    expect(q.options?.[3].label).toBe('D')
    expect(q.options?.[3].text).toBe('32')
  })

  it('correctly structures question 66 with factored fraction options and bracketed powers', () => {
    const rawInput = `66. प्रथम \\(n\\) प्राकृतिक संख्याओं का योगफल है—

(a) \\(\\frac{n(n+1)(2n+1)}6\\)
(b) \\(\\frac{n(n+1)}2\\)
(c) \\(\\left[\\frac{n(n+1)}2\\right]^2\\)
(d) \\(\\frac{n(n-1)}2\\)`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.type).toBe('mcq')
    expect(q.prompt).toBe('प्रथम n प्राकृतिक संख्याओं का योगफल है—')
    expect(q.options?.length).toBe(4)
    expect(q.options?.[0].label).toBe('A')
    expect(q.options?.[0].text).toBe('n(n + 1)(2n + 1)/6')
    expect(q.options?.[1].label).toBe('B')
    expect(q.options?.[1].text).toBe('n(n + 1)/2')
    expect(q.options?.[2].label).toBe('C')
    expect(q.options?.[2].text).toBe('[n(n + 1)/2]²')
    expect(q.options?.[3].label).toBe('D')
    expect(q.options?.[3].text).toBe('n(n - 1)/2')
  })

  it('correctly structures quadratic equation question with inequality options (Screenshot 1)', () => {
    const rawInput = `39. ax^2 + bx + c = 0 एक द्विघात समीकरण कहलाता है, जहाँ a, b, c वास्तविक संख्याएँ हैं, यदि—
(a) a \\ne 0
(b) b \\ne 0
(c) c \\ne 0
(d) a = 0`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.type).toBe('mcq')
    expect(q.prompt).toBe('ax² + bx + c = 0 एक द्विघात समीकरण कहलाता है, जहाँ a, b, c वास्तविक संख्याएँ हैं, यदि—')
    expect(q.options?.length).toBe(4)
    expect(q.options?.[0].label).toBe('A')
    expect(q.options?.[0].text).toBe('a ≠ 0')
    expect(q.options?.[1].label).toBe('B')
    expect(q.options?.[1].text).toBe('b ≠ 0')
    expect(q.options?.[2].label).toBe('C')
    expect(q.options?.[2].text).toBe('c ≠ 0')
    expect(q.options?.[3].label).toBe('D')
    expect(q.options?.[3].text).toBe('a = 0')
  })

  it('correctly converts squished \\ne and cleans unescaped "ne" in ratio options (Screenshot 2)', () => {
    const rawInput = `रैखिक समीकरणों के युग्म का आलेखीय निरूपण यदि समांतर रेखाएँ हों, तो—
(A) a₁/a₂neb₁/b₂
(B) a₁/a₂ = b₁/b₂ = c₁/c₂
(C) a₁/a₂ = b₁/b₂nec₁/c₂
(D) इनमें से कोई नहीं`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(1)
    const q = parsed[0]
    expect(q.type).toBe('mcq')
    expect(q.options?.[0].text).toBe('a₁/a₂ ≠ b₁/b₂')
    expect(q.options?.[1].text).toBe('a₁/a₂ = b₁/b₂ = c₁/c₂')
    expect(q.options?.[2].text).toBe('a₁/a₂ = b₁/b₂ ≠ c₁/c₂')
    expect(q.options?.[3].text).toBe('इनमें से कोई नहीं')
  })

  it('parses bulk unnumbered Hindi MCQs from teacher paste (resolving single question swallow bug)', () => {
    const rawInput = `निबंध लेखन की दृष्टि से भारतेन्दु युग कैसा था?
(A) उर्वर (B) अनुपयोगी (C) प्रगतिशील (D) प्रतिगामी

नूतन ब्रह्मचारी क्या है?
(A) उपन्यास (B) निबंध (C) कहानी (D) सभी

निम्नलिखित में से पार्वती देवी किनकी माता हैं?
(A) बालकृष्ण भट्ट (B) चन्द्रधर शर्मा गुलेरी (C) जयप्रकाश नारायण (D) रामधारी सिंह दिनकर`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(3)

    // Question 1
    expect(parsed[0].type).toBe('mcq')
    expect(parsed[0].prompt).toBe('निबंध लेखन की दृष्टि से भारतेन्दु युग कैसा था?')
    expect(parsed[0].options?.length).toBe(4)
    expect(parsed[0].options?.[0].label).toBe('A')
    expect(parsed[0].options?.[0].text).toBe('उर्वर')
    expect(parsed[0].options?.[1].label).toBe('B')
    expect(parsed[0].options?.[1].text).toBe('अनुपयोगी')
    expect(parsed[0].options?.[2].label).toBe('C')
    expect(parsed[0].options?.[2].text).toBe('प्रगतिशील')
    expect(parsed[0].options?.[3].label).toBe('D')
    expect(parsed[0].options?.[3].text).toBe('प्रतिगामी')

    // Question 2
    expect(parsed[1].type).toBe('mcq')
    expect(parsed[1].prompt).toBe('नूतन ब्रह्मचारी क्या है?')
    expect(parsed[1].options?.length).toBe(4)
    expect(parsed[1].options?.[0].text).toBe('उपन्यास')
    expect(parsed[1].options?.[1].text).toBe('निबंध')
    expect(parsed[1].options?.[2].text).toBe('कहानी')
    expect(parsed[1].options?.[3].text).toBe('सभी')

    // Question 3
    expect(parsed[2].type).toBe('mcq')
    expect(parsed[2].prompt).toBe('निम्नलिखित में से पार्वती देवी किनकी माता हैं?')
    expect(parsed[2].options?.length).toBe(4)
    expect(parsed[2].options?.[0].text).toBe('बालकृष्ण भट्ट')
    expect(parsed[2].options?.[1].text).toBe('चन्द्रधर शर्मा गुलेरी')
    expect(parsed[2].options?.[2].text).toBe('जयप्रकाश नारायण')
    expect(parsed[2].options?.[3].text).toBe('रामधारी सिंह दिनकर')
  })

  it('parses unnumbered tightly-packed MCQs without blank lines between questions', () => {
    const rawInput = `निबंध लेखन की दृष्टि से भारतेन्दु युग कैसा था?
(A) उर्वर (B) अनुपयोगी (C) प्रगतिशील (D) प्रतिगामी
नूतन ब्रह्मचारी क्या है?
(A) उपन्यास (B) निबंध (C) कहानी (D) सभी`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(2)
    expect(parsed[0].prompt).toBe('निबंध लेखन की दृष्टि से भारतेन्दु युग कैसा था?')
    expect(parsed[0].options?.length).toBe(4)
    expect(parsed[1].prompt).toBe('नूतन ब्रह्मचारी क्या है?')
    expect(parsed[1].options?.length).toBe(4)
  })

  it('parses vertical unnumbered MCQs with Hindi labels and answer keys', () => {
    const rawInput = `बालकृष्ण भट्ट किस काल के रचनाकार हैं?
(क) भारतेन्दु युग
(ख) भक्तिकाल
(ग) रीतिकाल
(घ) द्विवेदी युग
उत्तर: (क)

बातचीत क्या है?
A. निबंध
B. कहानी
C. नाटक
D. उपन्यास
Ans: A`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(2)

    expect(parsed[0].options?.length).toBe(4)
    expect(parsed[0].options?.[0].label).toBe('A')
    expect(parsed[0].options?.[0].text).toBe('भारतेन्दु युग')
    expect(parsed[0].options?.[0].isCorrect).toBe(true)
    expect(parsed[0].answerKey).toBe('A')

    expect(parsed[1].options?.length).toBe(4)
    expect(parsed[1].options?.[0].label).toBe('A')
    expect(parsed[1].options?.[0].text).toBe('निबंध')
    expect(parsed[1].options?.[0].isCorrect).toBe(true)
    expect(parsed[1].answerKey).toBe('A')
  })

  it('parses mixed numbered, Devanagari numbered, and unnumbered questions', () => {
    const rawInput = `१. बालकृष्ण भट्ट की रचना बातचीत क्या है?
(A) एकांकी (B) संस्मरण (C) यात्रा वृत्तांत (D) ललित निबंध

बालकृष्ण भट्ट किस युग के निबंधकार थे?
(A) प्रसाद युग (B) भारतेन्दु युग (C) द्विवेदी युग (D) स्वातंत्र्योत्तर युग

३. मनुष्य की बातचीत का उत्तम तरीका क्या है?
(A) विद्वतापूर्ण बात करना (B) तर्कपूर्ण बात करना (C) भीड़ से बात करना (D) अवाक् होकर अपने से बातचीत करना`

    const parsed = parseBulkQuestions(rawInput)
    expect(parsed.length).toBe(3)
    expect(parsed[0].prompt).toBe('बालकृष्ण भट्ट की रचना बातचीत क्या है?')
    expect(parsed[0].options?.length).toBe(4)
    expect(parsed[1].prompt).toBe('बालकृष्ण भट्ट किस युग के निबंधकार थे?')
    expect(parsed[1].options?.length).toBe(4)
    expect(parsed[2].prompt).toBe('मनुष्य की बातचीत का उत्तम तरीका क्या है?')
    expect(parsed[2].options?.length).toBe(4)
  })
})
