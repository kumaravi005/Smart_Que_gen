import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Wand2, FileEdit, Eye, ArrowRight } from 'lucide-react'

export interface WorkflowStepperProps {
  currentStep: 'setup' | 'questions' | 'preview'
  paperId: string
  paperTitle?: string
  questionCount?: number
  totalMarks?: number
  subject?: string
  classNameText?: string
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  paperId,
  paperTitle,
  questionCount,
  totalMarks,
  subject,
  classNameText
}) => {
  const navigate = useNavigate()

  const steps = [
    {
      id: 'setup' as const,
      num: 1,
      title: 'Exam Setup',
      desc: 'Class, Subject & Marks',
      path: `/wizard?paperId=${paperId}`,
      icon: Wand2
    },
    {
      id: 'questions' as const,
      num: 2,
      title: 'Add Questions',
      desc: questionCount !== undefined ? `${questionCount} Questions Added` : 'Type, Paste, Scan or Speak',
      path: `/editor?paperId=${paperId}`,
      icon: FileEdit
    },
    {
      id: 'preview' as const,
      num: 3,
      title: 'Preview & Print',
      desc: 'Print PDF, Word, or Excel',
      path: `/preview?paperId=${paperId}`,
      icon: Eye
    }
  ]

  const getStepStatus = (stepId: 'setup' | 'questions' | 'preview') => {
    if (stepId === currentStep) return 'active'
    if (currentStep === 'preview') return 'completed'
    if (currentStep === 'questions' && stepId === 'setup') return 'completed'
    return 'upcoming'
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-3 sm:p-4 shadow-xs mb-6">
      {/* Optional Paper Context Info */}
      {(paperTitle || subject || classNameText) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{paperTitle || 'Examination Paper'}</span>
            {(classNameText || subject) && (
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold">
                {[classNameText, subject].filter(Boolean).join(' • ')}
              </span>
            )}
            {totalMarks !== undefined && (
              <span className="text-slate-500 font-medium">({totalMarks} Marks)</span>
            )}
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            {currentStep === 'setup' && 'Step 1 of 3: Examination Configuration'}
            {currentStep === 'questions' && 'Step 2 of 3: Question Authoring'}
            {currentStep === 'preview' && 'Step 3 of 3: Review & Print Generation'}
          </div>
        </div>
      )}

      {/* Stepper Steps Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id)
          const isClickable = !!paperId

          return (
            <button
              key={step.id}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && navigate(step.path)}
              className={`flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl text-left transition-all relative ${
                status === 'active'
                  ? 'bg-blue-50/90 border border-blue-200 shadow-2xs'
                  : status === 'completed'
                  ? 'hover:bg-slate-50 cursor-pointer'
                  : 'hover:bg-slate-50 opacity-80 cursor-pointer'
              }`}
            >
              {/* Step Number or Checkmark Badge */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  status === 'active'
                    ? 'bg-blue-600 text-white shadow-xs ring-4 ring-blue-100'
                    : status === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  step.num
                )}
              </div>

              {/* Step Text Labels */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs sm:text-sm font-bold truncate ${
                      status === 'active'
                        ? 'text-blue-900'
                        : status === 'completed'
                        ? 'text-slate-800'
                        : 'text-slate-600'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden sm:block">
                  {step.desc}
                </p>
              </div>

              {/* Arrow Indicator for active step on larger screens */}
              {status === 'active' && idx < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-blue-500 hidden md:block shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
