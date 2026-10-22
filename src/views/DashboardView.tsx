import React from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Plus,
  Wand2,
  FileEdit,
  Database,
  Layers,
  Palette,
  Eye,
  FileDown,
  Archive,
  ScanText,
  Mic,
  GraduationCap,
  Clock,
  Trash2,
  ArrowRight,
  HardDrive,
  FileQuestion,
  ExternalLink
} from 'lucide-react'
import { usePapers } from '../hooks/usePapers'
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

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await deletePaper(id)
      } catch {
        alert('Failed to delete paper.')
      }
    }
  }

  const modules = [
    {
      num: 1,
      title: 'Paper Setup Wizard',
      desc: 'Configure exam structure, sections, marking schemes, and time before question entry.',
      path: '/wizard',
      icon: Wand2,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      num: 2,
      title: 'Question Editor',
      desc: 'Rich editing for MCQs, short/long answers, internal choices, hints, and diagrams.',
      path: '/editor',
      icon: FileEdit,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      num: 3,
      title: 'Question Bank',
      desc: 'Reusable repository tagged by subject, grade, difficulty, and previous exam usage.',
      path: '/bank',
      icon: Database,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      num: 4,
      title: 'Automatic Layout Engine',
      desc: 'Multi-column balancing, page break management, and spacing calculation.',
      path: '/layout',
      icon: Layers,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      num: 5,
      title: 'Visual Paper Designer',
      desc: 'Customizable institute headers, logos, watermarks, borders, and typography.',
      path: '/designer',
      icon: Palette,
      color: 'bg-pink-50 text-pink-700 border-pink-200'
    },
    {
      num: 6,
      title: 'Live Preview',
      desc: 'Real-time print layout rendering with zoom, page navigation, and mobile view.',
      path: '/preview',
      icon: Eye,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      num: 7,
      title: 'Export Manager',
      desc: 'Export to print-ready PDF, editable Microsoft Word DOCX, and Excel XLSX.',
      path: '/export',
      icon: FileDown,
      color: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
      num: 8,
      title: 'Drafts & Local Storage',
      desc: 'Full IndexedDB persistence, revision history, and offline data backups.',
      path: '/drafts',
      icon: Archive,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    },
    {
      num: 9,
      title: 'Image & OCR Processing',
      desc: 'Extract questions, diagrams, and options directly from textbook photos.',
      path: '/ocr',
      icon: ScanText,
      color: 'bg-violet-50 text-violet-700 border-violet-200',
      badge: 'AI Vision'
    },
    {
      num: 10,
      title: 'Voice Input',
      desc: 'Dictate questions and multiple-choice options with speech-to-text formatting.',
      path: '/voice',
      icon: Mic,
      color: 'bg-teal-50 text-teal-700 border-teal-200',
      badge: 'Speech'
    }
  ]

  const totalQuestionsSum = papers.reduce((acc, p) => acc + (p.totalQuestions || 0), 0)

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Primary Action Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/15">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-blue-200 text-xs font-medium border border-white/10">
              <GraduationCap className="w-3.5 h-3.5 text-blue-300" />
              <span>Omega Education Center — Coaching & Assessment Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Smart Question Paper Generator
            </h1>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Create, format, and export examinations with automated layout, MCQ formatting,
              and offline IndexedDB persistence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={openCreateModal}
              className="bg-white text-blue-900 hover:bg-blue-50 active:bg-blue-100 shadow-lg shadow-black/10 border-0"
            >
              Create New Paper
            </Button>
            <Button
              variant="outline"
              size="lg"
              leftIcon={<Database className="w-5 h-5" />}
              onClick={() => navigate('/bank')}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30"
            >
              Question Bank
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Statistics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Total Papers
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileQuestion className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{papers.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Stored locally in IndexedDB</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Questions
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileEdit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalQuestionsSum}</div>
          <div className="mt-1 text-[11px] text-slate-500">Across all draft sections</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Storage Health
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 flex items-center gap-1.5">
            <span>100%</span>
            <span className="text-xs font-normal text-emerald-700">IndexedDB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">No cloud dependency</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
              Target Users
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">3–4 Staff</div>
          <div className="mt-1 text-[11px] text-slate-500">Omega Coaching Center</div>
        </div>
      </div>

      {/* Recent Papers / Drafts Section */}
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
            View All
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading examination drafts from IndexedDB...</p>
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
              Get started by launching the Paper Setup Wizard to configure your first examination.
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
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-semibold text-slate-900 hover:text-blue-600 text-sm sm:text-base cursor-pointer"
                      onClick={() => navigate(`/wizard?paperId=${paper.id}`)}
                    >
                      {paper.title}
                    </span>
                    <Badge variant={paper.status === 'ready' ? 'success' : 'warning'} size="sm">
                      {paper.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      • {paper.subject} ({paper.className})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      Total Marks: {paper.totalMarks}
                    </span>
                    <span>•</span>
                    <span>{paper.totalQuestions} Questions</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {formatRelativeTime(paper.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/wizard?paperId=${paper.id}`)}
                    title="Configure examination details"
                  >
                    Setup
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/editor?paperId=${paper.id}`)}
                    title="Edit questions and options"
                  >
                    Questions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/preview?paperId=${paper.id}`)}
                    title="Preview layout"
                  >
                    Preview
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(paper.id, paper.title)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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

      {/* 10 Core Modules Architecture Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Application Architecture</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              The 10 modular components powering the Omega Smart Question Paper Generator
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
            Phase 1 Foundation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(mod => {
            const Icon = mod.icon
            return (
              <div
                key={mod.num}
                onClick={() => navigate(mod.path)}
                className="group relative bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-blue-400 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {mod.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 uppercase tracking-wider">
                          {mod.badge}
                        </span>
                      )}
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        #{mod.num}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base flex items-center justify-between">
                    <span>{mod.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{mod.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
