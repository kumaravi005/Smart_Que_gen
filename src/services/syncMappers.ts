import type {
  PaperMetadata,
  ExamSettings,
  PaperContent,
  VisualLayout,
  QuestionBankItem,
  BankFolder,
  PaperSetupTemplate,
  Institute
} from '../types'
import { deterministicUuid, isValidUuid } from '../utils/uuid'

/**
 * Maps local paper entity to Supabase papers table row.
 */
export function paperToCloud(
  local: PaperMetadata,
  instituteId: string,
  userId?: string,
  version = 1
): Record<string, any> {
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('paper', local.id)

  return {
    id: cloudId,
    institute_id: instituteId,
    title: local.title || 'Untitled Examination Paper',
    subject: local.subject || 'General',
    class_name: local.className || 'General',
    exam_name: local.examName || 'Assessment',
    total_marks: local.totalMarks || 0,
    total_questions: local.totalQuestions || 0,
    status: local.status || 'draft',
    tags: Array.isArray(local.tags) ? local.tags : [],
    is_archived: Boolean(local.isArchived),
    created_by: userId || null,
    updated_by: userId || null,
    version,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString(),
    deleted_at: null
  }
}

/**
 * Maps Supabase papers row back to local PaperMetadata model.
 */
export function paperFromCloud(
  cloud: Record<string, any>,
  localId?: string,
  existingMeta?: PaperMetadata | null
): PaperMetadata {
  const id = localId || cloud.id
  const settingsId = existingMeta?.examSettingsId || cloud.exam_settings_id || (isValidUuid(id) ? id : deterministicUuid('setting', id))
  const contentId = existingMeta?.contentId || cloud.content_id || (isValidUuid(id) ? id : deterministicUuid('content', id))
  const visualLayoutId = existingMeta?.visualLayoutId || cloud.visual_layout_id || (isValidUuid(id) ? id : deterministicUuid('layout', id))

  return {
    id,
    title: cloud.title || 'Untitled Examination Paper',
    subject: cloud.subject || 'General',
    className: cloud.class_name || 'General',
    examName: cloud.exam_name || 'Assessment',
    totalMarks: Number(cloud.total_marks || 0),
    totalQuestions: Number(cloud.total_questions || 0),
    status: cloud.status || 'draft',
    examSettingsId: settingsId,
    contentId,
    visualLayoutId,
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString(),
    tags: Array.isArray(cloud.tags) ? cloud.tags : [],
    isArchived: Boolean(cloud.is_archived)
  }
}

/**
 * Maps local ExamSettings to Supabase exam_settings row.
 */
export function settingsToCloud(
  local: ExamSettings,
  instituteId: string,
  version = 1
): Record<string, any> {
  const paperCloudId = isValidUuid(local.paperId) ? local.paperId : deterministicUuid('paper', local.paperId)
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('setting', local.id)

  return {
    id: cloudId,
    paper_id: paperCloudId,
    institute_id: instituteId,
    institute_profile: local.institute || {},
    exam_name: local.examName || '',
    academic_session: local.academicSession || '',
    class_name: local.className || '',
    subject: local.subject || '',
    subject_code: local.subjectCode || null,
    duration_minutes: local.durationMinutes || 180,
    total_marks: local.totalMarks || 80,
    exam_date: local.date || null,
    general_instructions: Array.isArray(local.generalInstructions) ? local.generalInstructions : [],
    sections: Array.isArray(local.sections) ? local.sections : [],
    student_fields: local.studentFields || {},
    cover_page_mode: local.coverPageMode || 'first_page_top',
    custom_cover_text: local.customCoverText || null,
    version,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString()
  }
}

/**
 * Maps Supabase exam_settings row to local ExamSettings model.
 */
export function settingsFromCloud(
  cloud: Record<string, any>,
  localPaperId?: string,
  existingSettings?: ExamSettings | null
): ExamSettings {
  const paperId = localPaperId || cloud.paper_id
  const id = existingSettings?.id || cloud.id || (isValidUuid(paperId) ? paperId : deterministicUuid('setting', paperId))

  return {
    id,
    paperId,
    institute: cloud.institute_profile || {
      name: 'Omega Education Centre',
      tagline: 'एक अद्भुत शिक्षण शैली...',
      affiliation: 'BOARD | JNV | CHS | OLYMPIAD',
      address: '',
      contact: '',
      logoUrl: '/omega-logo.png'
    },
    examName: cloud.exam_name || '',
    academicSession: cloud.academic_session || '',
    className: cloud.class_name || '',
    subject: cloud.subject || '',
    subjectCode: cloud.subject_code || undefined,
    durationMinutes: Number(cloud.duration_minutes || 180),
    totalMarks: Number(cloud.total_marks || 80),
    date: cloud.exam_date || new Date().toISOString().split('T')[0],
    generalInstructions: Array.isArray(cloud.general_instructions) ? cloud.general_instructions : [],
    sections: Array.isArray(cloud.sections) ? cloud.sections : [],
    studentFields: cloud.student_fields || {
      showName: true,
      showRollNo: true,
      showDate: true,
      showSection: true,
      showSignature: true,
      showInvigilatorSign: true
    },
    coverPageMode: cloud.cover_page_mode || 'first_page_top',
    customCoverText: cloud.custom_cover_text || undefined,
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString()
  }
}

/**
 * Maps local PaperContent to Supabase paper_contents row.
 */
export function contentToCloud(
  local: PaperContent,
  instituteId: string,
  version = 1
): Record<string, any> {
  const paperCloudId = isValidUuid(local.paperId) ? local.paperId : deterministicUuid('paper', local.paperId)
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('content', local.id)

  return {
    id: cloudId,
    paper_id: paperCloudId,
    institute_id: instituteId,
    sections: Array.isArray(local.sections) ? local.sections : [],
    total_calculated_marks: local.totalCalculatedMarks || 0,
    total_calculated_questions: local.totalCalculatedQuestions || 0,
    version,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString()
  }
}

/**
 * Maps Supabase paper_contents row to local PaperContent model.
 */
export function contentFromCloud(
  cloud: Record<string, any>,
  localPaperId?: string,
  existingContent?: PaperContent | null
): PaperContent {
  const paperId = localPaperId || cloud.paper_id
  const id = existingContent?.id || cloud.id || (isValidUuid(paperId) ? paperId : deterministicUuid('content', paperId))

  return {
    id,
    paperId,
    sections: Array.isArray(cloud.sections) ? cloud.sections : [],
    totalCalculatedMarks: Number(cloud.total_calculated_marks || 0),
    totalCalculatedQuestions: Number(cloud.total_calculated_questions || 0),
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString()
  }
}

/**
 * Maps local VisualLayout to Supabase visual_layouts row.
 */
export function layoutToCloud(
  local: VisualLayout,
  instituteId: string,
  version = 1
): Record<string, any> {
  const paperCloudId = isValidUuid(local.paperId) ? local.paperId : deterministicUuid('paper', local.paperId)
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('layout', local.id)

  return {
    id: cloudId,
    paper_id: paperCloudId,
    institute_id: instituteId,
    page_size: local.pageSize || 'A4',
    orientation: local.orientation || 'portrait',
    column_layout: local.columnLayout || 'single',
    font_family: local.fontFamily || 'sans',
    font_size_pt: local.fontSizePt || 11.0,
    line_spacing: local.lineSpacing || 1.25,
    page_margins_mm: local.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 },
    header_style: local.headerStyle || 'modern',
    show_institute_logo: local.showInstituteLogo ?? true,
    logo_placement: local.logoPlacement || 'center',
    logo_width_mm: local.logoWidthMm || 24.0,
    show_watermark: local.showWatermark ?? true,
    watermark_text: local.watermarkText || 'OMEGA EDUCATION CENTER',
    watermark_opacity: local.watermarkOpacity ?? 0.08,
    divider_between_questions: local.dividerBetweenQuestions ?? true,
    question_spacing_pt: local.questionSpacingPt || 10.0,
    option_spacing_pt: local.optionSpacingPt || 6.0,
    mcq_option_layout: local.mcqOptionLayout || 'auto',
    page_count_strategy: local.pageCountStrategy || 'auto',
    target_page_count: local.targetPageCount || 2,
    section_break_new_page: local.sectionBreakNewPage ?? false,
    show_marks_per_question: local.showMarksPerQuestion ?? true,
    marks_alignment: local.marksAlignment || 'right',
    footer_note: local.footerNote || 'Omega Education Center — Academic Excellence',
    show_page_numbers: local.showPageNumbers ?? true,
    page_number_position: local.pageNumberPosition || 'bottom_center',
    header_footer: local.headerFooter || {},
    design_data: local.designData || null,
    version,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString()
  }
}

/**
 * Maps Supabase visual_layouts row to local VisualLayout model.
 */
export function layoutFromCloud(
  cloud: Record<string, any>,
  localPaperId?: string,
  existingLayout?: VisualLayout | null
): VisualLayout {
  const paperId = localPaperId || cloud.paper_id
  const id = existingLayout?.id || cloud.id || (isValidUuid(paperId) ? paperId : deterministicUuid('layout', paperId))

  return {
    id,
    paperId,
    pageSize: cloud.page_size || 'A4',
    orientation: cloud.orientation || 'portrait',
    columnLayout: cloud.column_layout || 'single',
    fontFamily: cloud.font_family || 'sans',
    fontSizePt: Number(cloud.font_size_pt || 11.0),
    lineSpacing: Number(cloud.line_spacing || 1.25),
    pageMarginsMm: cloud.page_margins_mm || { top: 15, bottom: 15, left: 15, right: 15 },
    headerStyle: cloud.header_style || 'modern',
    showInstituteLogo: cloud.show_institute_logo ?? true,
    logoPlacement: cloud.logo_placement || 'center',
    logoWidthMm: Number(cloud.logo_width_mm || 24.0),
    showWatermark: cloud.show_watermark ?? true,
    watermarkText: cloud.watermark_text || 'OMEGA EDUCATION CENTER',
    watermarkOpacity: Number(cloud.watermark_opacity ?? 0.08),
    dividerBetweenQuestions: cloud.divider_between_questions ?? true,
    questionSpacingPt: Number(cloud.question_spacing_pt || 10.0),
    optionSpacingPt: Number(cloud.option_spacing_pt || 6.0),
    mcqOptionLayout: cloud.mcq_option_layout || 'auto',
    pageCountStrategy: cloud.page_count_strategy || 'auto',
    targetPageCount: Number(cloud.target_page_count || 2),
    sectionBreakNewPage: cloud.section_break_new_page ?? false,
    showMarksPerQuestion: cloud.show_marks_per_question ?? true,
    marksAlignment: cloud.marks_alignment || 'right',
    footerNote: cloud.footer_note || 'Omega Education Center — Academic Excellence',
    showPageNumbers: cloud.show_page_numbers ?? true,
    pageNumberPosition: cloud.page_number_position || 'bottom_center',
    headerFooter: cloud.header_footer || {},
    designData: cloud.design_data || undefined,
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString()
  }
}

/**
 * Maps local QuestionBankItem to Supabase question_bank row.
 */
export function questionToCloud(
  local: QuestionBankItem,
  instituteId: string,
  userId?: string,
  version = 1
): Record<string, any> {
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('question', local.id)
  const folderId = local.folderId ? (isValidUuid(local.folderId) ? local.folderId : deterministicUuid('folder', local.folderId)) : null

  return {
    id: cloudId,
    institute_id: instituteId,
    folder_id: folderId,
    prompt: local.prompt || (local as any).question || '',
    type: local.type || 'mcq',
    subject: local.subject || 'General',
    class_name: local.className || 'General',
    topic: local.topic || 'General',
    subtopic: local.subtopic || null,
    difficulty: local.difficulty || 'medium',
    marks: local.marks || 1,
    options: local.options || null,
    match_pairs: local.matchPairs || null,
    solution_text: local.solutionText || null,
    hint: local.hint || null,
    diagram_path: local.diagramUrl || null,
    tags: Array.isArray(local.tags) ? local.tags : [],
    usage_count: local.usageCount || 0,
    created_by: userId || null,
    version,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString(),
    deleted_at: null
  }
}

/**
 * Maps Supabase question_bank row to local QuestionBankItem model.
 */
export function questionFromCloud(cloud: Record<string, any>, localId?: string): QuestionBankItem {
  const prompt = cloud.prompt || cloud.question || ''
  const item: QuestionBankItem = {
    id: localId || cloud.id,
    prompt,
    type: cloud.type || 'mcq',
    subject: cloud.subject || 'General',
    className: cloud.class_name || 'General',
    topic: cloud.topic || 'General',
    subtopic: cloud.subtopic || undefined,
    difficulty: cloud.difficulty || 'medium',
    marks: Number(cloud.marks || 1),
    options: cloud.options || undefined,
    matchPairs: cloud.match_pairs || undefined,
    solutionText: cloud.solution_text || undefined,
    hint: cloud.hint || undefined,
    diagramUrl: cloud.diagram_path || undefined,
    tags: Array.isArray(cloud.tags) ? cloud.tags : [],
    folderId: cloud.folder_id || null,
    usageCount: Number(cloud.usage_count || 0),
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString()
  }
  ;(item as any).question = prompt
  return item
}

/**
 * Maps local BankFolder to Supabase bank_folders row.
 */
export function folderToCloud(
  local: BankFolder,
  instituteId: string,
  userId?: string
): Record<string, any> {
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('folder', local.id)
  const parentId = local.parentId ? (isValidUuid(local.parentId) ? local.parentId : deterministicUuid('folder', local.parentId)) : null

  return {
    id: cloudId,
    institute_id: instituteId,
    name: local.name || 'New Folder',
    parent_id: parentId,
    color: local.color || '#3b82f6',
    description: local.description || null,
    created_by: userId || null,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString(),
    deleted_at: null
  }
}

/**
 * Maps Supabase bank_folders row to local BankFolder model.
 */
export function folderFromCloud(cloud: Record<string, any>, localId?: string): BankFolder {
  return {
    id: localId || cloud.id,
    name: cloud.name || 'New Folder',
    parentId: cloud.parent_id || null,
    color: cloud.color || '#3b82f6',
    description: cloud.description || undefined,
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString()
  }
}

/**
 * Maps local PaperSetupTemplate to Supabase templates row.
 */
export function templateToCloud(
  local: PaperSetupTemplate,
  instituteId: string,
  userId?: string
): Record<string, any> {
  const cloudId = isValidUuid(local.id) ? local.id : deterministicUuid('template', local.id)

  return {
    id: cloudId,
    institute_id: instituteId,
    name: local.name || 'Custom Template',
    description: local.description || null,
    subject: local.subject || 'General',
    class_name: local.className || 'General',
    total_marks: local.totalMarks || 80,
    settings: local.settings || {},
    layout: local.layout || {},
    created_by: userId || null,
    created_at: local.createdAt || new Date().toISOString(),
    updated_at: local.updatedAt || new Date().toISOString(),
    deleted_at: null
  }
}

/**
 * Maps Supabase templates row to local PaperSetupTemplate model.
 */
export function templateFromCloud(cloud: Record<string, any>, localId?: string): PaperSetupTemplate {
  return {
    id: localId || cloud.id,
    name: cloud.name || 'Custom Template',
    description: cloud.description || undefined,
    subject: cloud.subject || 'General',
    className: cloud.class_name || 'General',
    totalMarks: Number(cloud.total_marks || 80),
    settings: cloud.settings || {},
    layout: cloud.layout || {},
    createdAt: cloud.created_at || new Date().toISOString(),
    updatedAt: cloud.updated_at || new Date().toISOString()
  }
}

/**
 * Maps Supabase institutes row to local institute object.
 */
export function instituteFromCloud(cloud: Record<string, any>): Institute {
  return {
    id: cloud.id,
    name: cloud.name || 'Omega Education Centre',
    tagline: cloud.tagline || '',
    affiliation: cloud.affiliation || '',
    address: cloud.address || '',
    contact: cloud.contact || '',
    logo_path: cloud.logo_path || '/omega-logo.png',
    created_at: cloud.created_at,
    updated_at: cloud.updated_at
  }
}
