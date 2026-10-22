import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  ImageIcon,
  X
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import type { Question, QuestionType, DifficultyLevel, MCQOption, SectionContent } from '../../types'
import { generateId } from '../../utils/id'

interface QuestionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (question: Question, targetSectionId: string) => Promise<void>
  initialQuestion?: Question | null
  currentSectionId: string
  sections: SectionContent[]
  defaultMarks?: number
  defaultType?: QuestionType
}

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuestion,
  currentSectionId,
  sections,
  defaultMarks = 1,
  defaultType = 'mcq'
}) => {
  const isEditing = !!initialQuestion

  const [targetSectionId, setTargetSectionId] = useState(currentSectionId)
  const [prompt, setPrompt] = useState('')
  const [type, setType] = useState<QuestionType>(defaultType)
  const [marks, setMarks] = useState<number>(defaultMarks)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium')
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [diagramUrl, setDiagramUrl] = useState('')
  const [answerKey, setAnswerKey] = useState('')
  const [explanation, setExplanation] = useState('')
  const [writingSpaceLines, setWritingSpaceLines] = useState<number>(0)
  const [customNumber, setCustomNumber] = useState('')
  const [customLayoutMode, setCustomLayoutMode] = useState<'auto' | 'four_per_row' | 'two_per_row' | 'one_per_row'>('auto')

  // MCQ Options State
  const defaultOptions: MCQOption[] = [
    { id: 'opt_1', label: 'A', text: '', isCorrect: true },
    { id: 'opt_2', label: 'B', text: '', isCorrect: false },
    { id: 'opt_3', label: 'C', text: '', isCorrect: false },
    { id: 'opt_4', label: 'D', text: '', isCorrect: false }
  ]
  const [options, setOptions] = useState<MCQOption[]>(defaultOptions)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Populate form when initialQuestion changes
  useEffect(() => {
    if (initialQuestion) {
      setTargetSectionId(initialQuestion.sectionId || currentSectionId)
      setPrompt(initialQuestion.prompt || '')
      setType(initialQuestion.type || 'mcq')
      setMarks(initialQuestion.marks ?? defaultMarks)
      setDifficulty(initialQuestion.difficulty || 'medium')
      setTopic(initialQuestion.topic || '')
      setInstructions(initialQuestion.instructions || '')
      setDiagramUrl(initialQuestion.diagramUrl || '')
      setAnswerKey(initialQuestion.answerKey || '')
      setExplanation(initialQuestion.explanation || initialQuestion.solutionText || '')
      setWritingSpaceLines(initialQuestion.writingSpaceLines ?? 0)
      setCustomNumber(initialQuestion.customNumber || '')
      setCustomLayoutMode(initialQuestion.customLayoutMode || 'auto')

      if (initialQuestion.options && initialQuestion.options.length > 0) {
        setOptions(initialQuestion.options)
      } else if (initialQuestion.type === 'mcq') {
        setOptions(defaultOptions)
      } else if (initialQuestion.type === 'true_false') {
        setOptions([
          { id: 'opt_1', label: 'A', text: 'True', isCorrect: false },
          { id: 'opt_2', label: 'B', text: 'False', isCorrect: false }
        ])
      }
    } else {
      setTargetSectionId(currentSectionId)
      setPrompt('')
      setType(defaultType)
      setMarks(defaultMarks)
      setDifficulty('medium')
      setTopic('')
      setInstructions('')
      setDiagramUrl('')
      setAnswerKey('')
      setExplanation('')
      setWritingSpaceLines(0)
      setCustomNumber('')
      setCustomLayoutMode('auto')
      setOptions(defaultOptions)
    }
    setValidationError(null)
  }, [initialQuestion, currentSectionId, isOpen, defaultMarks, defaultType])

  // Automatically adapt default marks when question type changes
  const handleTypeChange = (newType: QuestionType) => {
    setType(newType)
    if (!initialQuestion) {
      if (newType === 'mcq' || newType === 'true_false' || newType === 'fill_blanks') {
        setMarks(1)
        if (newType === 'true_false') {
          setOptions([
            { id: 'opt_1', label: 'A', text: 'True', isCorrect: true },
            { id: 'opt_2', label: 'B', text: 'False', isCorrect: false }
          ])
        } else if (options.length < 2) {
          setOptions(defaultOptions)
        }
      } else if (newType === 'very_short_answer') {
        setMarks(1)
        setWritingSpaceLines(2)
      } else if (newType === 'short_answer') {
        setMarks(3)
        setWritingSpaceLines(4)
      } else if (newType === 'long_answer') {
        setMarks(5)
        setWritingSpaceLines(8)
      }
    }
  }

  // Handle MCQ option modifications
  const handleAddOption = () => {
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const nextLabel = alphabet[options.length] || `${options.length + 1}`
    setOptions(prev => [
      ...prev,
      {
        id: generateId('opt'),
        label: nextLabel,
        text: '',
        isCorrect: false
      }
    ])
  }

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length <= 2) return
    const alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const updated = options
      .filter((_, i) => i !== indexToRemove)
      .map((opt, i) => ({
        ...opt,
        label: alphabet[i] || `${i + 1}`
      }))
    setOptions(updated)
  }

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions(prev => prev.map((opt, i) => (i === index ? { ...opt, text } : opt)))
  }

  const handleSetCorrectOption = (index: number) => {
    setOptions(prev =>
      prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === index
      }))
    )
    setAnswerKey(options[index]?.label || '')
  }

  // Handle image upload simulation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setDiagramUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setValidationError('Question prompt cannot be empty.')
      return
    }

    if (type === 'mcq' && options.length < 2) {
      setValidationError('MCQs must have at least 2 options.')
      return
    }

    try {
      setIsSubmitting(true)
      setValidationError(null)

      const finalQuestion: Question = {
        id: initialQuestion?.id || generateId('q'),
        sectionId: targetSectionId,
        orderNumber: initialQuestion?.orderNumber || 1,
        type,
        prompt: prompt.trim(),
        marks: Number(marks) || 1,
        difficulty,
        topic: topic.trim() || undefined,
        instructions: instructions.trim() || undefined,
        diagramUrl: diagramUrl.trim() || undefined,
        answerKey: answerKey.trim() || (type === 'mcq' ? options.find(o => o.isCorrect)?.label : undefined),
        explanation: explanation.trim() || undefined,
        solutionText: explanation.trim() || undefined,
        writingSpaceLines: (type === 'short_answer' || type === 'long_answer' || type === 'very_short_answer' || type === 'custom')
          ? writingSpaceLines
          : undefined,
        customNumber: customNumber.trim() || undefined,
        customLayoutMode: type === 'mcq' ? customLayoutMode : undefined,
        tags: [topic.trim()].filter(Boolean),
        source: initialQuestion?.source || 'manual',
        options:
          type === 'mcq' || type === 'true_false'
            ? options.map(opt => ({
                id: opt.id || generateId('opt'),
                label: opt.label,
                text: opt.text.trim(),
                isCorrect: !!opt.isCorrect
              }))
            : undefined
      }

      await onSave(finalQuestion, targetSectionId)
      onClose()
    } catch (err: any) {
      console.error('Error saving question:', err)
      setValidationError(err?.message || 'Failed to save question. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Question' : 'Add New Question'}
      description="Configure question text, marking scheme, options, and diagram"
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {validationError}
          </div>
        )}

        {/* Top Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Target Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Section
            </label>
            <select
              value={targetSectionId}
              onChange={e => setTargetSectionId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sections.map(sec => (
                <option key={sec.sectionId} value={sec.sectionId}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Question Type
            </label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value as QuestionType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mcq">Multiple Choice (MCQ)</option>
              <option value="true_false">True / False</option>
              <option value="fill_blanks">Fill in the Blanks</option>
              <option value="very_short_answer">Very Short Answer (VSA)</option>
              <option value="short_answer">Short Answer (SA)</option>
              <option value="long_answer">Long Answer (LA)</option>
              <option value="custom">Custom Question Type</option>
            </select>
          </div>

          {/* Marks & Difficulty */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Marks
              </label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                value={marks}
                onChange={e => setMarks(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Optional Custom Number & Optional Instructions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Custom Question Number <span className="text-slate-400 font-normal">(Optional Override)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Q1(a) or Bonus Q"
              value={customNumber}
              onChange={e => setCustomNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Specific Instructions <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Write in not more than 30 words"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Question Statement / Prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Question Statement / Problem Prompt <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Supports text, inline formulas & markdown</span>
          </div>
          <textarea
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Type or paste question text here..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            required
          />
        </div>

        {/* MCQ / True-False Options Section */}
        {(type === 'mcq' || type === 'true_false') && (
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Options & Correct Answer
                </span>
                <span className="text-[11px] text-slate-500">
                  (Click letter badge to mark correct answer)
                </span>
              </div>

              {type === 'mcq' && (
                <div className="flex items-center gap-2">
                  <select
                    value={customLayoutMode}
                    onChange={e => setCustomLayoutMode(e.target.value as any)}
                    className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700"
                    title="Layout arrangement mode"
                  >
                    <option value="auto">Smart Auto Layout</option>
                    <option value="four_per_row">4 per row (Horizontal)</option>
                    <option value="two_per_row">2 per row (Grid)</option>
                    <option value="one_per_row">1 per row (Stacked)</option>
                  </select>
                  {options.length < 8 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Option
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt, i) => (
                <div
                  key={opt.id || i}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    opt.isCorrect
                      ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSetCorrectOption(i)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      opt.isCorrect
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={opt.isCorrect ? 'Correct choice' : 'Click to mark as correct choice'}
                  >
                    {opt.label}
                  </button>

                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => handleOptionTextChange(i, e.target.value)}
                    placeholder={`Option (${opt.label}) text`}
                    className="flex-1 px-2.5 py-1 text-xs sm:text-sm bg-transparent border-none focus:outline-none text-slate-800"
                  />

                  {opt.isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}

                  {type === 'mcq' && options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 transition-colors"
                      title="Remove option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subjective Answer Writing Space (For short/long/custom) */}
        {(type === 'short_answer' || type === 'long_answer' || type === 'very_short_answer' || type === 'custom') && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-indigo-950 uppercase flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Answer Writing Space in Printed Paper</span>
              </label>
              <span className="text-xs font-bold text-indigo-700">
                {writingSpaceLines === 0 ? 'No blank space' : `${writingSpaceLines} Ruled Lines`}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[0, 2, 4, 6, 8, 12].map(lines => (
                <button
                  key={lines}
                  type="button"
                  onClick={() => setWritingSpaceLines(lines)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                    writingSpaceLines === lines
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lines === 0 ? 'None' : `${lines} Lines`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Diagram / Image Section */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Optional Diagram / Figure / Illustration</span>
            </label>
            {diagramUrl && (
              <button
                type="button"
                onClick={() => setDiagramUrl('')}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Remove Diagram</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Paste Image URL or data URL..."
              value={diagramUrl.startsWith('data:') ? 'Image uploaded from device' : diagramUrl}
              onChange={e => setDiagramUrl(e.target.value)}
              disabled={diagramUrl.startsWith('data:')}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 text-center shrink-0 flex items-center justify-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {diagramUrl && (
            <div className="mt-2 p-2 bg-white rounded-xl border border-slate-200 max-w-xs mx-auto text-center">
              <img
                src={diagramUrl}
                alt="Question diagram"
                className="max-h-36 mx-auto rounded-lg object-contain"
              />
            </div>
          )}
        </div>

        {/* Answer Key & Explanation (Collapsible/Configurable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Answer Key <span className="text-slate-400 font-normal">(For Teacher / Grading)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Option B / 42 m/s"
              value={answerKey}
              onChange={e => setAnswerKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Topic / Chapter Tag
            </label>
            <input
              type="text"
              placeholder="e.g. Thermodynamics"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Explanation / Solution Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={2}
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Step-by-step reasoning or scoring rubric..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {isEditing ? 'Update Question' : 'Save Question'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
