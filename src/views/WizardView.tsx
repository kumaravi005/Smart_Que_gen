import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Wand2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { paperService } from '../services/paperService'
import { templateService } from '../services/templateService'
import { Button } from '../components/common/Button'
import { WorkflowStepper } from '../components/common/WorkflowStepper'
import { WizardStepper, WIZARD_STEPS } from '../components/wizard/WizardStepper'
import { Step1ExamDetails } from '../components/wizard/Step1ExamDetails'
import { Step2QuestionCounts } from '../components/wizard/Step2QuestionCounts'
import { Step3PageSettings } from '../components/wizard/Step3PageSettings'
import { Step4Instructions } from '../components/wizard/Step4Instructions'
import { Step5HeaderFooter } from '../components/wizard/Step5HeaderFooter'
import { Step6McqLayout } from '../components/wizard/Step6McqLayout'
import { Step7Review } from '../components/wizard/Step7Review'
import { DeleteTemplateConfirmationModal } from '../components/common/DeleteTemplateConfirmationModal'
import { validateStep1, validateStep2, validateStep3 } from '../utils/wizardValidation'
import type { ExamSettings, VisualLayout, PaperSetupTemplate } from '../types'

export const WizardView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers, loading: papersLoading, refresh: refreshPapers } = usePapers()

  // Track active paper ID from URL query or fallback to first paper
  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const stepParam = searchParams.get('step')
  const initialStep = stepParam ? Math.min(7, Math.max(1, parseInt(stepParam, 10))) : 1

  // Automatically synchronize paperId in URL if paper exists but search param is missing
  useEffect(() => {
    if (!searchParams.get('paperId') && papers.length > 0) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('paperId', papers[0].id)
        return next
      }, { replace: true })
    }
  }, [papers, searchParams, setSearchParams])

  const [currentStep, setCurrentStep] = useState<number>(initialStep)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [stepWarnings, setStepWarnings] = useState<string[]>([])
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved locally')
  const [templates, setTemplates] = useState<PaperSetupTemplate[]>([])
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<PaperSetupTemplate | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false)

  const { paper, loading, refresh: refreshDetails } = usePaperDetails(paperId)

  // Local editable copies for smooth user input without lag
  const [localSettings, setLocalSettings] = useState<ExamSettings | null>(null)
  const [localLayout, setLocalLayout] = useState<VisualLayout | null>(null)

  // Sync with paper details once loaded
  useEffect(() => {
    if (paper) {
      setLocalSettings(paper.settings)
      setLocalLayout(paper.layout)
    }
  }, [paper])

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const list = await templateService.getAllTemplates()
        setTemplates(list)
      } catch (err) {
        console.error('Failed to load templates:', err)
      }
    }
    loadTemplates()
  }, [])

  // Auto-save helper to persist progress directly to IndexedDB
  const persistChanges = useCallback(
    async (newSettings?: ExamSettings, newLayout?: VisualLayout) => {
      if (!paper) return
      try {
        setIsAutoSaving(true)
        setAutoSaveStatus('Saving...')

        if (newSettings) {
          await paperService.updateExamSettings(newSettings)
        }
        if (newLayout) {
          await paperService.updateVisualLayout(newLayout)
        }

        setAutoSaveStatus('All changes saved to IndexedDB')
        setTimeout(() => setAutoSaveStatus('Saved locally'), 2000)
      } catch (err) {
        console.error('Auto-save error:', err)
        setAutoSaveStatus('Save error')
      } finally {
        setIsAutoSaving(false)
      }
    },
    [paper]
  )

  // Handler for setting changes
  const handleSettingsChange = (updates: Partial<ExamSettings>) => {
    if (!localSettings) return
    const updated = { ...localSettings, ...updates }
    setLocalSettings(updated)
    // Clear errors for touched fields
    setStepErrors({})
    persistChanges(updated, undefined)
  }

  // Handler for layout changes
  const handleLayoutChange = (updates: Partial<VisualLayout>) => {
    if (!localLayout) return
    const updated = { ...localLayout, ...updates }
    setLocalLayout(updated)
    setStepErrors({})
    persistChanges(undefined, updated)
  }

  // Step Validation before advancing
  const validateCurrentStep = (step: number): boolean => {
    if (!localSettings || !localLayout) return true

    if (step === 1) {
      const res = validateStep1(localSettings)
      setStepErrors(res.errors)
      setStepWarnings(res.warnings)
      return res.isValid
    }
    if (step === 2) {
      const res = validateStep2(localSettings)
      setStepErrors(res.errors)
      setStepWarnings(res.warnings)
      return res.isValid
    }
    if (step === 3) {
      const res = validateStep3(localLayout)
      setStepErrors(res.errors)
      setStepWarnings(res.warnings)
      return res.isValid
    }

    setStepErrors({})
    setStepWarnings([])
    return true
  }

  // Navigation handlers
  const handleNextStep = async () => {
    const isValid = validateCurrentStep(currentStep)
    if (!isValid) return

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }

    if (localSettings && localLayout) {
      await persistChanges(localSettings, localLayout)
    }

    if (currentStep < 7) {
      const next = currentStep + 1
      setCurrentStep(next)
      setSearchParams({ paperId: paper?.metadata.id || paperId, step: next.toString() })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1
      setCurrentStep(prev)
      setSearchParams({ paperId: paper?.metadata.id || paperId, step: prev.toString() })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
  }

  const handleSelectStep = (targetStep: number) => {
    // If navigating forward, validate
    if (targetStep > currentStep) {
      const isValid = validateCurrentStep(currentStep)
      if (!isValid) return
    }
    setCurrentStep(targetStep)
    setSearchParams({ paperId: paper?.metadata.id || paperId, step: targetStep.toString() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Duplicate setup
  const handleDuplicateSetup = async () => {
    if (!paper) return
    try {
      const copy = await paperService.duplicatePaper(paper.metadata.id)
      if (copy) {
        await refreshPapers()
        navigate(`/wizard?paperId=${copy.metadata.id}&step=1`)
        alert(`Setup duplicated successfully as "${copy.metadata.title}".`)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to duplicate setup.')
    }
  }

  // Apply template
  const handleApplyTemplate = async (template: PaperSetupTemplate) => {
    if (!paper) return
    try {
      await paperService.applyTemplate(paper.metadata.id, template)
      await refreshDetails()
      setShowTemplatesModal(false)
      alert(`Applied template "${template.name}".`)
    } catch (err) {
      console.error(err)
      alert('Failed to apply template.')
    }
  }

  // Confirm delete template
  const handleConfirmDeleteTemplate = async (template: PaperSetupTemplate) => {
    try {
      setIsDeletingTemplate(true)
      await templateService.deleteTemplate(template.id)
      const list = await templateService.getAllTemplates()
      setTemplates(list)
      setTemplateToDelete(null)
    } catch (err) {
      console.error('Failed to delete template:', err)
      alert('Could not delete template. Please try again.')
    } finally {
      setIsDeletingTemplate(false)
    }
  }

  // Final confirmation to proceed to question editor
  const handleConfirmProceed = async () => {
    if (!paper || !localSettings || !localLayout) return
    try {
      // Mark paper as configured
      const updatedMeta = { ...paper.metadata, status: 'in_progress' as const }
      await paperService.updateMetadata(updatedMeta)
      await persistChanges(localSettings, localLayout)
      navigate(`/editor?paperId=${paper.metadata.id}`)
    } catch (err) {
      console.error(err)
      navigate(`/editor?paperId=${paper.metadata.id}`)
    }
  }

  if (papersLoading || (paperId && loading)) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="font-bold text-slate-800 text-base">Loading Paper Setup Wizard...</h3>
        <p className="text-xs text-slate-400">Loading examination preferences from IndexedDB</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm">
        <Wand2 className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-xs text-slate-500">
          Create a new paper or select one from the dashboard to configure all examination details.
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
              await refreshPapers()
              setSearchParams({ paperId: created.metadata.id })
            }}
          >
            Create New Paper
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!localSettings || !localLayout) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="font-bold text-slate-800 text-base">Preparing Wizard Blueprint...</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* 3-Step Guided Workflow Stepper */}
      <WorkflowStepper
        currentStep="setup"
        paperId={paper.metadata.id}
        paperTitle={paper.metadata.title}
        subject={paper.settings.subject}
        classNameText={paper.settings.className}
        totalMarks={paper.settings.totalMarks}
      />

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePrevStep}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {currentStep === 1 ? 'Dashboard' : 'Back'}
          </Button>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-800 text-sm truncate max-w-[240px] sm:max-w-md">
            {paper.metadata.title}
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {/* Auto-Save Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className={`w-2 h-2 rounded-full ${isAutoSaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
            <span>{autoSaveStatus}</span>
          </div>

          {templates.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTemplatesModal(true)}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-purple-600" />}
            >
              Templates ({templates.length})
            </Button>
          )}
        </div>
      </div>

      {/* Progress Stepper Component */}
      <WizardStepper
        currentStep={currentStep}
        onSelectStep={handleSelectStep}
        completedSteps={completedSteps}
      />

      {/* Step Warning Notice (if any) */}
      {stepWarnings.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 animate-in fade-in">
          {stepWarnings.map((warn, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Step Views */}
      <div className="transition-all duration-200">
        {currentStep === 1 && (
          <Step1ExamDetails
            settings={localSettings}
            onChange={handleSettingsChange}
            errors={stepErrors}
          />
        )}

        {currentStep === 2 && (
          <Step2QuestionCounts
            settings={localSettings}
            actualEnteredQuestionsCount={paper.content.totalCalculatedQuestions}
            onChange={handleSettingsChange}
            errors={stepErrors}
          />
        )}

        {currentStep === 3 && (
          <Step3PageSettings
            settings={localSettings}
            layout={localLayout}
            onChange={handleLayoutChange}
            errors={stepErrors}
          />
        )}

        {currentStep === 4 && (
          <Step4Instructions
            settings={localSettings}
            onChange={handleSettingsChange}
            errors={stepErrors}
          />
        )}

        {currentStep === 5 && (
          <Step5HeaderFooter
            layout={localLayout}
            onChange={handleLayoutChange}
            errors={stepErrors}
          />
        )}

        {currentStep === 6 && (
          <Step6McqLayout
            layout={localLayout}
            onChange={handleLayoutChange}
            errors={stepErrors}
          />
        )}

        {currentStep === 7 && (
          <Step7Review
            metadata={paper.metadata}
            settings={localSettings}
            layout={localLayout}
            actualQuestionsCount={paper.content.totalCalculatedQuestions}
            onJumpToStep={handleSelectStep}
            onConfirmProceed={handleConfirmProceed}
            onSaveDraft={async () => persistChanges(localSettings, localLayout)}
            onDuplicate={handleDuplicateSetup}
            isSaving={isAutoSaving}
          />
        )}
      </div>

      {/* Sticky Bottom Navigation Bar */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-4 shadow-lg flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handlePrevStep}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          {currentStep === 1 ? 'Cancel / Exit' : 'Previous Step'}
        </Button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Progress auto-saved in local IndexedDB</span>
        </div>

        {currentStep < 7 ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNextStep}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Next: {WIZARD_STEPS[currentStep].shortTitle}
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirmProceed}
            rightIcon={<ArrowRight className="w-4 h-4 stroke-[2.5]" />}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirm & Go to Question Editor
          </Button>
        )}
      </div>

      {/* Templates Quick-Load Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Load Setup Template</h3>
                <p className="text-xs text-slate-500">Apply predefined blueprint & visual layout parameters</p>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No saved templates found.
                </div>
              ) : (
                templates.map(tpl => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{tpl.name}</h4>
                      {tpl.description && <p className="text-xs text-slate-500 line-clamp-2">{tpl.description}</p>}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{tpl.subject} ({tpl.className})</span>
                        <span>•</span>
                        <span>{tpl.totalMarks} Marks</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApplyTemplate(tpl)}
                      >
                        Apply
                      </Button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTemplateToDelete(tpl)
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
                        title={`Delete template "${tpl.name}"`}
                        aria-label={`Delete template ${tpl.name}`}
                      >
                        <Trash2 className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setShowTemplatesModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Template Confirmation Modal */}
      <DeleteTemplateConfirmationModal
        isOpen={!!templateToDelete}
        template={templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        onConfirmDelete={handleConfirmDeleteTemplate}
        isDeleting={isDeletingTemplate}
      />
    </div>
  )
}
