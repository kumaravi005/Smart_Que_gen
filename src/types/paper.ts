import type { ExamSettings } from './exam'
import type { PaperContent } from './question'
import type { VisualLayout } from './layout'

export type PaperStatus = 'draft' | 'configured' | 'in_progress' | 'ready' | 'exported'

export interface PaperMetadata {
  id: string
  title: string
  subject: string
  className: string
  examName: string
  totalMarks: number
  totalQuestions: number
  status: PaperStatus
  examSettingsId: string
  contentId: string
  visualLayoutId: string
  createdAt: string
  updatedAt: string
  lastExportedAt?: string
  tags: string[]
  isArchived?: boolean
}

// Full aggregated paper representation for preview, editor, and export managers
export interface FullPaper {
  metadata: PaperMetadata
  settings: ExamSettings
  content: PaperContent
  layout: VisualLayout
}
