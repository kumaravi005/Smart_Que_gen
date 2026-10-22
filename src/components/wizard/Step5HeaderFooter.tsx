import React from 'react'
import {
  Palette,
  Shield,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  EyeOff
} from 'lucide-react'
import type { VisualLayout, HeaderFooterSettings } from '../../types'

interface Step5Props {
  layout: VisualLayout
  onChange: (updated: Partial<VisualLayout>) => void
  errors?: Record<string, string>
}

export const Step5HeaderFooter: React.FC<Step5Props> = ({ layout, onChange }) => {
  const hf = layout.headerFooter || {
    logoPlacement: 'center',
    showInstitutionName: true,
    showAddress: true,
    showContact: true,
    headerCustomText: '',
    footerCustomText: layout.footerNote || 'Omega Education Center — All Rights Reserved — Best of Luck!',
    showPageNumbers: true,
    pageNumberPosition: 'bottom_center',
    showExamNameInFooter: true,
    separatorLineStyle: 'single',
    borderStyle: 'none',
    differentFirstPage: false,
    firstPageHeaderStyle: 'full'
  }

  const updateHeaderFooter = (updates: Partial<HeaderFooterSettings>) => {
    onChange({
      headerFooter: {
        ...hf,
        ...updates
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Logo Placement Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          <span>Institution Header & Logo Placement</span>
        </h3>

        {/* Logo Placement */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
            Logo Placement in Header
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'center', label: 'Centered Above', icon: AlignCenter },
              { id: 'left', label: 'Left Aligned', icon: AlignLeft },
              { id: 'right', label: 'Right Aligned', icon: AlignRight },
              { id: 'none', label: 'No Logo', icon: EyeOff }
            ].map(pos => (
              <button
                key={pos.id}
                type="button"
                onClick={() => {
                  updateHeaderFooter({ logoPlacement: pos.id as any })
                  onChange({ logoPlacement: pos.id as any, showInstituteLogo: pos.id !== 'none' })
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  hf.logoPlacement === pos.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <pos.icon className="w-4 h-4" />
                <span>{pos.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Header Elements Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <label className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-slate-800">Show Institution Name</span>
            <input
              type="checkbox"
              checked={hf.showInstitutionName}
              onChange={e => updateHeaderFooter({ showInstitutionName: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-slate-800">Show Address Line</span>
            <input
              type="checkbox"
              checked={hf.showAddress}
              onChange={e => updateHeaderFooter({ showAddress: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer">
            <span className="text-xs font-medium text-slate-800">Show Contact Details</span>
            <input
              type="checkbox"
              checked={hf.showContact}
              onChange={e => updateHeaderFooter({ showContact: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>
        </div>

        {/* Separator Lines and Borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Header Separator Rule
            </label>
            <select
              value={hf.separatorLineStyle}
              onChange={e => updateHeaderFooter({ separatorLineStyle: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="single">Single Horizontal Divider Line</option>
              <option value="double">Double Horizontal Divider Rule</option>
              <option value="none">No Divider Line</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Page Frame Border Setting
            </label>
            <select
              value={hf.borderStyle}
              onChange={e => updateHeaderFooter({ borderStyle: e.target.value as any })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none"
            >
              <option value="none">No Outer Border (Modern Clean)</option>
              <option value="outer_box">Outer Box Frame Around Each Page</option>
              <option value="header_box">Framed Box Around Header Only</option>
            </select>
          </div>
        </div>

        {/* Different First Page Setting */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-slate-900 block">Different First Page Header</span>
            <p className="text-xs text-slate-500">
              Full logo and credentials on Page 1; compact single-line title on subsequent pages.
            </p>
          </div>
          <input
            type="checkbox"
            checked={hf.differentFirstPage}
            onChange={e => updateHeaderFooter({ differentFirstPage: e.target.checked })}
            className="w-5 h-5 accent-blue-600 rounded"
          />
        </div>
      </div>

      {/* 2. Footer Controls & Page Numbering */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span>Footer Running Notes & Page Numbering</span>
        </h3>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Running Footer Text
          </label>
          <input
            type="text"
            value={hf.footerCustomText || ''}
            onChange={e => {
              updateHeaderFooter({ footerCustomText: e.target.value })
              onChange({ footerNote: e.target.value })
            }}
            placeholder="e.g. Omega Education Center — Academic Excellence — Best of Luck!"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Show Page Numbers</span>
              <span className="text-[11px] text-slate-500">Prints &quot;Page X of Y&quot;</span>
            </div>
            <input
              type="checkbox"
              checked={hf.showPageNumbers}
              onChange={e => {
                updateHeaderFooter({ showPageNumbers: e.target.checked })
                onChange({ showPageNumbers: e.target.checked })
              }}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Show Exam Name in Footer</span>
              <span className="text-[11px] text-slate-500">Adds subject & exam title to footer</span>
            </div>
            <input
              type="checkbox"
              checked={hf.showExamNameInFooter}
              onChange={e => updateHeaderFooter({ showExamNameInFooter: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Page Number Position
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'bottom_center', label: 'Bottom Center' },
              { id: 'bottom_right', label: 'Bottom Right' },
              { id: 'top_right', label: 'Top Right' }
            ].map(pos => (
              <button
                key={pos.id}
                type="button"
                onClick={() => {
                  updateHeaderFooter({ pageNumberPosition: pos.id as any })
                  onChange({ pageNumberPosition: (pos.id === 'top_right' ? 'bottom_right' : pos.id) as any })
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                  hf.pageNumberPosition === pos.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Anti-Piracy Watermark Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-pink-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-base">Anti-Piracy Center Watermark</h3>
              <p className="text-xs text-slate-500">Translucent diagonal watermark printed across all question pages</p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={layout.showWatermark}
            onChange={e => onChange({ showWatermark: e.target.checked })}
            className="w-5 h-5 accent-pink-600 rounded"
          />
        </div>

        {layout.showWatermark && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Watermark Text
              </label>
              <input
                type="text"
                value={layout.watermarkText || ''}
                onChange={e => onChange({ watermarkText: e.target.value })}
                placeholder="e.g. OMEGA EDUCATION CENTER"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold uppercase tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Watermark Opacity: {Math.round((layout.watermarkOpacity || 0.08) * 100)}%
                </label>
                <span className="text-[11px] text-slate-400">Subtle background tint</span>
              </div>
              <input
                type="range"
                min="0.04"
                max="0.20"
                step="0.01"
                value={layout.watermarkOpacity || 0.08}
                onChange={e => onChange({ watermarkOpacity: Number(e.target.value) })}
                className="w-full accent-pink-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
