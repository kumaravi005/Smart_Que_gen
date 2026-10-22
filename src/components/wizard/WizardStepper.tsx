import React from 'react'
import { Check, ChevronRight } from 'lucide-react'

export interface StepItem {
  number: number
  title: string
  shortTitle: string
  desc: string
}

export const WIZARD_STEPS: StepItem[] = [
  { number: 1, title: 'Examination Details', shortTitle: 'Details', desc: 'Institute, Exam, Subject, Grade' },
  { number: 2, title: 'Question Counts & Types', shortTitle: 'Questions', desc: 'Sections, Counts, Marks Blueprint' },
  { number: 3, title: 'Page & Print Settings', shortTitle: 'Layout', desc: 'Columns, Margins, Font, Page Target' },
  { number: 4, title: 'Instructions & Front Page', shortTitle: 'Instructions', desc: 'Cover Page, Student Notes' },
  { number: 5, title: 'Header & Footer', shortTitle: 'Header/Footer', desc: 'Branding, Borders, Page Numbers' },
  { number: 6, title: 'MCQ Option Layout', shortTitle: 'MCQ Layout', desc: 'Automatic, 4, 2, or 1 per row' },
  { number: 7, title: 'Review & Confirm', shortTitle: 'Review', desc: 'Summary, Template, Save' }
]

interface WizardStepperProps {
  currentStep: number
  onSelectStep: (step: number) => void
  completedSteps?: number[]
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  onSelectStep,
  completedSteps = []
}) => {
  const currentStepData = WIZARD_STEPS[currentStep - 1]
  const progressPercent = Math.round((currentStep / WIZARD_STEPS.length) * 100)

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Mobile Top Stepper Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {currentStep}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Step {currentStep} of {WIZARD_STEPS.length}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">
                {currentStepData.desc}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {currentStepData.title}
            </h2>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Horizontal Scrollable Step Pills for Touch & Desktop */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {WIZARD_STEPS.map(step => {
          const isActive = currentStep === step.number
          const isDone = completedSteps.includes(step.number) || step.number < currentStep

          return (
            <button
              key={step.number}
              type="button"
              onClick={() => onSelectStep(step.number)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                  : isDone
                  ? 'bg-blue-50/80 text-blue-800 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive
                    ? 'bg-white text-blue-700'
                    : isDone
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.number}
              </span>
              <span>{step.shortTitle}</span>
              {step.number < WIZARD_STEPS.length && (
                <ChevronRight className={`w-3 h-3 opacity-40 ml-0.5 ${isActive ? 'text-white' : ''}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
