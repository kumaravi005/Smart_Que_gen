export type PageOrientation = 'portrait' | 'landscape'
export type PageSize = 'A4' | 'Letter' | 'Legal'
export type ColumnLayout = 'single' | 'two_column' | 'auto_responsive'
export type HeaderStyle = 'classic' | 'modern' | 'minimal' | 'bordered'
export type NumberingStyle = '123' | 'roman' | 'alpha'

export type McqOptionLayoutMode = 'auto' | 'four_per_row' | 'two_per_row' | 'one_per_row'
export type PageCountStrategy = 'auto' | 'prefer_one_page' | 'target_pages' | 'manual'

export interface HeaderFooterSettings {
  logoPlacement: 'left' | 'center' | 'right' | 'none'
  showInstitutionName: boolean
  showAddress: boolean
  showContact: boolean
  headerCustomText?: string
  footerCustomText?: string
  showPageNumbers: boolean
  pageNumberPosition: 'bottom_center' | 'bottom_right' | 'top_right'
  showExamNameInFooter: boolean
  separatorLineStyle: 'single' | 'double' | 'none'
  borderStyle: 'none' | 'outer_box' | 'header_box'
  differentFirstPage: boolean
  firstPageHeaderStyle?: 'full' | 'compact'
}

export interface VisualLayout {
  id: string
  paperId: string
  pageSize: PageSize
  orientation: PageOrientation
  columnLayout: ColumnLayout
  fontFamily: 'system' | 'serif' | 'sans' | 'dejavu'
  fontSizePt: number // standard 10.5pt, 11pt, 12pt
  lineSpacing: number // e.g. 1.0, 1.15, 1.25, 1.5
  pageMarginsMm: {
    top: number
    bottom: number
    left: number
    right: number
  }
  headerStyle: HeaderStyle
  showInstituteLogo: boolean
  logoPlacement: 'center' | 'left' | 'right' | 'none'
  logoWidthMm: number
  showWatermark: boolean
  watermarkText?: string
  watermarkOpacity: number // 0.05 to 0.2
  dividerBetweenQuestions: boolean
  questionSpacingPt: number
  optionSpacingPt: number
  mcqOptionLayout: McqOptionLayoutMode
  pageCountStrategy: PageCountStrategy
  targetPageCount?: number
  sectionBreakNewPage: boolean
  showMarksPerQuestion: boolean
  marksAlignment: 'right' | 'inline'
  footerNote?: string
  showPageNumbers: boolean
  pageNumberPosition: 'bottom_center' | 'bottom_right'
  headerFooter: HeaderFooterSettings
  createdAt: string
  updatedAt: string
}
