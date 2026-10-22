import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Eye,
  Printer,
  FileDown,
  FileEdit,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Columns,
  Maximize2,
  AlertTriangle,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { PaperSheet } from '../components/preview/PaperSheet'
import { paginatePaper } from '../utils/paginationEngine'
import type { ColumnLayout, PageOrientation } from '../types'

export const PreviewView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading, saveLayout } = usePaperDetails(paperId)

  // View state
  const [activePageIndex, setActivePageIndex] = useState<number>(0)
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single')
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  // Quick layout adjustments directly on preview
  const handleToggleColumns = async () => {
    if (!paper) return
    const nextCol: ColumnLayout = paper.layout.columnLayout === 'two_column' ? 'single' : 'two_column'
    setIsApplyingAdjustment(true)
    await saveLayout({
      ...paper.layout,
      columnLayout: nextCol
    })
    setIsApplyingAdjustment(false)
  }

  const handleToggleOrientation = async () => {
    if (!paper) return
    const nextOrient: PageOrientation = paper.layout.orientation === 'landscape' ? 'portrait' : 'landscape'
    setIsApplyingAdjustment(true)
    await saveLayout({
      ...paper.layout,
      orientation: nextOrient
    })
    setIsApplyingAdjustment(false)
  }

  const handleQuickFontSize = async (pt: number) => {
    if (!paper) return
    setIsApplyingAdjustment(true)
    await saveLayout({
      ...paper.layout,
      fontSizePt: pt
    })
    setIsApplyingAdjustment(false)
  }

  const handleApplyCompactMargins = async () => {
    if (!paper) return
    setIsApplyingAdjustment(true)
    await saveLayout({
      ...paper.layout,
      pageMarginsMm: { top: 10, bottom: 10, left: 10, right: 10 }
    })
    setIsApplyingAdjustment(false)
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="font-bold text-slate-800 text-base">Generating Live Paginated Paper Preview...</h3>
        <p className="text-xs text-slate-400">Calculating physical page boundaries and layout typography</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12">
        <Eye className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500">
          Please select or create an examination paper to view live preview.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  // Automatic Pagination Calculation
  const pagination = paginatePaper({
    settings: paper.settings,
    content: paper.content,
    layout: paper.layout
  })

  const { pages, totalPages, fitsTarget, targetFitExplanation } = pagination
  const safePageIndex = Math.min(Math.max(0, activePageIndex), Math.max(0, totalPages - 1))
  const currentPage = pages[safePageIndex] || pages[0]

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
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
              <Badge variant="info" size="sm">
                {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              Live Paper Preview
            </h1>
            <p className="text-xs text-slate-500">
              Interactive pagination simulator matching physical A4 paper dimensions and print boundaries.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/wizard?paperId=${paper.metadata.id}&step=3`)}
            leftIcon={<Wand2 className="w-4 h-4 text-purple-600" />}
          >
            Setup Wizard
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/editor?paperId=${paper.metadata.id}`)}
            leftIcon={<FileEdit className="w-4 h-4 text-blue-600" />}
          >
            Question Editor
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

      {/* Target Page Overflow Warning Banner */}
      {!fitsTarget && targetFitExplanation && (
        <div className="print:hidden p-4 rounded-3xl bg-amber-500/10 border border-amber-300 text-amber-950 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-amber-950">
                Target Page Count Exceeded
              </h3>
              <p className="text-xs text-amber-900 leading-relaxed">
                {targetFitExplanation}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
            <span className="text-[11px] font-bold text-amber-900 uppercase">1-Click Fixes:</span>
            {paper.layout.columnLayout !== 'two_column' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleColumns}
                disabled={isApplyingAdjustment}
                leftIcon={<Columns className="w-3.5 h-3.5" />}
              >
                Switch to 2-Column
              </Button>
            )}
            {(paper.layout.pageMarginsMm?.top || 15) > 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyCompactMargins}
                disabled={isApplyingAdjustment}
                leftIcon={<Maximize2 className="w-3.5 h-3.5" />}
              >
                Apply Compact Margins (10mm)
              </Button>
            )}
            {(paper.layout.fontSizePt || 11) > 10.5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickFontSize(10.5)}
                disabled={isApplyingAdjustment}
              >
                Set Font to 10.5pt
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Preview Controls & Page Navigation Toolbar (hidden in print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700 sticky top-4 z-20">
        {/* Page Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={viewMode === 'all' || safePageIndex === 0}
            onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Prev Page
          </Button>

          {/* Jump to page select */}
          <select
            value={safePageIndex}
            onChange={e => {
              setActivePageIndex(Number(e.target.value))
              setViewMode('single')
            }}
            disabled={viewMode === 'all'}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
          >
            {pages.map((p, idx) => (
              <option key={p.pageNumber} value={idx}>
                Page {p.pageNumber} of {totalPages} {p.isCoverPage ? '(Cover)' : ''}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={viewMode === 'all' || safePageIndex >= totalPages - 1}
            onClick={() => setActivePageIndex(prev => Math.min(totalPages - 1, prev + 1))}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next Page
          </Button>

          <span className="text-slate-300">|</span>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'single'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Page
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All {totalPages} Pages
            </button>
          </div>
        </div>

        {/* Quick Layout Tweak Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Column Toggle */}
          <button
            type="button"
            onClick={handleToggleColumns}
            disabled={isApplyingAdjustment}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              paper.layout.columnLayout === 'two_column'
                ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle between Single-Column and Two-Column layout"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{paper.layout.columnLayout === 'two_column' ? '2 Columns' : '1 Column'}</span>
          </button>

          {/* Orientation Toggle */}
          <button
            type="button"
            onClick={handleToggleOrientation}
            disabled={isApplyingAdjustment}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
              paper.layout.orientation === 'landscape'
                ? 'bg-purple-50 border-purple-400 text-purple-700 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Toggle Page Orientation"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{paper.layout.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              disabled={zoomLevel <= 70}
              onClick={() => setZoomLevel(prev => Math.max(70, prev - 15))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 font-bold text-slate-700">
              {zoomLevel}%
            </span>
            <button
              type="button"
              disabled={zoomLevel >= 130}
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 15))}
              className="p-1 text-slate-600 hover:text-slate-900 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Pages Container */}
      <div
        className="space-y-8 transition-transform duration-200 origin-top flex flex-col items-center"
        style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined }}
      >
        {viewMode === 'single' ? (
          <div className="w-full flex flex-col items-center space-y-2">
            <div className="print:hidden text-xs font-semibold text-slate-400">
              Page {currentPage.pageNumber} of {totalPages} {currentPage.isCoverPage ? '— Cover Page' : ''}
            </div>
            <PaperSheet
              page={currentPage}
              totalPages={totalPages}
              settings={paper.settings}
              layout={paper.layout}
            />
          </div>
        ) : (
          pages.map((p) => (
            <div key={p.pageNumber} className="w-full flex flex-col items-center space-y-2">
              <div className="print:hidden text-xs font-semibold text-slate-400">
                Page {p.pageNumber} of {totalPages} {p.isCoverPage ? '— Cover Page' : ''}
              </div>
              <PaperSheet
                page={p}
                totalPages={totalPages}
                settings={paper.settings}
                layout={paper.layout}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
