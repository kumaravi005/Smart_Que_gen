import type { DifficultyLevel, QuestionType, MCQOption, MatchPair } from './question'

export interface BankFolder {
  id: string
  name: string
  parentId: string | null // null indicates a top-level/root folder
  color?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface QuestionBankItem {
  id: string
  prompt: string
  type: QuestionType
  subject: string
  className: string
  topic: string
  subtopic?: string
  difficulty: DifficultyLevel
  marks: number
  options?: MCQOption[]
  matchPairs?: MatchPair[]
  solutionText?: string
  hint?: string
  diagramUrl?: string // Attached photo / diagram / illustration data URL
  tags: string[]
  folderId?: string | null // ID of parent BankFolder (or null for unfiled)
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface BankFilter {
  subject?: string
  className?: string
  topic?: string
  type?: QuestionType
  difficulty?: DifficultyLevel
  searchQuery?: string
  folderId?: string | null // null = unfiled questions; string = specific folder
  includeSubfolders?: boolean
}

export interface BulkParsedQuestion {
  id: string
  prompt: string
  type: QuestionType
  marks: number
  difficulty: DifficultyLevel
  options?: { id: string; label: string; text: string; isCorrect?: boolean }[]
  solutionText?: string
  answerKey?: string
  rawText: string
  isSelected: boolean
}

