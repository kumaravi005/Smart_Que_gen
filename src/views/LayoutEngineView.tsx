import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Layers, Check, Eye } from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'

export const LayoutEngineView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading, saving, saveLayout } = usePaperDetails(paperId)

  const [columnLayout, setColumnLayout] = useState<'single' | 'two_column'>('single')
  const [fontSizePt, setFontSizePt] = useState(11)
  const [lineSpacing, setLineSpacing] = useState(1.25)
  const [dividerBetweenQuestions, setDivider] = useState(true)
  const [saved, setSaved] = useState(false)

  React.useEffect(() => {
    if (paper?.layout) {
      setColumnLayout(paper.layout.columnLayout === 'two_column' ? 'two_column' : 'single')
      setFontSizePt(paper.layout.fontSizePt || 11)
      setLineSpacing(paper.layout.lineSpacing || 1.25)
      setDivider(paper.layout.dividerBetweenQuestions ?? true)
    }
  }, [paper])

  const handleSave = async () => {
    if (!paper) return
    await saveLayout({
      ...paper.layout,
      columnLayout,
      fontSizePt,
      lineSpacing,
      dividerBetweenQuestions
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading layout configuration...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Module 4</span>
              <Badge variant="purple" size="sm">Automated Geometry</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Automatic Layout Engine</h1>
            <p className="text-xs text-slate-500">
              Balances questions across pages, columns, and print margins without orphan items.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={saved ? <Check className="w-4 h-4 text-emerald-600" /> : undefined}
          >
            {saved ? 'Saved!' : 'Save Layout'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/preview?paperId=${paperId}`)}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Preview Output
          </Button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Column Formatting</h2>
          <p className="text-xs text-slate-500 mb-3">
            Choose paper column density for saving printed paper pages in coaching tests.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setColumnLayout('single')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                columnLayout === 'single'
                  ? 'border-purple-600 bg-purple-50/40 text-purple-950'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-sm">Single Column (Standard)</div>
              <p className="text-xs text-slate-500 mt-1">
                Generous spacing, recommended for descriptive and board exams.
              </p>
            </div>

            <div
              onClick={() => setColumnLayout('two_column')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                columnLayout === 'two_column'
                  ? 'border-purple-600 bg-purple-50/40 text-purple-950'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold text-sm">Two-Column Balanced (Paper Saver)</div>
              <p className="text-xs text-slate-500 mt-1">
                Ideal for 20+ MCQs, reducing total photocopy pages by up to 40%.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Font Size: {fontSizePt}pt
            </label>
            <input
              type="range"
              min="9"
              max="14"
              step="0.5"
              value={fontSizePt}
              onChange={e => setFontSizePt(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>9pt (Compact)</span>
              <span>11pt (Standard)</span>
              <span>14pt (Large)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Line Spacing: {lineSpacing}x
            </label>
            <input
              type="range"
              min="1.0"
              max="1.75"
              step="0.05"
              value={lineSpacing}
              onChange={e => setLineSpacing(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1.0x (Tight)</span>
              <span>1.25x (Recommended)</span>
              <span>1.75x (Spaced)</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-slate-900">Question Separator Lines</div>
            <p className="text-xs text-slate-500">Draw subtle horizontal rules between questions.</p>
          </div>
          <input
            type="checkbox"
            checked={dividerBetweenQuestions}
            onChange={e => setDivider(e.target.checked)}
            className="w-5 h-5 accent-purple-600 rounded"
          />
        </div>
      </div>
    </div>
  )
}
