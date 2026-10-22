import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  FileDown,
  FileType,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Info,
  Palette,
  Eye,
  Check,
  AlertTriangle,
  FileEdit,
  Loader2,
  DownloadCloud
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { PaperSheet } from '../components/preview/PaperSheet'
import { paginatePaper } from '../utils/paginationEngine'
import {
  exportToDocx,
  exportToXlsx,
  generateExportFilename,
  triggerDownload,
  triggerPrintWithOrientation
} from '../utils/exportManager'

export const ExportView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading } = usePaperDetails(paperId)

  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | 'xlsx' | null>(null)
  const [exportStep, setExportStep] = useState<string>('')
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const isManualDesignMode = paper?.layout.designData?.mode === 'manual'
  const allQuestions = (paper?.content.sections || []).flatMap(s => s.questions || [])
  const hasQuestions = allQuestions.length > 0

  const handleExport = async (format: 'pdf' | 'docx' | 'xlsx') => {
    if (!paper) return
    setStatusError(null)
    setStatusSuccess(null)

    if (!hasQuestions) {
      setStatusError('Cannot export an empty examination. Please add questions before generating files.')
      return
    }

    setExportingFormat(format)

    try {
      if (format === 'pdf') {
        setExportStep('Preparing print-ready A4 vector layout...')
        await new Promise(r => setTimeout(r, 400))
        triggerPrintWithOrientation(paper.layout.orientation || 'portrait')
        setStatusSuccess('Print dialog opened. Select "Save as PDF" to produce a vector-quality PDF.')
        setTimeout(() => setStatusSuccess(null), 6000)
      } else if (format === 'docx') {
        setExportStep('Structuring Word paragraphs and MCQ tables...')
        await new Promise(r => setTimeout(r, 300))
        const blob = await exportToDocx(paper)
        if (!blob || blob.size < 100) {
          throw new Error('Generated DOCX file was empty or corrupted.')
        }
        setExportStep('Packaging Office Open XML document...')
        await new Promise(r => setTimeout(r, 200))
        const filename = generateExportFilename(paper, 'docx')
        triggerDownload(blob, filename)
        setStatusSuccess(`Editable Word document downloaded: ${filename}`)
        setTimeout(() => setStatusSuccess(null), 6000)
      } else if (format === 'xlsx') {
        setExportStep('Building Question Matrix spreadsheet...')
        await new Promise(r => setTimeout(r, 300))
        const blob = exportToXlsx(paper)
        if (!blob || blob.size < 100) {
          throw new Error('Generated XLSX workbook was empty or corrupted.')
        }
        const filename = generateExportFilename(paper, 'xlsx')
        triggerDownload(blob, filename)
        setStatusSuccess(`Excel spreadsheet downloaded: ${filename}`)
        setTimeout(() => setStatusSuccess(null), 6000)
      }
    } catch (err: any) {
      console.error('Export error:', err)
      setStatusError(`Export failed: ${err.message || 'An unexpected error occurred during export.'}`)
    } finally {
      setExportingFormat(null)
      setExportStep('')
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="font-bold text-slate-800 text-base">Loading Export Manager...</h3>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12">
        <FileDown className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500">
          Please select or create an examination paper to export.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  // Calculate pagination for print preview and PDF export
  const pagination = paginatePaper({
    settings: paper.settings,
    content: paper.content,
    layout: paper.layout
  })
  const { pages, totalPages } = pagination

  return (
    <>
      {/* SCREEN UI (Hidden during window.print) */}
      <div className="print:hidden space-y-6 max-w-4xl mx-auto pb-20">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100">
              <FileDown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Module 7</span>
                <Badge variant="purple" size="sm">Multi-Format Pipeline</Badge>
                {isManualDesignMode ? (
                  <Badge variant="warning" size="sm">Manual Canvas Mode</Badge>
                ) : (
                  <Badge variant="info" size="sm">Automatic Flow Mode</Badge>
                )}
                <Badge variant="primary" size="sm">
                  {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Export Manager</h1>
              <p className="text-xs text-slate-500">
                Generate offline-ready vector PDF, editable Microsoft Word DOCX, and structured XLSX spreadsheets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/preview?paperId=${paper.metadata.id}`)}
              leftIcon={<Eye className="w-4 h-4 text-amber-600" />}
            >
              Live Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/designer?paperId=${paper.metadata.id}`)}
              leftIcon={<Palette className="w-4 h-4 text-pink-600" />}
            >
              Designer
            </Button>
          </div>
        </div>

        {/* Paper Summary Pill */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">{paper.settings.examName}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-medium">{paper.settings.subject} ({paper.settings.className})</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600 font-semibold">
            <span>Questions: <strong className="text-slate-900">{allQuestions.length}</strong></span>
            <span>Marks: <strong className="text-slate-900">{paper.settings.totalMarks}</strong></span>
            <span>Duration: <strong className="text-slate-900">{paper.settings.durationMinutes}m</strong></span>
          </div>
        </div>

        {/* Empty Paper Warning */}
        {!hasQuestions && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-amber-950">No Questions Found</h3>
              <p className="text-xs text-amber-800">
                This examination paper does not contain any questions. Please add questions in the Question Editor or import from the Question Bank before exporting.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate(`/editor?paperId=${paper.metadata.id}`)}
                leftIcon={<FileEdit className="w-4 h-4" />}
              >
                Open Question Editor
              </Button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {statusSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{statusSuccess}</span>
          </div>
        )}

        {statusError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{statusError}</span>
          </div>
        )}

        {/* Progress Step Banner */}
        {exportingFormat && exportStep && (
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-sm flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-blue-950">Generating {exportingFormat.toUpperCase()}</span>
              <p className="text-xs text-blue-800">{exportStep}</p>
            </div>
          </div>
        )}

        {/* Designer & Layout Export Compatibility Guide */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-slate-800 text-amber-400 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-100">
                Multi-Format Export Fidelity & Rules
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                How Omega Question Generator guarantees offline export compatibility without rasterizing or flattening content:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Printer className="w-4 h-4" />
                <span>Print-Ready Vector PDF (A4)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Preserves 100% of physical margins, header logos, section dividers, and typography.
                {isManualDesignMode
                  ? ' Custom millimeter coordinates from Manual Design Mode are rendered directly into print vectors without distortion.'
                  : ' Automatic pagination balances multi-page content preventing orphan headers and clipped MCQs.'}
              </p>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <FileType className="w-4 h-4" />
                <span>Microsoft Word (.docx) Editability</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Generates a true Office Open XML document with native tables for MCQ options and examination metadata. Absolute canvas positioning is reflowed into standard Word flow so staff can freely edit questions, add notes, and reflow text on Word desktop and mobile.
              </p>
            </div>
          </div>

          {isManualDesignMode && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-amber-300 text-xs">
              <span className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Paper has custom coordinates from <strong>Manual Visual Designer Mode</strong>.</span>
              </span>
              <button
                onClick={() => navigate(`/designer?paperId=${paper.metadata.id}`)}
                className="text-white bg-amber-600 hover:bg-amber-500 px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-colors"
              >
                Open Designer
              </button>
            </div>
          )}
        </div>

        {/* Export Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* PDF Export */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-rose-400 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Print-Ready PDF</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Standard vector PDF matching exact paper margins, watermark, and custom canvas layout.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                <Check className="w-3.5 h-3.5" />
                <span>100% Offline Compatible</span>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              isLoading={exportingFormat === 'pdf'}
              disabled={!hasQuestions || exportingFormat !== null}
              onClick={() => handleExport('pdf')}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Export PDF
            </Button>
          </div>

          {/* DOCX Export */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileType className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Microsoft Word (.docx)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Native OpenXML Word document with editable MCQ option tables and exam metadata.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                <Check className="w-3.5 h-3.5" />
                <span>Full Text & Table Editability</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              isLoading={exportingFormat === 'docx'}
              disabled={!hasQuestions || exportingFormat !== null}
              onClick={() => handleExport('docx')}
              leftIcon={<DownloadCloud className="w-4 h-4" />}
            >
              Export DOCX
            </Button>
          </div>

          {/* Excel XLSX Export */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-400 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Excel (.xlsx)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Multi-sheet workbook with question matrix, answer keys, marks, and examination summary.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
                <Check className="w-3.5 h-3.5" />
                <span>Structured Matrix & Summary</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              isLoading={exportingFormat === 'xlsx'}
              disabled={!hasQuestions || exportingFormat !== null}
              onClick={() => handleExport('xlsx')}
              leftIcon={<DownloadCloud className="w-4 h-4" />}
            >
              Export XLSX
            </Button>
          </div>
        </div>
      </div>

      {/* PRINT CONTAINER (Hidden during normal screen view, active only during window.print) */}
      <div className="hidden print:block w-full">
        {pages.map((p) => (
          <PaperSheet
            key={p.pageNumber}
            page={p}
            totalPages={totalPages}
            settings={paper.settings}
            layout={paper.layout}
            questions={allQuestions}
          />
        ))}
      </div>
    </>
  )
}
