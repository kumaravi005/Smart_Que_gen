import type { SectionNumberingStyle, SectionContent, Question } from '../types'

/**
 * Converts a positive number to Roman numerals (e.g. 1 -> I, 4 -> IV)
 */
export function toRoman(num: number, uppercase = true): string {
  if (num <= 0) return num.toString()
  const lookup: Record<string, number> = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1
  }
  let roman = ''
  let n = num
  for (const i in lookup) {
    while (n >= lookup[i]) {
      roman += i
      n -= lookup[i]
    }
  }
  return uppercase ? roman : roman.toLowerCase()
}

/**
 * Converts a 1-based number to alphabetical label (e.g. 1 -> A, 2 -> B, 27 -> AA)
 */
export function toAlpha(num: number, uppercase = true): string {
  if (num <= 0) return num.toString()
  let result = ''
  let n = num
  while (n > 0) {
    n--
    result = String.fromCharCode((uppercase ? 65 : 97) + (n % 26)) + result
    n = Math.floor(n / 26)
  }
  return result
}

/**
 * Generates the displayed question number for a question given its context
 */
export function getDisplayQuestionNumber({
  globalIndex,
  sectionIndex: _sectionIndex,
  questionIndexInSection,
  style = 'continuous',
  customNumber
}: {
  globalIndex: number
  sectionIndex: number
  questionIndexInSection: number
  style?: SectionNumberingStyle
  customNumber?: string
}): string {
  if (customNumber && customNumber.trim()) {
    return customNumber.trim()
  }

  const indexToUse = style === 'continuous' ? globalIndex + 1 : questionIndexInSection + 1

  switch (style) {
    case 'alpha':
      return `${toAlpha(indexToUse, true)}.`
    case 'roman':
      return `${toRoman(indexToUse, true)}.`
    case 'restart_per_section':
      return `Q${indexToUse}.`
    case 'continuous':
    default:
      return `Q${indexToUse}.`
  }
}

/**
 * Recalculates `orderNumber` across all sections sequentially
 */
export function recalculateOrderNumbers(sections: SectionContent[]): SectionContent[] {
  let globalOrder = 1
  return sections.map(section => {
    const updatedQuestions: Question[] = (section.questions || []).map((q, idx) => ({
      ...q,
      orderNumber: idx + 1
    }))
    globalOrder += updatedQuestions.length
    return {
      ...section,
      questions: updatedQuestions
    }
  })
}
