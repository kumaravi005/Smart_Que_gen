import React from 'react'
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Award,
  Sparkles
} from 'lucide-react'
import type { ExamSettings, ExamSectionConfig, SectionNumberingStyle } from '../../types'
import { calculateMarksFromSections } from '../../utils/layoutEstimator'
import { Badge } from '../common/Badge'
import { generateId } from '../../utils/id'

interface Step2Props {
  settings: ExamSettings
  actualEnteredQuestionsCount?: number
  onChange: (updated: Partial<ExamSettings>) => void
  errors?: Record<string, string>
}

interface QuestionTypeDefinition {
  typeKey: string
  label: string
  defaultMarks: number
  defaultTitle: string
  defaultInstructions: string
}

const STANDARD_QUESTION_TYPES: QuestionTypeDefinition[] = [
  {
    typeKey: 'mcq',
    label: 'MCQ / Objective',
    defaultMarks: 1,
    defaultTitle: 'Section A: Multiple Choice Questions',
    defaultInstructions: 'Choose the correct alternative among the given options.'
  },
  {
    typeKey: 'true_false',
    label: 'True or False',
    defaultMarks: 1,
    defaultTitle: 'Section: True or False Statements',
    defaultInstructions: 'State whether the following statements are True or False.'
  },
  {
    typeKey: 'fill_blanks',
    label: 'Fill in the Blanks',
    defaultMarks: 1,
    defaultTitle: 'Section: Fill in the Blanks',
    defaultInstructions: 'Fill in the blanks with the most appropriate word or phrase.'
  },
  {
    typeKey: 'very_short_answer',
    label: 'Very Short Answer',
    defaultMarks: 1,
    defaultTitle: 'Section: Very Short Answer Questions',
    defaultInstructions: 'Answer each question in one word or one sentence.'
  },
  {
    typeKey: 'short_answer',
    label: 'Short Answer',
    defaultMarks: 2,
    defaultTitle: 'Section: Short Answer Questions',
    defaultInstructions: 'Answer the questions showing brief steps and explanations.'
  },
  {
    typeKey: 'long_answer',
    label: 'Long Answer',
    defaultMarks: 5,
    defaultTitle: 'Section: Long Answer / Analytical Questions',
    defaultInstructions: 'Answer in detail. Internal choice is provided where indicated.'
  },
  {
    typeKey: 'custom',
    label: 'Custom Question Type',
    defaultMarks: 3,
    defaultTitle: 'Section: Specialized Assessment Unit',
    defaultInstructions: 'Read the context carefully and answer the following questions.'
  }
]

export const Step2QuestionCounts: React.FC<Step2Props> = ({
  settings,
  actualEnteredQuestionsCount = 0,
  onChange,
  errors = {}
}) => {
  const sections = settings.sections || []

  const { totalConfiguredMarks, totalConfiguredQuestions } = calculateMarksFromSections(sections)
  const isMarksMismatch = totalConfiguredMarks !== settings.totalMarks

  const handleUpdateSection = (sectionId: string, updates: Partial<ExamSectionConfig>) => {
    const updated = sections.map(sec => (sec.id === sectionId ? { ...sec, ...updates } : sec))
    onChange({ sections: updated })
  }

  const handleRemoveSection = (sectionId: string) => {
    const updated = sections.filter(sec => sec.id !== sectionId)
    onChange({ sections: updated })
  }

  const handleAddPresetType = (preset: QuestionTypeDefinition) => {
    const nextCode = String.fromCharCode(65 + sections.length)
    const newSection: ExamSectionConfig = {
      id: generateId('sec'),
      name: `Section ${nextCode}`,
      title: `${preset.defaultTitle} (${preset.defaultMarks} Mark${preset.defaultMarks > 1 ? 's' : ''} Each)`,
      instructions: preset.defaultInstructions,
      totalQuestions: 5,
      marksPerQuestion: preset.defaultMarks,
      targetTypes: [preset.typeKey],
      enabled: true,
      numberingStyle: 'continuous'
    }
    onChange({ sections: [...sections, newSection] })
  }

  const handleSyncMaxMarks = () => {
    onChange({ totalMarks: totalConfiguredMarks })
  }

  return (
    <div className="space-y-6">
      {/* 1. Live Calculations & Marks Comparison Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Blueprint Calculation Matrix</h3>
              <p className="text-xs text-slate-400">
                Live verification of configured questions and marks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="primary" size="md">
              {sections.filter(s => s.enabled ?? true).length} Active Sections
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Expected Questions</span>
            <div className="text-xl sm:text-2xl font-bold text-blue-400 mt-1">
              {totalConfiguredQuestions} Qs
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Actual Questions Entered</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-200 mt-1">
              {actualEnteredQuestionsCount} Qs
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Calculated Marks</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
              {totalConfiguredMarks} M
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Configured Max Marks</span>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
              {settings.totalMarks} M
            </div>
          </div>
        </div>

        {/* Warning if marks differ */}
        {isMarksMismatch ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Calculated total marks from sections (<strong>{totalConfiguredMarks} Marks</strong>) does not match
                configured Maximum Marks (<strong>{settings.totalMarks} Marks</strong>).
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncMaxMarks}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold whitespace-nowrap self-end sm:self-center transition-colors"
            >
              Sync Max Marks to {totalConfiguredMarks}
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Marks blueprint perfectly balanced: Section total matches Maximum Marks ({settings.totalMarks} Marks).</span>
          </div>
        )}
      </div>

      {/* 2. Configured Sections List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Examination Sections & Question Types</h3>
            <p className="text-xs text-slate-500">
              Configure question counts, marks, instructions, and section-specific numbering
            </p>
          </div>
        </div>

        {errors.sections && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errors.sections}
          </div>
        )}

        <div className="space-y-3">
          {sections.map((sec, idx) => {
            const isEnabled = sec.enabled ?? true
            const secTotal = (sec.totalQuestions || 0) * (sec.marksPerQuestion || 0)

            return (
              <div
                key={sec.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                  isEnabled
                    ? 'bg-white border-slate-200/90 shadow-xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={e => handleUpdateSection(sec.id, { enabled: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 rounded"
                      />
                      <Badge variant="purple" size="md">
                        {sec.name || `Section ${idx + 1}`}
                      </Badge>
                    </label>

                    <span className="text-xs text-slate-400 font-mono">
                      Type: {sec.targetTypes?.[0] || 'mixed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      Section Total: {secTotal} Marks
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(sec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Remove section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Section Heading / Title
                    </label>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={e => handleUpdateSection(sec.id, { title: e.target.value })}
                      placeholder="e.g. Section A: Multiple Choice Questions"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Section Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={sec.instructions || ''}
                      onChange={e => handleUpdateSection(sec.id, { instructions: e.target.value })}
                      placeholder="e.g. Each question carries 1 mark. Select the single best answer."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Question Count Stepper */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Number of Questions
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSection(sec.id, {
                            totalQuestions: Math.max(1, (sec.totalQuestions || 1) - 1)
                          })
                        }
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center border border-slate-200 active:scale-95 transition-transform"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={sec.totalQuestions}
                        onChange={e =>
                          handleUpdateSection(sec.id, { totalQuestions: Number(e.target.value) })
                        }
                        className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center font-bold focus:bg-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSection(sec.id, {
                            totalQuestions: (sec.totalQuestions || 0) + 1
                          })
                        }
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center border border-slate-200 active:scale-95 transition-transform"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Marks per Question */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Marks Per Question
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        max="50"
                        value={sec.marksPerQuestion}
                        onChange={e =>
                          handleUpdateSection(sec.id, { marksPerQuestion: Number(e.target.value) })
                        }
                        className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-center font-bold focus:bg-white focus:outline-none"
                      />
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleUpdateSection(sec.id, { marksPerQuestion: m })}
                            className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              sec.marksPerQuestion === m
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {m}M
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Numbering Style and Page Break */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">Numbering:</span>
                      <select
                        value={sec.numberingStyle || 'continuous'}
                        onChange={e =>
                          handleUpdateSection(sec.id, {
                            numberingStyle: e.target.value as SectionNumberingStyle
                          })
                        }
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                      >
                        <option value="continuous">Continuous Across Paper (1, 2, 3...)</option>
                        <option value="restart_per_section">Restart Per Section (1, 2, 3...)</option>
                        <option value="alpha">Alphabetic (a, b, c...)</option>
                        <option value="roman">Roman Numerals (i, ii, iii...)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={sec.startOnNewPage ?? false}
                        onChange={e =>
                          handleUpdateSection(sec.id, { startOnNewPage: e.target.checked })
                        }
                        className="w-4 h-4 accent-blue-600 rounded"
                      />
                      <span>Start section on new page</span>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Quick-Add Question Type Presets */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h4 className="font-bold text-slate-900 text-sm">Add Question Type to Examination</h4>
        </div>
        <p className="text-xs text-slate-500">
          Tap any question type below to append a new section configured with standard defaults:
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {STANDARD_QUESTION_TYPES.map(preset => (
            <button
              key={preset.typeKey}
              type="button"
              onClick={() => handleAddPresetType(preset)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-semibold transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>{preset.label}</span>
              <span className="text-[10px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {preset.defaultMarks}M
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
