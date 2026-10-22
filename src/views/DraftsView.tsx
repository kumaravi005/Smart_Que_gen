import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Download,
  Trash2,
  HardDrive,
  CheckCircle2,
  FileQuestion,
  Wand2,
  FileEdit
} from 'lucide-react'
import { usePapers } from '../hooks/usePapers'
import { storageService } from '../services/storageService'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { formatRelativeTime } from '../utils/date'

export const DraftsView: React.FC = () => {
  const navigate = useNavigate()
  const { papers, loading, deletePaper } = usePapers()
  const [backupDownloading, setBackupDownloading] = useState(false)

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
    } catch {
      alert('Failed to generate local backup.')
    } finally {
      setBackupDownloading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete "${title}" from local storage?`)) {
      await deletePaper(id)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Module 8</span>
              <Badge variant="info" size="sm">IndexedDB Engine</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Local Storage & Drafts</h1>
            <p className="text-xs text-slate-500">
              Manage local examination drafts, revisions, and download full database backups.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadBackup}
          isLoading={backupDownloading}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Download JSON Backup
        </Button>
      </div>

      {/* Storage Indicator */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-cyan-300">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">IndexedDB Offline Engine Active</h3>
            <p className="text-xs text-slate-400">
              All paper data, configurations, and questions are saved locally on this browser.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Local Storage Connected</span>
        </div>
      </div>

      {/* Drafts List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">All Examination Drafts</h2>
          <span className="text-xs text-slate-500">{papers.length} Papers Saved</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading drafts...</div>
        ) : papers.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <FileQuestion className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No saved drafts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {papers.map(p => (
              <div
                key={p.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm sm:text-base">
                      {p.title}
                    </span>
                    <Badge variant={p.status === 'ready' ? 'success' : 'warning'} size="sm">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{p.subject}</span>
                    <span>•</span>
                    <span>{p.className}</span>
                    <span>•</span>
                    <span>{p.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>Updated {formatRelativeTime(p.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/wizard?paperId=${p.id}`)}
                    leftIcon={<Wand2 className="w-3.5 h-3.5" />}
                  >
                    Setup
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/editor?paperId=${p.id}`)}
                    leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                  >
                    Editor
                  </Button>
                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
