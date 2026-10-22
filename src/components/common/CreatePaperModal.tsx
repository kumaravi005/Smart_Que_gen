import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { Button } from './Button'
import { paperService } from '../../services/paperService'
import { BookOpen, Sparkles } from 'lucide-react'

interface CreatePaperModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

export const CreatePaperModal: React.FC<CreatePaperModalProps> = ({ isOpen, onClose, onCreated }) => {
  const navigate = useNavigate()
  const [subject, setSubject] = useState('Mathematics')
  const [className, setClassName] = useState('Class X')
  const [examName, setExamName] = useState('Mid-Term Examination 2026')
  const [totalMarks, setTotalMarks] = useState(80)
  const [durationMinutes, setDurationMinutes] = useState(180)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      const newPaper = await paperService.createNewPaper({
        subject,
        className,
        examName,
        totalMarks: Number(totalMarks),
        durationMinutes: Number(durationMinutes)
      })

      onClose()
      if (onCreated) onCreated()

      // Navigate to the Setup Wizard with the new paper selected
      navigate(`/wizard?paperId=${newPaper.metadata.id}`)
    } catch (err) {
      console.error('Failed to create new paper:', err)
      alert('Could not initialize paper. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Question Paper"
      description="Configure examination details to begin paper setup"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Subject
          </label>
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science (Physics / Chemistry / Biology)</option>
            <option value="Social Science">Social Science (History / Civics / Geo)</option>
            <option value="English">English Language & Literature</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Computer Science">Computer Science / IT</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Class / Grade
            </label>
            <select
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Class IX">Class IX</option>
              <option value="Class X">Class X</option>
              <option value="Class XI">Class XI</option>
              <option value="Class XII">Class XII</option>
              <option value="Class VIII">Class VIII</option>
              <option value="Foundation">Competitive / Foundation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Total Marks
            </label>
            <input
              type="number"
              min="10"
              max="200"
              value={totalMarks}
              onChange={e => setTotalMarks(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Exam Name / Assessment Title
          </label>
          <input
            type="text"
            value={examName}
            onChange={e => setExamName(e.target.value)}
            placeholder="e.g. Periodic Test 1 / Mid-Term 2026"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Duration (Minutes)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[45, 90, 120, 180].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all ${
                  durationMinutes === mins
                    ? 'bg-blue-50 border-blue-600 text-blue-700 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            This creates separated records for <strong>Exam Settings</strong>, <strong>Content</strong>, and <strong>Layout</strong> linked via stable IDs in local IndexedDB.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            Create & Configure
          </Button>
        </div>
      </form>
    </Modal>
  )
}
