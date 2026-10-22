import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Wand2,
  Save,
  ArrowRight,
  Plus,
  Trash2,
  Check
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import type { ExamSectionConfig } from '../types'
import { generateId } from '../utils/id'

export const WizardView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading, saving, saveSettings } = usePaperDetails(paperId)

  // Form local state
  const [examName, setExamName] = useState('')
  const [subject, setSubject] = useState('')
  const [className, setClassName] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(180)
  const [totalMarks, setTotalMarks] = useState(80)
  const [instituteName, setInstituteName] = useState('OMEGA EDUCATION CENTER')
  const [instructions, setInstructions] = useState<string[]>([])
  const [newInstruction, setNewInstruction] = useState('')
  const [sections, setSections] = useState<ExamSectionConfig[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (paper?.settings) {
      setExamName(paper.settings.examName)
      setSubject(paper.settings.subject)
      setClassName(paper.settings.className)
      setDurationMinutes(paper.settings.durationMinutes)
      setTotalMarks(paper.settings.totalMarks)
      setInstituteName(paper.settings.institute.name)
      setInstructions(paper.settings.generalInstructions || [])
      setSections(paper.settings.sections || [])
    }
  }, [paper])

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return
    setInstructions(prev => [...prev, newInstruction.trim()])
    setNewInstruction('')
  }

  const handleRemoveInstruction = (index: number) => {
    setInstructions(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddSection = () => {
    const nextCode = String.fromCharCode(65 + sections.length) // A, B, C, D...
    const newSec: ExamSectionConfig = {
      id: generateId('sec'),
      name: `Section ${nextCode}`,
      title: `Section ${nextCode}: Descriptive Questions`,
      totalQuestions: 5,
      marksPerQuestion: 2,
      targetTypes: ['short_answer']
    }
    setSections(prev => [...prev, newSec])
  }

  const handleRemoveSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const handleSave = async () => {
    if (!paper) return
    const updatedSettings = {
      ...paper.settings,
      examName,
      subject,
      className,
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks),
      institute: {
        ...paper.settings.institute,
        name: instituteName
      },
      generalInstructions: instructions,
      sections
    }

    await saveSettings(updatedSettings)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading exam configuration...</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <Wand2 className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Please select an existing paper from the dashboard or create a new paper to start the Setup Wizard.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Go to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
            <Wand2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Module 1</span>
              <Badge variant="primary" size="sm">IndexedDB Linked</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Paper Setup Wizard</h1>
            <p className="text-xs text-slate-500">
              Configure exam parameters and section rules before entering questions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={saveSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
          >
            {saveSuccess ? 'Saved!' : 'Save Config'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/editor?paperId=${paper.metadata.id}`)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Go to Editor
          </Button>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <span>1. Institute & Examination Details</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Coaching Center / Institute Name
            </label>
            <input
              type="text"
              value={instituteName}
              onChange={e => setInstituteName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Examination Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={e => setExamName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Class / Grade
            </label>
            <input
              type="text"
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Time (Mins)
              </label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Marks
              </label>
              <input
                type="number"
                value={totalMarks}
                onChange={e => setTotalMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Examination Sections Configuration */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">2. Paper Section Blueprint</h2>
              <p className="text-xs text-slate-500">Configure questions count and marks per section</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleAddSection}
            >
              Add Section
            </Button>
          </div>

          <div className="space-y-3">
            {sections.map(sec => (
              <div
                key={sec.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="purple" size="sm">{sec.name}</Badge>
                    <input
                      type="text"
                      value={sec.title}
                      onChange={e => {
                        const val = e.target.value
                        setSections(prev =>
                          prev.map(s => (s.id === sec.id ? { ...s, title: val } : s))
                        )
                      }}
                      className="flex-1 px-2.5 py-1 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <label className="flex items-center gap-1.5">
                      <span>Questions:</span>
                      <input
                        type="number"
                        min="1"
                        value={sec.totalQuestions}
                        onChange={e => {
                          const val = Number(e.target.value)
                          setSections(prev =>
                            prev.map(s => (s.id === sec.id ? { ...s, totalQuestions: val } : s))
                          )
                        }}
                        className="w-16 px-2 py-0.5 bg-white border border-slate-200 rounded text-center"
                      />
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span>Marks each:</span>
                      <input
                        type="number"
                        min="1"
                        value={sec.marksPerQuestion}
                        onChange={e => {
                          const val = Number(e.target.value)
                          setSections(prev =>
                            prev.map(s => (s.id === sec.id ? { ...s, marksPerQuestion: val } : s))
                          )
                        }}
                        className="w-16 px-2 py-0.5 bg-white border border-slate-200 rounded text-center"
                      />
                    </label>
                    <span className="font-semibold text-blue-700">
                      Total: {sec.totalQuestions * sec.marksPerQuestion} M
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSection(sec.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white self-end sm:self-center transition-colors"
                  title="Remove section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* General Instructions */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h2 className="text-base font-bold text-slate-900">3. General Instructions for Students</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={newInstruction}
              onChange={e => setNewInstruction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInstruction())}
              placeholder="e.g. Question 1 to 20 carry 1 mark each..."
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button variant="secondary" size="sm" onClick={handleAddInstruction}>
              Add
            </Button>
          </div>

          <ul className="space-y-2">
            {instructions.map((inst, index) => (
              <li
                key={index}
                className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700 border border-slate-200"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-400">{index + 1}.</span>
                  <span>{inst}</span>
                </div>
                <button
                  onClick={() => handleRemoveInstruction(index)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
