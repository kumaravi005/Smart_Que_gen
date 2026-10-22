import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Download,
  Upload,
  Trash2,
  HardDrive,
  CheckCircle2,
  FileQuestion,
  Wand2,
  FileEdit,
  Wifi,
  WifiOff,
  AlertCircle,
  Bookmark,
  Printer
} from 'lucide-react'
import { usePapers } from '../hooks/usePapers'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { storageService } from '../services/storageService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { ChangeTemplateModal } from '../components/common/ChangeTemplateModal'
import { formatRelativeTime } from '../utils/date'

export const DraftsView: React.FC = () => {
  const navigate = useNavigate()
  const { papers, loading, deletePaper, refresh } = usePapers()
  const { isOnline } = useNetworkStatus()

  const [backupDownloading, setBackupDownloading] = useState(false)
  const [backupRestoring, setBackupRestoring] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [templateModalPaper, setTemplateModalPaper] = useState<{ id: string; title: string } | null>(null)

  const handleDownloadBackup = async () => {
    try {
      setBackupDownloading(true)
      const jsonStr = await storageService.exportBackup()
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `omega_backup_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatusMessage('Full database JSON backup successfully downloaded!')
      setTimeout(() => setStatusMessage(null), 4000)
    } catch {
      setErrorMessage('Failed to generate local backup.')
    } finally {
      setBackupDownloading(false)
    }
  }

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        setBackupRestoring(true)
        const jsonText = reader.result as string
        await storageService.importBackup(jsonText)
        await refresh()
        setStatusMessage('Database backup successfully restored to IndexedDB!')
        setTimeout(() => setStatusMessage(null), 5000)
      } catch (err: any) {
        setErrorMessage(`Backup restoration failed: ${err.message || 'Invalid format'}`)
      } finally {
        setBackupRestoring(false)
      }
    }
    reader.readAsText(file)
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete "${title}" from local storage? This action cannot be undone.`)) {
      await deletePaper(id)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Saved Papers</span>
              <Badge variant="info" size="sm">Device Storage</Badge>
              {isOnline ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-3 h-3" /> Offline Ready
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">My Examination Papers & Backups</h1>
            <p className="text-xs text-slate-500">
              All your question papers are saved securely on this device. You can reopen them anytime offline or export a backup.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Restore JSON Backup */}
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestoreBackup}
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors">
              <Upload className="w-3.5 h-3.5 text-cyan-600" />
              <span>{backupRestoring ? 'Restoring...' : 'Restore Backup'}</span>
            </span>
          </label>

          {/* Download JSON Backup */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadBackup}
            isLoading={backupDownloading}
            leftIcon={<Download className="w-4 h-4 text-cyan-600" />}
          >
            Download JSON Backup
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Offline Verification Card */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10 text-cyan-300 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>IndexedDB Offline Engine Active</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                100% Client-Side
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              All paper configurations, questions, visual layouts, and templates are saved locally on this browser. You can safely disconnect from the internet and continue creating, editing, and previewing papers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 shrink-0 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <CheckCircle2 className="w-4 h-4" />
          <span>Local Persistence Verified</span>
        </div>
      </div>

      {/* Drafts List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Saved Examination Papers</h2>
          <Badge variant="primary" size="sm">{papers.length} Papers in Storage</Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading drafts from IndexedDB...</div>
        ) : papers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileQuestion className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Saved Drafts Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new paper from the Setup Wizard or Dashboard to get started.
            </p>
            <Button variant="primary" size="sm" onClick={() => navigate('/wizard')}>
              Create Paper
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {papers.map(p => (
              <div
                key={p.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">
                      {p.title}
                    </span>
                    <Badge variant={p.status === 'ready' ? 'success' : 'warning'} size="sm">
                      {p.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{p.subject}</span>
                    <span>•</span>
                    <span>{p.className}</span>
                    <span>•</span>
                    <span>{p.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{p.totalMarks} Marks</span>
                    <span>•</span>
                    <span>Updated {formatRelativeTime(p.updatedAt)}</span>
                  </div>
                </div>

                {/* One-Click Action Buttons for this paper */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/editor?paperId=${p.id}`)}
                    title="Edit or Add Questions"
                    leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                  >
                    Edit Questions
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/preview?paperId=${p.id}`)}
                    title="Print or Export to PDF/Word/Excel"
                    leftIcon={<Printer className="w-3.5 h-3.5 text-emerald-600" />}
                    className="border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                  >
                    Export / Print
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateModalPaper({ id: p.id, title: p.title })}
                    title="Apply a different examination blueprint/layout"
                    leftIcon={<Bookmark className="w-3.5 h-3.5 text-purple-600" />}
                  >
                    Change Template
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/wizard?paperId=${p.id}`)}
                    title="Edit Exam Details & Instructions"
                    leftIcon={<Wand2 className="w-3.5 h-3.5 text-slate-500" />}
                  >
                    Setup
                  </Button>

                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Template Modal */}
      {templateModalPaper && (
        <ChangeTemplateModal
          isOpen={!!templateModalPaper}
          onClose={() => setTemplateModalPaper(null)}
          paperId={templateModalPaper.id}
          paperTitle={templateModalPaper.title}
          onApplied={async () => {
            await refresh()
            setStatusMessage(`Template updated successfully for "${templateModalPaper.title}"!`)
            setTimeout(() => setStatusMessage(null), 4000)
          }}
        />
      )}
    </div>
  )
}
