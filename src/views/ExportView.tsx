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
  Check
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { exportWordDocument, exportExcelCsv } from '../utils/exportHelpers'

export const ExportView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading } = usePaperDetails(paperId)
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const isManualDesignMode = paper?.layout.designData?.mode === 'manual'

  const handleExport = (format: string) => {
    if (!paper) return
    setExportingFormat(format)
    setStatusMessage(`Preparing ${format.toUpperCase()} export...`)

    setTimeout(() => {
      setExportingFormat(null)
      if (format === 'pdf') {
        window.print()
      } else if (format === 'docx') {
        exportWordDocument(paper)
        setStatusMessage('Microsoft Word (.doc) exported. Fully editable in Word desktop & mobile.')
        setTimeout(() => setStatusMessage(null), 5000)
      } else if (format === 'xlsx') {
        exportExcelCsv(paper)
        setStatusMessage('Excel question matrix (.csv) exported with answer keys and marks.')
        setTimeout(() => setStatusMessage(null), 5000)
      }
    }, 800)
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading export manager...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
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
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Export Manager</h1>
            <p className="text-xs text-slate-500">
              Generate offline-compatible PDF, editable Word DOCX, and question list XLSX.
            </p>
          </div>
        </div>

        {paper && (
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {paper.metadata.title}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/preview?paperId=${paper.metadata.id}`)}
              leftIcon={<Eye className="w-4 h-4 text-amber-600" />}
            >
              Live Preview
            </Button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
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
              Export Compatibility & Visual Designer Rules
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              How Omega Paper Generator preserves your question formatting, typography, and manual canvas positioning across export formats:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <Printer className="w-4 h-4" />
              <span>Print & PDF Export Fidelity</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Preserves 100% of millimetric layout, custom borders, divider lines, logo alignment, and font sizes.
              {isManualDesignMode
                ? ' Freeform element positions configured in Manual Design Mode are rendered directly into print vectors without distortion.'
                : ' Automatic multi-page pagination and margins are respected 1:1.'}
            </p>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <FileType className="w-4 h-4" />
              <span>Microsoft Word (DOCX) Editability</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Preserves complete document editability on Word desktop and mobile. To avoid text clipping or broken mobile wrapping, questions and instructions are structured as native Word flow sections, gracefully reflowing absolute positioning while keeping content fully editable.
            </p>
          </div>
        </div>

        {isManualDesignMode && (
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-amber-300 text-xs">
            <span className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Paper is in <strong>Manual Visual Designer Mode</strong> with custom coordinates.</span>
            </span>
            <button
              onClick={() => navigate(`/designer?paperId=${paper?.metadata.id}`)}
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
            onClick={() => handleExport('pdf')}
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
            <h3 className="font-bold text-slate-900 text-lg">Microsoft Word (.doc)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Fully editable document for staff members to adjust questions or add notes in MS Word.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
              <Check className="w-3.5 h-3.5" />
              <span>Full Text Editability</span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            isLoading={exportingFormat === 'docx'}
            onClick={() => handleExport('docx')}
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
            <h3 className="font-bold text-slate-900 text-lg">Excel / CSV</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Structured table of questions, MCQ answer keys, difficulty levels, and syllabus tags.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md w-fit">
              <Check className="w-3.5 h-3.5" />
              <span>Answer Key Matrix</span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            isLoading={exportingFormat === 'xlsx'}
            onClick={() => handleExport('xlsx')}
          >
            Export CSV / XLSX
          </Button>
        </div>
      </div>
    </div>
  )
}
