import React, { useState, useEffect } from 'react'
import {
  Database,
  Plus,
  Search,
  Trash2
} from 'lucide-react'
import { bankService } from '../services/bankService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import type { QuestionBankItem, DifficultyLevel, QuestionType } from '../types'

export const QuestionBankView: React.FC = () => {
  const [items, setItems] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // New question state
  const [prompt, setPrompt] = useState('')
  const [subject, setSubject] = useState('Mathematics')
  const [className, setClassName] = useState('Class X')
  const [topic, setTopic] = useState('')
  const [marks, setMarks] = useState(2)
  const [difficulty] = useState<DifficultyLevel>('medium')
  const [type] = useState<QuestionType>('short_answer')

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const data = await bankService.getQuestions({
        searchQuery: search,
        subject: selectedSubject || undefined,
        difficulty: (selectedDifficulty as DifficultyLevel) || undefined
      })
      setItems(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [search, selectedSubject, selectedDifficulty])

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    await bankService.addQuestion({
      prompt: prompt.trim(),
      subject,
      className,
      topic: topic.trim() || 'General',
      marks: Number(marks),
      difficulty,
      type,
      tags: [subject, className, topic.trim()].filter(Boolean)
    })

    setPrompt('')
    setIsAdding(false)
    await loadQuestions()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this question from bank?')) {
      await bankService.deleteQuestion(id)
      await loadQuestions()
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Module 3</span>
              <Badge variant="success" size="sm">Persistent Bank</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Question Bank</h1>
            <p className="text-xs text-slate-500">
              Centralized reusable question repository with tagging and difficulty ratings.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsAdding(true)}
        >
          Add to Bank
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions by keyword or topic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700"
          >
            <option value="">All Subjects</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Add to Bank Form Modal/Drawer */}
      {isAdding && (
        <form
          onSubmit={handleAddQuestion}
          className="bg-white p-5 rounded-3xl border-2 border-emerald-500 shadow-md space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-sm">Add Question to Bank</h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
              <input
                type="text"
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Algebra"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Marks</label>
              <input
                type="number"
                value={marks}
                onChange={e => setMarks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Question Prompt</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Enter question text to save in bank..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save to Bank
            </Button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading questions from bank...</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Database className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No matching questions found in bank</p>
            <p className="text-xs text-slate-400">Add questions to build your coaching question bank.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary" size="sm">{item.subject}</Badge>
                    <Badge variant="default" size="sm">{item.className}</Badge>
                    <Badge variant={item.difficulty === 'hard' ? 'warning' : 'success'} size="sm">
                      {item.difficulty.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">• Topic: {item.topic}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 pt-1 leading-relaxed">
                    {item.prompt}
                  </p>
                  {item.solutionText && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <strong>Solution / Hint:</strong> {item.solutionText}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">[{item.marks} M]</span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
