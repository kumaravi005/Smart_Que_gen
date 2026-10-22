import type {
  PaginationResult,
  DesignerElement,
  VisualLayout
} from '../types'
import { generateId } from './id'

/**
 * Converts automatically paginated page elements into freeform manual designer elements
 */
export function convertAutomaticToManualElements(
  pagination: PaginationResult,
  layout: VisualLayout
): DesignerElement[] {
  const manualElements: DesignerElement[] = []
  const margins = layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }
  const dimensions = pagination.pageDimensionsMm || { width: 210, height: 297 }
  const printableWidth = dimensions.width - margins.left - margins.right

  pagination.pages.forEach((page, pIdx) => {
    let currentY = margins.top
    let z = 1

    page.elements.forEach(el => {
      const elWidth = page.hasTwoColumns && el.type === 'question'
        ? (printableWidth - 6) / 2
        : printableWidth

      const baseElement: DesignerElement = {
        id: generateId('man'),
        type: el.type === 'cover'
          ? 'box'
          : el.type === 'header'
          ? 'header'
          : el.type === 'section_header'
          ? 'section_header'
          : el.type === 'question'
          ? 'question_block'
          : 'box',
        pageIndex: pIdx,
        x: margins.left,
        y: currentY,
        width: Math.round(elWidth * 10) / 10,
        height: Math.max(10, Math.round(el.heightMm * 10) / 10),
        zIndex: z++,
        fontSizePt: layout.fontSizePt || 11,
        borderWidth: 0,
        paddingMm: 2
      }

      if (el.type === 'section_header') {
        const sEl = el as any
        baseElement.text = sEl.title
        baseElement.bold = true
        baseElement.alignment = 'center'
        baseElement.backgroundColor = '#f1f5f9'
        baseElement.sectionId = sEl.sectionId
      } else if (el.type === 'question') {
        const qEl = el as any
        baseElement.questionId = qEl.question?.id
        baseElement.displayNumber = qEl.displayNumber
        baseElement.text = `${qEl.displayNumber} ${qEl.question?.prompt || ''}`
        baseElement.sectionId = qEl.sectionId
      } else if (el.type === 'header') {
        baseElement.alignment = 'center'
      }

      manualElements.push(baseElement)
      currentY += el.heightMm + 4
    })
  })

  return manualElements
}

/**
 * Checks for element overlaps (Axis-Aligned Bounding Box intersection) on the same page
 */
export function checkElementOverlaps(elements: DesignerElement[], pageIndex: number): { id1: string; id2: string }[] {
  const pageElements = elements.filter(e => e.pageIndex === pageIndex)
  const overlaps: { id1: string; id2: string }[] = []

  for (let i = 0; i < pageElements.length; i++) {
    for (let j = i + 1; j < pageElements.length; j++) {
      const a = pageElements[i]
      const b = pageElements[j]

      // Check if bounding boxes overlap with 1mm tolerance
      const isOverlap =
        a.x < b.x + b.width - 1 &&
        a.x + a.width - 1 > b.x &&
        a.y < b.y + b.height - 1 &&
        a.y + a.height - 1 > b.y

      if (isOverlap) {
        overlaps.push({ id1: a.id, id2: b.id })
      }
    }
  }

  return overlaps
}

/**
 * Checks if an element extends beyond physical or printable page boundaries
 */
export function checkBoundaryWarnings(
  element: DesignerElement,
  pageWidthMm: number,
  pageHeightMm: number,
  margins: { top: number; bottom: number; left: number; right: number }
): string[] {
  const warnings: string[] = []

  if (element.x < margins.left) {
    warnings.push(`Extends ${Math.round(margins.left - element.x)}mm into left margin`)
  }
  if (element.y < margins.top) {
    warnings.push(`Extends ${Math.round(margins.top - element.y)}mm into top margin`)
  }
  if (element.x + element.width > pageWidthMm - margins.right) {
    warnings.push(`Extends ${Math.round(element.x + element.width - (pageWidthMm - margins.right))}mm beyond right printable boundary`)
  }
  if (element.y + element.height > pageHeightMm - margins.bottom) {
    warnings.push(`Extends ${Math.round(element.y + element.height - (pageHeightMm - margins.bottom))}mm beyond bottom printable boundary`)
  }

  return warnings
}
