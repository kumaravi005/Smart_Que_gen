import React, { useState } from 'react'
import {
  Edit2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  BookmarkPlus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft
} from 'lucide-react'
import { Badge } from '../common/Badge'
import { FormattedMathText } from '../common/FormattedMathText'
import type { Question, SectionContent, VisualLayout } from '../../types'
import { estimateMcqOptionGrid } from '../../utils/mcqLayout'

interface QuestionCardProps {
  question: Question
  displayNumber: string
  isFirst: boolean
  isLast: boolean
  sections: SectionContent[]
  currentSectionId: string
  layout?: VisualLayout
  onEdit: (q: Question) => void
  onDelete: (id: string) => void
  onDuplicate: (q: Question) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onMoveToSection: (qId: string, targetSectionId: string) => void
  onSaveToBank: (q: Question) => void
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  displayNumber,
  isFirst,
  isLast,
  sections,
  currentSectionId,
  layout,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveToSection,
  onSaveToBank
}) => {
  const [showSolution, setShowSolution] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  // Smart MCQ Layout calculation
  const mcqEstimation = estimateMcqOptionGrid({
    options: question.options,
    mode: question.customLayoutMode || layout?.mcqOptionLayout || 'auto',
    columnLayout: layout?.columnLayout || 'single'
  })

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 space-y-3.5 group">
      {/* Top Header & Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-900 font-mono text-sm sm:text-base">
            {displayNumber}
          </span>
          <Badge variant="purple" size="sm">
            {question.marks} {question.marks === 1 ? 'Mark' : 'Marks'}
          </Badge>
          <Badge variant="info" size="sm">
            {question.type.replace('_', ' ').toUpperCase()}
          </Badge>
          {question.difficulty && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              question.difficulty === 'easy'
                ? 'bg-emerald-50 text-emerald-700'
                : question.difficulty === 'hard'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {question.difficulty}
            </span>
          )}
          {question.topic && (
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {question.topic}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 self-end sm:self-center">
          {/* Move Up */}
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMoveUp(question.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              isFirst
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Move Question Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Move Down */}
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMoveDown(question.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLast
                ? 'text-slate-200 cursor-not-allowed'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Move Question Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-200">|</span>

          {/* Move to another section */}
          {sections.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                title="Move to another section"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              {showMoveMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-20 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                    Move to Section:
                  </div>
                  {sections.map(sec => (
                    <button
                      key={sec.sectionId}
                      type="button"
                      disabled={sec.sectionId === currentSectionId}
                      onClick={() => {
                        onMoveToSection(question.id, sec.sectionId)
                        setShowMoveMenu(false)
                      }}
                      className={`w-full text-left px-2 py-1 text-xs rounded-lg truncate transition-colors ${
                        sec.sectionId === currentSectionId
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      {sec.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save to Question Bank */}
          <button
            type="button"
            onClick={() => onSaveToBank(question)}
            className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
            title="Save to Question Bank"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>

          {/* Duplicate */}
          <button
            type="button"
            onClick={() => onDuplicate(question)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            title="Duplicate question"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            title="Edit question"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Specific Instruction if present */}
      {question.instructions && (
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600 italic">
          <strong>Instruction:</strong> {question.instructions}
        </div>
      )}

      {/* Question Prompt */}
      <div className="space-y-2">
        <div className="text-sm sm:text-base text-slate-900 leading-relaxed font-medium break-words">
          <FormattedMathText text={question.prompt} />
        </div>

        {/* Optional Diagram / Image */}
        {question.diagramUrl && (
          <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block max-w-sm">
            <img
              src={question.diagramUrl}
              alt="Question diagram"
              className="max-h-48 rounded-xl object-contain"
            />
          </div>
        )}
      </div>

      {/* Smart MCQ Options Grid */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className={`grid ${mcqEstimation.gridClass} gap-2`}>
            {question.options.map(opt => (
              <div
                key={opt.id}
                className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm break-words transition-all ${
                  opt.isCorrect
                    ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-medium shadow-2xs'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                <span className="font-bold font-mono text-slate-900 shrink-0 mt-0.5">
                  ({opt.label})
                </span>
                <div className="flex-1 min-w-0 break-words leading-snug">
                  <FormattedMathText text={opt.text} isOption={true} />
                </div>
                {opt.isCorrect && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Arrangement: {mcqEstimation.reason}</span>
          </div>
        </div>
      )}

      {/* Subjective Writing Space Indicator */}
      {question.writingSpaceLines && question.writingSpaceLines > 0 ? (
        <div className="p-2.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-indigo-900 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Printed Answer Space: {question.writingSpaceLines} Ruled Lines</span>
          </span>
          <span className="text-[11px] text-indigo-600">Lines reserved on final paper</span>
        </div>
      ) : null}

      {/* Collapsible Answer Key & Solution */}
      {(question.answerKey || question.explanation || question.solutionText) && (
        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowSolution(!showSolution)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {showSolution ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            <span>
              {showSolution ? 'Hide Solution & Answer Key' : 'Show Solution & Answer Key'}
            </span>
          </button>

          {showSolution && (
            <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700 animate-in fade-in duration-150">
              {question.answerKey && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Correct Answer Key:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-emerald-700">
                    {question.answerKey}
                  </span>
                </div>
              )}
              {(question.explanation || question.solutionText) && (
                <div className="pt-1">
                  <span className="font-bold text-slate-900 block mb-0.5">Explanation:</span>
                  <p className="leading-relaxed text-slate-600">
                    {question.explanation || question.solutionText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
