import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, Printer, FileDown, FileEdit } from 'lucide-react'
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

      {/* Physical A4 Sheet Container */}
      <div className="relative bg-white shadow-xl rounded-xl border border-slate-300 p-8 sm:p-12 min-h-[1050px] font-serif text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 overflow-hidden">
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
          {/* Header Section */}
          <div className="text-center space-y-1.5 pb-4 border-b-2 border-slate-900">
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide">
              {settings.institute.name}
            </h1>
            {settings.institute.tagline && (
              <p className="text-xs sm:text-sm italic font-sans text-slate-700">
                {settings.institute.tagline}
              </p>
            )}
            {settings.institute.affiliation && (
              <p className="text-[11px] font-sans text-slate-600">
                {settings.institute.affiliation}
              </p>
            )}

            <div className="pt-2 text-base sm:text-lg font-bold tracking-tight">
              {settings.examName} ({settings.academicSession})
            </div>

            {/* Exam Meta Bar */}
            <div className="pt-2 font-sans flex flex-wrap items-center justify-between text-xs sm:text-sm font-semibold border-t border-slate-400 mt-2 px-2">
              <div>Subject: {settings.subject} {settings.subjectCode ? `(${settings.subjectCode})` : ''}</div>
              <div>Class: {settings.className}</div>
              <div>Time Allowed: {Math.floor(settings.durationMinutes / 60)} hrs {settings.durationMinutes % 60 ? `${settings.durationMinutes % 60} mins` : ''}</div>
              <div>Maximum Marks: {settings.totalMarks}</div>
            </div>
          </div>

          {/* General Instructions */}
          {settings.generalInstructions && settings.generalInstructions.length > 0 && (
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
              <div key={sec.sectionId} className="space-y-4">
                <div className="text-center font-sans font-bold uppercase text-sm tracking-wider py-1 bg-slate-100 border-y border-slate-300">
                  {sec.title}
                </div>

                <div className={isTwoColumn ? 'grid grid-cols-1 sm:grid-cols-2 gap-6' : 'space-y-4'}>
                  {sec.questions.map((q, idx: number) => (
                    <div
                      key={q.id}
                      className={`text-sm ${
                        layout.dividerBetweenQuestions && idx !== 0 ? 'pt-3 border-t border-slate-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="font-bold shrink-0">{idx + 1}.</span>
                          <div className="space-y-2 flex-1">
                            <span className="leading-relaxed">{q.prompt}</span>

                            {/* MCQs Option Layout */}
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1.5 font-sans text-xs">
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

          {/* Footer running note */}
          {layout.footerNote && (
            <div className="pt-8 border-t border-slate-300 text-center font-sans text-xs text-slate-500">
              {layout.footerNote}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
