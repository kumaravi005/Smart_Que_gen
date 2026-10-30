import React from 'react'
import {
  FileText,
  Maximize2,
  Type,
  AlertTriangle,
  Layers
} from 'lucide-react'
import type { VisualLayout, ExamSettings, PageSize, PageOrientation, PageCountStrategy } from '../../types'
import { estimatePageFit } from '../../utils/layoutEstimator'

interface Step3Props {
  settings: ExamSettings
  layout: VisualLayout
  onChange: (updated: Partial<VisualLayout>) => void
  errors?: Record<string, string>
}

export const Step3PageSettings: React.FC<Step3Props> = ({
  settings,
  layout,
  onChange,
  errors = {}
}) => {
  const estimation = estimatePageFit(settings, layout)

  const marginPresets = [
    { label: 'Compact (10mm)', top: 10, bottom: 10, left: 10, right: 10 },
    { label: 'Standard (15mm)', top: 15, bottom: 15, left: 15, right: 15 },
    { label: 'Spacious (20mm)', top: 20, bottom: 20, left: 20, right: 20 }
  ]

  const isCurrentMargin = (preset: typeof marginPresets[0]) =>
    layout.pageMarginsMm?.top === preset.top &&
    layout.pageMarginsMm?.bottom === preset.bottom &&
    layout.pageMarginsMm?.left === preset.left &&
    layout.pageMarginsMm?.right === preset.right

  return (
    <div className="space-y-6">
      {/* 1. Intelligent Page Capacity Estimator & Target Warning */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-xs transition-all ${
        estimation.fitsTarget
          ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-slate-800'
          : 'bg-amber-500/10 border-amber-300 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${estimation.fitsTarget ? 'bg-white/10 text-blue-300' : 'bg-amber-100 text-amber-800'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${estimation.fitsTarget ? 'text-white' : 'text-amber-950'}`}>
                Page Density & Capacity Estimator
              </h3>
              <p className={`text-xs ${estimation.fitsTarget ? 'text-slate-300' : 'text-amber-800'}`}>
                Calculates whether your questions and typography fit cleanly on physical A4 pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              estimation.fitsTarget ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-200 text-amber-900 border border-amber-300'
            }`}>
              Estimated: ~{estimation.estimatedPages} Page{estimation.estimatedPages > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Target warning & practical suggestions */}
        {!estimation.fitsTarget && estimation.warningMessage && (
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{estimation.warningMessage}</span>
            </div>

            <div className="bg-white/80 p-3 rounded-2xl border border-amber-200 space-y-1.5 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block">Practical adjustments to fit target without shrinking text unreadably:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                {estimation.suggestions.map((sug, i) => (
                  <li key={i}>{sug}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 2. Paper Size, Orientation & Column Density */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>Paper Geometry & Columns</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Paper Format
            </label>
            <select
              value={layout.pageSize}
              onChange={e => onChange({ pageSize: e.target.value as PageSize })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="A4">A4 (210 × 297 mm) — Standard Exam</option>
              <option value="Letter">US Letter (8.5 × 11 in)</option>
              <option value="Legal">US Legal (8.5 × 14 in)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Page Orientation
            </label>
            <select
              value={layout.orientation}
              onChange={e => onChange({ orientation: e.target.value as PageOrientation })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="portrait">Portrait (Standard Vertical)</option>
              <option value="landscape">Landscape (Horizontal Booklet)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Page Count Target
            </label>
            <select
              value={layout.pageCountStrategy}
              onChange={e => onChange({ pageCountStrategy: e.target.value as PageCountStrategy })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Automatic Pagination (Natural Flow)</option>
              <option value="prefer_one_page">Prefer Single Page (if feasible)</option>
              <option value="target_pages">Target Specific Page Count</option>
              <option value="manual">Manual Page Breaks</option>
            </select>
          </div>
        </div>

        {layout.pageCountStrategy === 'target_pages' && (
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900">Target Page Count:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 6].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChange({ targetPageCount: count })}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    (layout.targetPageCount || 2) === count
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {count} Page{count > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Column Layout Selection */}
        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
            Column Formatting & Page Saving
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => onChange({ columnLayout: 'single' })}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                layout.columnLayout === 'single'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-medium'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="font-bold text-sm">Single Column (Standard)</div>
              <p className="text-xs text-slate-500 mt-1">
                Generous spacing, standard board examination presentation.
              </p>
            </div>

            <div
              onClick={() => onChange({ columnLayout: 'two_column' })}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                layout.columnLayout === 'two_column'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-medium'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="font-bold text-sm flex items-center justify-between">
                <span>Two-Column Balanced (Paper Saver)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  Save ~40% Paper
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Divides page into 2 columns, ideal for MCQs to cut photocopy costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Margins Configuration */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Maximize2 className="w-5 h-5 text-indigo-600" />
          <span>Page Margins</span>
        </h3>

        {errors.margins && (
          <p className="text-xs text-rose-600">{errors.margins}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {marginPresets.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                onChange({
                  pageMarginsMm: {
                    top: preset.top,
                    bottom: preset.bottom,
                    left: preset.left,
                    right: preset.right
                  }
                })
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isCurrentMargin(preset)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-500">Top (mm)</label>
            <input
              type="number"
              min="5"
              max="40"
              value={layout.pageMarginsMm?.top ?? 15}
              onChange={e =>
                onChange({
                  pageMarginsMm: { ...layout.pageMarginsMm, top: Number(e.target.value) }
                })
              }
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500">Bottom (mm)</label>
            <input
              type="number"
              min="5"
              max="40"
              value={layout.pageMarginsMm?.bottom ?? 15}
              onChange={e =>
                onChange({
                  pageMarginsMm: { ...layout.pageMarginsMm, bottom: Number(e.target.value) }
                })
              }
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500">Left (mm)</label>
            <input
              type="number"
              min="5"
              max="40"
              value={layout.pageMarginsMm?.left ?? 15}
              onChange={e =>
                onChange({
                  pageMarginsMm: { ...layout.pageMarginsMm, left: Number(e.target.value) }
                })
              }
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500">Right (mm)</label>
            <input
              type="number"
              min="5"
              max="40"
              value={layout.pageMarginsMm?.right ?? 15}
              onChange={e =>
                onChange({
                  pageMarginsMm: { ...layout.pageMarginsMm, right: Number(e.target.value) }
                })
              }
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
            />
          </div>
        </div>
      </div>

      {/* 4. Typography & Spacing */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Type className="w-5 h-5 text-purple-600" />
          <span>Typography, Line Spacing & Question Spacing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Font Family
            </label>
            <select
              value={layout.fontFamily}
              onChange={e => onChange({ fontFamily: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sans">Inter (Modern Clean Sans-Serif)</option>
              <option value="serif">Times New Roman (Formal Board Serif)</option>
              <option value="dejavu">DejaVu Serif (Academic Book Serif)</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Base Font Size: {layout.fontSizePt}pt
              </label>
              <span className="text-xs text-slate-500 font-mono">Standard 11pt</span>
            </div>
            <input
              type="range"
              min="8.5"
              max="13"
              step="0.5"
              value={layout.fontSizePt}
              onChange={e => onChange({ fontSizePt: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>8.5pt (Dense)</span>
              <span>11pt (Default)</span>
              <span>13pt (Large)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Line Spacing: {layout.lineSpacing || 1.25}x
              </label>
              <span className="text-xs text-slate-500 font-mono">Line height</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="1.6"
              step="0.05"
              value={layout.lineSpacing || 1.25}
              onChange={e => onChange({ lineSpacing: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1.0x (Tight)</span>
              <span>1.15x</span>
              <span>1.25x (Default)</span>
              <span>1.6x (Wide)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Question Spacing: {layout.questionSpacingPt}pt
              </label>
              <span className="text-xs text-slate-500 font-mono">Gap between Qs</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={layout.questionSpacingPt}
              onChange={e => onChange({ questionSpacingPt: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>2pt (Compact)</span>
              <span>6pt</span>
              <span>10pt (Default)</span>
              <span>20pt (Wide)</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase">
                Option Spacing: {layout.optionSpacingPt ?? 3}pt
              </label>
              <span className="text-xs text-slate-500 font-mono">Gap between choices</span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={layout.optionSpacingPt ?? 3}
              onChange={e => onChange({ optionSpacingPt: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1pt (Tight)</span>
              <span>3pt (Compact)</span>
              <span>6pt (Default)</span>
              <span>12pt (Wide)</span>
            </div>
          </div>
        </div>

        {/* Live Typography & Spacing Preview */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Live Typography & Option Spacing Preview</span>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {layout.fontSizePt}pt • {layout.lineSpacing || 1.25}x • Option Gap: {layout.optionSpacingPt ?? 3}pt
            </span>
          </div>
          <div
            className="p-3 bg-white border border-slate-200 rounded-xl select-none"
            style={{
              fontFamily:
                layout.fontFamily === 'serif'
                  ? 'Times New Roman, Cambria, Georgia, serif'
                  : layout.fontFamily === 'dejavu'
                  ? 'DejaVu Serif, Georgia, serif'
                  : 'Inter, system-ui, sans-serif',
              fontSize: `${layout.fontSizePt || 11}pt`,
              lineHeight: layout.lineSpacing || 1.25
            }}
          >
            <div className="flex justify-between items-baseline font-semibold text-slate-900">
              <span>Q1. 'तिरिछ' कहानी के लेखक कौन हैं?</span>
              <span className="text-xs font-bold text-slate-500 shrink-0 ml-2">[1]</span>
            </div>
            <div
              className="grid grid-cols-2 gap-x-4 font-sans text-xs"
              style={{
                rowGap: `${layout.optionSpacingPt ?? 3}pt`,
                marginTop: `${Math.max(1, (layout.optionSpacingPt ?? 3) * 0.35)}pt`,
                lineHeight: layout.lineSpacing || 1.25
              }}
            >
              <div className="flex items-baseline gap-1.5 min-h-0">
                <span className="font-bold shrink-0">(A)</span>
                <span>उदय प्रकाश</span>
              </div>
              <div className="flex items-baseline gap-1.5 min-h-0">
                <span className="font-bold shrink-0">(B)</span>
                <span>प्रेमचंद</span>
              </div>
              <div className="flex items-baseline gap-1.5 min-h-0">
                <span className="font-bold shrink-0">(C)</span>
                <span>फणीश्वरनाथ रेणु</span>
              </div>
              <div className="flex items-baseline gap-1.5 min-h-0">
                <span className="font-bold shrink-0">(D)</span>
                <span>मोहन राकेश</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-800">Horizontal Divider Between Questions</span>
            <p className="text-xs text-slate-500">Draws thin separator line between each question item</p>
          </div>
          <input
            type="checkbox"
            checked={layout.dividerBetweenQuestions}
            onChange={e => onChange({ dividerBetweenQuestions: e.target.checked })}
            className="w-5 h-5 accent-blue-600 rounded"
          />
        </div>
      </div>
    </div>
  )
}
