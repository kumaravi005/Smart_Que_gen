import React, { useState } from 'react'
import {
  Upload,
  Check,
  Building,
  Calendar,
  Clock,
  Award,
  Sparkles,
  UserCheck,
  Trash2
} from 'lucide-react'
import type { ExamSettings, InstituteProfile } from '../../types'
import { Button } from '../common/Button'
import { getDatabase } from '../../services/db'

interface Step1Props {
  settings: ExamSettings
  onChange: (updated: Partial<ExamSettings>) => void
  errors?: Record<string, string>
}

export const Step1ExamDetails: React.FC<Step1Props> = ({ settings, onChange, errors = {} }) => {
  const [profileSaved, setProfileSaved] = useState(false)

  const handleInstituteChange = (field: keyof InstituteProfile, value: string) => {
    onChange({
      institute: {
        ...settings.institute,
        [field]: value
      }
    })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        handleInstituteChange('logoUrl', reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveAsDefaultProfile = async () => {
    try {
      const db = await getDatabase()
      await db.put('app_settings', {
        key: 'institute_profile',
        value: settings.institute
      })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      console.error('Failed to save profile:', err)
      alert('Could not save institute profile.')
    }
  }

  const durationPresets = [45, 60, 90, 120, 180]
  const marksPresets = [20, 40, 50, 70, 80, 100]

  return (
    <div className="space-y-6">
      {/* 1. Institution Credentials Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Institution & Coaching Profile</h3>
              <p className="text-xs text-slate-500">
                School/Institute branding printed at the top of question papers
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveAsDefaultProfile}
            leftIcon={profileSaved ? <Check className="w-4 h-4 text-emerald-600" /> : <Sparkles className="w-4 h-4 text-blue-600" />}
          >
            {profileSaved ? 'Profile Saved!' : 'Save as Default Profile'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Institution Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.institute.name}
              onChange={e => handleInstituteChange('name', e.target.value)}
              placeholder="e.g. OMEGA EDUCATION CENTER"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                errors.instituteName ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.instituteName && (
              <p className="text-xs text-rose-600 mt-1">{errors.instituteName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Motto / Subtitle / Tagline
            </label>
            <input
              type="text"
              value={settings.institute.tagline || ''}
              onChange={e => handleInstituteChange('tagline', e.target.value)}
              placeholder="e.g. Excellence in Coaching & Board Preparations"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Affiliation / Center Code
            </label>
            <input
              type="text"
              value={settings.institute.affiliation || ''}
              onChange={e => handleInstituteChange('affiliation', e.target.value)}
              placeholder="e.g. Center Code: OEC-2026 / CBSE Affiliated"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Address
            </label>
            <input
              type="text"
              value={settings.institute.address || ''}
              onChange={e => handleInstituteChange('address', e.target.value)}
              placeholder="e.g. Knowledge Park, Phase 2, Near City Center"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Contact Details (Optional)
            </label>
            <input
              type="text"
              value={settings.institute.contact || ''}
              onChange={e => handleInstituteChange('contact', e.target.value)}
              placeholder="e.g. Phone: +91 98765 43210 | info@omegaedu.org"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Institution Logo Picker */}
          <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-700 uppercase block">Institution Logo</span>
              <p className="text-xs text-slate-500">
                Printed in the examination header according to layout preferences
              </p>
            </div>

            <div className="flex items-center gap-3">
              {settings.institute.logoUrl ? (
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <img
                    src={settings.institute.logoUrl}
                    alt="Logo preview"
                    className="w-10 h-10 object-contain rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleInstituteChange('logoUrl', '')}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <span className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 inline-flex items-center gap-2">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Upload Logo Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Examination Parameters Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Examination Parameters</h3>
            <p className="text-xs text-slate-500">
              Exam name, class, subject, session, and assessment schedule
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Examination Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.examName}
              onChange={e => onChange({ examName: e.target.value })}
              placeholder="e.g. Mid-Term Examination 2026"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.examName ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.examName && <p className="text-xs text-rose-600 mt-1">{errors.examName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Academic Session (Optional)
            </label>
            <input
              type="text"
              value={settings.academicSession || ''}
              onChange={e => onChange({ academicSession: e.target.value })}
              placeholder="e.g. 2026-2027"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Class / Grade <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.className}
              onChange={e => onChange({ className: e.target.value })}
              placeholder="e.g. Class X or Grade 10"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.className ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.className && <p className="text-xs text-rose-600 mt-1">{errors.className}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={settings.subject}
              onChange={e => onChange({ subject: e.target.value })}
              placeholder="e.g. Mathematics"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.subject ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.subject && <p className="text-xs text-rose-600 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Subject Code (Optional)
            </label>
            <input
              type="text"
              value={settings.subjectCode || ''}
              onChange={e => onChange({ subjectCode: e.target.value })}
              placeholder="e.g. MATH-041"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Exam Date (Optional)
            </label>
            <input
              type="date"
              value={settings.date || ''}
              onChange={e => onChange({ date: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Time and Maximum Marks with Quick Touch Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Duration (Minutes) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {Math.floor(settings.durationMinutes / 60)}h {settings.durationMinutes % 60 ? `${settings.durationMinutes % 60}m` : ''}
              </span>
            </div>
            <input
              type="number"
              min="10"
              max="360"
              value={settings.durationMinutes}
              onChange={e => onChange({ durationMinutes: Number(e.target.value) })}
              className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.durationMinutes ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.durationMinutes && (
              <p className="text-xs text-rose-600 mt-1">{errors.durationMinutes}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2">
              {durationPresets.map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChange({ durationMinutes: mins })}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    settings.durationMinutes === mins
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                Maximum Marks <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {settings.totalMarks} Marks
              </span>
            </div>
            <input
              type="number"
              min="5"
              max="500"
              value={settings.totalMarks}
              onChange={e => onChange({ totalMarks: Number(e.target.value) })}
              className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.totalMarks ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:ring-blue-500'
              }`}
            />
            {errors.totalMarks && (
              <p className="text-xs text-rose-600 mt-1">{errors.totalMarks}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2">
              {marksPresets.map(marks => (
                <button
                  key={marks}
                  type="button"
                  onClick={() => onChange({ totalMarks: marks })}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    settings.totalMarks === marks
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {marks}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Student Identification Fields on Paper */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Student Information Fill-In Block</h3>
            <p className="text-xs text-slate-500">
              Select which fields should be printed on the paper for students to fill out
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { key: 'showName', label: 'Student Name Field' },
            { key: 'showRollNo', label: 'Roll Number Field' },
            { key: 'showDate', label: 'Date of Examination' },
            { key: 'showSection', label: 'Section / Batch' },
            { key: 'showSignature', label: 'Candidate Signature' },
            { key: 'showInvigilatorSign', label: 'Invigilator Sign' }
          ].map(field => {
            const isChecked = (settings.studentFields as any)[field.key] ?? true
            return (
              <label
                key={field.key}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-blue-50/50 border-blue-300 text-blue-900 font-medium'
                    : 'bg-slate-50/60 border-slate-200 text-slate-600'
                }`}
              >
                <span className="text-xs">{field.label}</span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e =>
                    onChange({
                      studentFields: {
                        ...settings.studentFields,
                        [field.key]: e.target.checked
                      }
                    })
                  }
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
