import React, { useState, useEffect } from 'react'
import {
  Search,
  BookOpen,
  CheckCircle2,
  Check,
  Folder,
  ChevronRight,
  X
} from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import type { Question, QuestionBankItem, BankFolder, SectionContent, QuestionType, DifficultyLevel } from '../../types'
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
  defaultSubject: _defaultSubject = '',
  defaultClass: _defaultClass = ''
}) => {

  const [targetSectionId, setTargetSectionId] = useState(currentSectionId)

  const [folders, setFolders] = useState<BankFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([])
  const [folderStats, setFolderStats] = useState<Map<string, { questionCount: number; subfolderCount: number }>>(new Map())

  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | ''>('')
  const [browseMode, setBrowseMode] = useState<'folders' | 'all'>('folders')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)

  // Multi-folder Selected Items Map: questionId -> QuestionBankItem
  const [selectedItemsMap, setSelectedItemsMap] = useState<Map<string, QuestionBankItem>>(new Map())
  const [isImporting, setIsImporting] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  // Load folders and questions
  const loadModalData = async () => {
    try {
      setLoading(true)
      const [allFolders, crumbs, stats, fetchedQuestions] = await Promise.all([
        bankService.getFolders(),
        bankService.getFolderBreadcrumbs(currentFolderId),
        bankService.getFolderStats(),
        bankService.getQuestions({
          folderId: browseMode === 'folders' ? currentFolderId : undefined,
          includeSubfolders: browseMode === 'all',
          type: typeFilter || undefined,
          difficulty: difficultyFilter || undefined,
          searchQuery: searchQuery || undefined
        })
      ])

      setFolders(allFolders)
      setBreadcrumbs(crumbs)
      setFolderStats(stats)
      setBankItems(fetchedQuestions)
    } catch (err) {
      console.error('Failed to load bank questions for modal:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadModalData()
    }
  }, [isOpen, currentFolderId, browseMode, typeFilter, difficultyFilter, searchQuery])

  // Subfolders of current folder
  const currentSubfolders = folders.filter(f => f.parentId === currentFolderId)
  const currentFolder = folders.find(f => f.id === currentFolderId)

  // Toggle question selection
  const handleToggleSelect = (item: QuestionBankItem) => {
    setSelectedItemsMap(prev => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, item)
      }
      return next
    })
  }

  // Select all in current view
  const handleSelectAllVisible = () => {
    const allVisibleSelected = bankItems.every(item => selectedItemsMap.has(item.id))
    setSelectedItemsMap(prev => {
      const next = new Map(prev)
      if (allVisibleSelected) {
        bankItems.forEach(item => next.delete(item.id))
      } else {
        bankItems.forEach(item => next.set(item.id, item))
      }
      return next
    })
  }

  // Confirm import into target section
  const handleConfirmImport = async () => {
    const selectedList = Array.from(selectedItemsMap.values())
    if (selectedList.length === 0) return

    const convertedQuestions: Question[] = selectedList.map((item, idx) => ({
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
      diagramUrl: item.diagramUrl, // Crucial: attach photo/diagram to examination question!
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
      for (const item of selectedList) {
        await bankService.recordUsage(item.id)
      }

      setSelectedItemsMap(new Map())
      onClose()
    } catch (err) {
      console.error('Import from bank error:', err)
    } finally {
      setIsImporting(false)
    }
  }

  // Items to display: either selected only, or filtered bankItems
  const itemsToDisplay = showSelectedOnly ? Array.from(selectedItemsMap.values()) : bankItems

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question Bank Repository"
      description="Browse folders, select questions across multiple categories, and insert directly into your examination"
      maxWidth="4xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {/* Top Target Section & Selection Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Insert into Section:</span>
            <select
              value={targetSectionId}
              onChange={e => setTargetSectionId(e.target.value)}
              className="px-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            >
              {sections.map(sec => (
                <option key={sec.sectionId} value={sec.sectionId}>
                  {sec.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSelectedOnly(!showSelectedOnly)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                showSelectedOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {showSelectedOnly ? 'Show All Questions' : `View Selected Only (${selectedItemsMap.size})`}
            </button>

            {!showSelectedOnly && bankItems.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllVisible}
              >
                {bankItems.every(i => selectedItemsMap.has(i.id)) ? 'Deselect Page' : 'Select All on Page'}
              </Button>
            )}
          </div>
        </div>

        {/* Folder Hierarchy Navigator (When in folder browsing mode) */}
        {!showSelectedOnly && (
          <div className="space-y-2 p-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Breadcrumbs */}
              <div className="flex flex-wrap items-center gap-1 font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentFolderId(null)
                    setBrowseMode('folders')
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition-colors ${
                    currentFolderId === null && browseMode === 'folders'
                      ? 'bg-emerald-100 text-emerald-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All Folders</span>
                </button>

                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentFolderId(crumb.id)
                        setBrowseMode('folders')
                      }}
                      className={`px-2 py-0.5 rounded-lg transition-colors ${
                        idx === breadcrumbs.length - 1
                          ? 'bg-emerald-100 text-emerald-900 font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setBrowseMode('folders')
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    browseMode === 'folders' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  By Folder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrowseMode('all')
                    setCurrentFolderId(null)
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    browseMode === 'all' ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All Questions (Flat)
                </button>
              </div>
            </div>

            {/* Subfolders Chips (Click to open folder) */}
            {browseMode === 'folders' && currentSubfolders.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Open Subfolder:</span>
                {currentSubfolders.map(sf => {
                  const stats = folderStats.get(sf.id) || { questionCount: 0, subfolderCount: 0 }
                  return (
                    <button
                      key={sf.id}
                      type="button"
                      onClick={() => setCurrentFolderId(sf.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 rounded-xl text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
                    >
                      <Folder className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{sf.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded-full font-bold">
                        {stats.questionCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Search & Filter inputs */}
        {!showSelectedOnly && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={currentFolder ? `Search in "${currentFolder.name}"...` : "Search questions by prompt, topic or tag..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">All Question Types</option>
                <option value="mcq">MCQ</option>
                <option value="short_answer">Short Answer</option>
                <option value="long_answer">Long Answer</option>
              </select>

              <select
                value={difficultyFilter}
                onChange={e => setDifficultyFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {(searchQuery || typeFilter || difficultyFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setTypeFilter('')
                    setDifficultyFilter('')
                  }}
                  className="text-xs text-rose-600 hover:underline px-2"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs">Loading questions from bank...</p>
          </div>
        ) : itemsToDisplay.length === 0 ? (
          <div className="p-10 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              {showSelectedOnly ? 'No questions selected yet' : 'No questions found in this view'}
            </p>
            <p className="text-xs text-slate-500">
              {showSelectedOnly
                ? 'Select questions from any folder using the checkboxes, then review them here.'
                : 'Browse another folder or clear your search query.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {itemsToDisplay.map(item => {
              const isSelected = selectedItemsMap.has(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item)}
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

                    <div className="flex-1 space-y-1.5 min-w-0">
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
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {item.topic}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-900 leading-snug whitespace-pre-wrap">
                        {item.prompt}
                      </p>

                      {/* Diagram preview thumbnail */}
                      {item.diagramUrl && (
                        <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                          <img
                            src={item.diagramUrl}
                            alt="Attached diagram"
                            className="w-10 h-8 object-contain rounded border border-slate-200 bg-white cursor-pointer hover:opacity-80"
                            onClick={() => setZoomedImage(item.diagramUrl || null)}
                          />
                          <span className="text-[11px] text-slate-500 font-semibold">Diagram Attached</span>
                        </div>
                      )}

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
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <div className="text-xs font-bold text-slate-700">
            <span>
              {selectedItemsMap.size} Question{selectedItemsMap.size === 1 ? '' : 's'} Selected Across Folders
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isImporting}
              disabled={selectedItemsMap.size === 0}
              onClick={handleConfirmImport}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Import {selectedItemsMap.size} Selected Question{selectedItemsMap.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      </div>

      {/* Zoom Image Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white p-2 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={zoomedImage} alt="Diagram Zoomed" className="max-h-[85vh] w-auto object-contain rounded-xl" />
          </div>
        </div>
      )}
    </Modal>
  )
}
