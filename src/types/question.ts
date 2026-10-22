export type QuestionType =
  | 'mcq'
  | 'true_false'
  | 'fill_blanks'
  | 'very_short_answer'
  | 'short_answer'
  | 'long_answer'
  | 'custom'
  | 'match_following'
  | 'assertion_reason'
  | 'case_study'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface MCQOption {
  id: string
  label: string // 'A', 'B', 'C', 'D'
  text: string
  isCorrect?: boolean
}

export interface MatchPair {
  id: string
  leftText: string
  rightText: string
}

export interface Question {
  id: string
  sectionId: string
  orderNumber: number
  type: QuestionType
  prompt: string // Supports rich text or markdown/LaTeX
  instructions?: string // Optional per-question instruction (e.g. "Attempt in 30 words")
  options?: MCQOption[]
  matchPairs?: MatchPair[]
  marks: number
  negativeMarks?: number
  difficulty: DifficultyLevel
  topic?: string
  subtopic?: string
  hint?: string
  solutionText?: string
  explanation?: string // Optional detailed explanation
  answerKey?: string // Optional answer key (e.g. "B" or "74 degrees")
  writingSpaceLines?: number // Optional answer-writing space lines in print output
  customNumber?: string // Optional manual question number override
  customLayoutMode?: 'auto' | 'four_per_row' | 'two_per_row' | 'one_per_row'
  orQuestionId?: string // Link to an alternative question for internal choice
  hasInternalChoice?: boolean
  diagramUrl?: string
  tags: string[]
  source?: 'manual' | 'bank' | 'ocr' | 'voice'
}

export interface SectionContent {
  sectionId: string
  title: string
  instructions?: string
  questions: Question[]
}

export interface PaperContent {
  id: string
  paperId: string
  sections: SectionContent[]
  totalCalculatedMarks: number
  totalCalculatedQuestions: number
  createdAt: string
  updatedAt: string
}
