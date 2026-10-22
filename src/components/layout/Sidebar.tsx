import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
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
  Settings,
  X,
  Sparkles
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  to: string
  label: string
  moduleNum?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const primaryNav: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard }
  ]

  const modulesNav: NavItem[] = [
    { to: '/wizard', label: 'Paper Setup Wizard', moduleNum: '1', icon: Wand2 },
    { to: '/editor', label: 'Question Editor', moduleNum: '2', icon: FileEdit },
    { to: '/bank', label: 'Question Bank', moduleNum: '3', icon: Database },
    { to: '/layout', label: 'Automatic Layout', moduleNum: '4', icon: Layers },
    { to: '/designer', label: 'Visual Designer', moduleNum: '5', icon: Palette },
    { to: '/preview', label: 'Live Preview', moduleNum: '6', icon: Eye },
    { to: '/export', label: 'Export Manager', moduleNum: '7', icon: FileDown },
    { to: '/drafts', label: 'Drafts & Storage', moduleNum: '8', icon: Archive },
    { to: '/ocr', label: 'Image & OCR', moduleNum: '9', icon: ScanText, badge: 'AI' },
    { to: '/voice', label: 'Voice Input', moduleNum: '10', icon: Mic, badge: 'Voice' }
  ]

  const bottomNav: NavItem[] = [
    { to: '/settings', label: 'Settings & Profile', icon: Settings }
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
            <span className="font-bold text-slate-800 tracking-tight">System Navigation</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-mono">
              v1.0
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
            {primaryNav.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={linkClass}
                  end={item.to === '/'}
                >
                  {({ isActive }) => (
                    <div className="flex items-center gap-3">
                      <Icon className={iconClass(isActive)} />
                      <span>{item.label}</span>
                    </div>
                  )}
                </NavLink>
              )
            })}
          </div>

          {/* Logical Modules */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                10 Core Modules
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">
                Offline Ready
              </span>
            </div>
            <div className="space-y-1">
              {modulesNav.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={linkClass}
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 truncate">
                          <Icon className={iconClass(isActive)} />
                          <span className="truncate">
                            <span className={`text-[10px] font-mono mr-1.5 opacity-60 ${isActive ? 'text-white' : ''}`}>
                              {item.moduleNum}.
                            </span>
                            {item.label}
                          </span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>

          {/* Bottom Settings */}
          <div>
            <div className="px-3 mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                System
              </span>
            </div>
            <div className="space-y-1">
              {bottomNav.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={linkClass}
                  >
                    {({ isActive }) => (
                      <div className="flex items-center gap-3">
                        <Icon className={iconClass(isActive)} />
                        <span>{item.label}</span>
                      </div>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center Footer Card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-slate-800 leading-tight">Coaching Center Mode</p>
              <p className="text-slate-500 text-[11px] mt-0.5">IndexedDB saves all changes instantly on device.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
