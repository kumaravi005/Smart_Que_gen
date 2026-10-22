import type { ExamSettings } from './exam'
import type { VisualLayout } from './layout'

export interface PaperSetupTemplate {
  id: string
  name: string
  description?: string
  subject: string
  className: string
  totalMarks: number
  settings: Omit<ExamSettings, 'id' | 'paperId' | 'createdAt' | 'updatedAt'>
  layout: Omit<VisualLayout, 'id' | 'paperId' | 'createdAt' | 'updatedAt'>
  createdAt: string
  updatedAt: string
}
