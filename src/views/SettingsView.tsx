import React, { useState, useEffect } from 'react'
import { Save, Check, HardDrive, ShieldCheck } from 'lucide-react'
import { getDatabase } from '../services/db'
import { storageService } from '../services/storageService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { TeacherManagementSection } from '../components/admin/TeacherManagementSection'
import { useAuth } from '../hooks/useAuth'

export const SettingsView: React.FC = () => {
  const { institute, isOwner } = useAuth()

  const [instituteName, setInstituteName] = useState('OMEGA EDUCATION CENTRE')
  const [tagline, setTagline] = useState('एक अद्भुत शिक्षण शैली... | BOARD • JNV • CHS • OLYMPIAD')
  const [affiliation, setAffiliation] = useState('BOARD | JNV | CHS | OLYMPIAD | NAVODAYA | SAINIK SCHOOL')
  const [address, setAddress] = useState('Knowledge Park, Phase 2, Near City Center')
  const [contact, setContact] = useState('Phone: +91 98765 43210 | info@omegaedu.org')
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<{ papersCount: number; bankCount: number }>({ papersCount: 0, bankCount: 0 })

  useEffect(() => {
    const loadSettings = async () => {
      // 1. Prioritize authorized institute profile from cloud session
      if (institute) {
        if (institute.name) setInstituteName(institute.name)
        if (institute.tagline) setTagline(institute.tagline)
        if (institute.affiliation) setAffiliation(institute.affiliation)
        if (institute.address) setAddress(institute.address)
        if (institute.contact) setContact(institute.contact)
      } else {
        const db = await getDatabase()
        const setting = await db.get('app_settings', 'institute_profile')
        if (setting?.value) {
          setInstituteName(setting.value.name || 'OMEGA EDUCATION CENTRE')
          setTagline(setting.value.tagline || 'एक अद्भुत शिक्षण शैली...')
          setAffiliation(setting.value.affiliation || '')
          setAddress(setting.value.address || '')
          setContact(setting.value.contact || '')
        }
      }
      const st = await storageService.getStorageStats()
      setStats(st)
    }
    loadSettings()
  }, [institute])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOwner) return

    const db = await getDatabase()
    await db.put('app_settings', {
      key: 'institute_profile',
      value: {
        name: instituteName,
        tagline,
        affiliation,
        address,
        contact
      }
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#0055D4]/30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-2xl bg-white border-2 border-[#0055D4] shrink-0">
            <img src="/omega-logo.png" alt="Omega Education Centre" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Settings</span>
              <Badge variant={isOwner ? 'primary' : 'default'} size="sm">
                {isOwner ? 'Owner Managed' : 'Teacher View (Read-Only)'}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0055D4]">Coaching Center Profile</h1>
            <p className="text-xs text-slate-500">
              {isOwner
                ? 'Default institution credentials used across new examination headers.'
                : 'Institute credentials shared with all faculty members for question papers.'}
            </p>
          </div>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            leftIcon={saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            className="bg-[#0055D4] hover:bg-[#0041a8] text-white border-0 font-bold"
          >
            {saved ? 'Saved!' : 'Save Profile'}
          </Button>
        )}
      </div>

      {!isOwner && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#0055D4] shrink-0" />
          <span>
            Coaching Center Profile is managed exclusively by the Institute Owner. All papers created by teachers automatically inherit these credentials.
          </span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        {/* Active Official Logo Card */}
        <div className="flex items-center gap-4 p-4 bg-amber-50/70 rounded-2xl border-2 border-[#FFE600] mb-4">
          <div className="p-2 bg-white rounded-xl border border-[#0055D4]/20 shadow-xs shrink-0">
            <img src="/omega-logo.png" alt="Omega Education Centre" className="h-16 w-auto object-contain" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0055D4]">Official Omega Education Centre Logo</h3>
              <span className="text-[10px] font-bold bg-[#047857] text-white px-2 py-0.5 rounded-full">ACTIVE</span>
            </div>
            <p className="text-xs text-slate-600">
              Preserved in original proportions across portal headers, examination titles, and watermarks.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Institute / Coaching Name
          </label>
          <input
            type="text"
            value={instituteName}
            disabled={!isOwner}
            onChange={e => setInstituteName(e.target.value)}
            className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-bold text-slate-900 ${
              isOwner ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/70 border-slate-200 cursor-not-allowed'
            }`}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Motto / Tagline
          </label>
          <input
            type="text"
            value={tagline}
            disabled={!isOwner}
            onChange={e => setTagline(e.target.value)}
            className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${
              isOwner ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/70 border-slate-200 cursor-not-allowed'
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Affiliation / Center Code
          </label>
          <input
            type="text"
            value={affiliation}
            disabled={!isOwner}
            onChange={e => setAffiliation(e.target.value)}
            className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${
              isOwner ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/70 border-slate-200 cursor-not-allowed'
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              disabled={!isOwner}
              onChange={e => setAddress(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${
                isOwner ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/70 border-slate-200 cursor-not-allowed'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Contact & Support Details
            </label>
            <input
              type="text"
              value={contact}
              disabled={!isOwner}
              onChange={e => setContact(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm ${
                isOwner ? 'bg-slate-50 border-slate-300' : 'bg-slate-100/70 border-slate-200 cursor-not-allowed'
              }`}
            />
          </div>
        </div>
      </form>

      {/* Admin: Faculty & Teacher Accounts */}
      <TeacherManagementSection />

      {/* Storage Information */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-600" />
          <span>Local IndexedDB Diagnostics</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500">Total Paper Drafts:</span>
            <div className="text-lg font-bold text-slate-800">{stats.papersCount}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500">Total Questions in Bank:</span>
            <div className="text-lg font-bold text-slate-800">{stats.bankCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
