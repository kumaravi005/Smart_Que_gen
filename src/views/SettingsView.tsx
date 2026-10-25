import React, { useState, useEffect } from 'react'
import { Settings, Save, Check, HardDrive } from 'lucide-react'
import { getDatabase } from '../services/db'
import { storageService } from '../services/storageService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { TeacherManagementSection } from '../components/admin/TeacherManagementSection'

export const SettingsView: React.FC = () => {
  const [instituteName, setInstituteName] = useState('OMEGA EDUCATION CENTER')
  const [tagline, setTagline] = useState('Excellence in Coaching & Board Preparations')
  const [affiliation, setAffiliation] = useState('Center Code: OEC-2026 / CBSE & State Board Curriculum')
  const [address, setAddress] = useState('Knowledge Park, Phase 2, Near City Center')
  const [contact, setContact] = useState('Phone: +91 98765 43210 | info@omegaedu.org')
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<{ papersCount: number; bankCount: number }>({ papersCount: 0, bankCount: 0 })

  useEffect(() => {
    const loadSettings = async () => {
      const db = await getDatabase()
      const setting = await db.get('app_settings', 'institute_profile')
      if (setting?.value) {
        setInstituteName(setting.value.name || '')
        setTagline(setting.value.tagline || '')
        setAffiliation(setting.value.affiliation || '')
        setAddress(setting.value.address || '')
        setContact(setting.value.contact || '')
      }
      const st = await storageService.getStorageStats()
      setStats(st)
    }
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Settings</span>
              <Badge variant="primary" size="sm">IndexedDB Config</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Coaching Center Profile</h1>
            <p className="text-xs text-slate-500">
              Default institution credentials used across new examination headers.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          leftIcon={saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
        >
          {saved ? 'Saved!' : 'Save Profile'}
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Institute / Coaching Name
          </label>
          <input
            type="text"
            value={instituteName}
            onChange={e => setInstituteName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
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
            onChange={e => setTagline(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Affiliation / Center Code
          </label>
          <input
            type="text"
            value={affiliation}
            onChange={e => setAffiliation(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
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
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Contact & Support Details
            </label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
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
