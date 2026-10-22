export type PageOrientation = 'portrait' | 'landscape'
export type PageSize = 'A4' | 'Letter' | 'Legal'
export type ColumnLayout = 'single' | 'two_column' | 'auto_responsive'
export type HeaderStyle = 'classic' | 'modern' | 'minimal' | 'bordered'
export type NumberingStyle = '123' | 'roman' | 'alpha'

export interface VisualLayout {
  id: string
  paperId: string
  pageSize: PageSize
  orientation: PageOrientation
  columnLayout: ColumnLayout
  fontFamily: 'system' | 'serif' | 'sans' | 'dejavu'
  fontSizePt: number // standard 11pt, 12pt
  lineSpacing: number // e.g. 1.25 or 1.5
  pageMarginsMm: {
    top: number
    bottom: number
    left: number
    right: number
  }
  headerStyle: HeaderStyle
  showInstituteLogo: boolean
  logoPlacement: 'center' | 'left' | 'right'
  logoWidthMm: number
  showWatermark: boolean
  watermarkText?: string
  watermarkOpacity: number // 0.05 to 0.2
  dividerBetweenQuestions: boolean
  questionSpacingPt: number
  sectionBreakNewPage: boolean
  showMarksPerQuestion: boolean
  marksAlignment: 'right' | 'inline'
  footerNote?: string
  showPageNumbers: boolean
  pageNumberPosition: 'bottom_center' | 'bottom_right'
  createdAt: string
  updatedAt: string
}
