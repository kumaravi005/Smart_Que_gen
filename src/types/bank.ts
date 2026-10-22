import type { DifficultyLevel, QuestionType, MCQOption, MatchPair } from './question'

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
  tags: string[]
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
}
