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
  Bookmark,
  Layers,
  Check
} from 'lucide-react'

interface CreatePaperModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

interface SectionPatternItem {
  id: string
  key: 'mcq' | 'very_short_answer' | 'short_answer' | 'long_answer' | 'case_study'
  title: string
  subtitle: string
  selected: boolean
  questionCount: number
  marksPerQuestion: number
  instructions: string
}

const DEFAULT_PATTERNS: SectionPatternItem[] = [
  {
    id: 'sec_mcq',
    key: 'mcq',
    title: 'Objective / Multiple Choice (MCQ)',
    subtitle: 'Standard 4 options (A, B, C, D) questions',
    selected: true,
    questionCount: 10,
    marksPerQuestion: 1,
    instructions: 'Choose the correct option for each question.'
  },
  {
    id: 'sec_vsa',
    key: 'very_short_answer',
    title: 'Very Short Answer (VSA)',
    subtitle: '1-line definitions, facts, or fill-in answers',
    selected: false,
    questionCount: 5,
    marksPerQuestion: 1,
    instructions: 'Answer in one word or one sentence each.'
  },
  {
    id: 'sec_sa',
    key: 'short_answer',
    title: 'Short Answer (SA)',
    subtitle: '2-3 step working or brief explanatory questions',
    selected: true,
    questionCount: 5,
    marksPerQuestion: 2,
    instructions: 'Answer briefly and show all necessary working/steps.'
  },
  {
    id: 'sec_la',
    key: 'long_answer',
    title: 'Long Answer (LA)',
    subtitle: 'Detailed derivation, long problem, or essay question',
    selected: true,
    questionCount: 2,
    marksPerQuestion: 5,
    instructions: 'Provide detailed explanations and diagrams where applicable.'
  },
  {
    id: 'sec_case',
    key: 'case_study',
    title: 'Case Study / Passage Based',
    subtitle: 'Scenario, passage or diagram followed by sub-questions',
    selected: false,
    questionCount: 2,
    marksPerQuestion: 4,
    instructions: 'Read the context carefully and answer the following questions.'
  }
]

export const CreatePaperModal: React.FC<CreatePaperModalProps> = ({ isOpen, onClose, onCreated }) => {
  const navigate = useNavigate()

  // Modal Step: 1 (Paper Details & Section Pattern) or 2 (Setup Mode / Template Selection)
  const [modalStep, setModalStep] = useState<1 | 2>(1)

  // Step 1: Manual Paper Information
  const [paperTitle, setPaperTitle] = useState('')
  const [subject, setSubject] = useState('Mathematics')
  const [className, setClassName] = useState('Class 10')
  const [examName, setExamName] = useState('Unit Test')
  const [totalMarks, setTotalMarks] = useState<number>(30)
  const [durationMinutes, setDurationMinutes] = useState<number>(60)

  // Step 1: Configurable Section Patterns
  const [patterns, setPatterns] = useState<SectionPatternItem[]>(DEFAULT_PATTERNS)

  // Step 2: Setup Mode & Template Choice
  const [setupMode, setSetupMode] = useState<'scratch' | 'template'>('template')
  const [templates, setTemplates] = useState<PaperSetupTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter selected sections
  const selectedPatterns = patterns.filter(p => p.selected)
  const totalQuestionsCount = selectedPatterns.reduce((sum, p) => sum + p.questionCount, 0)
  const calculatedTotalMarks = selectedPatterns.reduce(
    (sum, p) => sum + p.questionCount * p.marksPerQuestion,
    0
  )

  // Auto-suggest a clear paper name when subject/class/exam changes, if user hasn't typed custom name
  useEffect(() => {
    if (!paperTitle || paperTitle.includes('Test') || paperTitle.includes('Exam') || paperTitle.includes('Assessment')) {
      const parts = [className, subject, examName].filter(Boolean)
      setPaperTitle(parts.join(' - '))
    }
  }, [className, subject, examName])

  // Reset or initialize on open
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

  // Toggle section selection
  const togglePatternSelection = (id: string) => {
    setPatterns(prev =>
      prev.map(p => (p.id === id ? { ...p, selected: !p.selected } : p))
    )
  }

  // Update question count or marks per question
  const updatePatternValue = (
    id: string,
    field: 'questionCount' | 'marksPerQuestion',
    value: number
  ) => {
    setPatterns(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: Math.max(1, value) } : p))
    )
  }

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!paperTitle.trim()) {
      alert('Please provide a name for this paper so you can easily identify it later.')
      return
    }
    if (selectedPatterns.length === 0) {
      alert('Please select at least one question type section for this paper.')
      return
    }
    setModalStep(2)
  }

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true)

      // Dynamic section letters (Section A, Section B, Section C, etc.)
      const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F']
      const generatedSections: ExamSectionConfig[] = selectedPatterns.map((p, idx) => {
        const letter = sectionLetters[idx] || `${idx + 1}`
        return {
          id: `sec_${letter.toLowerCase()}`,
          name: `Section ${letter}`,
          title: `Section ${letter}: ${p.title} (${p.marksPerQuestion} Mark${p.marksPerQuestion > 1 ? 's' : ''} Each)`,
          instructions: p.instructions,
          totalQuestions: p.questionCount,
          marksPerQuestion: p.marksPerQuestion,
          targetTypes: [p.key],
          enabled: true,
          numberingStyle: 'continuous'
        }
      })

      // 1. Create the base paper with user's exact sections and identity
      const created = await paperService.createNewPaper({
        title: paperTitle.trim(),
        subject: subject.trim(),
        className: className.trim(),
        examName: examName.trim(),
        totalMarks: Number(totalMarks),
        durationMinutes: Number(durationMinutes),
        sections: generatedSections
      })

      // 2. If user chose "Use Saved Template", apply it (keeps user's sections & identity)
      if (setupMode === 'template' && selectedTemplateId) {
        const chosenTemplate = templates.find(t => t.id === selectedTemplateId)
        if (chosenTemplate) {
          await paperService.applyTemplate(created.metadata.id, chosenTemplate)
        }
      }

      onClose()
      if (onCreated) onCreated()

      // 3. Routing:
      // Template mode -> Question Editor (/editor?paperId=...)
      // Scratch mode -> Setup Wizard (/wizard?paperId=...)
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
          ? 'Enter manual exam details, select question sections, and give a recognizable name'
          : 'Set up from scratch or apply a ready-to-use coaching blueprint template'
      }
      maxWidth="lg"
    >
      {modalStep === 1 ? (
        <form onSubmit={handleProceedToStep2} className="space-y-4">
          {/* 1. Paper Name / Display Identifier */}
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
              Give this paper a clear recognizable name so you can easily identify and export it later from your saved papers list.
            </p>
          </div>

          {/* 2. Manual Required Details: Class, Subject, Exam Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Class / Grade <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="class-suggestions"
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="e.g. Class 10, Grade 8"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <datalist id="class-suggestions">
                <option value="Class VI" />
                <option value="Class VII" />
                <option value="Class VIII" />
                <option value="Class IX" />
                <option value="Class X" />
                <option value="Class XI" />
                <option value="Class XII" />
                <option value="Grade 6" />
                <option value="Grade 7" />
                <option value="Grade 8" />
                <option value="Grade 9" />
                <option value="Grade 10" />
                <option value="Grade 11" />
                <option value="Grade 12" />
                <option value="Foundation Batch" />
                <option value="Competitive Exam" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="subject-suggestions"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Mathematics, Science"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <datalist id="subject-suggestions">
                <option value="Mathematics" />
                <option value="Science" />
                <option value="Physics" />
                <option value="Chemistry" />
                <option value="Biology" />
                <option value="English" />
                <option value="Social Science" />
                <option value="History & Civics" />
                <option value="Geography" />
                <option value="Hindi" />
                <option value="Sanskrit" />
                <option value="Computer Science" />
                <option value="Economics" />
                <option value="Accountancy" />
                <option value="Business Studies" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Examination Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="exam-suggestions"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                placeholder="e.g. Unit Test 1"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <datalist id="exam-suggestions">
                <option value="Unit Test" />
                <option value="Periodic Assessment" />
                <option value="Weekly Test" />
                <option value="Mid-Term Examination" />
                <option value="Pre-Board Examination" />
                <option value="Annual Examination" />
                <option value="Chapter Practice Test" />
              </datalist>
            </div>
          </div>

          {/* 3. Manual Total Marks & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Total Marks <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={totalMarks}
                onChange={e => setTotalMarks(Math.max(1, Number(e.target.value)))}
                placeholder="e.g. 30"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Time / Duration (Minutes) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                  placeholder="e.g. 60"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium pointer-events-none">
                  {durationMinutes >= 60
                    ? `${(durationMinutes / 60).toFixed(1).replace('.0', '')} hr${durationMinutes > 60 ? 's' : ''}`
                    : `${durationMinutes}m`}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Select Question Types & Section Pattern */}
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Select Question Types to Include
                </span>
                <span className="text-[11px] text-slate-500">
                  Check only the types you want. Only selected types will be added as sections in this paper.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">
                  {selectedPatterns.length} of {patterns.length} Types Selected
                </span>
              </div>
            </div>

            {/* List of Section Patterns */}
            <div className="space-y-2.5 pt-1">
              {patterns.map((item) => {
                const isSelected = item.selected
                const sectionSubtotal = item.questionCount * item.marksPerQuestion

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-2xs ring-1 ring-blue-500/30'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Header Row with Toggle Checkbox */}
                    <div
                      onClick={() => togglePatternSelection(item.id)}
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0">
                          <span className={`text-xs font-bold block truncate ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>

                      {/* Subtotal or Status Badge */}
                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            = {sectionSubtotal} Marks
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Not in Paper
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Inputs when Selected */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-blue-50/20 rounded-b-2xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                              Number of Questions
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={item.questionCount}
                              onChange={e =>
                                updatePatternValue(
                                  item.id,
                                  'questionCount',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">
                              Marks for Each Question
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={item.marksPerQuestion}
                              onChange={e =>
                                updatePatternValue(
                                  item.id,
                                  'marksPerQuestion',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-2 font-medium">
                          Summary: {item.questionCount} question{item.questionCount > 1 ? 's' : ''} × {item.marksPerQuestion} mark{item.marksPerQuestion > 1 ? 's' : ''} = <strong>{sectionSubtotal} Marks</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Calculated Marks vs Target Marks Summary Bar */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-100/90 border border-slate-200">
                <div className="text-xs">
                  <span className="font-bold text-slate-800">
                    Total: {selectedPatterns.length} Section{selectedPatterns.length !== 1 ? 's' : ''} • {totalQuestionsCount} Questions
                  </span>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    Calculated Marks: <strong className="text-slate-900">{calculatedTotalMarks}</strong> | Target Marks: <strong className="text-slate-900">{totalMarks}</strong>
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {calculatedTotalMarks === totalMarks ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg flex items-center gap-1 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Marks Match Target
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTotalMarks(calculatedTotalMarks)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                      title="Sync target Total Marks to match your selected question counts"
                    >
                      Set Target to {calculatedTotalMarks} Marks
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
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
          <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-blue-900">
            <span>Paper: <strong>{paperTitle}</strong></span>
            <span>{className} • {subject} • {totalMarks} Marks • {durationMinutes} Mins</span>
          </div>

          {/* Selected Sections Summary Preview */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Configured Sections:</span>
            {selectedPatterns.map((p, idx) => {
              const letter = ['A', 'B', 'C', 'D', 'E', 'F'][idx] || `${idx + 1}`
              return (
                <span key={p.id} className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-slate-800">
                  Section {letter}: {p.title.split(' ')[0]} ({p.questionCount} Qs, {p.questionCount * p.marksPerQuestion}M)
                </span>
              )
            })}
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
