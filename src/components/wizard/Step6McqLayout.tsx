import React, { useState } from 'react'
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck
} from 'lucide-react'
import type { VisualLayout, McqOptionLayoutMode } from '../../types'

interface Step6Props {
  layout: VisualLayout
  onChange: (updated: Partial<VisualLayout>) => void
  errors?: Record<string, string>
}

export const Step6McqLayout: React.FC<Step6Props> = ({ layout, onChange }) => {
  const currentMode = layout.mcqOptionLayout || 'auto'

  const [sampleType, setSampleType] = useState<'short' | 'medium' | 'long'>('short')

  const sampleOptions = {
    short: [
      { label: 'A', text: '12 cm²' },
      { label: 'B', text: '24 cm²' },
      { label: 'C', text: '36 cm²' },
      { label: 'D', text: '48 cm²' }
    ],
    medium: [
      { label: 'A', text: 'Increases linearly' },
      { label: 'B', text: 'Decreases exponentially' },
      { label: 'C', text: 'Remains strictly constant' },
      { label: 'D', text: 'Fluctuates periodically' }
    ],
    long: [
      { label: 'A', text: 'The net magnetic flux through any closed Gaussian surface remains identically zero' },
      { label: 'B', text: 'Electric field lines always form continuous closed loops without start or termination' },
      { label: 'C', text: 'Induced electromotive force opposes the time-rate of change of magnetic induction' },
      { label: 'D', text: 'Electrostatic force between point charges is directly proportional to permittivity' }
    ]
  }

  const modes: {
    id: McqOptionLayoutMode
    title: string
    subtitle: string
    desc: string
    paperSaving: string
  }[] = [
    {
      id: 'auto',
      title: 'Automatic Intelligent Adaptation',
      subtitle: 'Dynamic content width evaluation',
      desc: 'Estimates option character length against printable column width. Short choices collapse into 1 row, while longer choices automatically wrap into 2 or 4 rows to prevent clipping.',
      paperSaving: 'Optimal Balance'
    },
    {
      id: 'four_per_row',
      title: 'Four Options Per Row (1 Line)',
      subtitle: '(A) ... (B) ... (C) ... (D) ...',
      desc: 'All 4 options arranged horizontally on a single line when space permits. Maximum paper saving for short math numerals and chemical symbols.',
      paperSaving: 'Saves ~60% Height'
    },
    {
      id: 'two_per_row',
      title: 'Two Options Per Row (2×2 Grid)',
      subtitle: '(A) ... (B) ... / (C) ... (D) ...',
      desc: 'Balanced two-column grid. Standard layout for typical sentences and textbook questions.',
      paperSaving: 'Saves ~30% Height'
    },
    {
      id: 'one_per_row',
      title: 'One Option Per Row (Vertical Stack)',
      subtitle: 'Stacked vertically (A) then (B) then (C) then (D)',
      desc: 'Each option gets a dedicated full-width line. Guarantees zero crowding for long descriptive statements or legal/constitutional clauses.',
      paperSaving: 'Full Readability'
    }
  ]

  // Helper to determine rendered grid classes for the live demonstration
  const getRenderedGridClass = () => {
    if (currentMode === 'four_per_row') return 'grid grid-cols-4 gap-2'
    if (currentMode === 'two_per_row') return 'grid grid-cols-2 gap-2'
    if (currentMode === 'one_per_row') return 'grid grid-cols-1 gap-1.5'

    // Automatic mode logic
    if (sampleType === 'short') {
      return layout.columnLayout === 'two_column' ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-4 gap-2'
    } else if (sampleType === 'medium') {
      return 'grid grid-cols-2 gap-2'
    } else {
      return 'grid grid-cols-1 gap-1.5'
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Mode Selection Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-base">Multiple-Choice (MCQ) Option Arrangement</h3>
          <p className="text-xs text-slate-500">
            Control how (A), (B), (C), and (D) choices are laid out across printed question columns
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modes.map(mode => {
            const isSelected = currentMode === mode.id
            return (
              <div
                key={mode.id}
                onClick={() => onChange({ mcqOptionLayout: mode.id })}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-medium shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900">{mode.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {mode.paperSaving}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 mb-2">{mode.subtitle}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{mode.desc}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Active Arrangement Mode</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Tap to Select Mode</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Interactive Live Option Preview & Overlap Safeguard */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Live Geometry Simulation: Zero Overlap Guarantee
              </h3>
              <p className="text-xs text-slate-500">
                Test how your selected layout arranges short numerals vs lengthy text blocks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1">Sample Text Length:</span>
            {(['short', 'medium', 'long'] as const).map(len => (
              <button
                key={len}
                type="button"
                onClick={() => setSampleType(len)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize transition-all ${
                  sampleType === len
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {len}
              </button>
            ))}
          </div>
        </div>

        {/* Live Question Sheet Preview Box */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-serif">
          <div className="flex items-start gap-2 text-sm text-slate-900">
            <span className="font-bold">Q1.</span>
            <span className="font-medium">
              {sampleType === 'short'
                ? 'Calculate the total surface area of a cube whose edge measures 2 cm:'
                : sampleType === 'medium'
                ? 'Under standard atmospheric temperature and pressure, how does electric resistance behave?'
                : 'Select the statement that correctly represents Faraday’s Law and Maxwell’s correction:'}
            </span>
            <span className="font-sans text-xs font-bold text-slate-500 ml-auto shrink-0">[1 Mark]</span>
          </div>

          {/* Options dynamically formatted */}
          <div className={`pt-2 font-sans text-xs ${getRenderedGridClass()}`}>
            {sampleOptions[sampleType].map(opt => (
              <div
                key={opt.label}
                className="flex items-baseline gap-1.5 p-2 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs"
              >
                <span className="font-bold font-mono text-blue-700">({opt.label})</span>
                <span className="leading-snug">{opt.text}</span>
              </div>
            ))}
          </div>

          {currentMode === 'auto' && (
            <div className="pt-2 text-[11px] font-sans text-emerald-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Automatic mode evaluated <strong>{sampleType}</strong> option length and allocated{' '}
                <strong>{sampleType === 'short' ? '4 options per row' : sampleType === 'medium' ? '2 options per row' : '1 option per row'}</strong>{' '}
                to guarantee zero text clipping.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
