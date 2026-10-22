import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { Button } from './Button'
import { CheckCircle2, Archive, Printer } from 'lucide-react'

interface SavePaperConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  paperId: string
  paperTitle: string
}

export const SavePaperConfirmationModal: React.FC<SavePaperConfirmationModalProps> = ({
  isOpen,
  onClose,
  paperId,
  paperTitle
}) => {
  const navigate = useNavigate()

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paper Saved Successfully"
      description="All questions and examination details are safely stored on this device"
      maxWidth="md"
    >
      <div className="space-y-5 text-center py-2">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">{paperTitle}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your paper is securely preserved in local storage. You can safely close your browser or return anytime to edit, format, or export.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Option A: Return to Saved Papers List */}
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate('/drafts')
            }}
            className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-left transition-all group"
          >
            <div className="flex items-center gap-2 mb-1 text-slate-800 font-bold text-xs group-hover:text-blue-600">
              <Archive className="w-4 h-4 text-blue-600" />
              <span>Go to Saved Papers</span>
            </div>
            <p className="text-[11px] text-slate-400">
              View all your examination papers in one place.
            </p>
          </button>

          {/* Option B: Export Now */}
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate(`/preview?paperId=${paperId}`)
            }}
            className="p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-left transition-all group"
          >
            <div className="flex items-center gap-2 mb-1 text-slate-800 font-bold text-xs group-hover:text-emerald-700">
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Export or Print Now</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Instant print to PDF or download Word / Excel.
            </p>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Continue Editing This Paper
          </Button>
        </div>
      </div>
    </Modal>
  )
}
