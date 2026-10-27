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
  Printer
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
  const { profile, institute, role } = useAuth()

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
    <div className="space-y-8 animate-in fade-in duration-300 max-w-6xl mx-auto pb-12">
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#003B94] via-[#0055D4] to-[#0041a8] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/20 border-2 border-[#0055D4]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-48 h-48 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="bg-white p-2 rounded-2xl border-2 border-[#FFE600] shrink-0 shadow-md">
              <img
                src="/omega-logo.png"
                alt="Omega Education Centre"
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFE600] text-blue-950 text-xs font-bold shadow-xs">
                <span>{institute?.name || 'Omega Education Centre'}</span>
                {papers.length > 0 && (
                  <span className="ml-1 pl-2 border-l border-blue-900/30 text-blue-900 font-bold">
                    {papers.length} Papers • {totalQuestionsSum} Questions
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                {profile?.full_name ? `Welcome, ${profile.full_name}` : 'Omega Question Paper Generator'}
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
                Signed in as <strong className="text-white capitalize">{role || 'faculty member'}</strong>. Access your shared institute question bank, build question papers, and export to A4 PDF, Word, or Excel.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="w-5 h-5 text-blue-950" />}
              onClick={openCreateModal}
              className="bg-[#FFE600] text-blue-950 hover:bg-[#f2db00] active:bg-[#e0cb00] shadow-lg shadow-black/15 border-0 font-bold"
            >
              + Create New Paper
            </Button>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Archive className="w-5 h-5" />}
              onClick={() => navigate('/drafts')}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 font-semibold"
            >
              My Saved Papers ({papers.length})
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Continue Working on Recent Paper Banner (If available) */}
      {latestPaper && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 rounded-3xl border border-blue-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                Recent Active Paper
              </span>
              <span className="text-xs text-slate-500">
                Last edited {formatRelativeTime(latestPaper.updatedAt)}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {latestPaper.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {latestPaper.totalQuestions || 0} Questions Added • {latestPaper.status === 'ready' ? 'Ready to Print' : 'Drafting'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate(`/wizard?paperId=${latestPaper.id}`)}
              leftIcon={<Wand2 className="w-4 h-4 text-purple-600" />}
            >
              1. Setup
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/editor?paperId=${latestPaper.id}`)}
              leftIcon={<FileEdit className="w-4 h-4" />}
            >
              2. Edit Questions
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(`/preview?paperId=${latestPaper.id}`)}
              leftIcon={<Printer className="w-4 h-4 text-emerald-600" />}
            >
              3. Preview & Print
            </Button>
          </div>
        </div>
      )}

      {/* 3. The 3-Step Guided Process (Non-Tech Friendly Explanation) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">How It Works in 3 Steps</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              No technical expertise required — follow these three simple steps to prepare your examination.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 Card */}
          <div
            onClick={() => navigate(latestPaper ? `/wizard?paperId=${latestPaper.id}` : '/wizard')}
            className="group bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base border border-blue-100">
                  1
                </div>
                <Badge variant="primary" size="sm">Step 1</Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                Exam Details & Setup
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Set Institute name, exam title, subject, grade, duration, maximum marks, and instructions.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>Open Setup Wizard</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Step 2 Card */}
          <div
            onClick={() => navigate(latestPaper ? `/editor?paperId=${latestPaper.id}` : '/editor')}
            className="group bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base border border-indigo-100">
                  2
                </div>
                <Badge variant="info" size="sm">Step 2</Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                Add & Edit Questions
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Type questions directly, paste whole exams at once, speak by voice, or scan from a textbook photo.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>Open Question Editor</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Step 3 Card */}
          <div
            onClick={() => navigate(latestPaper ? `/preview?paperId=${latestPaper.id}` : '/preview')}
            className="group bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base border border-emerald-100">
                  3
                </div>
                <Badge variant="success" size="sm">Step 3</Badge>
              </div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                Preview & Print Paper
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                See realistic A4 pagination. One-click print to high-res vector PDF, or download in Word and Excel.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
              <span>View & Print Paper</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Papers & Drafts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Recent Question Papers</h2>
            <Badge variant="primary" size="sm">
              {papers.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/drafts')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Manage All ({papers.length})
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Loading examination drafts from device storage...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileQuestion className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No question papers created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Get started by clicking the button below to configure your first examination.
            </p>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openCreateModal}
            >
              Create First Paper
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {papers.map(paper => (
              <div
                key={paper.id}
                className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-bold text-slate-900 hover:text-blue-600 text-sm sm:text-base cursor-pointer"
                      onClick={() => navigate(`/editor?paperId=${paper.id}`)}
                    >
                      {paper.title}
                    </span>
                    <Badge variant={paper.status === 'ready' ? 'success' : 'warning'} size="sm">
                      {paper.status === 'ready' ? 'Ready' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {formatRelativeTime(paper.updatedAt)}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">
                      {paper.totalQuestions || 0} Questions
                    </span>
                  </div>
                </div>

                {/* Direct Action Buttons for each paper */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/editor?paperId=${paper.id}`)}
                    leftIcon={<FileEdit className="w-3.5 h-3.5 text-blue-600" />}
                  >
                    Questions
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/preview?paperId=${paper.id}`)}
                    leftIcon={<Printer className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    Print
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/export?paperId=${paper.id}`)}
                    leftIcon={<FileDown className="w-3.5 h-3.5 text-slate-500" />}
                  >
                    Export
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(paper.id, paper.title)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Delete paper"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Helpful Input Tools Quick Access */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Fast Input & Design Tools</h2>
            <p className="text-xs text-slate-500">
              Shortcuts for scanning textbook images, voice dictation, and question banking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => navigate(latestPaper ? `/ocr?paperId=${latestPaper.id}` : '/ocr')}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600 group-hover:scale-105 transition-transform">
                <ScanText className="w-5 h-5" />
              </div>
              <Badge variant="purple" size="sm">Camera</Badge>
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block">Scan from Photo</span>
              <span className="text-[11px] text-slate-400">OCR text & crop diagrams</span>
            </div>
          </div>

          <div
            onClick={() => navigate(latestPaper ? `/voice?paperId=${latestPaper.id}` : '/voice')}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-teal-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-teal-50 text-teal-600 group-hover:scale-105 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <Badge variant="success" size="sm">Voice</Badge>
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block">Voice Dictation</span>
              <span className="text-[11px] text-slate-400">Speak MCQ options aloud</span>
            </div>
          </div>

          <div
            onClick={() => navigate('/bank')}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <Badge variant="warning" size="sm">Bank</Badge>
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block">Question Bank</span>
              <span className="text-[11px] text-slate-400">Reuse curated questions</span>
            </div>
          </div>

          <div
            onClick={() => navigate(latestPaper ? `/designer?paperId=${latestPaper.id}` : '/designer')}
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-pink-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-xl bg-pink-50 text-pink-600 group-hover:scale-105 transition-transform">
                <Palette className="w-5 h-5" />
              </div>
              <Badge variant="purple" size="sm">Visual</Badge>
            </div>
            <div>
              <span className="font-bold text-xs text-slate-900 block">Visual Designer</span>
              <span className="text-[11px] text-slate-400">Drag & drop layout customization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
