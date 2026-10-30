import React from 'react'
import {
  Palette,
  Shield,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignRight,
  EyeOff,
  Type,
  Maximize2
} from 'lucide-react'
import type { VisualLayout, HeaderFooterSettings, ExamSettings } from '../../types'

interface Step5Props {
  layout: VisualLayout
  settings?: ExamSettings
  onChange: (updated: Partial<VisualLayout>) => void
  errors?: Record<string, string>
}

export const Step5HeaderFooter: React.FC<Step5Props> = ({ layout, settings, onChange }) => {
  const currentLogoPlacement = layout.headerFooter?.logoPlacement || layout.logoPlacement || 'center'
  const isLogoDisabled = layout.showInstituteLogo === false || currentLogoPlacement === 'none'
  const effectiveLogoPlacement: 'center' | 'left' | 'right' | 'none' = isLogoDisabled ? 'none' : currentLogoPlacement

  const hf: HeaderFooterSettings = {
    logoPlacement: effectiveLogoPlacement,
    logoWidthMm: layout.headerFooter?.logoWidthMm || layout.logoWidthMm || 24,
    logoHeightMm: layout.headerFooter?.logoHeightMm || layout.logoHeightMm,
    showInstitutionName: layout.headerFooter?.showInstitutionName ?? true,
    institutionNameSizePt: layout.headerFooter?.institutionNameSizePt || 22,
    institutionNameAlign: layout.headerFooter?.institutionNameAlign || 'center',
    showAddress: layout.headerFooter?.showAddress ?? true,
    addressSizePt: layout.headerFooter?.addressSizePt || 9.5,
    addressAlign: layout.headerFooter?.addressAlign || 'center',
    taglineSizePt: layout.headerFooter?.taglineSizePt || 11,
    taglineAlign: layout.headerFooter?.taglineAlign || 'center',
    showContact: layout.headerFooter?.showContact ?? true,
    headerCustomText: layout.headerFooter?.headerCustomText ?? '',
    showRunningFooter: layout.headerFooter?.showRunningFooter ?? (layout.footerNote !== '' && layout.headerFooter?.footerCustomText !== ''),
    footerCustomText: layout.headerFooter?.footerCustomText !== undefined
      ? layout.headerFooter.footerCustomText
      : (layout.footerNote !== undefined ? layout.footerNote : 'Omega Education Center — All Rights Reserved — Best of Luck!'),
    showPageNumbers: layout.headerFooter?.showPageNumbers ?? layout.showPageNumbers ?? true,
    pageNumberPosition: layout.headerFooter?.pageNumberPosition || layout.pageNumberPosition || 'bottom_center',
    showExamNameInFooter: layout.headerFooter?.showExamNameInFooter ?? true,
    separatorLineStyle: layout.headerFooter?.separatorLineStyle || 'single',
    borderStyle: layout.headerFooter?.borderStyle || 'none',
    differentFirstPage: layout.headerFooter?.differentFirstPage ?? false,
    firstPageHeaderStyle: layout.headerFooter?.firstPageHeaderStyle || 'full'
  }

  const updateHeaderFooter = (updates: Partial<HeaderFooterSettings>, topLevelUpdates?: Partial<VisualLayout>) => {
    const nextHf: HeaderFooterSettings = {
      ...hf,
      ...updates
    }
    onChange({
      ...topLevelUpdates,
      headerFooter: nextHf
    })
  }

  const handleLogoPlacement = (posId: 'center' | 'left' | 'right' | 'none') => {
    const isNone = posId === 'none'
    updateHeaderFooter(
      { logoPlacement: posId },
      {
        logoPlacement: posId,
        showInstituteLogo: !isNone
      }
    )
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
                onClick={() => handleLogoPlacement(pos.id as any)}
                className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
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

          {/* Logo Width / Sizing Slider when logo is active */}
          {hf.logoPlacement !== 'none' && (
            <div className="pt-3 border-t border-slate-100 p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Logo / Header Banner Size
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Adjust width freely from small icon (24mm) to full-page header banner (180mm)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newW = Math.max(10, (hf.logoWidthMm || layout.logoWidthMm || 24) - 5)
                      updateHeaderFooter({ logoWidthMm: newW }, { logoWidthMm: newW })
                    }}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-xs"
                    title="Decrease 5mm"
                  >
                    -
                  </button>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      max="210"
                      value={hf.logoWidthMm || layout.logoWidthMm || 24}
                      onChange={e => {
                        const newW = Math.max(10, Math.min(210, Number(e.target.value) || 24))
                        updateHeaderFooter({ logoWidthMm: newW }, { logoWidthMm: newW })
                      }}
                      className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center pr-7 shadow-xs"
                    />
                    <span className="absolute right-2 top-1.5 text-[11px] font-semibold text-slate-400">
                      mm
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newW = Math.min(210, (hf.logoWidthMm || layout.logoWidthMm || 24) + 5)
                      updateHeaderFooter({ logoWidthMm: newW }, { logoWidthMm: newW })
                    }}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-xs"
                    title="Increase 5mm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Free-Sizing Range Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 w-10">10 mm</span>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="2"
                  value={hf.logoWidthMm || layout.logoWidthMm || 24}
                  onChange={e => {
                    const newW = Number(e.target.value)
                    updateHeaderFooter({ logoWidthMm: newW }, { logoWidthMm: newW })
                  }}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] font-bold text-slate-400 w-12 text-right">200 mm</span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-blue-100/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  Presets:
                </span>
                {[
                  { width: 24, label: '24mm (Icon)' },
                  { width: 40, label: '40mm (Small)' },
                  { width: 60, label: '60mm (Medium)' },
                  { width: 90, label: '90mm (Quarter)' },
                  { width: 120, label: '120mm (Half)' },
                  { width: 150, label: '150mm (Wide)' },
                  { width: 180, label: '180mm (Full Header Banner)' }
                ].map(p => (
                  <button
                    key={p.width}
                    type="button"
                    onClick={() => updateHeaderFooter({ logoWidthMm: p.width }, { logoWidthMm: p.width })}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      (hf.logoWidthMm || layout.logoWidthMm || 24) === p.width
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Height & Aspect Ratio Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-100/70 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold text-[11px]">Height Mode:</span>
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ logoHeightMm: undefined }, { logoHeightMm: undefined })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      !hf.logoHeightMm
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Auto Aspect Ratio (Natural)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ logoHeightMm: 35 }, { logoHeightMm: 35 })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      hf.logoHeightMm
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Custom Height
                  </button>
                </div>

                {hf.logoHeightMm && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Height:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const h = Math.max(10, (hf.logoHeightMm || 35) - 5)
                        updateHeaderFooter({ logoHeightMm: h }, { logoHeightMm: h })
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={hf.logoHeightMm || 35}
                      onChange={e => {
                        const h = Math.max(10, Math.min(100, Number(e.target.value) || 35))
                        updateHeaderFooter({ logoHeightMm: h }, { logoHeightMm: h })
                      }}
                      className="w-16 px-1.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold">mm</span>
                    <button
                      type="button"
                      onClick={() => {
                        const h = Math.min(100, (hf.logoHeightMm || 35) + 5)
                        updateHeaderFooter({ logoHeightMm: h }, { logoHeightMm: h })
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Header Typography, Sizing & Alignment */}
        <div className="pt-3 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Header Sizing & Alignment (Name, Tagline & Address)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Institution Name */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Institution Name</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {hf.institutionNameSizePt || 22} pt
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Font Size</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ institutionNameSizePt: Math.max(12, (hf.institutionNameSizePt || 22) - 1) })}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="12"
                    max="40"
                    value={hf.institutionNameSizePt || 22}
                    onChange={e => updateHeaderFooter({ institutionNameSizePt: Number(e.target.value) || 22 })}
                    className="flex-1 w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ institutionNameSizePt: Math.min(40, (hf.institutionNameSizePt || 22) + 1) })}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Alignment</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'left', label: 'Left', icon: AlignLeft },
                    { id: 'center', label: 'Center', icon: AlignCenter },
                    { id: 'right', label: 'Right', icon: AlignRight }
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => updateHeaderFooter({ institutionNameAlign: a.id as any })}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        (hf.institutionNameAlign || 'center') === a.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <a.icon className="w-3 h-3" />
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Motto / Tagline */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Motto / Tagline</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {hf.taglineSizePt || 11} pt
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Font Size</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ taglineSizePt: Math.max(8, (hf.taglineSizePt || 11) - 1) })}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="8"
                    max="24"
                    value={hf.taglineSizePt || 11}
                    onChange={e => updateHeaderFooter({ taglineSizePt: Number(e.target.value) || 11 })}
                    className="flex-1 w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ taglineSizePt: Math.min(24, (hf.taglineSizePt || 11) + 1) })}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Alignment</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'left', label: 'Left', icon: AlignLeft },
                    { id: 'center', label: 'Center', icon: AlignCenter },
                    { id: 'right', label: 'Right', icon: AlignRight }
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => updateHeaderFooter({ taglineAlign: a.id as any })}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        (hf.taglineAlign || 'center') === a.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <a.icon className="w-3 h-3" />
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Address & Contact */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Address & Contact</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {hf.addressSizePt || 9.5} pt
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Font Size</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ addressSizePt: Math.max(7, Math.round(((hf.addressSizePt || 9.5) - 0.5) * 10) / 10) })}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="7"
                    max="18"
                    value={hf.addressSizePt || 9.5}
                    onChange={e => updateHeaderFooter({ addressSizePt: Number(e.target.value) || 9.5 })}
                    className="flex-1 w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                  />
                  <button
                    type="button"
                    onClick={() => updateHeaderFooter({ addressSizePt: Math.min(18, Math.round(((hf.addressSizePt || 9.5) + 0.5) * 10) / 10) })}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Alignment</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'left', label: 'Left', icon: AlignLeft },
                    { id: 'center', label: 'Center', icon: AlignCenter },
                    { id: 'right', label: 'Right', icon: AlignRight }
                  ].map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => updateHeaderFooter({ addressAlign: a.id as any })}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                        (hf.addressAlign || 'center') === a.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <a.icon className="w-3 h-3" />
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Header Preview */}
        {settings && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Header Preview on Paper</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Exact font sizes & alignments reflected live
              </span>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
              <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-1.5">
                <div className={`flex flex-col ${
                  hf.logoPlacement === 'left' ? 'sm:flex-row items-center gap-4' :
                  hf.logoPlacement === 'right' ? 'sm:flex-row-reverse items-center gap-4' :
                  'items-center text-center'
                }`}>
                  {hf.logoPlacement !== 'none' && (
                    <div className={`shrink-0 flex items-center justify-center ${hf.logoPlacement === 'center' ? 'w-full mb-2' : ''}`}>
                      <img
                        src={settings.institute?.logoUrl || '/omega-logo.png'}
                        alt="Logo"
                        style={{
                          width: `${hf.logoWidthMm || layout.logoWidthMm || 24}mm`,
                          maxWidth: '100%',
                          height: hf.logoHeightMm ? `${hf.logoHeightMm}mm` : 'auto',
                          maxHeight: hf.logoHeightMm ? `${hf.logoHeightMm}mm` : '80mm',
                          objectFit: 'contain'
                        }}
                        className="object-contain"
                      />
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-1">
                    {hf.showInstitutionName && (
                      <div
                        style={{ fontSize: `${hf.institutionNameSizePt || 22}pt`, lineHeight: 1.2 }}
                        className={`w-full font-extrabold uppercase tracking-wide text-slate-900 ${
                          hf.institutionNameAlign === 'left' ? 'text-left' : hf.institutionNameAlign === 'right' ? 'text-right' : 'text-center'
                        }`}
                      >
                        {settings.institute?.name || 'OMEGA EDUCATION CENTER'}
                      </div>
                    )}

                    {settings.institute?.tagline && (
                      <div
                        style={{ fontSize: `${hf.taglineSizePt || 11}pt`, lineHeight: 1.3 }}
                        className={`w-full italic font-sans text-slate-700 ${
                          hf.taglineAlign === 'left' ? 'text-left' : hf.taglineAlign === 'right' ? 'text-right' : 'text-center'
                        }`}
                      >
                        {settings.institute.tagline}
                      </div>
                    )}

                    {hf.showAddress && settings.institute?.address && (
                      <div
                        style={{ fontSize: `${hf.addressSizePt || 9.5}pt`, lineHeight: 1.3 }}
                        className={`w-full font-sans text-slate-600 ${
                          hf.addressAlign === 'left' ? 'text-left' : hf.addressAlign === 'right' ? 'text-right' : 'text-center'
                        }`}
                      >
                        {settings.institute.address}
                      </div>
                    )}

                    {hf.showContact && settings.institute?.contact && (
                      <div
                        style={{ fontSize: `${(hf.addressSizePt || 9.5) * 0.95}pt`, lineHeight: 1.3 }}
                        className={`w-full font-sans text-slate-500 ${
                          hf.addressAlign === 'left' ? 'text-left' : hf.addressAlign === 'right' ? 'text-right' : 'text-center'
                        }`}
                      >
                        {settings.institute.contact}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Toggle to Enable / Disable Running Footer Note */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-800 block">Enable Running Footer Note</span>
            <span className="text-[11px] text-slate-500">
              Prints custom tagline or message at the bottom of pages
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(hf.showRunningFooter)}
              onChange={e => {
                const checked = e.target.checked
                updateHeaderFooter(
                  { showRunningFooter: checked },
                  { footerNote: checked ? (hf.footerCustomText || '') : '' }
                )
              }}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Running Footer Text (Visible and editable when enabled) */}
        {hf.showRunningFooter ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Running Footer Text
              </label>
              {hf.footerCustomText && (
                <button
                  type="button"
                  onClick={() => {
                    updateHeaderFooter(
                      { footerCustomText: '' },
                      { footerNote: '' }
                    )
                  }}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear Text
                </button>
              )}
            </div>
            <input
              type="text"
              value={hf.footerCustomText || ''}
              onChange={e => {
                const val = e.target.value
                updateHeaderFooter(
                  { footerCustomText: val },
                  { footerNote: val }
                )
              }}
              placeholder="e.g. Omega Education Center — Academic Excellence — Best of Luck!"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-800 flex items-center justify-between">
            <span>Running footer note is disabled — no custom note will be printed on the paper.</span>
            <button
              type="button"
              onClick={() => {
                updateHeaderFooter(
                  { showRunningFooter: true },
                  { footerNote: hf.footerCustomText || 'Omega Education Center — All Rights Reserved — Best of Luck!' }
                )
              }}
              className="font-bold text-amber-900 underline text-xs cursor-pointer ml-2 shrink-0"
            >
              Re-enable
            </button>
          </div>
        )}

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
                updateHeaderFooter(
                  { showPageNumbers: e.target.checked },
                  { showPageNumbers: e.target.checked }
                )
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
                  updateHeaderFooter(
                    { pageNumberPosition: pos.id as any },
                    { pageNumberPosition: (pos.id === 'top_right' ? 'bottom_right' : pos.id) as any }
                  )
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
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
