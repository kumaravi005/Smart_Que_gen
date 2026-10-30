import React from 'react'
import type { GeneratedPage } from '../../types/pageLayout'
import type { ExamSettings, VisualLayout, Question } from '../../types'
import { estimateMcqOptionGrid } from '../../utils/mcqLayout'
import { FormattedMathText } from '../common/FormattedMathText'

/**
 * Strips duplicate leading question numbers (e.g. "1.", "1)", "1:", "Q1.", "Q.1", "प्रश्न 1.")
 * to avoid rendering redundant numbering like "Q1. 1. Question"
 */
export function cleanQuestionPrompt(prompt: string): string {
  if (!prompt) return ''
  return prompt.replace(/^(?:(?:Q|Question|प्रश्न|प्र)\.?\s*\d+[\.\:\-\)]|\d+[\.\:\-\)])\s*/i, '').trim()
}

interface PaperSheetProps {
  page: GeneratedPage
  totalPages: number
  settings: ExamSettings
  layout: VisualLayout
  questions?: Question[]
}

export const PaperSheet: React.FC<PaperSheetProps> = ({
  page,
  totalPages,
  settings,
  layout,
  questions
}) => {
  const isLandscape = layout.orientation === 'landscape'
  const isTwoColumn = page.hasTwoColumns
  const margins = layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }
  const hf = layout.headerFooter || {
    logoPlacement: layout.logoPlacement || 'center',
    showInstitutionName: true,
    showAddress: true,
    separatorLineStyle: 'single',
    borderStyle: 'none',
    showPageNumbers: layout.showPageNumbers ?? true,
    pageNumberPosition: 'bottom_center',
    showExamNameInFooter: true
  }

  const currentLogoPlacement = hf.logoPlacement || layout.logoPlacement || 'center'
  const showLogo =
    layout.showInstituteLogo !== false &&
    layout.logoPlacement !== 'none' &&
    currentLogoPlacement !== 'none'

  const instNameSize = hf.institutionNameSizePt || 22
  const instNameAlign = hf.institutionNameAlign || 'center'
  const taglineSize = hf.taglineSizePt || 11
  const taglineAlign = hf.taglineAlign || 'center'
  const addressSize = hf.addressSizePt || 9.5
  const addressAlign = hf.addressAlign || 'center'
  const logoSizeMm = hf.logoWidthMm || layout.logoWidthMm || 24
  const logoHeightMm = hf.logoHeightMm || layout.logoHeightMm

  const alignClassMap: Record<string, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  const rawFooterText = (hf.footerCustomText !== undefined ? hf.footerCustomText : layout.footerNote) || ''
  const showRunningFooter = hf.showRunningFooter !== false && rawFooterText.trim().length > 0
  const showExamName = Boolean(hf.showExamNameInFooter)
  const showPageNumbers = hf.showPageNumbers !== false && layout.showPageNumbers !== false
  const hasFooter = showRunningFooter || showExamName || showPageNumbers

  const separatorClass =
    hf.separatorLineStyle === 'double'
      ? 'border-b-4 border-double border-slate-900'
      : hf.separatorLineStyle === 'none'
      ? ''
      : 'border-b-2 border-slate-900'

  const borderContainerClass =
    hf.borderStyle === 'outer_box'
      ? 'border-2 sm:border-4 border-slate-900'
      : hf.borderStyle === 'header_box'
      ? 'border border-slate-300 print:border-none'
      : 'border border-slate-300 print:border-none'

  const fontFamilyStyle =
    layout.fontFamily === 'serif'
      ? 'Times New Roman, Cambria, Georgia, serif'
      : layout.fontFamily === 'dejavu'
      ? 'DejaVu Serif, Georgia, serif'
      : 'Inter, system-ui, -apple-system, sans-serif'

  // Dimensions for realistic sheet rendering
  // A4 Portrait: 210mm x 297mm (~794px x 1123px)
  // A4 Landscape: 297mm x 210mm (~1123px x 794px)
  const sheetDimensionsStyle = isLandscape
    ? { minHeight: '210mm', width: '100%', maxWidth: '297mm' }
    : { minHeight: '297mm', width: '100%', maxWidth: '210mm' }

  const manualElements = layout.designData?.elements || []
  const manualElementsForPage = layout.designData?.mode === 'manual'
    ? manualElements.filter(el => el.pageIndex === (page.pageNumber - 1))
    : []
  const hasManualQuestions = manualElementsForPage.some(el => el.type === 'question_block')
  const hasQuestionsInPaper = (questions && questions.length > 0) || page.elements.some(e => e.type === 'question')
  const isManualMode = layout.designData?.mode === 'manual' && manualElementsForPage.length > 0 && (!hasQuestionsInPaper || hasManualQuestions)

  return (
    <div
      className={`paper-sheet ${isLandscape ? 'is-landscape' : ''} relative mx-auto bg-white shadow-xl ${borderContainerClass} print:shadow-none print:m-0 rounded-md flex flex-col justify-between transition-all duration-200 select-text`}
      style={{
        ...sheetDimensionsStyle,
        paddingTop: isManualMode ? 0 : `${margins.top}mm`,
        paddingBottom: isManualMode ? 0 : `${margins.bottom}mm`,
        paddingLeft: isManualMode ? 0 : `${margins.left}mm`,
        paddingRight: isManualMode ? 0 : `${margins.right}mm`,
        fontFamily: fontFamilyStyle,
        boxSizing: 'border-box'
      }}
    >
      {/* Anti-piracy Watermark */}
      {layout.showWatermark && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
          style={{ opacity: layout.watermarkOpacity || 0.08 }}
        >
          <span className="text-5xl sm:text-6xl font-black font-sans uppercase -rotate-45 tracking-widest text-slate-900 text-center">
            {layout.watermarkText || 'OMEGA EDUCATION CENTER'}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {isManualMode && manualElementsForPage.length > 0 ? (
        <div className="relative w-full h-full min-h-[inherit]">
          {manualElementsForPage.map(el => {
            const linkedQuestion = questions?.find(q => q.id === el.questionId)
            return (
              <div
                key={el.id}
                className="absolute overflow-hidden"
                style={{
                  left: `${el.x}mm`,
                  top: `${el.y}mm`,
                  width: `${el.width}mm`,
                  height: `${el.height}mm`,
                  zIndex: el.zIndex,
                  backgroundColor: el.backgroundColor || 'transparent',
                  borderWidth: el.borderWidth !== undefined ? `${el.borderWidth}px` : undefined,
                  borderColor: el.borderColor || '#cbd5e1',
                  borderStyle: el.borderStyle || 'none',
                  padding: el.paddingMm ? `${el.paddingMm}mm` : undefined,
                  boxSizing: 'border-box'
                }}
              >
                <div
                  className="w-full h-full overflow-hidden text-slate-900 select-text font-serif leading-snug"
                  style={{
                    fontSize: el.fontSizePt ? `${el.fontSizePt}pt` : '11pt',
                    fontWeight: el.bold ? 'bold' : 'normal',
                    fontStyle: el.italic ? 'italic' : 'normal',
                    textAlign: el.alignment || 'left',
                    color: el.color || '#0f172a'
                  }}
                >
                  {el.type === 'header' ? (
                    <div className="w-full text-center space-y-1">
                      <h2 className="text-base font-extrabold uppercase font-serif tracking-wider">
                        {settings.institute.name}
                      </h2>
                      <p className="text-xs font-sans font-bold text-slate-800">
                        {settings.examName} • {settings.subject} ({settings.className})
                      </p>
                      <div className="flex justify-between text-[11px] font-sans border-t border-slate-300 pt-1">
                        <span>Time: {settings.durationMinutes} Mins</span>
                        <span>Max Marks: {settings.totalMarks}</span>
                      </div>
                    </div>
                  ) : el.type === 'logo' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={el.imageUrl || settings.institute.logoUrl || '/omega-logo.png'}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    </div>
                  ) : el.type === 'image' ? (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded">
                      {el.imageUrl ? (
                        <img
                          src={el.imageUrl}
                          alt="Figure"
                          className="max-w-full max-h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <span className="text-xs font-sans text-slate-400">Figure / Diagram</span>
                      )}
                    </div>
                  ) : el.type === 'line_h' ? (
                    <div className="w-full h-full flex items-center">
                      <hr className="w-full border-t border-slate-900" />
                    </div>
                  ) : el.type === 'line_v' ? (
                    <div className="w-full h-full flex justify-center">
                      <div className="h-full border-l border-slate-900" />
                    </div>
                  ) : el.type === 'section_header' ? (
                    <div className="w-full h-full flex items-center justify-center font-sans font-bold uppercase text-xs tracking-wider bg-slate-100 border-y border-slate-300 px-2">
                      {el.text || 'Section Header'}
                    </div>
                  ) : el.type === 'question_block' ? (
                    <div className="w-full h-full space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-slate-900 shrink-0">
                          {el.displayNumber || ''}
                        </span>
                        <div className="flex-1 text-slate-800 text-xs sm:text-sm font-medium leading-relaxed">
                          <FormattedMathText text={cleanQuestionPrompt(linkedQuestion?.prompt || el.text || '')} />
                        </div>
                        {linkedQuestion?.marks && (
                          <span className="text-xs font-bold font-sans text-slate-700 shrink-0">
                            [{linkedQuestion.marks}]
                          </span>
                        )}
                      </div>

                      {/* MCQ Options preview if applicable */}
                      {linkedQuestion?.options && (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-sans pt-1">
                          {linkedQuestion.options.map((opt) => (
                            <div key={opt.id} className="flex items-center gap-1 min-h-[28px]">
                              <span className="font-bold shrink-0">({opt.label})</span>
                              <FormattedMathText text={opt.text} isOption={true} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : el.type === 'footer' ? (
                    <div className="w-full flex items-center justify-between text-[11px] font-sans border-t border-slate-300 pt-1 text-slate-500">
                      <span>{settings.examName}</span>
                      <span>Page {page.pageNumber} of {totalPages}</span>
                    </div>
                  ) : (
                    // General Text Block or Box
                    <div className="w-full h-full break-words">
                      {el.text || (el.type === 'box' ? '' : 'Text block')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <div className="relative z-10 flex-1 flex flex-col space-y-4">
        {/* Render Page Elements */}
        {page.isCoverPage ? (
          // DEDICATED COVER PAGE
          <div className="flex-1 flex flex-col justify-between py-6 text-center space-y-6">
            <div className="space-y-3">
              {showLogo && (
                <div className="flex justify-center mb-2 w-full">
                  <img
                    src={settings.institute.logoUrl || '/omega-logo.png'}
                    alt="Logo"
                    style={{
                      width: `${Math.min(185, logoSizeMm * 1.3)}mm`,
                      maxWidth: '100%',
                      height: logoHeightMm ? `${logoHeightMm * 1.3}mm` : 'auto',
                      maxHeight: logoHeightMm ? `${logoHeightMm * 1.3}mm` : '85mm',
                      objectFit: 'contain'
                    }}
                    className="object-contain mx-auto"
                  />
                </div>
              )}
              <h1
                style={{ fontSize: `${instNameSize * 1.3}pt`, lineHeight: 1.2 }}
                className={`font-extrabold uppercase tracking-wide block ${alignClassMap[instNameAlign] || 'text-center'}`}
              >
                {settings.institute.name}
              </h1>
              {settings.institute.tagline && (
                <p
                  style={{ fontSize: `${taglineSize * 1.3}pt`, lineHeight: 1.3 }}
                  className={`italic font-sans text-slate-600 block ${alignClassMap[taglineAlign] || 'text-center'}`}
                >
                  {settings.institute.tagline}
                </p>
              )}
              {settings.institute.address && (
                <p
                  style={{ fontSize: `${addressSize * 1.2}pt`, lineHeight: 1.3 }}
                  className={`font-sans text-slate-500 block ${alignClassMap[addressAlign] || 'text-center'}`}
                >
                  {settings.institute.address}
                </p>
              )}

              <div className="pt-6 space-y-2">
                <span className="text-xs uppercase font-sans font-bold tracking-widest text-slate-400">
                  Official Examination Question Booklet
                </span>
                <h2 className="text-2xl font-bold uppercase">{settings.examName}</h2>
                <div className="text-sm font-sans font-semibold text-slate-700">
                  Academic Session: {settings.academicSession || '2026-2027'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4 font-sans text-xs text-left border-y border-slate-300 py-3">
                <div><strong>Subject:</strong> {settings.subject}</div>
                <div><strong>Class:</strong> {settings.className}</div>
                <div><strong>Time:</strong> {settings.durationMinutes} Minutes</div>
                <div><strong>Maximum Marks:</strong> {settings.totalMarks}</div>
              </div>
            </div>

            {/* Candidate Box */}
            <div className="font-sans border-2 border-slate-800 rounded-lg p-5 space-y-3 max-w-md mx-auto w-full text-left">
              <h3 className="font-bold text-center uppercase tracking-wider text-xs border-b border-slate-300 pb-2">
                Candidate Information
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-24">Student Name:</span>
                  <span className="flex-1 border-b border-slate-400"></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold w-24">Roll Number:</span>
                  <span className="flex-1 border-b border-slate-400"></span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Section:</span>
                    <span className="flex-1 border-b border-slate-400"></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Exam Date:</span>
                    <span className="flex-1 border-b border-slate-400">{settings.date || ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions on cover */}
            {settings.generalInstructions && settings.generalInstructions.length > 0 && (
              <div className="font-sans text-xs space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-lg mx-auto w-full text-left">
                <div className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                  General Instructions:
                </div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                  {settings.generalInstructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="text-center font-sans text-[11px] text-slate-400">
              Do not turn the page until instructed by the examination invigilator.
            </div>
          </div>
        ) : (
          // REGULAR QUESTION SHEET ELEMENTS
          <div className="space-y-4">
            {/* 1. Header Elements */}
            {page.elements.filter(e => e.type === 'header').map(el => {
              const hEl = el as any
              if (hEl.isCompact) {
                // Compact running header on subsequent pages
                return (
                  <div key={el.id} className="font-sans text-[11px] text-slate-600 flex items-center justify-between pb-1.5 border-b border-slate-300">
                    <span className="font-bold">{settings.institute.name} — {settings.examName}</span>
                    <span>{settings.subject} ({settings.className})</span>
                  </div>
                )
              }

              // Full first-page header
              return (
                <div key={el.id} className={`space-y-1 pb-3 ${separatorClass}`}>
                  <div className={`flex flex-col ${
                    showLogo && currentLogoPlacement === 'left' ? 'sm:flex-row items-center gap-4' :
                    showLogo && currentLogoPlacement === 'right' ? 'sm:flex-row-reverse items-center gap-4' :
                    'text-center'
                  }`}>
                    {showLogo && (
                      <div className={`shrink-0 ${currentLogoPlacement === 'center' ? 'flex justify-center mb-1.5 w-full' : ''}`}>
                        <img
                          src={settings.institute.logoUrl || '/omega-logo.png'}
                          alt="Logo"
                          style={{
                            width: `${logoSizeMm}mm`,
                            maxWidth: '100%',
                            height: logoHeightMm ? `${logoHeightMm}mm` : 'auto',
                            maxHeight: logoHeightMm ? `${logoHeightMm}mm` : '75mm',
                            objectFit: 'contain'
                          }}
                          className="object-contain"
                        />
                      </div>
                    )}

                    <div className="flex-1 w-full min-w-0 space-y-1">
                      {hf.showInstitutionName && (
                        <h1
                          style={{
                            fontSize: `${instNameSize}pt`,
                            lineHeight: 1.2
                          }}
                          className={`w-full font-extrabold uppercase tracking-wide text-slate-900 block ${alignClassMap[instNameAlign] || 'text-center'}`}
                        >
                          {settings.institute.name}
                        </h1>
                      )}
                      {settings.institute.tagline && (
                        <p
                          style={{
                            fontSize: `${taglineSize}pt`,
                            lineHeight: 1.3
                          }}
                          className={`w-full italic font-sans text-slate-700 block ${alignClassMap[taglineAlign] || 'text-center'}`}
                        >
                          {settings.institute.tagline}
                        </p>
                      )}
                      {hf.showAddress && settings.institute.address && (
                        <p
                          style={{
                            fontSize: `${addressSize}pt`,
                            lineHeight: 1.3
                          }}
                          className={`w-full font-sans text-slate-600 block ${alignClassMap[addressAlign] || 'text-center'}`}
                        >
                          {settings.institute.address}
                        </p>
                      )}
                      {hf.showContact && settings.institute.contact && (
                        <p
                          style={{
                            fontSize: `${addressSize * 0.95}pt`,
                            lineHeight: 1.3
                          }}
                          className={`w-full font-sans text-slate-500 block ${alignClassMap[addressAlign] || 'text-center'}`}
                        >
                          {settings.institute.contact}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-center pt-1 text-sm sm:text-base font-bold tracking-tight">
                    {settings.examName} {settings.academicSession ? `(${settings.academicSession})` : ''}
                  </div>

                  {/* Exam Meta Bar */}
                  <div className="pt-1.5 font-sans flex flex-wrap items-center justify-between text-xs font-semibold border-t border-slate-400 mt-1.5 px-1">
                    <div>Subject: {settings.subject}</div>
                    <div>Class: {settings.className}</div>
                    <div>Time: {Math.floor(settings.durationMinutes / 60)}h {settings.durationMinutes % 60 ? `${settings.durationMinutes % 60}m` : ''}</div>
                    <div>Max Marks: {settings.totalMarks}</div>
                  </div>
                </div>
              )
            })}

            {/* 2. Candidate Info Block */}
            {page.elements.filter(e => e.type === 'candidate_block').map(el => {
              const cEl = el as any
              return (
                <div key={el.id} className="pt-1 border-t border-dashed border-slate-300 font-sans text-xs flex flex-wrap items-center justify-between gap-3 px-1.5 bg-slate-50/70 p-1.5 rounded">
                  {cEl.showName && (
                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                      <span className="font-semibold text-slate-600">Name:</span>
                      <span className="flex-1 border-b border-slate-400"></span>
                    </div>
                  )}
                  {cEl.showRollNo && (
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="font-semibold text-slate-600">Roll No:</span>
                      <span className="flex-1 border-b border-slate-400"></span>
                    </div>
                  )}
                  {cEl.showSection && (
                    <div className="flex items-center gap-1.5 w-20">
                      <span className="font-semibold text-slate-600">Sec:</span>
                      <span className="flex-1 border-b border-slate-400"></span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 3. General Instructions */}
            {page.elements.filter(e => e.type === 'instructions').map(el => {
              const iEl = el as any
              return (
                <div key={el.id} className="font-sans text-xs space-y-0.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                    General Instructions:
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
                    {iEl.instructions.map((inst: string, idx: number) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ol>
                </div>
              )
            })}

            {/* 4. Section Headers & Questions Container */}
            <div
              className={isTwoColumn ? 'grid grid-cols-2 gap-x-6' : 'space-y-0'}
              style={{ rowGap: `${layout.questionSpacingPt || 8}pt` }}
            >
              {page.elements
                .filter(e => e.type === 'section_header' || e.type === 'question')
                .map(el => {
                  if (el.type === 'section_header') {
                    const sEl = el as any
                    return (
                      <div
                        key={el.id}
                        className={`${isTwoColumn ? 'col-span-2' : ''} text-center font-sans font-bold uppercase text-xs sm:text-sm tracking-wider py-1 bg-slate-100 border-y border-slate-300 mt-2`}
                      >
                        <div>{sEl.title}</div>
                        {sEl.instructions && sEl.instructions.trim() && (
                          <div className="text-[11px] font-normal italic text-slate-600 tracking-normal normal-case">
                            {sEl.instructions.trim().startsWith('(') && sEl.instructions.trim().endsWith(')')
                              ? sEl.instructions.trim()
                              : `(${sEl.instructions.trim()})`}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Question Element
                  const qEl = el as any
                  const q = qEl.question

                  // MCQ Grid estimation
                  const mcqGrid = estimateMcqOptionGrid({
                    options: q.options,
                    mode: qEl.optionsLayout || 'auto',
                    columnLayout: isTwoColumn ? 'two_column' : 'single'
                  })

                  const optionSpacingPt = layout.optionSpacingPt ?? 3
                  const questionSpacingPt = layout.questionSpacingPt ?? 8
                  const lineSpacing = layout.lineSpacing || 1.25

                  return (
                    <div
                      key={el.id}
                      className={`break-inside-avoid ${
                        layout.dividerBetweenQuestions ? 'pt-2 border-t border-slate-200/80' : ''
                      }`}
                      style={{
                        fontSize: `${layout.fontSizePt || 11}pt`,
                        lineHeight: lineSpacing,
                        marginBottom: isTwoColumn ? undefined : `${questionSpacingPt}pt`
                      }}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-1.5 flex-1 min-w-0">
                          <span className="font-bold shrink-0">{qEl.displayNumber}</span>
                          <div
                            className="flex-1 min-w-0"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: `${Math.max(1, optionSpacingPt * 0.4)}pt`
                            }}
                          >
                            {/* Specific instruction if present */}
                            {q.instructions && (
                              <p className="text-[11px] font-sans italic text-slate-600">
                                ({q.instructions})
                              </p>
                            )}

                            {/* Prompt */}
                            <div className="break-words font-medium text-slate-900" style={{ lineHeight: lineSpacing }}>
                              <FormattedMathText text={cleanQuestionPrompt(q.prompt)} />
                            </div>

                            {/* Optional Diagram / Image */}
                            {q.diagramUrl && (
                              <div className="my-1 max-w-xs">
                                <img
                                  src={q.diagramUrl}
                                  alt="Question figure"
                                  className="max-h-36 object-contain rounded"
                                />
                              </div>
                            )}

                            {/* Smart MCQ Options */}
                            {q.options && q.options.length > 0 && (
                              <div
                                className={`font-sans text-xs grid ${mcqGrid.gridClass} gap-x-3`}
                                style={{
                                  rowGap: `${optionSpacingPt}pt`,
                                  marginTop: `${Math.max(1, optionSpacingPt * 0.35)}pt`,
                                  lineHeight: lineSpacing
                                }}
                              >
                                {q.options.map((opt: any) => (
                                  <div
                                    key={opt.id}
                                    className="flex items-baseline gap-1.5 break-words min-h-0"
                                    style={{ lineHeight: lineSpacing }}
                                  >
                                    <span className="font-bold shrink-0">({opt.label})</span>
                                    <FormattedMathText text={opt.text} isOption={true} />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Subjective Ruled Lines space */}
                            {q.writingSpaceLines && q.writingSpaceLines > 0 ? (
                              <div className="pt-2 space-y-2">
                                {Array.from({ length: q.writingSpaceLines }).map((_, lIdx) => (
                                  <div key={lIdx} className="border-b border-slate-300 w-full h-4" />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Marks */}
                        {qEl.showMarks && (
                          <span className="font-sans text-xs font-bold text-slate-800 shrink-0 ml-1">
                            [{q.marks}]
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Running Footer Note & Dynamic Page Number */}
      {!page.isCoverPage && !isManualMode && hasFooter && (
        <div className="relative z-10 pt-3 border-t border-slate-300 flex items-center justify-between font-sans text-[11px] text-slate-500 mt-4">
          <div className="truncate max-w-[70%]">
            {showExamName && <span>{settings.subject} — {settings.examName}</span>}
            {showExamName && showRunningFooter && <span> | </span>}
            {showRunningFooter && <span>{rawFooterText}</span>}
          </div>
          {showPageNumbers && (
            <div className="font-bold font-mono">
              Page {page.pageNumber} of {totalPages}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
