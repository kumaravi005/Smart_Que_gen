import React, { useState, useEffect } from 'react'
import {
  Search,
  BookOpen,
  CheckCircle2,
  Check
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import type { Question, QuestionBankItem, SectionContent, QuestionType, DifficultyLevel } from '../../types'
import { bankService } from '../../services/bankService'
import { generateId } from '../../utils/id'

interface QuestionBankModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (questions: Question[], targetSectionId: string) => Promise<void>
  sections: SectionContent[]
  currentSectionId: string
  defaultSubject?: string
  defaultClass?: string
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  onImport,
  sections,
  currentSectionId,
  defaultSubject = '',
  defaultClass = ''
}) => {
  const [targetSectionId, setTargetSectionId] = useState(currentSectionId)
  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState(defaultSubject)
  const [classFilter, setClassFilter] = useState(defaultClass)
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | ''>('')

  // Selected item IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isImporting, setIsImporting] = useState(false)

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const data = await bankService.getQuestions({
        subject: subjectFilter || undefined,
        className: classFilter || undefined,
        type: typeFilter || undefined,
        difficulty: difficultyFilter || undefined,
        searchQuery: searchQuery || undefined
      })
      setBankItems(data)
    } catch (err) {
      console.error('Failed to load bank questions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadQuestions()
    }
  }, [isOpen, subjectFilter, classFilter, typeFilter, difficultyFilter, searchQuery])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === bankItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(bankItems.map(item => item.id)))
    }
  }

  const handleConfirmImport = async () => {
    const selectedItems = bankItems.filter(item => selectedIds.has(item.id))
    if (selectedItems.length === 0) return

    const convertedQuestions: Question[] = selectedItems.map((item, idx) => ({
      id: generateId('q'),
      sectionId: targetSectionId,
      orderNumber: idx + 1,
      type: item.type,
      prompt: item.prompt,
      marks: item.marks,
      difficulty: item.difficulty,
      topic: item.topic,
      subtopic: item.subtopic,
      hint: item.hint,
      solutionText: item.solutionText,
      explanation: item.solutionText,
      options: item.options?.map(opt => ({
        id: generateId('opt'),
        label: opt.label,
        text: opt.text,
        isCorrect: opt.isCorrect
      })),
      tags: item.tags || [],
      source: 'bank'
    }))

    try {
      setIsImporting(true)
      await onImport(convertedQuestions, targetSectionId)

      // Record usage count for imported items
      for (const item of selectedItems) {
        await bankService.recordUsage(item.id)
      }

      setSelectedIds(new Set())
      onClose()
    } catch (err) {
      console.error('Import from bank error:', err)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question Bank Repository"
      description="Search, filter, and import verified questions directly into your examination"
      maxWidth="4xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {/* Controls and Target Section Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Insert into Section:</span>
            <select
              value={targetSectionId}
              onChange={e => setTargetSectionId(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
            >
              {sections.map(sec => (
                <option key={sec.sectionId} value={sec.sectionId}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedIds.size === bankItems.length && bankItems.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </Button>
            <span className="text-xs font-semibold text-slate-600">
              {selectedIds.size} of {bankItems.length} selected
            </span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search questions by keyword, topic, or tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-0.5">
                Subject
              </label>
              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="">All Subjects</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Social Science">Social Science</option>
                <option value="English">English</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-0.5">
                Class / Grade
              </label>
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="">All Classes</option>
                <option value="Class IX">Class IX</option>
                <option value="Class X">Class X</option>
                <option value="Class XI">Class XI</option>
                <option value="Class XII">Class XII</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-0.5">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="">All Types</option>
                <option value="mcq">MCQ</option>
                <option value="short_answer">Short Answer</option>
                <option value="long_answer">Long Answer</option>
                <option value="true_false">True / False</option>
                <option value="fill_blanks">Fill in Blanks</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-0.5">
                Difficulty
              </label>
              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading Question Bank items...</p>
          </div>
        ) : bankItems.length === 0 ? (
          <div className="p-10 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No questions found</p>
            <p className="text-xs text-slate-500">
              Try adjusting your filters or search terms.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setSubjectFilter('')
                setClassFilter('')
                setTypeFilter('')
                setDifficultyFilter('')
              }}
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {bankItems.map(item => {
              const isSelected = selectedIds.has(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="purple" size="sm">
                            {item.marks} M
                          </Badge>
                          <Badge variant="info" size="sm">
                            {item.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {item.subject} • {item.className}
                          </span>
                        </div>

                        {item.topic && (
                          <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {item.topic}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-900 leading-snug">
                        {item.prompt}
                      </p>

                      {/* Options Preview for MCQs */}
                      {item.options && item.options.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 pt-1">
                          {item.options.map(opt => (
                            <div
                              key={opt.id}
                              className={`px-2 py-1 rounded-lg text-[11px] border truncate ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              ({opt.label}) {opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 sticky bottom-0 bg-white">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={isImporting}
            disabled={selectedIds.size === 0}
            onClick={handleConfirmImport}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Import {selectedIds.size} Question{selectedIds.size === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
