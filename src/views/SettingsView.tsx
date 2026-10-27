import React, { useState, useEffect } from 'react'
import { Save, Check, HardDrive, ShieldCheck, CloudUpload, RefreshCw, AlertCircle } from 'lucide-react'
import { getDatabase } from '../services/db'
import { storageService } from '../services/storageService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { TeacherManagementSection } from '../components/admin/TeacherManagementSection'
import { useAuth } from '../hooks/useAuth'
import { useSync } from '../hooks/useSync'

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

      {/* Cloud Sync & Safe Migration Section */}
      <CloudSyncSection />

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

const CloudSyncSection: React.FC = () => {
  const { status, pendingCount, lastSyncedAt, lastError, syncNow, initialMigration } = useSync()
  const [isMigrating, setIsMigrating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [migrationSummary, setMigrationSummary] = useState<{
    uploaded: number
    skipped: number
    errors: string[]
  } | null>(null)

  const handleSyncNow = async () => {
    setIsSyncing(true)
    try {
      await syncNow()
    } finally {
      setIsSyncing(false)
    }
  }

  const handleInitialMigration = async () => {
    setIsMigrating(true)
    setMigrationSummary(null)
    try {
      const res = await initialMigration()
      setMigrationSummary(res)
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border-2 border-emerald-500/20 shadow-xs p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-700">
            <CloudUpload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Offline-First Cloud Synchronization</h3>
            <p className="text-xs text-slate-500">
              Shared repository across authorized teachers with local-first IndexedDB resilience.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing || status === 'syncing' || status === 'offline'}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing || status === 'syncing' ? 'animate-spin' : ''}`} />}
            className="text-xs font-semibold"
          >
            {isSyncing || status === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleInitialMigration}
            disabled={isMigrating || status === 'offline'}
            leftIcon={<CloudUpload className={`w-3.5 h-3.5 ${isMigrating ? 'animate-bounce' : ''}`} />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs font-bold"
          >
            {isMigrating ? 'Uploading...' : 'Safe Initial Cloud Upload'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Connection & State</span>
          <div className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'offline'
                  ? 'bg-amber-500'
                  : status === 'syncing'
                  ? 'bg-blue-500'
                  : status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-500'
              }`}
            />
            {status === 'offline'
              ? 'Offline (Local IDB Active)'
              : status === 'syncing'
              ? 'Synchronizing...'
              : status === 'error'
              ? 'Sync Error'
              : 'Connected & Idle'}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Local Outbox Queue</span>
          <div className="font-bold text-slate-800">
            {pendingCount === 0 ? 'All changes synchronized' : `${pendingCount} changes waiting to upload`}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Last Cloud Sync</span>
          <div className="font-bold text-slate-800">
            {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never in this session'}
          </div>
        </div>
      </div>

      {lastError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>Last sync issue: {lastError}</span>
        </div>
      )}

      {migrationSummary && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-800">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Safe Cloud Upload Completed</span>
          </div>
          <div className="text-emerald-700">
            Successfully uploaded <strong>{migrationSummary.uploaded}</strong> new local records. Safely skipped{' '}
            <strong>{migrationSummary.skipped}</strong> existing items (duplicate prevention verified).
          </div>
          {migrationSummary.errors.length > 0 && (
            <div className="text-rose-600 font-medium pt-1">
              {migrationSummary.errors.length} notice(s): {migrationSummary.errors.slice(0, 2).join('; ')}
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
        <strong>Safe Migration Guarantee:</strong> Existing local questions and examination drafts are never
        overwritten or deleted. The initial upload checks existing cloud records first, preventing duplicate
        records while keeping full offline capability active.
      </p>
    </div>
  )
}
