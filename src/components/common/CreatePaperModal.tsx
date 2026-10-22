import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { Button } from './Button'
import { paperService } from '../../services/paperService'
import { templateService } from '../../services/templateService'
import type { PaperSetupTemplate, ExamSectionConfig } from '../../types'
import {
  Wand2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bookmark
} from 'lucide-react'

interface CreatePaperModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

export const CreatePaperModal: React.FC<CreatePaperModalProps> = ({ isOpen, onClose, onCreated }) => {
  const navigate = useNavigate()

  // Modal Step: 1 (Paper Details & Question Counts) or 2 (Setup Mode / Template Selection)
  const [modalStep, setModalStep] = useState<1 | 2>(1)

  // Step 1: Paper Identity & Details
  const [paperTitle, setPaperTitle] = useState('')
  const [subject, setSubject] = useState('Mathematics')
  const [className, setClassName] = useState('Class X')
  const [examName, setExamName] = useState('Weekly Test')
  const [totalMarks, setTotalMarks] = useState<number>(25)
  const [durationMinutes, setDurationMinutes] = useState<number>(45)

  // Step 1: Question Counts by Type
  const [mcqCount, setMcqCount] = useState<number>(10)
  const [mcqMarks, setMcqMarks] = useState<number>(1)
  const [shortCount, setShortCount] = useState<number>(5)
  const [shortMarks, setShortMarks] = useState<number>(2)
  const [longCount, setLongCount] = useState<number>(1)
  const [longMarks, setLongMarks] = useState<number>(5)

  // Step 2: Setup Mode & Template Choice
  const [setupMode, setSetupMode] = useState<'scratch' | 'template'>('template')
  const [templates, setTemplates] = useState<PaperSetupTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calculate live marks sum from questions
  const calculatedTotalMarks = mcqCount * mcqMarks + shortCount * shortMarks + longCount * longMarks

  // Auto-suggest a clear paper name when subject/class/exam changes, if user hasn't typed custom name
  useEffect(() => {
    if (!paperTitle || paperTitle.includes('Test') || paperTitle.includes('Exam')) {
      setPaperTitle(`${className} ${subject} - ${examName}`)
    }
  }, [className, subject, examName])

  // Load templates on modal open
  useEffect(() => {
    if (isOpen) {
      setModalStep(1)
      setLoadingTemplates(true)
      templateService.getAllTemplates()
        .then(list => {
          setTemplates(list)
          if (list.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(list[0].id)
          }
        })
        .catch(err => console.error('Failed to load templates:', err))
        .finally(() => setLoadingTemplates(false))
    }
  }, [isOpen])

  // Quick total marks presets
  const handleSelectPreset = (marks: number, mins: number, name: string) => {
    setTotalMarks(marks)
    setDurationMinutes(mins)
    setExamName(name)
    if (marks === 25) {
      setMcqCount(10)
      setMcqMarks(1)
      setShortCount(5)
      setShortMarks(2)
      setLongCount(1)
      setLongMarks(5)
    } else if (marks === 40) {
      setMcqCount(15)
      setMcqMarks(1)
      setShortCount(5)
      setShortMarks(3)
      setLongCount(2)
      setLongMarks(5)
    } else if (marks === 80) {
      setMcqCount(20)
      setMcqMarks(1)
      setShortCount(10)
      setShortMarks(3)
      setLongCount(6)
      setLongMarks(5)
    }
  }

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!paperTitle.trim()) {
      alert('Please provide a name for this paper so you can easily find it later.')
      return
    }
    setModalStep(2)
  }

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Build structured sections from the question counts
      const generatedSections: ExamSectionConfig[] = []

      if (mcqCount > 0) {
        generatedSections.push({
          id: 'sec_a',
          name: 'Section A',
          title: `Section A: Multiple Choice Questions (${mcqMarks} Mark Each)`,
          instructions: 'Choose the correct option for each question.',
          totalQuestions: mcqCount,
          marksPerQuestion: mcqMarks,
          targetTypes: ['mcq'],
          enabled: true,
          numberingStyle: 'continuous'
        })
      }

      if (shortCount > 0) {
        generatedSections.push({
          id: 'sec_b',
          name: 'Section B',
          title: `Section B: Short Answer Questions (${shortMarks} Marks Each)`,
          instructions: 'Answer briefly and show all necessary steps.',
          totalQuestions: shortCount,
          marksPerQuestion: shortMarks,
          targetTypes: ['short_answer'],
          enabled: true,
          numberingStyle: 'continuous'
        })
      }

      if (longCount > 0) {
        generatedSections.push({
          id: 'sec_c',
          name: 'Section C',
          title: `Section C: Long Answer Questions (${longMarks} Marks Each)`,
          instructions: 'Provide detailed explanations and diagrams where applicable.',
          totalQuestions: longCount,
          marksPerQuestion: longMarks,
          targetTypes: ['long_answer'],
          enabled: true,
          numberingStyle: 'continuous'
        })
      }

      // If no sections were enabled, provide a fallback section
      if (generatedSections.length === 0) {
        generatedSections.push({
          id: 'sec_a',
          name: 'Section A',
          title: 'Section A: General Questions',
          totalQuestions: 10,
          marksPerQuestion: 1,
          targetTypes: ['mcq'],
          enabled: true,
          numberingStyle: 'continuous'
        })
      }

      // 1. Create the base paper
      const created = await paperService.createNewPaper({
        title: paperTitle.trim(),
        subject,
        className,
        examName,
        totalMarks: Number(totalMarks),
        durationMinutes: Number(durationMinutes),
        sections: generatedSections
      })

      // 2. If user chose "Use Saved Template", apply it immediately!
      if (setupMode === 'template' && selectedTemplateId) {
        const chosenTemplate = templates.find(t => t.id === selectedTemplateId)
        if (chosenTemplate) {
          await paperService.applyTemplate(created.metadata.id, chosenTemplate)
        }
      }

      onClose()
      if (onCreated) onCreated()

      // 3. Smart routing:
      // If template mode -> user is ready to add questions! Route straight to Question Editor!
      // If scratch mode -> route to Setup Wizard to customize instructions/margins.
      if (setupMode === 'template') {
        navigate(`/editor?paperId=${created.metadata.id}`)
      } else {
        navigate(`/wizard?paperId=${created.metadata.id}`)
      }
    } catch (err) {
      console.error('Failed to create paper:', err)
      alert('Could not initialize paper. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalStep === 1 ? 'Create Question Paper' : 'Choose Setup Method'}
      description={
        modalStep === 1
          ? 'Enter exam details, question breakdown, and a recognizable paper name'
          : 'Set up from scratch or apply a ready-to-use coaching template'
      }
      maxWidth="lg"
    >
      {modalStep === 1 ? (
        <form onSubmit={handleProceedToStep2} className="space-y-4">
          {/* Quick Presets Pill Row */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Quick Test Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset(25, 45, 'Weekly Coaching Test')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  totalMarks === 25
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ⚡ 25 Marks (45 Mins - Weekly Test)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(40, 90, 'Periodic Assessment')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  totalMarks === 40
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                📝 40 Marks (90 Mins - Unit Test)
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset(80, 180, 'Mid-Term Exam')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  totalMarks === 80
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🎓 80 Marks (180 Mins - Term Exam)
              </button>
            </div>
          </div>

          {/* Paper Name / Display Identifier */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/90 space-y-1">
            <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider">
              Paper Name / Saved Label <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={paperTitle}
              onChange={e => setPaperTitle(e.target.value)}
              placeholder="e.g. Class 10 Maths Test - Ch 1 to 3"
              className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              required
            />
            <p className="text-[11px] text-blue-700">
              Give this paper a clear name so you can easily identify and export it later from your saved papers list.
            </p>
          </div>

          {/* Class, Subject & Exam Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Class / Grade
              </label>
              <select
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              >
                <option value="Class IX">Class IX</option>
                <option value="Class X">Class X</option>
                <option value="Class XI">Class XI</option>
                <option value="Class XII">Class XII</option>
                <option value="Class VIII">Class VIII</option>
                <option value="Foundation">Competitive / Foundation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science (Phy/Chem/Bio)</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="English">English</option>
                <option value="Social Science">Social Science</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="15"
                max="360"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Question Breakdown by Type (Objective vs Subjective) */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Question Breakdown by Type
                </span>
                <span className="text-[11px] text-slate-500">
                  Specify how many MCQs, short, and long questions you want in this test.
                </span>
              </div>
              <div className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                calculatedTotalMarks === totalMarks
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                {calculatedTotalMarks} / {totalMarks} Marks
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Objective / MCQs */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-800 block">1. Objective / MCQs</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Questions</label>
                    <input
                      type="number"
                      min="0"
                      value={mcqCount}
                      onChange={e => setMcqCount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Marks Each</label>
                    <input
                      type="number"
                      min="1"
                      value={mcqMarks}
                      onChange={e => setMcqMarks(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-600 text-right">
                  = {mcqCount * mcqMarks} Marks
                </div>
              </div>

              {/* Short Answer */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-800 block">2. Short Answer</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Questions</label>
                    <input
                      type="number"
                      min="0"
                      value={shortCount}
                      onChange={e => setShortCount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Marks Each</label>
                    <input
                      type="number"
                      min="1"
                      value={shortMarks}
                      onChange={e => setShortMarks(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-600 text-right">
                  = {shortCount * shortMarks} Marks
                </div>
              </div>

              {/* Long Answer */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-800 block">3. Long Answer</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Questions</label>
                    <input
                      type="number"
                      min="0"
                      value={longCount}
                      onChange={e => setLongCount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-semibold">Marks Each</label>
                    <input
                      type="number"
                      min="1"
                      value={longMarks}
                      onChange={e => setLongMarks(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="text-[11px] font-semibold text-blue-600 text-right">
                  = {longCount * longMarks} Marks
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Setup Choice ➔
            </Button>
          </div>
        </form>
      ) : (
        /* Step 2: Choose Setup Mode (Scratch vs Template) */
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Paper: <strong>{paperTitle}</strong></span>
            <span>{totalMarks} Marks • {durationMinutes} Mins</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option A: Use a Saved Template */}
            <div
              onClick={() => setSetupMode('template')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                setupMode === 'template'
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Use a Saved Template</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apply a pre-configured coaching blueprint with institute logo, standard instructions, and A4 layout. You can start adding questions immediately.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <CheckCircle2 className={`w-4 h-4 ${setupMode === 'template' ? 'text-blue-600' : 'text-slate-300'}`} />
                <span>{setupMode === 'template' ? 'Selected' : 'Click to Select'}</span>
              </div>
            </div>

            {/* Option B: Set Up from Scratch */}
            <div
              onClick={() => setSetupMode('scratch')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                setupMode === 'scratch'
                  ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                    <Wand2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    Custom Setup
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Set Up from Scratch</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Walk through the multi-step Paper Setup Wizard to configure custom institution details, page margins, and rules step-by-step.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <CheckCircle2 className={`w-4 h-4 ${setupMode === 'scratch' ? 'text-blue-600' : 'text-slate-300'}`} />
                <span>{setupMode === 'scratch' ? 'Selected' : 'Click to Select'}</span>
              </div>
            </div>
          </div>

          {/* Template Selection List (Visible when template mode is selected) */}
          {setupMode === 'template' && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Blueprint Template:
              </span>

              {loadingTemplates ? (
                <div className="p-6 text-center text-xs text-slate-400">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500 text-center">
                  No saved templates found. Choose "Set Up from Scratch".
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {templates.map(tpl => {
                    const isSelected = selectedTemplateId === tpl.id
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {tpl.name}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                              {tpl.totalMarks} Marks
                            </span>
                          </div>
                          {tpl.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {tpl.description}
                            </p>
                          )}
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setModalStep(1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Details
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleFinalSubmit}
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {setupMode === 'template' ? 'Apply Template & Add Questions ➔' : 'Start Setup Wizard ➔'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
