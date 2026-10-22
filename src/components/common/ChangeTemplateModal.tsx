import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { templateService } from '../../services/templateService'
import { paperService } from '../../services/paperService'
import type { PaperSetupTemplate } from '../../types'
import { Bookmark, CheckCircle2 } from 'lucide-react'

interface ChangeTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  paperId: string
  paperTitle?: string
  onApplied?: () => void
}

export const ChangeTemplateModal: React.FC<ChangeTemplateModalProps> = ({
  isOpen,
  onClose,
  paperId,
  paperTitle = 'Question Paper',
  onApplied
}) => {
  const [templates, setTemplates] = useState<PaperSetupTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setSuccessMessage(null)
      templateService.getAllTemplates()
        .then(list => {
          setTemplates(list)
          if (list.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(list[0].id)
          }
        })
        .catch(err => console.error('Failed to load templates:', err))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const handleApply = async () => {
    if (!paperId || !selectedTemplateId) return
    const chosen = templates.find(t => t.id === selectedTemplateId)
    if (!chosen) return

    try {
      setIsApplying(true)
      await paperService.applyTemplate(paperId, chosen)
      setSuccessMessage(`Successfully applied template: "${chosen.name}"!`)
      if (onApplied) onApplied()
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      console.error('Failed to apply template:', err)
      alert('Could not apply template. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Paper Template"
      description={`Apply a different examination blueprint to "${paperTitle}"`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {successMessage ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <>
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 leading-relaxed">
              <strong>Note:</strong> Changing the template updates the institution header, fonts, margins, and standard instructions. Your existing questions will <strong>not</strong> be deleted or altered.
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No saved templates found.</div>
              ) : (
                templates.map(tpl => {
                  const isSelected = selectedTemplateId === tpl.id
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-200 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {tpl.name}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                            {tpl.totalMarks} Marks
                          </span>
                        </div>
                        {tpl.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {tpl.description}
                          </p>
                        )}
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleApply}
                isLoading={isApplying}
                disabled={!selectedTemplateId}
                leftIcon={<Bookmark className="w-4 h-4" />}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Apply Template
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
