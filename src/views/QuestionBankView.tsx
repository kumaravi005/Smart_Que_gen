import React, { useState, useEffect, useRef } from 'react'
import {
  Database,

  Plus,
  Search,
  Trash2,
  Folder,
  FolderPlus,
  ChevronRight,
  ArrowLeft,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  Sparkles,
  Edit3,
  MoveRight,
  X,
  ExternalLink,
  FolderTree
} from 'lucide-react'

import { bankService } from '../services/bankService'
import { syncService } from '../services/syncService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { parseBulkQuestions } from '../utils/bulkQuestionParser'
import type { QuestionBankItem, BankFolder, DifficultyLevel, QuestionType, BulkParsedQuestion } from '../types'

export const QuestionBankView: React.FC = () => {
  // Navigation & Data State
  const [folders, setFolders] = useState<BankFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([])
  const [folderStats, setFolderStats] = useState<Map<string, { questionCount: number; subfolderCount: number }>>(new Map())
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<QuestionType | ''>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | ''>('')
  const [includeSubfolders, setIncludeSubfolders] = useState(false)

  // Selection for bulk actions
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [folderNameInput, setFolderNameInput] = useState('')
  const [folderColorInput, setFolderColorInput] = useState('emerald')
  const [editingFolder, setEditingFolder] = useState<BankFolder | null>(null)
  const [isSavingFolder, setIsSavingFolder] = useState(false)

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkRawText, setBulkRawText] = useState('')
  const [bulkParsedItems, setBulkParsedItems] = useState<BulkParsedQuestion[]>([])
  const [bulkDefaultSubject, setBulkDefaultSubject] = useState('Mathematics')
  const [bulkDefaultClass, setBulkDefaultClass] = useState('Class 10th')
  const [bulkDefaultTopic, setBulkDefaultTopic] = useState('')
  const [bulkDefaultMarks, setBulkDefaultMarks] = useState<number>(1)
  const [bulkDefaultDifficulty, setBulkDefaultDifficulty] = useState<DifficultyLevel>('medium')

  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null)
  const [singlePrompt, setSinglePrompt] = useState('')
  const [singleSubject, setSingleSubject] = useState('Mathematics')
  const [singleClass, setSingleClass] = useState('Class 10th')
  const [singleTopic, setSingleTopic] = useState('')
  const [singleMarks, setSingleMarks] = useState(1)
  const [singleDifficulty, setSingleDifficulty] = useState<DifficultyLevel>('medium')
  const [singleType, setSingleType] = useState<QuestionType>('mcq')
  const [singleOptions, setSingleOptions] = useState<{ id: string; label: string; text: string; isCorrect?: boolean }[]>([
    { id: '1', label: 'A', text: '', isCorrect: true },
    { id: '2', label: 'B', text: '', isCorrect: false },
    { id: '3', label: 'C', text: '', isCorrect: false },
    { id: '4', label: 'D', text: '', isCorrect: false }
  ])
  const [singleDiagramUrl, setSingleDiagramUrl] = useState<string | null>(null)
  const [singleSolution, setSingleSolution] = useState('')

  // Move Modal
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [targetMoveFolderId, setTargetMoveFolderId] = useState<string | null>(null)

  // Image Zoom Modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load all folder and question data
  const loadData = async () => {
    try {
      setLoading(true)
      const [allFolders, crumbs, stats, fetchedQuestions] = await Promise.all([
        bankService.getFolders(),
        bankService.getFolderBreadcrumbs(currentFolderId),
        bankService.getFolderStats(),
        bankService.getQuestions({
          folderId: currentFolderId,
          includeSubfolders,
          type: selectedType || undefined,
          difficulty: selectedDifficulty || undefined,
          searchQuery: search || undefined
        })
      ])

      setFolders(allFolders)
      setBreadcrumbs(crumbs)
      setFolderStats(stats)
      setQuestions(fetchedQuestions)
      setSelectedQuestionIds(new Set())
    } catch (err) {
      console.error('Error loading bank data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsub = syncService.subscribe((state) => {
      if (state.status === 'idle') {
        loadData()
      }
    })
    return () => unsub()
  }, [currentFolderId, includeSubfolders, search, selectedType, selectedDifficulty])

  // Current subfolders
  const currentSubfolders = folders.filter(f => f.parentId === currentFolderId)
  const currentFolder = folders.find(f => f.id === currentFolderId)

  // Handle Folder Creation or Update
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderNameInput.trim() || isSavingFolder) return

    setIsSavingFolder(true)
    try {
      if (editingFolder) {
        await bankService.updateFolder(editingFolder.id, {
          name: folderNameInput.trim(),
          color: folderColorInput
        })
      } else {
        await bankService.createFolder({
          name: folderNameInput.trim(),
          parentId: currentFolderId,
          color: folderColorInput
        })
      }

      setFolderNameInput('')
      setEditingFolder(null)
      setIsFolderModalOpen(false)
      await loadData()
    } finally {
      setIsSavingFolder(false)
    }
  }

  // Handle Delete Folder
  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (window.confirm(`Delete folder "${folderName}" and all its subfolders and questions?`)) {
      await bankService.deleteFolder(folderId, true)
      if (currentFolderId === folderId) {
        setCurrentFolderId(currentFolder?.parentId || null)
      } else {
        await loadData()
      }
    }
  }

  // Handle Bulk Parse
  const handleRunBulkParse = () => {
    if (!bulkRawText.trim()) return
    const parsed = parseBulkQuestions(bulkRawText, {
      defaultMarks: bulkDefaultMarks,
      defaultDifficulty: bulkDefaultDifficulty
    })
    setBulkParsedItems(parsed)
  }

  // Handle Bulk Save
  const handleSaveBulkQuestions = async () => {
    const selected = bulkParsedItems.filter(q => q.isSelected)
    if (selected.length === 0) {
      alert('Please select at least one question to save.')
      return
    }

    const itemsToAdd = selected.map(q => ({
      prompt: q.prompt,
      type: q.type,
      subject: bulkDefaultSubject,
      className: bulkDefaultClass,
      topic: bulkDefaultTopic.trim() || 'General',
      marks: q.marks,
      difficulty: q.difficulty,
      options: q.options,
      solutionText: q.solutionText,
      hint: q.answerKey ? `Correct Option: ${q.answerKey}` : undefined,
      folderId: currentFolderId,
      tags: [bulkDefaultSubject, bulkDefaultClass, bulkDefaultTopic.trim()].filter(Boolean)
    }))

    await bankService.addQuestionsBulk(itemsToAdd)
    setIsBulkModalOpen(false)
    setBulkRawText('')
    setBulkParsedItems([])
    await loadData()
  }

  // Handle Single Question Save (Add or Edit)
  const handleSaveSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!singlePrompt.trim()) return

    const questionData = {
      prompt: singlePrompt.trim(),
      subject: singleSubject,
      className: singleClass,
      topic: singleTopic.trim() || 'General',
      marks: Number(singleMarks),
      difficulty: singleDifficulty,
      type: singleType,
      options: singleType === 'mcq' ? singleOptions : undefined,
      diagramUrl: singleDiagramUrl || undefined,
      solutionText: singleSolution.trim() || undefined,
      folderId: currentFolderId,
      tags: [singleSubject, singleClass, singleTopic.trim()].filter(Boolean)
    }

    if (editingQuestion) {
      await bankService.updateQuestion(editingQuestion.id, questionData)
    } else {
      await bankService.addQuestion(questionData)
    }

    setIsSingleModalOpen(false)
    setEditingQuestion(null)
    resetSingleForm()
    await loadData()
  }

  const resetSingleForm = () => {
    setSinglePrompt('')
    setSingleMarks(1)
    setSingleDifficulty('medium')
    setSingleType('mcq')
    setSingleDiagramUrl(null)
    setSingleSolution('')
    setSingleOptions([
      { id: '1', label: 'A', text: '', isCorrect: true },
      { id: '2', label: 'B', text: '', isCorrect: false },
      { id: '3', label: 'C', text: '', isCorrect: false },
      { id: '4', label: 'D', text: '', isCorrect: false }
    ])
  }

  // Open Edit Single Question
  const handleOpenEditQuestion = (q: QuestionBankItem) => {
    setEditingQuestion(q)
    setSinglePrompt(q.prompt)
    setSingleSubject(q.subject)
    setSingleClass(q.className)
    setSingleTopic(q.topic)
    setSingleMarks(q.marks)
    setSingleDifficulty(q.difficulty)
    setSingleType(q.type)
    setSingleDiagramUrl(q.diagramUrl || null)
    setSingleSolution(q.solutionText || '')
    if (q.options && q.options.length > 0) {
      setSingleOptions(q.options)
    } else {
      setSingleOptions([
        { id: '1', label: 'A', text: '', isCorrect: true },
        { id: '2', label: 'B', text: '', isCorrect: false },
        { id: '3', label: 'C', text: '', isCorrect: false },
        { id: '4', label: 'D', text: '', isCorrect: false }
      ])
    }
    setIsSingleModalOpen(true)
  }

  // Image Upload handler
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setSingleDiagramUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Move Questions
  const handleConfirmMove = async () => {
    if (selectedQuestionIds.size === 0) return
    await bankService.moveQuestions(Array.from(selectedQuestionIds), targetMoveFolderId)
    setIsMoveModalOpen(false)
    setSelectedQuestionIds(new Set())
    await loadData()
  }

  // Delete Single Question
  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm('Delete this question from bank?')) {
      await bankService.deleteQuestion(id)
      await loadData()
    }
  }

  // Delete Selected Questions
  const handleDeleteSelected = async () => {
    if (selectedQuestionIds.size === 0) return
    if (window.confirm(`Delete ${selectedQuestionIds.size} selected questions?`)) {
      await bankService.deleteQuestionsBulk(Array.from(selectedQuestionIds))
      setSelectedQuestionIds(new Set())
      await loadData()
    }
  }

  // Toggle selection
  const handleToggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllQuestions = () => {
    if (selectedQuestionIds.size === questions.length) {
      setSelectedQuestionIds(new Set())
    } else {
      setSelectedQuestionIds(new Set(questions.map(q => q.id)))
    }
  }

  // Pre-seed sample folders helper
  const handleSeedClass10BsebFolders = async () => {
    const root = await bankService.createFolder({ name: 'Class 10th BSEB', color: 'blue' })
    const maths = await bankService.createFolder({ name: 'Mathematics', parentId: root.id, color: 'emerald' })
    const mcq = await bankService.createFolder({ name: 'MCQ Practice', parentId: maths.id, color: 'purple' })
    await bankService.createFolder({ name: 'Short & Long Answers', parentId: maths.id, color: 'amber' })
    
    // Add sample Hindi question to MCQ folder
    await bankService.addQuestion({
      prompt: 'किसी वृत्त पर बाह्य बिन्दु से कितनी स्पर्श रेखाएँ खींची जा सकती हैं?\n(How many tangents can be drawn from an external point to a circle?)',
      type: 'mcq',
      marks: 1,
      difficulty: 'easy',
      subject: 'Mathematics',
      className: 'Class 10th',
      topic: 'Circles / वृत्त',
      folderId: mcq.id,
      options: [
        { id: 'opt_1', label: 'A', text: '1', isCorrect: false },
        { id: 'opt_2', label: 'B', text: '2', isCorrect: true },
        { id: 'opt_3', label: 'C', text: 'अनंत (Infinite)', isCorrect: false },
        { id: 'opt_4', label: 'D', text: '0', isCorrect: false }
      ],
      tags: ['Class 10th BSEB', 'Maths', 'Circle']
    })

    setCurrentFolderId(mcq.id)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Question Repository</span>
              <Badge variant="success" size="sm">Folders & Hierarchies</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Question Bank</h1>
            <p className="text-xs text-slate-500">
              Organize questions by Class, Subject, and Topic in structured folders. Bulk paste questions or attach diagrams.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FolderPlus className="w-4 h-4 text-emerald-600" />}
            onClick={() => {
              setEditingFolder(null)
              setFolderNameInput('')
              setIsFolderModalOpen(true)
            }}
          >
            New Folder
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Sparkles className="w-4 h-4 text-violet-600" />}
            onClick={() => {
              setBulkParsedItems([])
              setBulkRawText('')
              setIsBulkModalOpen(true)
            }}
          >
            Bulk Paste
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              resetSingleForm()
              setEditingQuestion(null)
              setIsSingleModalOpen(true)
            }}
          >
            Add Question
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 font-semibold">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-colors ${
              currentFolderId === null
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-emerald-600" />
            <span>Root / All Folders</span>
          </button>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={`px-2.5 py-1 rounded-xl transition-colors ${
                    isLast
                      ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            )
          })}
        </div>

        {currentFolderId && (
          <button
            onClick={() => setCurrentFolderId(currentFolder?.parentId || null)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-semibold py-1 px-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Up One Level</span>
          </button>
        )}
      </div>

      {/* Subfolders Grid Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-emerald-600" />
            <span>Folders inside {currentFolder ? `"${currentFolder.name}"` : 'Question Bank'} ({currentSubfolders.length})</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<FolderPlus className="w-3.5 h-3.5 text-emerald-600" />}
            onClick={() => {
              setEditingFolder(null)
              setFolderNameInput('')
              setIsFolderModalOpen(true)
            }}
          >
            + New Subfolder
          </Button>
        </div>

        {currentSubfolders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentSubfolders.map(f => {
              const stats = folderStats.get(f.id) || { questionCount: 0, subfolderCount: 0 }
              return (
                <div
                  key={f.id}
                  className="group bg-white p-4 rounded-2xl border-2 border-slate-200/90 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between gap-3 cursor-pointer"
                  onClick={() => setCurrentFolderId(f.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                          {f.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span>{stats.questionCount} Questions</span>
                          {stats.subfolderCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{stats.subfolderCount} Subfolders</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFolder(f)
                          setFolderNameInput(f.name)
                          setFolderColorInput(f.color || 'emerald')
                          setIsFolderModalOpen(true)
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="Rename Folder"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFolder(f.id, f.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Open Folder indicator */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold group-hover:text-emerald-800">
                    <span className="flex items-center gap-1">
                      <span>Open Folder</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentFolderId(f.id)
                        setEditingFolder(null)
                        setFolderNameInput('')
                        setIsFolderModalOpen(true)
                      }}
                      className="text-[11px] text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2 py-0.5 rounded-md border border-slate-200"
                    >
                      + Subfolder
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : currentFolderId !== null ? (
          <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 text-center space-y-2">
            <FolderPlus className="w-8 h-8 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">
              No subfolders inside "{currentFolder?.name}" yet
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create subfolders like <strong>"Maths"</strong>, <strong>"Science"</strong>, or <strong>"MCQ"</strong> to keep questions neatly organized.
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FolderPlus className="w-4 h-4" />}
              onClick={() => {
                setEditingFolder(null)
                setFolderNameInput('')
                setIsFolderModalOpen(true)
              }}
            >
              + Create Subfolder inside {currentFolder?.name}
            </Button>
          </div>
        ) : null}
      </div>


      {/* Empty State when no folders exist at root */}
      {currentFolderId === null && currentSubfolders.length === 0 && questions.length === 0 && !loading && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-10 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100">
            <FolderTree className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Your Question Bank is Fresh</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create hierarchical folders to organize your questions like <strong>Class 10th BSEB &gt; Maths &gt; MCQ</strong>, or load a pre-configured sample folder hierarchy.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FolderPlus className="w-4 h-4" />}
              onClick={() => {
                setEditingFolder(null)
                setFolderNameInput('')
                setIsFolderModalOpen(true)
              }}
            >
              Create First Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4 text-violet-600" />}
              onClick={handleSeedClass10BsebFolders}
            >
              Load Sample "Class 10th BSEB &gt; Maths &gt; MCQ"
            </Button>
          </div>
        </div>
      )}

      {/* Questions Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={currentFolder ? `Search questions in "${currentFolder.name}"...` : "Search questions by prompt or topic..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as QuestionType | '')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Question Types</option>
            <option value="mcq">MCQ</option>
            <option value="short_answer">Short Answer</option>
            <option value="long_answer">Long Answer</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value as DifficultyLevel | '')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {currentFolderId && (
            <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={includeSubfolders}
                onChange={e => setIncludeSubfolders(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded"
              />
              <span>Include Subfolders</span>
            </label>
          )}
        </div>
      </div>

      {/* Selected Action Bar */}
      {selectedQuestionIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{selectedQuestionIds.size} Questions Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MoveRight className="w-3.5 h-3.5" />}
              onClick={() => {
                setTargetMoveFolderId(currentFolderId)
                setIsMoveModalOpen(true)
              }}
            >
              Move to Folder
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={questions.length > 0 && selectedQuestionIds.size === questions.length}
              onChange={handleSelectAllQuestions}
              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
            />
            <span>
              {currentFolder ? `Questions in "${currentFolder.name}"` : 'All Unfiled / Root Questions'} ({questions.length})
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading questions from bank...</div>
        ) : questions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Database className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No questions found in this folder</p>
            <p className="text-xs text-slate-400">Click "+ Add Question" or "Bulk Paste" to add questions to this folder.</p>
          </div>
        ) : (
          questions.map((item, idx) => {
            const isChecked = selectedQuestionIds.has(item.id)
            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 transition-colors space-y-3 ${
                  isChecked ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectQuestion(item.id)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer mt-1"
                    />

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <Badge variant={item.type === 'mcq' ? 'purple' : 'info'} size="sm">
                          {item.type.toUpperCase()}
                        </Badge>
                        <Badge variant={item.difficulty === 'hard' ? 'warning' : 'success'} size="sm">
                          {item.difficulty.toUpperCase()}
                        </Badge>
                        <Badge variant="primary" size="sm">{item.marks} Mark{item.marks > 1 ? 's' : ''}</Badge>
                        {item.topic && (
                          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                            Topic: {item.topic}
                          </span>
                        )}
                      </div>

                      {/* Prompt */}
                      <p className="text-sm font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                        {item.prompt}
                      </p>

                      {/* Attached Diagram / Image Preview */}
                      {item.diagramUrl && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setZoomedImage(item.diagramUrl || null)}
                            className="inline-flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition-colors group"
                          >
                            <img
                              src={item.diagramUrl}
                              alt="Diagram"
                              className="w-12 h-10 object-contain rounded border border-slate-200 bg-white"
                            />
                            <span className="font-semibold text-slate-600 group-hover:text-emerald-700">
                              View Attached Diagram
                            </span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                          </button>
                        </div>
                      )}

                      {/* MCQ Options Display */}
                      {item.type === 'mcq' && item.options && item.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {item.options.map(opt => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border ${
                                opt.isCorrect
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full flex items-center justify-center bg-white text-[11px] font-bold border border-slate-300">
                                {opt.label}
                              </span>
                              <span className="flex-1">{opt.text}</span>
                              {opt.isCorrect && (
                                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Solution or Answer Key */}
                      {item.solutionText && (
                        <div className="text-xs text-slate-600 bg-amber-50/60 border border-amber-200/80 p-2.5 rounded-xl">
                          <strong className="text-amber-900">Explanation / Solution:</strong> {item.solutionText}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditQuestion(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      title="Edit Question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* --- MODAL 1: Create or Rename Folder --- */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title={editingFolder ? 'Rename Folder' : `Create New Folder inside ${currentFolder ? currentFolder.name : 'Root'}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveFolder} className="space-y-4">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center gap-2 text-slate-700">
            <FolderTree className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>Target Location:</strong> {currentFolder ? `Inside "${currentFolder.name}"` : 'Top-Level (Root of Question Bank)'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Folder Name</label>
            <input
              type="text"
              placeholder={currentFolder ? "e.g. Maths, Science, MCQ, Chapter 1..." : "e.g. Class 10th BSEB, Class 9th..."}
              value={folderNameInput}
              onChange={e => setFolderNameInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-emerald-500"
              required
              autoFocus
            />
          </div>


          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Folder Accent Color</label>
            <div className="flex items-center gap-2">
              {['emerald', 'blue', 'purple', 'amber', 'rose'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFolderColorInput(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    c === 'emerald' ? 'bg-emerald-500' :
                    c === 'blue' ? 'bg-blue-500' :
                    c === 'purple' ? 'bg-purple-500' :
                    c === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                  } ${folderColorInput === c ? 'scale-110 border-slate-900 ring-2 ring-emerald-200' : 'border-white'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingFolder || !folderNameInput.trim()}
            >
              {isSavingFolder ? 'Saving...' : (editingFolder ? 'Update Folder' : 'Create Folder')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: Bulk Paste Questions --- */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={`Bulk Paste Questions into ${currentFolder ? currentFolder.name : 'Question Bank'}`}
        maxWidth="3xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
          {/* Metadata defaults */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Subject</label>
              <input
                type="text"
                value={bulkDefaultSubject}
                onChange={e => setBulkDefaultSubject(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Class</label>
              <input
                type="text"
                value={bulkDefaultClass}
                onChange={e => setBulkDefaultClass(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Topic</label>
              <input
                type="text"
                placeholder="e.g. Real Numbers"
                value={bulkDefaultTopic}
                onChange={e => setBulkDefaultTopic(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Default Marks</label>
              <input
                type="number"
                min={1}
                max={20}
                value={bulkDefaultMarks}
                onChange={e => setBulkDefaultMarks(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Difficulty</label>
              <select
                value={bulkDefaultDifficulty}
                onChange={e => setBulkDefaultDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>


          {/* Textarea for pasting */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Paste Question Text Here:</span>
              <button
                type="button"
                onClick={() => {
                  setBulkRawText(`1. किसी वृत्त पर बाह्य बिन्दु से कितनी स्पर्श रेखाएँ खींची जा सकती हैं?
(A) 1 (B) 2 (C) अनंत (Infinite) (D) 0
Ans: B

2. State Ohm's Law and write its formula. [2 Marks]

3. Which of the following is an irrational number?
(A) sqrt(4) (B) sqrt(9) (C) sqrt(3) (D) 0.25
Ans: C`)
                }}
                className="text-violet-600 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Load Sample Exam Text
              </button>
            </div>
            <textarea
              rows={7}
              placeholder="Paste questions here... e.g.&#10;1. Question prompt here?&#10;(A) Option 1 (B) Option 2 (C) Option 3 (D) Option 4&#10;Ans: (B)&#10;&#10;2. Define Photosynthesis [2 Marks]"
              value={bulkRawText}
              onChange={e => setBulkRawText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono leading-relaxed text-slate-900 focus:bg-white focus:outline-emerald-500"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunBulkParse}
              leftIcon={<Sparkles className="w-4 h-4 text-violet-600" />}
            >
              Recognize &amp; Structure Questions
            </Button>
          </div>

          {/* Parsed Preview List */}
          {bulkParsedItems.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Recognized Questions ({bulkParsedItems.length})</span>
                <span className="text-slate-500">
                  {bulkParsedItems.filter(q => q.isSelected).length} of {bulkParsedItems.length} selected for saving
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {bulkParsedItems.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-2xl border text-xs space-y-2 transition-all ${
                      q.isSelected ? 'bg-white border-emerald-300 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={q.isSelected}
                          onChange={e => {
                            const updated = [...bulkParsedItems]
                            updated[idx] = { ...q, isSelected: e.target.checked }
                            setBulkParsedItems(updated)
                          }}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="font-bold text-slate-900">Question #{idx + 1}</span>
                        <Badge variant={q.type === 'mcq' ? 'purple' : 'info'} size="sm">
                          {q.type.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-600">Marks:</span>
                        <input
                          type="number"
                          value={q.marks}
                          onChange={e => {
                            const updated = [...bulkParsedItems]
                            updated[idx] = { ...q, marks: Number(e.target.value) }
                            setBulkParsedItems(updated)
                          }}
                          className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center text-xs font-bold"
                        />
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={e => {
                        const updated = [...bulkParsedItems]
                        updated[idx] = { ...q, prompt: e.target.value }
                        setBulkParsedItems(updated)
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                    />

                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] ${
                              opt.isCorrect ? 'bg-emerald-50 border-emerald-300 font-bold' : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className="font-bold w-4 text-center">({opt.label})</span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const newOpts = [...(q.options || [])]
                                newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value }
                                const updated = [...bulkParsedItems]
                                updated[idx] = { ...q, options: newOpts }
                                setBulkParsedItems(updated)
                              }}
                              className="flex-1 bg-transparent focus:outline-none text-slate-900"
                            />
                            <input
                              type="radio"
                              name={`bulk_correct_${q.id}`}
                              checked={opt.isCorrect || false}
                              onChange={() => {
                                const newOpts = (q.options || []).map((o, i) => ({ ...o, isCorrect: i === optIdx }))
                                const updated = [...bulkParsedItems]
                                updated[idx] = { ...q, options: newOpts }
                                setBulkParsedItems(updated)
                              }}
                              title="Mark as correct"
                              className="cursor-pointer"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={bulkParsedItems.filter(q => q.isSelected).length === 0}
              onClick={handleSaveBulkQuestions}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Save {bulkParsedItems.filter(q => q.isSelected).length} Questions to Folder
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 3: Add / Edit Single Question (With Attached Photo/Diagram) --- */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title={editingQuestion ? 'Edit Question' : `Add Question to ${currentFolder ? currentFolder.name : 'Question Bank'}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSingleQuestion} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject</label>
              <input
                type="text"
                value={singleSubject}
                onChange={e => setSingleSubject(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Class</label>
              <input
                type="text"
                value={singleClass}
                onChange={e => setSingleClass(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Topic</label>
              <input
                type="text"
                placeholder="e.g. Geometry"
                value={singleTopic}
                onChange={e => setSingleTopic(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marks</label>
              <input
                type="number"
                min={1}
                max={20}
                value={singleMarks}
                onChange={e => setSingleMarks(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Question Type</label>
              <select
                value={singleType}
                onChange={e => setSingleType(e.target.value as QuestionType)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="short_answer">Short Answer</option>
                <option value="long_answer">Long Answer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Difficulty</label>
              <select
                value={singleDifficulty}
                onChange={e => setSingleDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Question Statement / Prompt</label>
            <textarea
              rows={3}
              value={singlePrompt}
              onChange={e => setSinglePrompt(e.target.value)}
              placeholder="Enter question statement here (supports Hindi or English)..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-emerald-500 font-sans"
              required
            />
          </div>

          {/* Diagram / Photo Attachment */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Attach Question Diagram or Photo:</span>
              </span>
              {singleDiagramUrl && (
                <button
                  type="button"
                  onClick={() => setSingleDiagramUrl(null)}
                  className="text-rose-600 hover:underline text-xs"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {singleDiagramUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={singleDiagramUrl}
                  alt="Preview"
                  className="h-20 w-auto object-contain rounded-xl border border-slate-200 bg-white"
                />
                <span className="text-xs text-emerald-700 font-semibold">Photo Attached Successfully!</span>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<ImageIcon className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Photo / Diagram
                </Button>
                <span className="text-[11px] text-slate-400 ml-2">PNG, JPG, or screenshot supported</span>
              </div>
            )}
          </div>

          {/* MCQ Options */}
          {singleType === 'mcq' && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase">
                MCQ Options (Select Radio for Correct Answer):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {singleOptions.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs ${
                      opt.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="font-bold w-5 text-center text-slate-700">({opt.label})</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => {
                        const newOpts = [...singleOptions]
                        newOpts[idx] = { ...newOpts[idx], text: e.target.value }
                        setSingleOptions(newOpts)
                      }}
                      placeholder={`Option ${opt.label} text`}
                      className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none"
                      required
                    />
                    <input
                      type="radio"
                      name="single_correct_option"
                      checked={opt.isCorrect || false}
                      onChange={() => {
                        const newOpts = singleOptions.map((o, i) => ({ ...o, isCorrect: i === idx }))
                        setSingleOptions(newOpts)
                      }}
                      title="Mark as correct answer"
                      className="cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Solution / Explanation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Solution / Explanation / Hint (Optional)
            </label>
            <textarea
              rows={2}
              value={singleSolution}
              onChange={e => setSingleSolution(e.target.value)}
              placeholder="Explanation or step-by-step solution..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsSingleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingQuestion ? 'Update Question' : 'Save to Bank'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 4: Move Questions to another folder --- */}
      <Modal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        title={`Move ${selectedQuestionIds.size} Questions to Folder`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select destination folder for the selected questions:
          </p>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => setTargetMoveFolderId(null)}
              className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                targetMoveFolderId === null
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FolderTree className="w-4 h-4 text-emerald-600" />
              <span>Root (Unfiled Questions)</span>
            </button>

            {folders.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTargetMoveFolderId(f.id)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                  targetMoveFolderId === f.id
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Folder className="w-4 h-4 text-emerald-600" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsMoveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleConfirmMove}>
              Confirm Move
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 5: Image Zoom --- */}
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
    </div>
  )
}
