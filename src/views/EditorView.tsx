import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  FileEdit,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  Mic,
  ScanText,
  HelpCircle
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import type { Question, QuestionType, DifficultyLevel } from '../types'
import { generateId } from '../utils/id'

export const EditorView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading, saving, saveContent } = usePaperDetails(paperId)

  const [activeSectionId, setActiveSectionId] = useState<string>('')
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)

  // New question form state
  const [newPrompt, setNewPrompt] = useState('')
  const [newType, setNewType] = useState<QuestionType>('mcq')
  const [newMarks, setNewMarks] = useState(1)
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>('medium')
  const [newTopic, setNewTopic] = useState('')
  const [options, setOptions] = useState([
    { label: 'A', text: '', isCorrect: true },
    { label: 'B', text: '', isCorrect: false },
    { label: 'C', text: '', isCorrect: false },
    { label: 'D', text: '', isCorrect: false }
  ])

  // Select first section once loaded
  const currentSection =
    paper?.content?.sections?.find(s => s.sectionId === activeSectionId) ||
    paper?.content?.sections?.[0]

  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paper || !currentSection || !newPrompt.trim()) return

    const newQ: Question = {
      id: generateId('q'),
      sectionId: currentSection.sectionId,
      orderNumber: (currentSection.questions?.length || 0) + 1,
      type: newType,
      prompt: newPrompt.trim(),
      marks: Number(newMarks),
      difficulty: newDifficulty,
      topic: newTopic.trim(),
      tags: [paper.settings.subject, newTopic.trim()].filter(Boolean),
      source: 'manual',
      options:
        newType === 'mcq'
          ? options.map((opt, i) => ({
              id: `opt_${i + 1}`,
              label: opt.label,
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          : undefined
    }

    const updatedSections = paper.content.sections.map(sec => {
      if (sec.sectionId === currentSection.sectionId) {
        return {
          ...sec,
          questions: [...(sec.questions || []), newQ]
        }
      }
      return sec
    })

    await saveContent({
      ...paper.content,
      sections: updatedSections
    })

    // Reset form
    setNewPrompt('')
    setIsAddingQuestion(false)
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!paper || !currentSection) return
    const updatedSections = paper.content.sections.map(sec => {
      if (sec.sectionId === currentSection.sectionId) {
        return {
          ...sec,
          questions: sec.questions.filter(q => q.id !== qId)
        }
      }
      return sec
    })

    await saveContent({
      ...paper.content,
      sections: updatedSections
    })
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading questions from IndexedDB...</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <FileEdit className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Please select or create a question paper to edit questions.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const sections = paper.content?.sections || []

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Module 2</span>
              <Badge variant="info" size="sm">{paper.settings.className} • {paper.settings.subject}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Question Editor</h1>
            <p className="text-xs text-slate-500">
              Add and edit MCQs, descriptive problems, and marking schemes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/preview?paperId=${paper.metadata.id}`)}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Live Preview
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddingQuestion(true)}
          >
            Add Question
          </Button>
        </div>
      </div>

      {/* Sections Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sections.map(sec => {
          const isSelected = (currentSection?.sectionId || '') === sec.sectionId
          return (
            <button
              key={sec.sectionId}
              onClick={() => setActiveSectionId(sec.sectionId)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {sec.title.split(':')[0]} ({sec.questions?.length || 0} Qs)
            </button>
          )
        })}
      </div>

      {/* Question Form / Modal */}
      {isAddingQuestion && (
        <div className="bg-white rounded-3xl border-2 border-blue-500 shadow-md p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">
              Add Question to {currentSection?.title?.split(':')[0]}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/ocr?paperId=${paper.metadata.id}`)}
                leftIcon={<ScanText className="w-4 h-4 text-violet-600" />}
              >
                Scan Photo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/voice?paperId=${paper.metadata.id}`)}
                leftIcon={<Mic className="w-4 h-4 text-teal-600" />}
              >
                Voice Dictate
              </Button>
            </div>
          </div>

          <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Question Type
                </label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as QuestionType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="short_answer">Short Answer (1–3 Marks)</option>
                  <option value="long_answer">Long Answer (4–6 Marks)</option>
                  <option value="fill_blanks">Fill in Blanks</option>
                  <option value="true_false">True / False</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newMarks}
                  onChange={e => setNewMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Difficulty
                </label>
                <select
                  value={newDifficulty}
                  onChange={e => setNewDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard / Analytical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Topic / Subtopic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Algebra"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Question Statement / Prompt
              </label>
              <textarea
                rows={3}
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                placeholder="Type question text here..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* MCQ Options Config */}
            {newType === 'mcq' && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 uppercase">
                  Options (Select correct choice)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {options.map((opt, i) => (
                    <div
                      key={opt.label}
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOptions(prev =>
                            prev.map((o, idx) => ({ ...o, isCorrect: idx === i }))
                          )
                        }
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          opt.isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="Mark as correct answer"
                      >
                        {opt.label}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => {
                          const val = e.target.value
                          setOptions(prev =>
                            prev.map((o, idx) => (idx === i ? { ...o, text: val } : o))
                          )
                        }}
                        placeholder={`Option ${opt.label} text`}
                        className="flex-1 px-2.5 py-1 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingQuestion(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={saving}>
                Save to Section
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {currentSection?.title || 'Section Questions'}
          </h2>
          <span className="text-xs text-slate-500">
            Total {currentSection?.questions?.length || 0} Questions
          </span>
        </div>

        {(!currentSection?.questions || currentSection.questions.length === 0) ? (
          <div className="p-10 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No questions added to this section yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add manually, pick from the Question Bank, scan a textbook photo, or use voice dictation.
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddingQuestion(true)}
            >
              Add Question
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentSection.questions.map((q, idx) => (
              <div key={q.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className="font-bold text-slate-900 text-sm sm:text-base shrink-0 mt-0.5">
                      Q{idx + 1}.
                    </span>
                    <div className="space-y-2 flex-1">
                      <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-medium">
                        {q.prompt}
                      </p>

                      {/* MCQ Options Rendering */}
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {q.options.map(opt => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-medium'
                                  : 'bg-white text-slate-700 border-slate-200'
                              }`}
                            >
                              <span className="font-bold font-mono">({opt.label})</span>
                              <span>{opt.text}</span>
                              {opt.isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="purple" size="sm">[{q.marks} Mark{q.marks > 1 ? 's' : ''}]</Badge>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
