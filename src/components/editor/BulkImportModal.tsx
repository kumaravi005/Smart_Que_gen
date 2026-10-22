import React, { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Plus
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import type { Question, SectionContent, QuestionType } from '../../types'
import { parseBulkQuestionText, type ParsedQuestion } from '../../utils/bulkParser'
import { generateId } from '../../utils/id'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (questions: Question[], targetSectionId: string) => Promise<void>
  sections: SectionContent[]
  currentSectionId: string
  defaultMarks?: number
  defaultType?: QuestionType
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  sections,
  currentSectionId,
  defaultMarks = 1,
  defaultType = 'mcq'
}) => {
  const [targetSectionId, setTargetSectionId] = useState(currentSectionId)
  const [rawText, setRawText] = useState('')
  const [mode, setMode] = useState<'input' | 'review'>('input')
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [unrecognizedLines, setUnrecognizedLines] = useState<string[]>([])
  const [isImporting, setIsImporting] = useState(false)

  // Example templates for 1-click loading
  const sampleMcqs = `Q: What is the capital of India?
A. Mumbai
B. New Delhi
C. Kolkata
D. Chennai
Answer: B
Explanation: New Delhi was made capital of India in 1911.

Q: What is the value of 2 + 2?
A. 2
B. 3
C. 4
D. 5
Answer: C

Q: Which planet is known as the Red Planet?
(a) Venus (b) Mars (c) Jupiter (d) Saturn
Ans: B
[1 Mark]

Q: Photosynthesis takes place primarily in the roots of plants.
(a) True
(b) False
Answer: B`

  const sampleSubjective = `1. State Newton's First Law of Motion and give one practical example. [3 Marks]
Note: Include the concept of inertia.

2. Explain the process of digestion in the human stomach. [5 Marks]
Solution: Food is mixed with gastric juices containing hydrochloric acid and pepsin.

3. Differentiate between renewable and non-renewable energy sources with two examples each. [3 Marks]`

  const handleParse = () => {
    if (!rawText.trim()) return
    const result = parseBulkQuestionText(rawText, defaultMarks, defaultType)
    setParsedQuestions(result.questions)
    setUnrecognizedLines(result.unrecognizedText)
    setMode('review')
  }

  const handleToggleInclude = (tempId: string) => {
    setParsedQuestions(prev =>
      prev.map(q => (q.tempId === tempId ? { ...q, isIncluded: !q.isIncluded } : q))
    )
  }

  const handleUpdatePrompt = (tempId: string, text: string) => {
    setParsedQuestions(prev =>
      prev.map(q => (q.tempId === tempId ? { ...q, prompt: text } : q))
    )
  }

  const handleUpdateMarks = (tempId: string, marks: number) => {
    setParsedQuestions(prev =>
      prev.map(q => (q.tempId === tempId ? { ...q, marks } : q))
    )
  }

  const handleSelectCorrectOption = (tempId: string, optIndex: number) => {
    setParsedQuestions(prev =>
      prev.map(q => {
        if (q.tempId !== tempId || !q.options) return q
        return {
          ...q,
          options: q.options.map((opt, idx) => ({
            ...opt,
            isCorrect: idx === optIndex
          })),
          answerKey: q.options[optIndex]?.label
        }
      })
    )
  }

  // Convert unrecognized lines into an extra subjective question
  const handleConvertUnrecognizedToQuestion = () => {
    if (unrecognizedLines.length === 0) return
    const text = unrecognizedLines.join(' ')
    const newQ: ParsedQuestion = {
      id: generateId('q'),
      tempId: generateId('tmp'),
      prompt: text,
      type: 'short_answer',
      marks: defaultMarks,
      difficulty: 'medium',
      rawText: text,
      warnings: [],
      isIncluded: true
    }
    setParsedQuestions(prev => [...prev, newQ])
    setUnrecognizedLines([])
  }

  const handleConfirmImport = async () => {
    const questionsToImport: Question[] = parsedQuestions
      .filter(q => q.isIncluded && q.prompt.trim())
      .map((q, idx) => ({
        id: generateId('q'),
        sectionId: targetSectionId,
        orderNumber: idx + 1,
        type: q.type,
        prompt: q.prompt.trim(),
        marks: Number(q.marks) || 1,
        difficulty: q.difficulty,
        instructions: q.instructions,
        answerKey: q.answerKey,
        explanation: q.explanation,
        options: q.options?.map(o => ({
          id: generateId('opt'),
          label: o.label,
          text: o.text,
          isCorrect: o.isCorrect
        })),
        tags: [],
        source: 'manual'
      }))

    if (questionsToImport.length === 0) return

    try {
      setIsImporting(true)
      await onImport(questionsToImport, targetSectionId)
      onClose()
      // Reset
      setRawText('')
      setMode('input')
      setParsedQuestions([])
      setUnrecognizedLines([])
    } catch (err) {
      console.error('Bulk import error:', err)
    } finally {
      setIsImporting(false)
    }
  }

  const includedCount = parsedQuestions.filter(q => q.isIncluded).length

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Text Question Import"
      description="Paste text or exam papers to automatically extract questions and options"
      maxWidth="4xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('input')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'input'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1. Paste / Enter Text
            </button>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <button
              type="button"
              disabled={parsedQuestions.length === 0}
              onClick={() => setMode('review')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'review'
                  ? 'bg-blue-600 text-white'
                  : parsedQuestions.length > 0
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
            >
              2. Review & Confirm ({parsedQuestions.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Target Section:</label>
            <select
              value={targetSectionId}
              onChange={e => setTargetSectionId(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
            >
              {sections.map(sec => (
                <option key={sec.sectionId} value={sec.sectionId}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode 1: Paste Text Input */}
        {mode === 'input' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase">
                Paste Questions (MCQs, True/False, or Subjective)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRawText(sampleMcqs)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                >
                  Load Sample MCQs
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setRawText(sampleSubjective)}
                  className="text-xs font-medium text-purple-600 hover:text-purple-800 underline"
                >
                  Load Sample Subjective
                </button>
              </div>
            </div>

            <textarea
              rows={12}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Q: What is the capital of India?\nA. Mumbai\nB. New Delhi\nC. Kolkata\nD. Chennai\nAnswer: B\n\nQ: What is 2 + 2?\nA. 2\nB. 3\nC. 4\nD. 5\nAnswer: C`}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Smart Pattern Recognition:</span>
              </p>
              <p className="text-slate-600 text-[11px]">
                Recognizes headers like <code>Q:</code>, <code>1.</code>, <code>Question 1:</code>, options formatted as <code>A.</code>, <code>(a)</code>, <code>1)</code>, horizontal options, answer keys like <code>Answer: B</code>, and marks like <code>[2 Marks]</code>. Unrecognized text will be highlighted in step 2.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!rawText.trim()}
                onClick={handleParse}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Analyze & Parse Questions
              </Button>
            </div>
          </div>
        )}

        {/* Mode 2: Review & Confirm */}
        {mode === 'review' && (
          <div className="space-y-4">
            {/* Unrecognized Text Banner */}
            {unrecognizedLines.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Unrecognized Text Detected ({unrecognizedLines.length} lines)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleConvertUnrecognizedToQuestion}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Convert to Question
                  </Button>
                </div>
                <p className="text-[11px] text-amber-800">
                  The following lines were not matched to any question or option. They will not be lost:
                </p>
                <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 font-mono text-xs text-slate-700 max-h-24 overflow-y-auto">
                  {unrecognizedLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Parsed Questions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Parsed Questions ({includedCount} of {parsedQuestions.length} selected)
                </span>
                <button
                  type="button"
                  onClick={() => setMode('input')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Edit Raw Text</span>
                </button>
              </div>

              {parsedQuestions.map((q, idx) => (
                <div
                  key={q.tempId}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    q.isIncluded
                      ? 'bg-white border-slate-300 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={q.isIncluded}
                      onChange={() => handleToggleInclude(q.tempId)}
                      className="mt-1 w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            Q{idx + 1}.
                          </span>
                          <Badge variant="info" size="sm">
                            {q.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {q.warnings.length > 0 && (
                            <Badge variant="warning" size="sm">
                              {q.warnings[0]}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-semibold text-slate-500">Marks:</label>
                          <input
                            type="number"
                            min="0.5"
                            max="20"
                            step="0.5"
                            value={q.marks}
                            onChange={e => handleUpdateMarks(q.tempId, Number(e.target.value))}
                            className="w-14 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center"
                          />
                        </div>
                      </div>

                      {/* Prompt */}
                      <textarea
                        rows={2}
                        value={q.prompt}
                        onChange={e => handleUpdatePrompt(q.tempId, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      {/* Options */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectCorrectOption(q.tempId, optIdx)}
                              className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs border text-left transition-all ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <span className="font-mono font-bold shrink-0">({opt.label})</span>
                              <span className="truncate flex-1">{opt.text}</span>
                              {opt.isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Answer Key & Explanation Preview */}
                      {(q.answerKey || q.explanation) && (
                        <div className="text-[11px] text-slate-500 pt-1 flex flex-wrap gap-3">
                          {q.answerKey && (
                            <span>
                              <strong>Key:</strong> {q.answerKey}
                            </span>
                          )}
                          {q.explanation && (
                            <span className="truncate max-w-sm">
                              <strong>Exp:</strong> {q.explanation}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 sticky bottom-0 bg-white">
              <Button type="button" variant="ghost" onClick={() => setMode('input')}>
                Back to Edit
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  isLoading={isImporting}
                  disabled={includedCount === 0}
                  onClick={handleConfirmImport}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Import {includedCount} Questions
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
