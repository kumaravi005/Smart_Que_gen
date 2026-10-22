import type { Question, MCQOption } from './question'
import type { ExamSettings, SectionNumberingStyle } from './exam'
import type { VisualLayout } from './layout'

export type PageElementType =
  | 'cover'
  | 'header'
  | 'candidate_block'
  | 'instructions'
  | 'section_header'
  | 'question'
  | 'footer'

export interface BasePageElement {
  id: string
  type: PageElementType
  heightMm: number
}

export interface CoverPageElement extends BasePageElement {
  type: 'cover'
  settings: ExamSettings
  layout: VisualLayout
}

export interface HeaderPageElement extends BasePageElement {
  type: 'header'
  settings: ExamSettings
  layout: VisualLayout
  isCompact: boolean
}

export interface CandidateBlockElement extends BasePageElement {
  type: 'candidate_block'
  showName: boolean
  showRollNo: boolean
  showSection: boolean
  showDate: boolean
  examDate?: string
}

export interface InstructionsPageElement extends BasePageElement {
  type: 'instructions'
  instructions: string[]
}

export interface SectionHeaderPageElement extends BasePageElement {
  type: 'section_header'
  sectionId: string
  title: string
  instructions?: string
  numberingStyle?: SectionNumberingStyle
}

export interface QuestionPageElement extends BasePageElement {
  type: 'question'
  question: Question
  displayNumber: string
  sectionId: string
  optionsLayout: 'auto' | 'four_per_row' | 'two_per_row' | 'one_per_row'
  showMarks: boolean
  marksAlignment: 'right' | 'inline'
  resolvedOptions?: MCQOption[]
}

export type PageElement =
  | CoverPageElement
  | HeaderPageElement
  | CandidateBlockElement
  | InstructionsPageElement
  | SectionHeaderPageElement
  | QuestionPageElement

export interface GeneratedPage {
  pageNumber: number
  isCoverPage: boolean
  elements: PageElement[]
  usedHeightMm: number
  availableHeightMm: number
  hasTwoColumns: boolean
  columnLayout: 'single' | 'two_column'
}

export interface PaginationResult {
  pages: GeneratedPage[]
  totalPages: number
  targetPages?: number
  fitsTarget: boolean
  targetFitExplanation?: string
  warnings: string[]
  pageDimensionsMm: {
    width: number
    height: number
  }
}
