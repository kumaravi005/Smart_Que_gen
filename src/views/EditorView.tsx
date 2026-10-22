import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  FileEdit,
  Plus,
  Eye,
  CheckCircle2,
  Wand2,
  FileSpreadsheet,
  BookOpen,
  HelpCircle
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { QuestionCard } from '../components/editor/QuestionCard'
import { QuestionFormModal } from '../components/editor/QuestionFormModal'
import { BulkImportModal } from '../components/editor/BulkImportModal'
import { QuestionBankModal } from '../components/editor/QuestionBankModal'
import { SectionSummaryBar } from '../components/editor/SectionSummaryBar'
import { bankService } from '../services/bankService'
import { paperService } from '../services/paperService'
import { getDisplayQuestionNumber, recalculateOrderNumbers } from '../utils/numbering'
import { generateId } from '../utils/id'
import type { Question, SectionContent, QuestionBankItem } from '../types'

export const EditorView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers, loading: papersLoading } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading: paperLoading, saveContent } = usePaperDetails(paperId)

  // Synchronize paperId to URL if missing
  useEffect(() => {
    if (!searchParams.get('paperId') && papers.length > 0) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('paperId', papers[0].id)
        return next
      }, { replace: true })
    }
  }, [papers, searchParams, setSearchParams])

  const [activeSectionId, setActiveSectionId] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<string>('Saved to IndexedDB')

  // Modals state
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Ensure content sections are populated from settings if paper content sections are empty
  useEffect(() => {
    if (!paper) return
    const currentSections = paper.content?.sections || []
    const settingSections = paper.settings?.sections || []

    if (currentSections.length === 0 && settingSections.length > 0) {
      const initializedSections: SectionContent[] = settingSections
        .filter(s => s.enabled ?? true)
        .map(s => ({
          sectionId: s.id,
          title: s.title,
          instructions: s.instructions,
          questions: []
        }))

      saveContent({
        ...paper.content,
        sections: initializedSections
      })
    }
  }, [paper, saveContent])

  const sections: SectionContent[] = paper?.content?.sections || []

  // Ensure an active section is selected
  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].sectionId)
    } else if (sections.length > 0 && !sections.some(s => s.sectionId === activeSectionId)) {
      setActiveSectionId(sections[0].sectionId)
    }
  }, [sections, activeSectionId])

  const currentSection =
    sections.find(s => s.sectionId === activeSectionId) || sections[0]
  const currentSectionConfig =
    paper?.settings?.sections?.find(s => s.id === currentSection?.sectionId)

  // Persistence wrapper with feedback
  const persistSections = useCallback(
    async (updatedSections: SectionContent[]) => {
      if (!paper) return
      try {
        setSaveStatus('Saving...')
        const recalculated = recalculateOrderNumbers(updatedSections)
        await saveContent({
          ...paper.content,
          sections: recalculated
        })
        setSaveStatus('All changes saved to IndexedDB')
        setTimeout(() => setSaveStatus('Saved to IndexedDB'), 2000)
      } catch (err) {
        console.error('Failed to save questions:', err)
        setSaveStatus('Save error')
      }
    },
    [paper, saveContent]
  )

  // 1. Add or Update single question
  const handleSaveQuestion = async (savedQuestion: Question, targetSectionId: string) => {
    if (!paper) return

    const sourceSectionId = savedQuestion.sectionId || targetSectionId
    let updatedSections = sections.map(sec => {
      // If updating within the same section
      if (sec.sectionId === targetSectionId && targetSectionId === sourceSectionId) {
        const exists = sec.questions.some(q => q.id === savedQuestion.id)
        if (exists) {
          return {
            ...sec,
            questions: sec.questions.map(q => (q.id === savedQuestion.id ? savedQuestion : q))
          }
        }
        return {
          ...sec,
          questions: [...sec.questions, savedQuestion]
        }
      }

      // If moving from another section during edit
      if (sec.sectionId === sourceSectionId && targetSectionId !== sourceSectionId) {
        return {
          ...sec,
          questions: sec.questions.filter(q => q.id !== savedQuestion.id)
        }
      }

      if (sec.sectionId === targetSectionId && targetSectionId !== sourceSectionId) {
        return {
          ...sec,
          questions: [...sec.questions, { ...savedQuestion, sectionId: targetSectionId }]
        }
      }

      return sec
    })

    // If target section didn't exist in content, create it
    if (!updatedSections.some(s => s.sectionId === targetSectionId)) {
      const secConf = paper.settings.sections.find(s => s.id === targetSectionId)
      updatedSections.push({
        sectionId: targetSectionId,
        title: secConf?.title || 'Section',
        instructions: secConf?.instructions,
        questions: [{ ...savedQuestion, sectionId: targetSectionId }]
      })
    }

    await persistSections(updatedSections)
    showToast('Question saved successfully!')
  }

  // 2. Delete question
  const handleDeleteQuestion = async (qId: string) => {
    if (!paper || !currentSection) return
    const updated = sections.map(sec => {
      if (sec.sectionId === currentSection.sectionId) {
        return {
          ...sec,
          questions: sec.questions.filter(q => q.id !== qId)
        }
      }
      return sec
    })
    await persistSections(updated)
    showToast('Question removed.')
  }

  // 3. Duplicate question
  const handleDuplicateQuestion = async (q: Question) => {
    if (!paper || !currentSection) return
    const cloned: Question = {
      ...q,
      id: generateId('q'),
      prompt: `${q.prompt} (Copy)`,
      options: q.options?.map(opt => ({ ...opt, id: generateId('opt') }))
    }

    const updated = sections.map(sec => {
      if (sec.sectionId === currentSection.sectionId) {
        const idx = sec.questions.findIndex(item => item.id === q.id)
        const newQs = [...sec.questions]
        newQs.splice(idx + 1, 0, cloned)
        return {
          ...sec,
          questions: newQs
        }
      }
      return sec
    })
    await persistSections(updated)
    showToast('Question duplicated.')
  }

  // 4. Move Question Up / Down
  const handleMoveQuestion = async (qId: string, direction: 'up' | 'down') => {
    if (!paper || !currentSection) return
    const qList = [...currentSection.questions]
    const index = qList.findIndex(q => q.id === qId)
    if (index === -1) return

    if (direction === 'up' && index > 0) {
      const temp = qList[index]
      qList[index] = qList[index - 1]
      qList[index - 1] = temp
    } else if (direction === 'down' && index < qList.length - 1) {
      const temp = qList[index]
      qList[index] = qList[index + 1]
      qList[index + 1] = temp
    }

    const updated = sections.map(sec =>
      sec.sectionId === currentSection.sectionId ? { ...sec, questions: qList } : sec
    )
    await persistSections(updated)
  }

  // 5. Move Question to another section
  const handleMoveToSection = async (qId: string, targetSectionId: string) => {
    if (!paper || !currentSection || currentSection.sectionId === targetSectionId) return
    const targetQ = currentSection.questions.find(q => q.id === qId)
    if (!targetQ) return

    const updated = sections.map(sec => {
      if (sec.sectionId === currentSection.sectionId) {
        return { ...sec, questions: sec.questions.filter(q => q.id !== qId) }
      }
      if (sec.sectionId === targetSectionId) {
        return { ...sec, questions: [...sec.questions, { ...targetQ, sectionId: targetSectionId }] }
      }
      return sec
    })
    await persistSections(updated)
    showToast('Question moved to new section.')
  }

  // 6. Bulk Import questions
  const handleBulkImport = async (newQuestions: Question[], targetSectionId: string) => {
    if (!paper) return
    const updated = sections.map(sec => {
      if (sec.sectionId === targetSectionId) {
        return {
          ...sec,
          questions: [...sec.questions, ...newQuestions]
        }
      }
      return sec
    })
    await persistSections(updated)
    showToast(`Imported ${newQuestions.length} questions successfully!`)
  }

  // 7. Save question to Question Bank
  const handleSaveToBank = async (q: Question) => {
    if (!paper) return
    try {
      const item: Omit<QuestionBankItem, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
        prompt: q.prompt,
        type: q.type,
        subject: paper.settings.subject,
        className: paper.settings.className,
        topic: q.topic || 'General',
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        marks: q.marks,
        options: q.options,
        matchPairs: q.matchPairs,
        solutionText: q.explanation || q.solutionText,
        hint: q.hint,
        tags: [paper.settings.subject, paper.settings.className, q.topic || ''].filter(Boolean)
      }
      await bankService.addQuestion(item)
      showToast('Saved to Question Bank for future exams!')
    } catch (err) {
      console.error('Failed to save to bank:', err)
      showToast('Error saving to bank.')
    }
  }

  // Calculate global question indexing for continuous numbering
  const getGlobalIndex = (sectionId: string, questionIndexInSection: number): number => {
    let count = 0
    for (const sec of sections) {
      if (sec.sectionId === sectionId) {
        return count + questionIndexInSection
      }
      count += sec.questions?.length || 0
    }
    return questionIndexInSection
  }

  if (papersLoading || (paperId && paperLoading)) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="font-bold text-slate-800 text-base">Loading Question Editor...</h3>
        <p className="text-xs text-slate-400">Loading exam questions and layout settings from IndexedDB</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <FileEdit className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500">
          Create a new examination or select an existing draft to start entering questions.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            onClick={async () => {
              const created = await paperService.createNewPaper({
                subject: 'Mathematics',
                className: 'Class X',
                examName: 'Mid-Term Examination 2026'
              })
              setSearchParams({ paperId: created.metadata.id })
            }}
          >
            Create First Question Paper
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner and Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
            <FileEdit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Module 2
              </span>
              <Badge variant="info" size="sm">
                {paper.settings.className} • {paper.settings.subject}
              </Badge>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {saveStatus}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {paper.metadata.title}
            </h1>
            <p className="text-xs text-slate-500">
              {paper.settings.examName} • {paper.settings.totalMarks} Marks • {paper.settings.durationMinutes} Mins
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/wizard?paperId=${paper.metadata.id}`)}
            leftIcon={<Wand2 className="w-4 h-4 text-blue-600" />}
          >
            Setup Wizard
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/preview?paperId=${paper.metadata.id}`)}
            leftIcon={<Eye className="w-4 h-4 text-purple-600" />}
          >
            Live Preview
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingQuestion(null)
              setIsQuestionModalOpen(true)
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Question
          </Button>
        </div>
      </div>

      {/* Secondary Fast Tools: Bulk Input & Question Bank */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setIsBulkModalOpen(true)}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl text-left hover:border-blue-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white text-blue-600 shadow-2xs group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">
                Bulk Text Input & Parser
              </span>
              <span className="text-xs text-slate-500">
                Paste whole exams or multiple questions at once
              </span>
            </div>
          </div>
          <Badge variant="info" size="sm">Fast Paste</Badge>
        </button>

        <button
          type="button"
          onClick={() => setIsBankModalOpen(true)}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 rounded-2xl text-left hover:border-purple-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white text-purple-600 shadow-2xs group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">
                Question Bank Repository
              </span>
              <span className="text-xs text-slate-500">
                Browse, search, and reuse curated questions
              </span>
            </div>
          </div>
          <Badge variant="purple" size="sm">Reuse Bank</Badge>
        </button>
      </div>

      {/* Sections Selector Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Examination Sections:
          </span>
          <span className="text-xs text-slate-400">
            {sections.length} Sections Configured
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {sections.map(sec => {
            const isSelected = (currentSection?.sectionId || '') === sec.sectionId
            const secConf = paper.settings.sections.find(s => s.id === sec.sectionId)
            const count = sec.questions?.length || 0
            const expected = secConf?.totalQuestions ?? 0
            const secMarks = (sec.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0)

            return (
              <button
                key={sec.sectionId}
                type="button"
                onClick={() => setActiveSectionId(sec.sectionId)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{sec.title.split(':')[0]}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}{expected ? `/${expected}` : ''} Qs ({secMarks}M)
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Section Summary & Wizard Integration Metric */}
      {currentSection && (
        <SectionSummaryBar
          settings={paper.settings}
          currentSection={currentSection}
          sectionConfig={currentSectionConfig}
          allSections={sections}
          onOpenWizard={() => navigate(`/wizard?paperId=${paper.metadata.id}&step=2`)}
        />
      )}

      {/* Questions List for Current Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-base">
              Questions in {currentSection?.title?.split(':')[0]}
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              ({currentSection?.questions?.length || 0} entered)
            </span>
          </div>

          {currentSection?.questions && currentSection.questions.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingQuestion(null)
                setIsQuestionModalOpen(true)
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Question
            </Button>
          )}
        </div>

        {(!currentSection?.questions || currentSection.questions.length === 0) ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-10 text-center space-y-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">
                No questions entered in {currentSection?.title?.split(':')[0]} yet
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Add structured questions one-by-one, paste a block of text via Bulk Input, or import verified items from your Question Bank.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingQuestion(null)
                  setIsQuestionModalOpen(true)
                }}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add First Question
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBulkModalOpen(true)}
                leftIcon={<FileSpreadsheet className="w-4 h-4 text-blue-600" />}
              >
                Paste Bulk Text
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBankModalOpen(true)}
                leftIcon={<BookOpen className="w-4 h-4 text-purple-600" />}
              >
                Import from Bank
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {currentSection.questions.map((q, idx) => {
              const globalIndex = getGlobalIndex(currentSection.sectionId, idx)
              const displayNumber = getDisplayQuestionNumber({
                globalIndex,
                sectionIndex: sections.findIndex(s => s.sectionId === currentSection.sectionId),
                questionIndexInSection: idx,
                style: currentSectionConfig?.numberingStyle || 'continuous',
                customNumber: q.customNumber
              })

              return (
                <QuestionCard
                  key={q.id}
                  question={q}
                  displayNumber={displayNumber}
                  isFirst={idx === 0}
                  isLast={idx === currentSection.questions.length - 1}
                  sections={sections}
                  currentSectionId={currentSection.sectionId}
                  layout={paper.layout}
                  onEdit={questionToEdit => {
                    setEditingQuestion(questionToEdit)
                    setIsQuestionModalOpen(true)
                  }}
                  onDelete={handleDeleteQuestion}
                  onDuplicate={handleDuplicateQuestion}
                  onMoveUp={qId => handleMoveQuestion(qId, 'up')}
                  onMoveDown={qId => handleMoveQuestion(qId, 'down')}
                  onMoveToSection={handleMoveToSection}
                  onSaveToBank={handleSaveToBank}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Mobile Sticky Quick Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden flex items-center justify-around z-30 shadow-lg">
        <button
          type="button"
          onClick={() => {
            setEditingQuestion(null)
            setIsQuestionModalOpen(true)
          }}
          className="flex flex-col items-center gap-1 text-blue-600 font-semibold text-xs"
        >
          <Plus className="w-5 h-5" />
          <span>Add Q</span>
        </button>
        <button
          type="button"
          onClick={() => setIsBulkModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-700 font-semibold text-xs"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Bulk Text</span>
        </button>
        <button
          type="button"
          onClick={() => setIsBankModalOpen(true)}
          className="flex flex-col items-center gap-1 text-purple-600 font-semibold text-xs"
        >
          <BookOpen className="w-5 h-5" />
          <span>Bank</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(`/preview?paperId=${paper.metadata.id}`)}
          className="flex flex-col items-center gap-1 text-slate-700 font-semibold text-xs"
        >
          <Eye className="w-5 h-5" />
          <span>Preview</span>
        </button>
      </div>

      {/* 1. Single Question Add/Edit Modal */}
      {isQuestionModalOpen && (
        <QuestionFormModal
          isOpen={isQuestionModalOpen}
          onClose={() => {
            setIsQuestionModalOpen(false)
            setEditingQuestion(null)
          }}
          onSave={handleSaveQuestion}
          initialQuestion={editingQuestion}
          currentSectionId={currentSection?.sectionId || ''}
          sections={sections}
          defaultMarks={currentSectionConfig?.marksPerQuestion || 1}
        />
      )}

      {/* 2. Bulk Text Import Modal */}
      {isBulkModalOpen && (
        <BulkImportModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onImport={handleBulkImport}
          sections={sections}
          currentSectionId={currentSection?.sectionId || ''}
          defaultMarks={currentSectionConfig?.marksPerQuestion || 1}
        />
      )}

      {/* 3. Question Bank Modal */}
      {isBankModalOpen && (
        <QuestionBankModal
          isOpen={isBankModalOpen}
          onClose={() => setIsBankModalOpen(false)}
          onImport={handleBulkImport}
          sections={sections}
          currentSectionId={currentSection?.sectionId || ''}
          defaultSubject={paper.settings.subject}
          defaultClass={paper.settings.className}
        />
      )}
    </div>
  )
}
