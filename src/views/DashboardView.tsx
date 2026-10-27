import React from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Plus,
  Wand2,
  FileEdit,
  Database,
  Palette,
  FileDown,
  Archive,
  ScanText,
  Mic,
  Clock,
  Trash2,
  ArrowRight,
  FileQuestion,
  Printer,
  User
} from 'lucide-react'
import { usePapers } from '../hooks/usePapers'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { formatRelativeTime } from '../utils/date'

interface OutletContextType {
  openCreateModal: () => void
}

export const DashboardView: React.FC = () => {
  const navigate = useNavigate()
  const { openCreateModal } = useOutletContext<OutletContextType>()
  const { papers, loading, error, deletePaper } = usePapers()
  const { profile, role, user } = useAuth()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Teacher'
  const userInitials = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : displayName.charAt(0).toUpperCase()

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await deletePaper(id)
      } catch {
        alert('Failed to delete paper.')
      }
    }
  }

  const latestPaper = papers.length > 0 ? papers[0] : null
  const totalQuestionsSum = papers.reduce((acc, p) => acc + (p.totalQuestions || 0), 0)

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto pb-8">
      {/* 1. Hero Section: Mobile-First Responsive Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-sm overflow-hidden transition-all">
          {/* Top Accent Strip with Omega Royal Blue & Yellow */}
          <div className="h-1 bg-gradient-to-r from-[#0055D4] via-[#FFE600] to-[#047857]" />

          <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-3.5">
            {/* Main Hero Header: Stacks vertically on mobile/tablet, horizontal on desktop */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
              {/* Welcome & Teacher Profile Header */}
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0055D4] to-blue-700 text-white font-black text-sm sm:text-base flex items-center justify-center shadow-xs border-2 border-white ring-2 ring-[#0055D4]/15">
                    {userInitials ? userInitials : <User className="w-5 h-5 text-white" />}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Online" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {role === 'owner' ? 'Institute Admin' : 'Teacher Workspace'}
                    </span>
                    {role && (
                      <Badge variant={role === 'owner' ? 'omega' : 'primary'} size="sm">
                        {role.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5 truncate">
                    Welcome, {displayName}
                  </h1>
                </div>
              </div>

            {/* Primary Action Buttons: Touch-friendly full-width 2-column grid on mobile, horizontal cluster on desktop */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full lg:w-auto lg:flex lg:items-center shrink-0">
              <Button
                variant="omega"
                size="md"
                leftIcon={<Plus className="w-4 h-4 text-blue-950 shrink-0" />}
                onClick={openCreateModal}
                className="w-full lg:w-auto justify-center font-bold text-xs sm:text-sm shadow-xs h-11 sm:h-10 px-3"
              >
                Create Paper
              </Button>
              <Button
                variant="outline"
                size="md"
                leftIcon={<Archive className="w-4 h-4 text-slate-600 shrink-0" />}
                onClick={() => navigate('/drafts')}
                className="w-full lg:w-auto justify-center font-semibold text-xs sm:text-sm h-11 sm:h-10 px-3 truncate"
              >
                Saved Papers ({papers.length})
              </Button>
            </div>
          </div>

          {/* Statistics Strip: Responsive compact cards with big readable metric first */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-slate-50/90 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-slate-200/70 text-center sm:text-left flex flex-col justify-center">
              <span className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {papers.length}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 sm:mt-1.5 truncate">
                Exam Papers
              </span>
            </div>

            <div className="bg-slate-50/90 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-slate-200/70 text-center sm:text-left flex flex-col justify-center">
              <span className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {totalQuestionsSum}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 sm:mt-1.5 truncate">
                Questions
              </span>
            </div>

            <div className="bg-slate-50/90 rounded-xl sm:rounded-2xl p-2 sm:p-3 border border-slate-200/70 text-center sm:text-left flex flex-col justify-center">
              <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 text-xs sm:text-sm font-bold text-[#047857] leading-none">
                <span className="w-2 h-2 rounded-full bg-[#047857] shrink-0 animate-pulse" />
                <span className="truncate">Offline</span>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 sm:mt-1.5 truncate">
                Storage
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Active / Recent Paper Quick Resume */}
      {latestPaper && (
        <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white rounded-2xl sm:rounded-3xl border border-blue-200/80 border-l-4 border-l-[#0055D4] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0055D4] bg-blue-100/70 px-2 py-0.5 rounded-full">
                  Recent Active Paper
                </span>
                <span className="text-xs text-slate-500">
                  {formatRelativeTime(latestPaper.updatedAt)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {latestPaper.title}
              </h2>
              <p className="text-xs text-slate-600">
                {latestPaper.totalQuestions || 0} questions &bull;{' '}
                <span className="font-medium text-slate-700 capitalize">
                  {latestPaper.status === 'ready' ? 'Ready to Print' : 'Drafting'}
                </span>
              </p>
            </div>

            {/* Touch-Friendly 3-Step Navigation */}
            <div className="grid grid-cols-3 sm:flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/wizard?paperId=${latestPaper.id}`)}
                leftIcon={<Wand2 className="w-3.5 h-3.5 text-purple-600" />}
                className="w-full sm:w-auto text-xs"
              >
                1. Setup
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/editor?paperId=${latestPaper.id}`)}
                leftIcon={<FileEdit className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto text-xs"
              >
                2. Questions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/preview?paperId=${latestPaper.id}`)}
                leftIcon={<Printer className="w-3.5 h-3.5 text-emerald-600" />}
                className="w-full sm:w-auto text-xs"
              >
                3. Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Recent Question Papers List */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Papers</h2>
            <Badge variant="primary" size="sm">
              {papers.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/drafts')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="text-xs font-semibold text-[#0055D4]"
          >
            Manage All
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="inline-block w-5 h-5 border-2 border-[#0055D4] border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs font-medium">Loading saved drafts...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600">
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="p-8 sm:p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0055D4] flex items-center justify-center mx-auto">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">No question papers created yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Configure your first examination paper to get started.
              </p>
            </div>
            <Button
              variant="omega"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-blue-950" />}
              onClick={openCreateModal}
            >
              Create First Paper
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {papers.slice(0, 5).map(paper => (
              <div
                key={paper.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-bold text-slate-900 hover:text-[#0055D4] text-sm cursor-pointer truncate"
                      onClick={() => navigate(`/editor?paperId=${paper.id}`)}
                    >
                      {paper.title}
                    </span>
                    <Badge variant={paper.status === 'ready' ? 'success' : 'warning'} size="sm">
                      {paper.status === 'ready' ? 'Ready' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {formatRelativeTime(paper.updatedAt)}
                    </span>
                    <span>&bull;</span>
                    <span className="font-semibold text-slate-700">
                      {paper.totalQuestions || 0} Questions
                    </span>
                  </div>
                </div>

                {/* Direct Action Buttons: touch-friendly on mobile without overflow */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t border-slate-100 sm:border-0">
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/editor?paperId=${paper.id}`)}
                      leftIcon={<FileEdit className="w-3.5 h-3.5 text-[#0055D4]" />}
                      className="flex-1 sm:flex-initial text-xs"
                    >
                      Questions
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/preview?paperId=${paper.id}`)}
                      leftIcon={<Printer className="w-3.5 h-3.5 text-emerald-600" />}
                      className="flex-1 sm:flex-initial text-xs"
                    >
                      Print
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/export?paperId=${paper.id}`)}
                      leftIcon={<FileDown className="w-3.5 h-3.5 text-slate-500" />}
                      className="hidden sm:inline-flex text-xs"
                    >
                      Export
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(paper.id, paper.title)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shrink-0"
                    title="Delete paper"
                    aria-label="Delete paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Fast Input & Tools Shortcuts */}
      <div className="space-y-2.5">
        <h2 className="text-sm sm:text-base font-bold text-slate-900">Essential Question Tools</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div
            onClick={() => navigate('/bank')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-[#0055D4] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-blue-50 text-[#0055D4] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-[#0055D4] transition-colors">Question Bank</span>
              <span className="text-[11px] text-slate-500">Reuse curated questions</span>
            </div>
          </div>

          <div
            onClick={() => navigate(latestPaper ? `/ocr?paperId=${latestPaper.id}` : '/ocr')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-[#0055D4] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ScanText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-[#0055D4] transition-colors">Scan Photo (OCR)</span>
              <span className="text-[11px] text-slate-500">Extract questions from images</span>
            </div>
          </div>

          <div
            onClick={() => navigate(latestPaper ? `/voice?paperId=${latestPaper.id}` : '/voice')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-[#0055D4] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-[#0055D4] transition-colors">Voice Dictation</span>
              <span className="text-[11px] text-slate-500">Speak MCQ & options</span>
            </div>
          </div>

          <div
            onClick={() => navigate(latestPaper ? `/designer?paperId=${latestPaper.id}` : '/designer')}
            className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-[#0055D4] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="p-2 w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm text-slate-900 block group-hover:text-[#0055D4] transition-colors">Visual Designer</span>
              <span className="text-[11px] text-slate-500">Customize paper styling</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
