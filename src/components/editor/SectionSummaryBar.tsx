import React from 'react'
import {
  AlertTriangle,
  Wand2
} from 'lucide-react'
import { Badge } from '../common/Badge'
import { Button } from '../common/Button'
import type { ExamSettings, SectionContent, ExamSectionConfig } from '../../types'

interface SectionSummaryBarProps {
  settings: ExamSettings
  currentSection?: SectionContent
  sectionConfig?: ExamSectionConfig
  allSections: SectionContent[]
  onOpenWizard: () => void
}

export const SectionSummaryBar: React.FC<SectionSummaryBarProps> = ({
  settings,
  currentSection,
  sectionConfig,
  allSections,
  onOpenWizard
}) => {
  // Calculate question counts and marks
  const actualSectionQuestions = currentSection?.questions?.length || 0
  const expectedSectionQuestions = sectionConfig?.totalQuestions ?? 0

  const actualSectionMarks = (currentSection?.questions || []).reduce(
    (sum, q) => sum + (Number(q.marks) || 0),
    0
  )
  const expectedSectionMarks = expectedSectionQuestions * (sectionConfig?.marksPerQuestion || 0)

  // Paper totals across all sections
  const totalActualQuestions = allSections.reduce(
    (sum, s) => sum + (s.questions?.length || 0),
    0
  )
  const totalActualMarks = allSections.reduce(
    (sum, s) => sum + (s.questions || []).reduce((qSum, q) => qSum + (Number(q.marks) || 0), 0),
    0
  )
  const configuredMaxMarks = settings.totalMarks || 0
  const isMarksMismatch = totalActualMarks !== configuredMaxMarks

  return (
    <div className="space-y-3">
      {/* Top Banner with Section Details and Marks Indicator */}
      <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Active Section
              </span>
              <Badge variant="purple" size="sm">
                Target: {expectedSectionQuestions} Qs ({expectedSectionMarks} Marks)
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {currentSection?.title || 'Section'}
            </h2>
            {currentSection?.instructions && (
              <p className="text-xs text-slate-500 italic mt-0.5">
                {currentSection.instructions}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenWizard}
              leftIcon={<Wand2 className="w-3.5 h-3.5 text-blue-600" />}
            >
              Setup Wizard
            </Button>
          </div>
        </div>

        {/* Section Progress & Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Section Qs */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-0.5">Section Questions:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900">{actualSectionQuestions}</span>
              <span className="text-slate-500 font-medium">/ {expectedSectionQuestions || '—'} expected</span>
            </div>
          </div>

          {/* Section Marks */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-0.5">Section Marks:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900">{actualSectionMarks}</span>
              <span className="text-slate-500 font-medium">/ {expectedSectionMarks || '—'} Marks</span>
            </div>
          </div>

          {/* Total Questions Paper */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-0.5">Entire Paper Qs:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-900">{totalActualQuestions}</span>
              <span className="text-slate-500 font-medium">Entered</span>
            </div>
          </div>

          {/* Total Calculated Marks vs Max Marks */}
          <div className={`p-3 rounded-2xl border ${
            isMarksMismatch
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-emerald-50/70 border-emerald-300'
          }`}>
            <span className={`block mb-0.5 ${isMarksMismatch ? 'text-amber-800' : 'text-emerald-800'}`}>
              Total Paper Marks:
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold ${isMarksMismatch ? 'text-amber-950' : 'text-emerald-950'}`}>
                {totalActualMarks}
              </span>
              <span className={`font-medium ${isMarksMismatch ? 'text-amber-700' : 'text-emerald-700'}`}>
                / {configuredMaxMarks} Max
              </span>
            </div>
          </div>
        </div>

        {/* Mismatch Warning Alert */}
        {isMarksMismatch && (
          <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Calculated question marks total (<strong>{totalActualMarks}M</strong>) differs from configured examination marks (<strong>{configuredMaxMarks}M</strong>).
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenWizard}
              className="text-xs font-bold text-amber-900 underline whitespace-nowrap"
            >
              Adjust in Wizard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
