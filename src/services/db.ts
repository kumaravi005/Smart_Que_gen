import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PaperMetadata, ExamSettings, PaperContent, VisualLayout, QuestionBankItem } from '../types'
import { generateId } from '../utils/id'

export interface OmegaDB extends DBSchema {
  papers: {
    key: string
    value: PaperMetadata
    indexes: {
      'by-updated': string
      'by-status': string
      'by-subject': string
    }
  }
  exam_settings: {
    key: string
    value: ExamSettings
    indexes: {
      'by-paper': string
    }
  }
  paper_contents: {
    key: string
    value: PaperContent
    indexes: {
      'by-paper': string
    }
  }
  visual_layouts: {
    key: string
    value: VisualLayout
    indexes: {
      'by-paper': string
    }
  }
  question_bank: {
    key: string
    value: QuestionBankItem
    indexes: {
      'by-subject': string
      'by-type': string
      'by-difficulty': string
    }
  }
  app_settings: {
    key: string
    value: any
  }
}

const DB_NAME = 'omega_paper_gen_db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<OmegaDB>> | null = null

export function getDatabase(): Promise<IDBPDatabase<OmegaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OmegaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Papers Store
        if (!db.objectStoreNames.contains('papers')) {
          const paperStore = db.createObjectStore('papers', { keyPath: 'id' })
          paperStore.createIndex('by-updated', 'updatedAt')
          paperStore.createIndex('by-status', 'status')
          paperStore.createIndex('by-subject', 'subject')
        }

        // 2. Exam Settings Store
        if (!db.objectStoreNames.contains('exam_settings')) {
          const settingsStore = db.createObjectStore('exam_settings', { keyPath: 'id' })
          settingsStore.createIndex('by-paper', 'paperId')
        }

        // 3. Paper Contents Store
        if (!db.objectStoreNames.contains('paper_contents')) {
          const contentsStore = db.createObjectStore('paper_contents', { keyPath: 'id' })
          contentsStore.createIndex('by-paper', 'paperId')
        }

        // 4. Visual Layouts Store
        if (!db.objectStoreNames.contains('visual_layouts')) {
          const layoutsStore = db.createObjectStore('visual_layouts', { keyPath: 'id' })
          layoutsStore.createIndex('by-paper', 'paperId')
        }

        // 5. Question Bank Store
        if (!db.objectStoreNames.contains('question_bank')) {
          const bankStore = db.createObjectStore('question_bank', { keyPath: 'id' })
          bankStore.createIndex('by-subject', 'subject')
          bankStore.createIndex('by-type', 'type')
          bankStore.createIndex('by-difficulty', 'difficulty')
        }

        // 6. App Settings Store
        if (!db.objectStoreNames.contains('app_settings')) {
          db.createObjectStore('app_settings', { keyPath: 'key' })
        }
      }
    })
  }
  return dbPromise
}

// Seed sample data if database is empty on first boot
export async function seedInitialDataIfEmpty(): Promise<void> {
  const db = await getDatabase()
  const count = await db.count('papers')
  if (count > 0) {
    return
  }

  const now = new Date().toISOString()
  const paperId = generateId('paper')
  const settingsId = generateId('setting')
  const contentId = generateId('content')
  const layoutId = generateId('layout')

  // Sample Paper 1: Class X Mathematics Mid-Term
  const sampleSettings: ExamSettings = {
    id: settingsId,
    paperId,
    institute: {
      name: 'OMEGA EDUCATION CENTER',
      tagline: 'Excellence in Coaching & Board Preparations',
      affiliation: 'Center Code: OEC-2026 / CBSE & State Board Curriculum',
      address: 'Knowledge Park, Phase 2, Near City Center',
      contact: 'Phone: +91 98765 43210 | info@omegaedu.org'
    },
    examName: 'Mid-Term Examination 2026-27',
    academicSession: '2026-2027',
    className: 'Class X',
    subject: 'Mathematics',
    subjectCode: 'MATH-041',
    durationMinutes: 180,
    totalMarks: 80,
    date: new Date().toISOString().split('T')[0],
    generalInstructions: [
      'This question paper contains 5 Sections: A, B, C, D, and E.',
      'Section A comprises 20 MCQs carrying 1 mark each.',
      'Section B comprises 5 Short Answer Questions carrying 2 marks each.',
      'Section C comprises 6 Short Answer Questions carrying 3 marks each.',
      'Section D comprises 4 Long Answer Questions carrying 5 marks each.',
      'Section E comprises 3 Case-Based integrated units of assessment (4 marks each).',
      'All Questions are compulsory. Internal choice is provided in 2 questions of 2 marks, 2 questions of 3 marks and 2 questions of 5 marks.',
      'Use of calculators is strictly prohibited.'
    ],
    sections: [
      {
        id: 'sec_a',
        name: 'Section A',
        title: 'Section A: Multiple Choice Questions (1 Mark Each)',
        totalQuestions: 20,
        marksPerQuestion: 1,
        targetTypes: ['mcq']
      },
      {
        id: 'sec_b',
        name: 'Section B',
        title: 'Section B: Short Answer Type I (2 Marks Each)',
        totalQuestions: 5,
        marksPerQuestion: 2,
        targetTypes: ['short_answer']
      }
    ],
    createdAt: now,
    updatedAt: now
  }

  const sampleContent: PaperContent = {
    id: contentId,
    paperId,
    sections: [
      {
        sectionId: 'sec_a',
        title: 'Section A: Multiple Choice Questions (1 Mark Each)',
        questions: [
          {
            id: generateId('q'),
            sectionId: 'sec_a',
            orderNumber: 1,
            type: 'mcq',
            prompt: 'If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then HCF(a, b) is:',
            options: [
              { id: 'opt_1', label: 'A', text: 'xy', isCorrect: false },
              { id: 'opt_2', label: 'B', text: 'xy²', isCorrect: true },
              { id: 'opt_3', label: 'C', text: 'x³y³', isCorrect: false },
              { id: 'opt_4', label: 'D', text: 'x²y²', isCorrect: false }
            ],
            marks: 1,
            difficulty: 'easy',
            topic: 'Real Numbers',
            tags: ['HCF', 'Prime Factors', 'Class 10'],
            solutionText: 'HCF is the product of smallest powers of each common prime factor. Common factors are x and y. Min power of x is 1, min power of y is 2. Hence HCF = xy².',
            source: 'manual'
          },
          {
            id: generateId('q'),
            sectionId: 'sec_a',
            orderNumber: 2,
            type: 'mcq',
            prompt: 'The discriminant of the quadratic equation 2x² - 4x + 3 = 0 is:',
            options: [
              { id: 'opt_1', label: 'A', text: '-8', isCorrect: true },
              { id: 'opt_2', label: 'B', text: '10', isCorrect: false },
              { id: 'opt_3', label: 'C', text: '-16', isCorrect: false },
              { id: 'opt_4', label: 'D', text: '8', isCorrect: false }
            ],
            marks: 1,
            difficulty: 'medium',
            topic: 'Quadratic Equations',
            tags: ['Discriminant', 'Nature of roots'],
            solutionText: 'D = b² - 4ac = (-4)² - 4(2)(3) = 16 - 24 = -8.',
            source: 'manual'
          }
        ]
      }
    ],
    totalCalculatedMarks: 2,
    totalCalculatedQuestions: 2,
    createdAt: now,
    updatedAt: now
  }

  const sampleLayout: VisualLayout = {
    id: layoutId,
    paperId,
    pageSize: 'A4',
    orientation: 'portrait',
    columnLayout: 'single',
    fontFamily: 'sans',
    fontSizePt: 11,
    lineSpacing: 1.25,
    pageMarginsMm: { top: 15, bottom: 15, left: 15, right: 15 },
    headerStyle: 'modern',
    showInstituteLogo: true,
    logoPlacement: 'center',
    logoWidthMm: 24,
    showWatermark: true,
    watermarkText: 'OMEGA EDUCATION CENTER',
    watermarkOpacity: 0.08,
    dividerBetweenQuestions: true,
    questionSpacingPt: 10,
    sectionBreakNewPage: false,
    showMarksPerQuestion: true,
    marksAlignment: 'right',
    footerNote: 'Omega Education Center — All Rights Reserved — Best of Luck!',
    showPageNumbers: true,
    pageNumberPosition: 'bottom_center',
    createdAt: now,
    updatedAt: now
  }

  const sampleMetadata: PaperMetadata = {
    id: paperId,
    title: 'Class X - Mathematics Mid-Term Paper 2026',
    subject: 'Mathematics',
    className: 'Class X',
    examName: 'Mid-Term Examination 2026-27',
    totalMarks: 80,
    totalQuestions: 2,
    status: 'in_progress',
    examSettingsId: settingsId,
    contentId,
    visualLayoutId: layoutId,
    createdAt: now,
    updatedAt: now,
    tags: ['Class 10', 'Board Prep', 'Term 1']
  }

  // Also seed a couple of question bank items
  const sampleBankItem: QuestionBankItem = {
    id: generateId('qb'),
    prompt: 'State the Fundamental Theorem of Arithmetic and explain why 1 is neither prime nor composite.',
    type: 'short_answer',
    subject: 'Mathematics',
    className: 'Class X',
    topic: 'Real Numbers',
    difficulty: 'medium',
    marks: 2,
    solutionText: 'Every composite number can be expressed (factorised) as a product of primes, and this factorisation is unique, apart from the order in which the prime factors occur.',
    tags: ['Theorem', 'Class 10', 'Real Numbers'],
    usageCount: 1,
    createdAt: now,
    updatedAt: now
  }

  // Save to IndexedDB
  const tx = db.transaction(
    ['papers', 'exam_settings', 'paper_contents', 'visual_layouts', 'question_bank', 'app_settings'],
    'readwrite'
  )
  await tx.objectStore('papers').put(sampleMetadata)
  await tx.objectStore('exam_settings').put(sampleSettings)
  await tx.objectStore('paper_contents').put(sampleContent)
  await tx.objectStore('visual_layouts').put(sampleLayout)
  await tx.objectStore('question_bank').put(sampleBankItem)
  await tx.objectStore('app_settings').put({
    key: 'institute_profile',
    value: sampleSettings.institute
  })
  await tx.done
}
