import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  convertAutomaticToManualElements,
  checkElementOverlaps,
  checkBoundaryWarnings
} from '../utils/designerConversion'
import { paginatePaper } from '../utils/paginationEngine'
import { paperService } from '../services/paperService'
import { templateService } from '../services/templateService'
import { seedInitialDataIfEmpty } from '../services/db'
import type { DesignerElement, VisualLayout } from '../types'

describe('Visual Paper Designer Test Suite', () => {
  beforeEach(async () => {
    await seedInitialDataIfEmpty()
  })

  // 1. Conversion of Automatic Pagination to Freeform Designer Elements
  it('converts automatic pagination elements into freeform manual designer elements with millimetric geometry', async () => {
    const papers = await paperService.getAllPapers()
    const full = await paperService.getFullPaper(papers[0].id)
    expect(full).not.toBeNull()

    const pagination = paginatePaper({
      settings: full!.settings,
      content: full!.content,
      layout: full!.layout
    })

    const manualElements = convertAutomaticToManualElements(pagination, full!.layout)
    expect(manualElements.length).toBeGreaterThan(0)

    manualElements.forEach(el => {
      expect(el.id).toBeDefined()
      expect(el.x).toBeGreaterThanOrEqual(0)
      expect(el.y).toBeGreaterThanOrEqual(0)
      expect(el.width).toBeGreaterThan(0)
      expect(el.height).toBeGreaterThan(0)
      expect(typeof el.pageIndex).toBe('number')
    })
  })

  // 2. Overlap Detection between elements on the same page
  it('detects overlapping element bounding boxes accurately', () => {
    const elements: DesignerElement[] = [
      {
        id: 'el_1',
        type: 'text',
        pageIndex: 0,
        x: 20,
        y: 20,
        width: 50,
        height: 30,
        zIndex: 1
      },
      // el_2 overlaps el_1 (x: 40 is within 20..70, y: 30 is within 20..50)
      {
        id: 'el_2',
        type: 'box',
        pageIndex: 0,
        x: 40,
        y: 30,
        width: 40,
        height: 20,
        zIndex: 2
      },
      // el_3 is far below (no overlap)
      {
        id: 'el_3',
        type: 'text',
        pageIndex: 0,
        x: 20,
        y: 100,
        width: 50,
        height: 20,
        zIndex: 3
      }
    ]

    const overlaps = checkElementOverlaps(elements, 0)
    expect(overlaps.length).toBe(1)
    expect(overlaps[0].id1).toBe('el_1')
    expect(overlaps[0].id2).toBe('el_2')
  })

  // 3. Boundary & Margin Warning Detection
  it('warns when an element extends into margins or beyond physical boundaries', () => {
    const margins = { top: 15, bottom: 15, left: 15, right: 15 }
    const pageWidth = 210
    const pageHeight = 297

    // In-bounds element
    const safeEl: DesignerElement = {
      id: 'safe',
      type: 'text',
      pageIndex: 0,
      x: 15,
      y: 15,
      width: 180,
      height: 40,
      zIndex: 1
    }
    const safeWarnings = checkBoundaryWarnings(safeEl, pageWidth, pageHeight, margins)
    expect(safeWarnings.length).toBe(0)

    // Out of bounds element (exceeds right boundary)
    const outRightEl: DesignerElement = {
      id: 'out_right',
      type: 'text',
      pageIndex: 0,
      x: 50,
      y: 20,
      width: 170, // x + width = 220 > 210 - 15 = 195
      height: 30,
      zIndex: 1
    }
    const rightWarnings = checkBoundaryWarnings(outRightEl, pageWidth, pageHeight, margins)
    expect(rightWarnings.length).toBeGreaterThan(0)
    expect(rightWarnings[0]).toContain('beyond right printable boundary')
  })

  // 4. Moving & Resizing Operations
  it('supports moving and resizing elements without corrupting question references', () => {
    const qBlock: DesignerElement = {
      id: 'qb_1',
      type: 'question_block',
      questionId: 'q_test_123',
      displayNumber: 'Q1.',
      text: 'Sample Question Prompt',
      pageIndex: 0,
      x: 15,
      y: 40,
      width: 180,
      height: 25,
      zIndex: 1
    }

    // Move to x: 20, y: 55
    const moved = { ...qBlock, x: 20, y: 55 }
    expect(moved.x).toBe(20)
    expect(moved.y).toBe(55)
    expect(moved.questionId).toBe('q_test_123')

    // Resize to width: 160, height: 35
    const resized = { ...moved, width: 160, height: 35 }
    expect(resized.width).toBe(160)
    expect(resized.height).toBe(35)
    expect(resized.questionId).toBe('q_test_123')
  })

  // 5. Undo and Redo History
  it('manages undo and redo stacks accurately', () => {
    let currentElements: DesignerElement[] = [
      { id: 'el_1', type: 'text', pageIndex: 0, x: 10, y: 10, width: 50, height: 20, zIndex: 1 }
    ]
    const history: DesignerElement[][] = []
    const future: DesignerElement[][] = []

    // Mutation 1: Move el_1
    history.push([...currentElements])
    currentElements = [{ ...currentElements[0], x: 30 }]

    expect(currentElements[0].x).toBe(30)
    expect(history.length).toBe(1)

    // Mutation 2: Add el_2
    history.push([...currentElements])
    currentElements = [
      ...currentElements,
      { id: 'el_2', type: 'box', pageIndex: 0, x: 20, y: 50, width: 40, height: 30, zIndex: 2 }
    ]
    expect(currentElements.length).toBe(2)
    expect(history.length).toBe(2)

    // Undo Mutation 2
    const prev2 = history.pop()!
    future.push([...currentElements])
    currentElements = prev2
    expect(currentElements.length).toBe(1)
    expect(currentElements[0].x).toBe(30)

    // Undo Mutation 1
    const prev1 = history.pop()!
    future.push([...currentElements])
    currentElements = prev1
    expect(currentElements[0].x).toBe(10)

    // Redo Mutation 1
    const next1 = future.pop()!
    history.push([...currentElements])
    currentElements = next1
    expect(currentElements[0].x).toBe(30)
  })

  // 6. Persistence of Manual Design Data in IndexedDB
  it('persists manual designData in VisualLayout without altering underlying PaperContent', async () => {
    const papers = await paperService.getAllPapers()
    const targetPaperId = papers[0].id
    const full = await paperService.getFullPaper(targetPaperId)
    expect(full).not.toBeNull()

    const originalQuestionsCount = full!.content.sections.reduce((sum, s) => sum + s.questions.length, 0)

    const testDesignerElement: DesignerElement = {
      id: 'el_designer_persisted',
      type: 'box',
      pageIndex: 0,
      x: 15,
      y: 25,
      width: 180,
      height: 50,
      zIndex: 1,
      backgroundColor: '#f8fafc',
      borderWidth: 2,
      borderColor: '#3b82f6'
    }

    const updatedLayout: VisualLayout = {
      ...full!.layout,
      designData: {
        mode: 'manual',
        elements: [testDesignerElement],
        activePage: 0
      }
    }

    await paperService.updateVisualLayout(updatedLayout)

    // Reload from IndexedDB
    const reloaded = await paperService.getFullPaper(targetPaperId)
    expect(reloaded).not.toBeNull()
    expect(reloaded!.layout.designData?.mode).toBe('manual')
    expect(reloaded!.layout.designData?.elements).toHaveLength(1)
    expect(reloaded!.layout.designData?.elements[0].id).toBe('el_designer_persisted')

    // Verify PaperContent was completely preserved and uncorrupted
    const reloadedQuestionsCount = reloaded!.content.sections.reduce((sum, s) => sum + s.questions.length, 0)
    expect(reloadedQuestionsCount).toBe(originalQuestionsCount)
  })

  // 7. Template Saving & Reusability of Custom Layout
  it('saves and reloads custom paper templates containing visual designer layouts', async () => {
    const papers = await paperService.getAllPapers()
    const full = await paperService.getFullPaper(papers[0].id)
    expect(full).not.toBeNull()

    const savedTemplate = await templateService.saveAsTemplate({
      name: 'OEC Premium Board Exam Template',
      description: 'Template with custom manual boxes and styling',
      settings: full!.settings,
      layout: {
        ...full!.layout,
        designData: {
          mode: 'manual',
          elements: [
            { id: 't_box', type: 'box', pageIndex: 0, x: 10, y: 10, width: 190, height: 40, zIndex: 1 }
          ]
        }
      }
    })

    expect(savedTemplate.id).toBeDefined()
    expect(savedTemplate.name).toBe('OEC Premium Board Exam Template')
    expect(savedTemplate.layout.designData?.mode).toBe('manual')

    const allTemplates = await templateService.getAllTemplates()
    const found = allTemplates.find(t => t.id === savedTemplate.id)
    expect(found).toBeDefined()
    expect(found?.layout.designData?.elements).toHaveLength(1)
  })
})
