import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, Printer, FileDown, FileEdit, Wand2 } from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'

export const PreviewView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading } = usePaperDetails(paperId)

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Generating live preview...</div>
  }

  if (!paper) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <Eye className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500">Please choose a paper to preview.</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const { settings, content, layout } = paper
  const isTwoColumn = layout.columnLayout === 'two_column'
  const hf = layout.headerFooter || {
    logoPlacement: layout.logoPlacement || 'center',
    showInstitutionName: true,
    showAddress: true,
    showContact: true,
    separatorLineStyle: 'single',
    borderStyle: 'none',
    footerCustomText: layout.footerNote || 'Omega Education Center — Academic Excellence',
    showPageNumbers: layout.showPageNumbers ?? true,
    pageNumberPosition: layout.pageNumberPosition || 'bottom_center',
    showExamNameInFooter: true
  }

  const studentFields = settings.studentFields || {
    showName: true,
    showRollNo: true,
    showDate: true,
    showSection: true,
    showSignature: true,
    showInvigilatorSign: true
  }

  // Helper for MCQ options grid class
  const getOptionGridClass = () => {
    const mode = layout.mcqOptionLayout || 'auto'
    if (mode === 'four_per_row') return 'grid grid-cols-4 gap-2'
    if (mode === 'two_per_row') return 'grid grid-cols-2 gap-2'
    if (mode === 'one_per_row') return 'grid grid-cols-1 gap-1'
    // auto
    return isTwoColumn ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 sm:grid-cols-4 gap-2'
  }

  const separatorClass =
    hf.separatorLineStyle === 'double'
      ? 'border-b-4 border-double border-slate-900'
      : hf.separatorLineStyle === 'none'
      ? ''
      : 'border-b-2 border-slate-900'

  const borderContainerClass =
    hf.borderStyle === 'outer_box'
      ? 'border-4 border-slate-900'
      : hf.borderStyle === 'header_box'
      ? ''
      : 'border border-slate-300'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner (hidden in print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Module 6</span>
              <Badge variant="warning" size="sm">Live Print Simulator</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Live Paper Preview</h1>
            <p className="text-xs text-slate-500">
              Interactive preview matching physical A4 paper typography and print boundaries.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/wizard?paperId=${paper.metadata.id}&step=7`)}
            leftIcon={<Wand2 className="w-4 h-4 text-purple-600" />}
          >
            Setup Wizard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/editor?paperId=${paper.metadata.id}`)}
            leftIcon={<FileEdit className="w-4 h-4" />}
          >
            Edit Questions
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print / PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/export?paperId=${paper.metadata.id}`)}
            leftIcon={<FileDown className="w-4 h-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* SEPARATE COVER PAGE (Option B) if enabled */}
      {settings.coverPageMode === 'separate_cover' && (
        <div className="relative bg-white shadow-xl rounded-xl border border-slate-300 p-12 min-h-[1050px] font-serif text-slate-900 flex flex-col justify-between print:shadow-none print:border-none print:p-8 print:m-0 print:break-after-page">
          <div className="text-center space-y-3 pt-6">
            {settings.institute.logoUrl && hf.logoPlacement !== 'none' && (
              <img
                src={settings.institute.logoUrl}
                alt="Logo"
                className="w-20 h-20 object-contain mx-auto mb-2"
              />
            )}
            <h1 className="text-3xl font-extrabold uppercase tracking-wide">
              {settings.institute.name}
            </h1>
            {settings.institute.tagline && (
              <p className="text-sm italic font-sans text-slate-600">
                {settings.institute.tagline}
              </p>
            )}
            {settings.institute.address && (
              <p className="text-xs font-sans text-slate-500">
                {settings.institute.address}
              </p>
            )}

            <div className="pt-8 space-y-2">
              <span className="text-xs uppercase font-sans font-bold tracking-widest text-slate-400">
                Official Examination Question Booklet
              </span>
              <h2 className="text-2xl font-bold uppercase">{settings.examName}</h2>
              <div className="text-base font-sans font-semibold text-slate-700">
                Academic Session: {settings.academicSession || '2026-2027'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-6 font-sans text-sm text-left border-y border-slate-300 py-4">
              <div><strong>Subject:</strong> {settings.subject}</div>
              <div><strong>Class:</strong> {settings.className}</div>
              <div><strong>Time:</strong> {settings.durationMinutes} Minutes</div>
              <div><strong>Maximum Marks:</strong> {settings.totalMarks}</div>
            </div>
          </div>

          {/* Student details fill-in table on cover page */}
          <div className="my-8 font-sans border-2 border-slate-800 rounded-lg p-5 space-y-4 max-w-lg mx-auto w-full">
            <h3 className="font-bold text-center uppercase tracking-wider text-xs border-b border-slate-300 pb-2">
              Candidate Examination Information
            </h3>
            <div className="space-y-3 text-xs">
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
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center pt-6 border-t border-slate-400 text-[11px] font-semibold text-slate-600">
                  Candidate&apos;s Signature
                </div>
                <div className="text-center pt-6 border-t border-slate-400 text-[11px] font-semibold text-slate-600">
                  Invigilator&apos;s Signature
                </div>
              </div>
            </div>
          </div>

          {/* General instructions on cover page */}
          <div className="font-sans text-xs space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-lg max-w-xl mx-auto w-full">
            <div className="font-bold uppercase tracking-wider text-[11px]">Important Instructions:</div>
            <ol className="list-decimal pl-4 space-y-1 text-slate-700">
              {settings.generalInstructions?.map((inst: string, i: number) => (
                <li key={i}>{inst}</li>
              ))}
            </ol>
            {settings.customCoverText && (
              <div className="pt-2 text-[11px] italic text-slate-600 border-t border-slate-200">
                {settings.customCoverText}
              </div>
            )}
          </div>

          <div className="text-center font-sans text-[11px] text-slate-400 pt-4">
            Do not turn the page until instructed by the examination invigilator.
          </div>
        </div>
      )}

      {/* QUESTION SHEET CONTAINER */}
      <div
        className={`relative bg-white shadow-xl rounded-xl ${borderContainerClass} p-8 sm:p-12 min-h-[1050px] font-serif text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 overflow-hidden`}
        style={{ fontFamily: layout.fontFamily === 'serif' ? 'Times New Roman, serif' : 'Inter, sans-serif' }}
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

        <div className="relative z-10 space-y-6">
          {/* Header Section (if not in separate cover or top of questions) */}
          <div className={`space-y-1.5 pb-4 ${separatorClass}`}>
            <div className={`flex flex-col ${
              hf.logoPlacement === 'left' ? 'sm:flex-row items-center gap-4 text-left' :
              hf.logoPlacement === 'right' ? 'sm:flex-row-reverse items-center gap-4 text-right' :
              'text-center'
            }`}>
              {settings.institute.logoUrl && hf.logoPlacement !== 'none' && (
                <img
                  src={settings.institute.logoUrl}
                  alt="Logo"
                  className="w-16 h-16 object-contain shrink-0 mx-auto sm:mx-0 mb-1"
                />
              )}

              <div className="flex-1">
                {hf.showInstitutionName && (
                  <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide">
                    {settings.institute.name}
                  </h1>
                )}
                {settings.institute.tagline && (
                  <p className="text-xs sm:text-sm italic font-sans text-slate-700">
                    {settings.institute.tagline}
                  </p>
                )}
                {hf.showAddress && settings.institute.address && (
                  <p className="text-[11px] font-sans text-slate-600">
                    {settings.institute.address}
                  </p>
                )}
              </div>
            </div>

            <div className="text-center pt-2 text-base sm:text-lg font-bold tracking-tight">
              {settings.examName} {settings.academicSession ? `(${settings.academicSession})` : ''}
            </div>

            {/* Exam Meta Bar */}
            <div className="pt-2 font-sans flex flex-wrap items-center justify-between text-xs sm:text-sm font-semibold border-t border-slate-400 mt-2 px-2">
              <div>Subject: {settings.subject} {settings.subjectCode ? `(${settings.subjectCode})` : ''}</div>
              <div>Class: {settings.className}</div>
              <div>Time: {Math.floor(settings.durationMinutes / 60)}h {settings.durationMinutes % 60 ? `${settings.durationMinutes % 60}m` : ''}</div>
              <div>Max Marks: {settings.totalMarks}</div>
            </div>

            {/* Candidate Info Block (if enabled on first page) */}
            {settings.coverPageMode !== 'separate_cover' && (studentFields.showName || studentFields.showRollNo) && (
              <div className="mt-2 pt-2 border-t border-dashed border-slate-300 font-sans text-xs flex flex-wrap items-center justify-between gap-3 px-2 bg-slate-50/60 p-1.5 rounded">
                {studentFields.showName && (
                  <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                    <span className="font-semibold text-slate-600">Name:</span>
                    <span className="flex-1 border-b border-slate-400"></span>
                  </div>
                )}
                {studentFields.showRollNo && (
                  <div className="flex items-center gap-1.5 w-32">
                    <span className="font-semibold text-slate-600">Roll No:</span>
                    <span className="flex-1 border-b border-slate-400"></span>
                  </div>
                )}
                {studentFields.showSection && (
                  <div className="flex items-center gap-1.5 w-24">
                    <span className="font-semibold text-slate-600">Sec:</span>
                    <span className="flex-1 border-b border-slate-400"></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* General Instructions (if on top of first page) */}
          {settings.coverPageMode !== 'separate_cover' && settings.generalInstructions && settings.generalInstructions.length > 0 && (
            <div className="font-sans text-xs space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold uppercase tracking-wider text-[11px] text-slate-800">
                General Instructions:
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
                {settings.generalInstructions.map((inst: string, i: number) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Paper Sections & Questions */}
          <div className="space-y-6">
            {content.sections.map(sec => (
              <div key={sec.sectionId} className="space-y-3">
                <div className="text-center font-sans font-bold uppercase text-sm tracking-wider py-1 bg-slate-100 border-y border-slate-300">
                  {sec.title}
                </div>
                {sec.instructions && (
                  <div className="text-xs italic font-sans text-slate-600 text-center">
                    {sec.instructions}
                  </div>
                )}

                <div className={isTwoColumn ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3' : 'space-y-3'}>
                  {sec.questions.map((q, idx: number) => (
                    <div
                      key={q.id}
                      className={`text-sm ${
                        layout.dividerBetweenQuestions && idx !== 0 ? 'pt-2.5 border-t border-slate-200' : ''
                      }`}
                      style={{ fontSize: `${layout.fontSizePt || 11}pt`, lineHeight: layout.lineSpacing || 1.25 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="font-bold shrink-0">{idx + 1}.</span>
                          <div className="space-y-1.5 flex-1">
                            <span className="leading-relaxed">{q.prompt}</span>

                            {/* MCQs Option Layout with selected grid arrangement */}
                            {q.options && q.options.length > 0 && (
                              <div className={`pt-1 font-sans text-xs ${getOptionGridClass()}`}>
                                {q.options.map(opt => (
                                  <div key={opt.id} className="flex items-baseline gap-1.5">
                                    <span className="font-bold">({opt.label})</span>
                                    <span>{opt.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {layout.showMarksPerQuestion && (
                          <span className="font-sans text-xs font-bold text-slate-700 shrink-0 ml-2">
                            [{q.marks}]
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Running Footer Note & Page Number */}
          <div className="pt-8 border-t border-slate-300 flex items-center justify-between font-sans text-xs text-slate-500">
            <div>
              {hf.showExamNameInFooter ? `${settings.subject} - ${settings.examName} | ` : ''}
              {hf.footerCustomText || layout.footerNote || ''}
            </div>
            {hf.showPageNumbers && (
              <div className="font-semibold">
                Page 1 of 1
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
