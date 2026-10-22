export type ExamType = 'unit_test' | 'term_exam' | 'final_exam' | 'mock_test' | 'quiz' | 'custom'

export interface ExamSectionConfig {
  id: string
  name: string
  title: string // e.g. "Section A: Multiple Choice Questions"
  instructions?: string
  totalQuestions: number
  marksPerQuestion: number
  compulsoryCount?: number // e.g. "Attempt any 5 out of 7"
  targetTypes: string[]
}

export interface InstituteProfile {
  name: string
  tagline?: string
  affiliation?: string // e.g., "CBSE Affiliated / Reg No: 12345"
  address?: string
  contact?: string
  logoUrl?: string
}

export interface ExamSettings {
  id: string
  paperId: string
  institute: InstituteProfile
  examName: string // e.g. "Mid-Term Examination 2026"
  academicSession: string // e.g. "2026-2027"
  className: string // e.g. "Class X"
  subject: string // e.g. "Mathematics"
  subjectCode?: string // e.g. "MATH-041"
  durationMinutes: number // e.g. 180
  totalMarks: number // e.g. 80
  date?: string
  generalInstructions: string[]
  sections: ExamSectionConfig[]
  allowCalculators?: boolean
  customHeaderNote?: string
  createdAt: string
  updatedAt: string
}
