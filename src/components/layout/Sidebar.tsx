import React from 'react'
import { NavLink, useLocation, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Wand2,
  FileEdit,
  Database,
  Palette,
  Eye,
  FileDown,
  Archive,
  ScanText,
  Mic,
  Settings,
  X,
  Sparkles,
  Layers
} from 'lucide-react'
import { usePapers } from '../../hooks/usePapers'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  stepNum?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [searchParams] = useSearchParams()
  const { papers } = usePapers()
  const { isAuthenticated, profile, role } = useAuth()
  const location = useLocation()

  // Get active or most recent paper ID for contextual workflow navigation
  const activePaperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const paperQuery = activePaperId ? `?paperId=${activePaperId}` : ''

  const mainNav: NavItem[] = [
    { to: '/', label: 'Home Dashboard', icon: LayoutDashboard },
    { to: `/drafts${paperQuery}`, label: 'My Papers & Drafts', icon: Archive }
  ]

  const workflowSteps: NavItem[] = [
    {
      to: `/wizard${paperQuery}`,
      label: '1. Exam Setup',
      stepNum: '1',
      icon: Wand2,
      badge: 'Step 1'
    },
    {
      to: `/editor${paperQuery}`,
      label: '2. Question Editor',
      stepNum: '2',
      icon: FileEdit,
      badge: 'Step 2'
    },
    {
      to: `/preview${paperQuery}`,
      label: '3. Preview & Print',
      stepNum: '3',
      icon: Eye,
      badge: 'Step 3'
    }
  ]

  const questionTools: NavItem[] = [
    { to: `/ocr${paperQuery}`, label: 'Scan Photo (OCR)', icon: ScanText, badge: 'Camera' },
    { to: `/voice${paperQuery}`, label: 'Voice Dictation', icon: Mic, badge: 'Voice' },
    { to: '/bank', label: 'Question Bank', icon: Database }
  ]

  const layoutAndExports: NavItem[] = [
    { to: `/designer${paperQuery}`, label: 'Visual Paper Designer', icon: Palette },
    { to: `/layout${paperQuery}`, label: 'Automatic Layout', icon: Layers },
    { to: `/export${paperQuery}`, label: 'Export Word & Excel', icon: FileDown }
  ]

  const bottomNav: NavItem[] = [
    { to: '/settings', label: 'Institute Profile & Settings', icon: Settings }
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group ${
      isActive
        ? 'bg-blue-600 text-white shadow-xs font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
    }`

  const iconClass = (isActive: boolean) =>
    `w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
    }`

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header in Drawer */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 tracking-tight">Omega Question Hub</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
              Coaching v1.0
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNav.map(item => {
              const Icon = item.icon
              const isItemActive = location.pathname === item.to.split('?')[0]
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={() => linkClass({ isActive: isItemActive })}
                  end={item.to === '/'}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={iconClass(isItemActive)} />
                    <span>{item.label}</span>
                  </div>
                </NavLink>
              )
            })}
          </div>

          {/* Standard 3-Step Paper Creation Workflow */}
          <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200/80">
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                Create a Paper (3 Steps)
              </span>
              <span className="text-[10px] text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded font-semibold">
                Guided
              </span>
            </div>
            <div className="space-y-1">
              {workflowSteps.map(item => {
                const Icon = item.icon
                const isItemActive = location.pathname === item.to.split('?')[0]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={() => linkClass({ isActive: isItemActive })}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={iconClass(isItemActive)} />
                      <span className="font-medium text-xs sm:text-sm truncate">{item.label}</span>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Question Input Tools */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Input Tools
              </span>
            </div>
            <div className="space-y-1">
              {questionTools.map(item => {
                const Icon = item.icon
                const isItemActive = location.pathname === item.to.split('?')[0]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={() => linkClass({ isActive: isItemActive })}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={iconClass(isItemActive)} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Layout & Export */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Layout & Export
              </span>
            </div>
            <div className="space-y-1">
              {layoutAndExports.map(item => {
                const Icon = item.icon
                const isItemActive = location.pathname === item.to.split('?')[0]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={() => linkClass({ isActive: isItemActive })}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={iconClass(isItemActive)} />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Bottom Settings */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Settings
              </span>
            </div>
            <div className="space-y-1">
              {bottomNav.map(item => {
                const Icon = item.icon
                const isItemActive = location.pathname === item.to.split('?')[0]
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={() => linkClass({ isActive: isItemActive })}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={iconClass(isItemActive)} />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center Footer Card */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">
              {isAuthenticated ? profile?.full_name || 'Logged In' : 'Coaching Mode'}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ml-auto shrink-0 ${
                isAuthenticated
                  ? 'bg-blue-100 text-blue-700 uppercase'
                  : 'text-emerald-700 bg-emerald-50'
              }`}
            >
              {isAuthenticated ? role || 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
