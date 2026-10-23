import React from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react'
import type { PaperSetupTemplate } from '../../types'

export interface DeleteTemplateConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  template: PaperSetupTemplate | null
  onConfirmDelete: (template: PaperSetupTemplate) => Promise<void> | void
  isDeleting?: boolean
}

export const DeleteTemplateConfirmationModal: React.FC<DeleteTemplateConfirmationModalProps> = ({
  isOpen,
  onClose,
  template,
  onConfirmDelete,
  isDeleting = false
}) => {
  if (!template) return null

  const handleDelete = async () => {
    await onConfirmDelete(template)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title="Delete Paper Template"
      description="Permanent removal confirmation"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Warning Header Icon & Text */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-950">
              Are you sure you want to delete this template?
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              This action cannot be undone. This template blueprint will be permanently removed from your saved templates list.
            </p>
          </div>
        </div>

        {/* Template Detail Preview Card */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-slate-900 truncate">
              {template.name}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 shrink-0">
              {template.totalMarks} Marks
            </span>
          </div>

          {template.description && (
            <p className="text-xs text-slate-600 leading-relaxed">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-200/60">
            <span>Subject: <strong className="text-slate-700">{template.subject || 'Not specified'}</strong></span>
            <span>•</span>
            <span>Class: <strong className="text-slate-700">{template.className || 'General'}</strong></span>
          </div>
        </div>

        {/* Safety Note */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Note: Any papers previously created using this template will remain safe and intact.</span>
        </div>

        {/* Action Controls with explicit DANGER RED delete button */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="w-4 h-4 stroke-[2.2]" />}
            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold shadow-md shadow-rose-600/20 focus:ring-rose-500"
          >
            {isDeleting ? 'Deleting...' : 'Delete Template'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
