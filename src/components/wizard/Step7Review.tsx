import React, { useState } from 'react'
import {
  CheckCircle2,
  Edit2,
  Save,
  Copy,
  ArrowRight,
  BookmarkPlus,
  Building,
  Award,
  Layers,
  FileText,
  Palette,
  Grid,
  AlertTriangle
} from 'lucide-react'
import type { ExamSettings, VisualLayout, PaperMetadata } from '../../types'
import { calculateMarksFromSections, estimatePageFit } from '../../utils/layoutEstimator'
import { templateService } from '../../services/templateService'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { Modal } from '../common/Modal'

interface Step7Props {
  metadata: PaperMetadata
  settings: ExamSettings
  layout: VisualLayout
  actualQuestionsCount?: number
  onJumpToStep: (stepNumber: number) => void
  onConfirmProceed: () => void
  onSaveDraft: () => Promise<void>
  onDuplicate: () => Promise<void>
  isSaving?: boolean
}

export const Step7Review: React.FC<Step7Props> = ({
  metadata,
  settings,
  layout,
  actualQuestionsCount = 0,
  onJumpToStep,
  onConfirmProceed,
  onSaveDraft,
  onDuplicate,
  isSaving = false
}) => {
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState(`${settings.className} ${settings.subject} Setup`)
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateSaved, setTemplateSaved] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const { totalConfiguredMarks, totalConfiguredQuestions } = calculateMarksFromSections(settings.sections || [])
  const isMarksMismatch = totalConfiguredMarks !== settings.totalMarks
  const estimation = estimatePageFit(settings, layout)

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName.trim()) return

    try {
      setIsSavingTemplate(true)
      await templateService.saveAsTemplate({
        name: templateName,
        description: templateDesc,
        settings,
        layout
      })
      setTemplateSaved(true)
      setTimeout(() => {
        setTemplateSaved(false)
        setTemplateModalOpen(false)
      }, 1500)
    } catch (err) {
      console.error(err)
      alert('Failed to save template.')
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleManualSaveDraft = async () => {
    await onSaveDraft()
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Top Review Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Step 7 of 7</span>
              <Badge variant="success" size="sm">Ready to Author</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Review Setup & Blueprint</h1>
            <p className="text-xs text-slate-500">
              Verify your exam structure, page format, and branding before entering questions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTemplateModalOpen(true)}
            leftIcon={<BookmarkPlus className="w-4 h-4 text-purple-600" />}
          >
            Save as Template
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDuplicate}
            leftIcon={<Copy className="w-4 h-4 text-blue-600" />}
          >
            Duplicate Setup
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleManualSaveDraft}
            isLoading={isSaving}
            leftIcon={draftSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
          >
            {draftSaved ? 'Draft Saved!' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Blueprint Status Notice */}
      {isMarksMismatch ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Marks Blueprint Discrepancy</span>
              <span>
                Calculated section marks total <strong>{totalConfiguredMarks} Marks</strong>, while configured Maximum Marks is <strong>{settings.totalMarks} Marks</strong>.
                You can adjust this anytime in Step 2.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJumpToStep(2)}
            className="text-amber-800 font-bold underline hover:text-amber-950 shrink-0"
          >
            Edit in Step 2
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              <strong>All systems verified:</strong> Section marks ({totalConfiguredMarks}M) perfectly matches Maximum Marks ({settings.totalMarks}M).
            </span>
          </div>
          <span className="text-emerald-700 font-semibold">{totalConfiguredQuestions} Expected Questions</span>
        </div>
      )}

      {/* Structured Review Cards with direct Edit buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Examination Details */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Building className="w-4 h-4 text-blue-600" />
                <span>1. Examination Details</span>
              </div>
              <button
                type="button"
                onClick={() => onJumpToStep(1)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Institution:</span>
                <span className="font-semibold text-slate-900 text-right">{settings.institute.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Examination:</span>
                <span className="font-semibold text-slate-800">{settings.examName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subject & Class:</span>
                <span className="font-semibold text-slate-800">{settings.subject} ({settings.className})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time & Max Marks:</span>
                <span className="font-semibold text-slate-800">{settings.durationMinutes} Mins | {settings.totalMarks} Marks</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Student Info Block:</span>
                <span className="text-slate-700">
                  {settings.studentFields?.showName ? 'Name, ' : ''}
                  {settings.studentFields?.showRollNo ? 'Roll No, ' : ''}
                  {settings.studentFields?.showDate ? 'Date' : ''}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-100">
                <span className="text-slate-400">Paper Status:</span>
                <span className="font-semibold text-slate-700 capitalize">{metadata?.status || 'draft'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Question Counts & Blueprint */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Award className="w-4 h-4 text-purple-600" />
                <span>2. Question Counts & Types</span>
              </div>
              <button
                type="button"
                onClick={() => onJumpToStep(2)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-500">Configured Sections:</span>
                <span>{settings.sections.filter(s => s.enabled ?? true).length} Sections</span>
              </div>
              <div className="flex justify-between text-xs bg-purple-50 text-purple-900 p-2 rounded-lg font-medium">
                <span>Expected Qs: <strong className="font-bold">{totalConfiguredQuestions}</strong></span>
                <span>Actual Entered Qs: <strong className="font-bold">{actualQuestionsCount}</strong></span>
              </div>
              {settings.sections.filter(s => s.enabled ?? true).map((sec) => (
                <div key={sec.id} className="flex justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg">
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                    {sec.name}: {sec.title.split(':')[1] || sec.title}
                  </span>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {sec.totalQuestions} Qs × {sec.marksPerQuestion}M = {sec.totalQuestions * sec.marksPerQuestion}M
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                <span>Total Expected:</span>
                <span>{totalConfiguredQuestions} Qs ({totalConfiguredMarks} Marks)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Page & Print Geometry */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>3. Page & Print Layout</span>
              </div>
              <button
                type="button"
                onClick={() => onJumpToStep(3)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Page Format:</span>
                <span className="font-semibold text-slate-800">{layout.pageSize} ({layout.orientation})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Column Layout:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {layout.columnLayout === 'two_column' ? 'Two-Column (Paper Saver)' : 'Single Column'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Margins:</span>
                <span className="font-semibold text-slate-800">
                  {layout.pageMarginsMm?.top}mm / {layout.pageMarginsMm?.left}mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Typography:</span>
                <span className="font-semibold text-slate-800">{layout.fontFamily} ({layout.fontSizePt}pt, {layout.lineSpacing}x)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Page Count:</span>
                <span className="font-bold text-blue-700">~{estimation.estimatedPages} Pages</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Instructions & Cover Page */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>4. Instructions & Cover</span>
              </div>
              <button
                type="button"
                onClick={() => onJumpToStep(4)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Cover Mode:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {settings.coverPageMode === 'first_page_top'
                    ? 'Top of First Question Page'
                    : settings.coverPageMode === 'separate_cover'
                    ? 'Separate Cover Page'
                    : settings.coverPageMode === 'compact_header'
                    ? 'Compact Header'
                    : 'Custom Arrangement'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rules Count:</span>
                <span className="font-semibold text-slate-800">{settings.generalInstructions?.length || 0} Instructions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Header & Footer */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Palette className="w-4 h-4 text-pink-600" />
                <span>5. Header & Footer</span>
              </div>
              <button
                type="button"
                onClick={() => onJumpToStep(5)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Logo Placement:</span>
                <span className="font-semibold text-slate-800 capitalize">{layout.headerFooter?.logoPlacement || layout.logoPlacement}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Watermark:</span>
                <span className="font-semibold text-slate-800">
                  {layout.showWatermark ? `Enabled ("${layout.watermarkText || 'OMEGA'}")` : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Page Numbers:</span>
                <span className="font-semibold text-slate-800">
                  {layout.headerFooter?.showPageNumbers ? `Enabled (${layout.headerFooter.pageNumberPosition})` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: MCQ Options Arrangement */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Grid className="w-4 h-4 text-teal-600" />
                <span>6. MCQ Option Layout</span>
              </div>
              <button
                type="button"
                onClick={() => onJumpToStep(6)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>

            <div className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Option Mode:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {layout.mcqOptionLayout === 'auto'
                    ? 'Automatic Adaptation'
                    : layout.mcqOptionLayout === 'four_per_row'
                    ? '4 Per Row (Horizontal)'
                    : layout.mcqOptionLayout === 'two_per_row'
                    ? '2 Per Row (2x2 Grid)'
                    : '1 Per Row (Vertical Stack)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clipping Safeguard:</span>
                <span className="font-semibold text-emerald-700">Active (Zero Overlap Guaranteed)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button: Proceed to Question Editor */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Ready to Enter Examination Questions?</h3>
          <p className="text-xs text-blue-200 mt-1 max-w-lg leading-relaxed">
            All examination parameters, blueprint rules, and visual styles are locked and saved to local IndexedDB.
            The setup remains fully editable anytime even after questions are added.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={onConfirmProceed}
          rightIcon={<ArrowRight className="w-5 h-5 stroke-[2.5]" />}
          className="bg-white text-blue-900 hover:bg-blue-50 active:bg-blue-100 shadow-md border-0 shrink-0"
        >
          Proceed to Question Editor
        </Button>
      </div>

      {/* Save as Reusable Template Modal */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title="Save as Reusable Setup Template"
        description="Save these blueprint & layout settings so staff can reuse them for future examinations"
      >
        <form onSubmit={handleSaveTemplateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. Standard 80 Marks Mid-Term Setup"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={templateDesc}
              onChange={e => setTemplateDesc(e.target.value)}
              placeholder="e.g. 20 MCQs + 5 Short + 4 Long with 2-column balanced layout"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingTemplate}
              leftIcon={templateSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            >
              {templateSaved ? 'Saved to Templates!' : 'Save Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
