import React, { useState } from 'react'
import {
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layout,
  CheckCircle2
} from 'lucide-react'
import type { ExamSettings, CoverPageMode } from '../../types'
import { Button } from '../common/Button'

interface Step4Props {
  settings: ExamSettings
  onChange: (updated: Partial<ExamSettings>) => void
  errors?: Record<string, string>
}

export const Step4Instructions: React.FC<Step4Props> = ({ settings, onChange }) => {
  const [newInstruction, setNewInstruction] = useState('')

  const instructions = settings.generalInstructions || []

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return
    onChange({ generalInstructions: [...instructions, newInstruction.trim()] })
    setNewInstruction('')
  }

  const handleRemoveInstruction = (index: number) => {
    onChange({ generalInstructions: instructions.filter((_, i) => i !== index) })
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...instructions]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    onChange({ generalInstructions: updated })
  }

  const handleMoveDown = (index: number) => {
    if (index === instructions.length - 1) return
    const updated = [...instructions]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    onChange({ generalInstructions: updated })
  }

  const handleUpdateText = (index: number, val: string) => {
    const updated = [...instructions]
    updated[index] = val
    onChange({ generalInstructions: updated })
  }

  const applyInstructionPreset = (presetInstructions: string[]) => {
    onChange({ generalInstructions: presetInstructions })
  }

  const coverOptions: { id: CoverPageMode; title: string; desc: string; badge: string }[] = [
    {
      id: 'first_page_top',
      title: 'A. Top of First Question Page',
      desc: 'Instructions appear directly beneath the header box on page 1, immediately followed by Section A.',
      badge: 'Most Popular'
    },
    {
      id: 'separate_cover',
      title: 'B. Separate Cover Page',
      desc: 'Creates a full-page formal examination booklet cover with logo, candidate details, and instructions.',
      badge: 'Formal Exams'
    },
    {
      id: 'compact_header',
      title: 'C. Compact Header',
      desc: 'Minimal single-line instructions banner directly above questions to maximize page room.',
      badge: 'Paper Saver'
    },
    {
      id: 'custom',
      title: 'D. Custom Arrangement',
      desc: 'Customized notice block with special instructions and candidate declarations.',
      badge: 'Flexible'
    }
  ]

  return (
    <div className="space-y-6">
      {/* 1. Cover / Instruction Placement Strategy */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Cover Page & Instruction Placement</h3>
            <p className="text-xs text-slate-500">
              Select how examination instructions and student fill-in blocks are positioned
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {coverOptions.map(opt => {
            const isSelected = settings.coverPageMode === opt.id
            return (
              <div
                key={opt.id}
                onClick={() => onChange({ coverPageMode: opt.id })}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-medium'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{opt.title}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                      {opt.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  <span>{isSelected ? 'Selected Mode' : 'Click to Select'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. Candidate Instructions List with Reordering */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Student General Instructions</h3>
              <p className="text-xs text-slate-500">
                Numbered rules printed for candidates (drag or use arrows to reorder)
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                applyInstructionPreset([
                  'This question paper contains structured sections as indicated.',
                  'All Questions are compulsory unless internal choice is specified.',
                  'Section A comprises MCQs. Choose the single most appropriate option.',
                  'Section B, C & D comprise descriptive questions requiring working.',
                  'Use of calculators or mathematical tables is strictly prohibited.'
                ])
              }
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
            >
              CBSE Preset
            </button>
            <button
              type="button"
              onClick={() =>
                applyInstructionPreset([
                  'All questions are compulsory objective type questions.',
                  'Each question carries equal marks.',
                  'There is no negative marking for incorrect answers.',
                  'Darken the corresponding circle on your OMR sheet.'
                ])
              }
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
            >
              MCQ Quiz Preset
            </button>
          </div>
        </div>

        {/* Add Instruction Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newInstruction}
            onChange={e => setNewInstruction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInstruction())}
            placeholder="Type a new instruction rule and tap Add..."
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleAddInstruction}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Rule
          </Button>
        </div>

        {/* Instructions List */}
        <div className="space-y-2 pt-2">
          {instructions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
              No instructions entered yet. Add rules above or click a preset.
            </div>
          ) : (
            instructions.map((inst, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs group hover:bg-white transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs font-mono">
                  {index + 1}
                </span>

                <input
                  type="text"
                  value={inst}
                  onChange={e => handleUpdateText(index, e.target.value)}
                  className="flex-1 bg-transparent px-1 py-0.5 text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                />

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-200"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === instructions.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-200"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstruction(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Custom Front Page / Cover Text Block */}
      {(settings.coverPageMode === 'separate_cover' || settings.coverPageMode === 'custom') && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-3 animate-in fade-in">
          <h4 className="font-bold text-slate-900 text-sm">Custom Cover Notice / Candidate Declaration</h4>
          <p className="text-xs text-slate-500">
            Additional text block printed on the cover page (e.g., examination code of conduct, invigilator instructions)
          </p>
          <textarea
            rows={3}
            value={settings.customCoverText || ''}
            onChange={e => onChange({ customCoverText: e.target.value })}
            placeholder="e.g. Candidates must verify that this booklet contains all pages before beginning..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  )
}
