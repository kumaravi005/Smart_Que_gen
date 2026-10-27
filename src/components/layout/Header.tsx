import React from 'react'
import { Link } from 'react-router-dom'
import {
  Menu,
  Plus,
  LogOut,
  ShieldCheck
} from 'lucide-react'
import { NetworkIndicator } from '../common/NetworkIndicator'
import { Button } from '../common/Button'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  onToggleSidebar: () => void
  onOpenCreateModal: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenCreateModal }) => {
  const { user, profile, institute, isAuthenticated, logout } = useAuth()

  const roleBadgeColors = {
    owner: 'bg-[#FFE600] text-blue-950 border-yellow-400 font-bold shadow-xs',
    admin: 'bg-blue-100 text-[#0055D4] border-blue-200 font-bold',
    teacher: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold'
  }

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : 'Member'

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-t-4 border-[#0055D4] border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left Brand & Mobile Hamburger */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src="/omega-logo.png"
                  alt="Omega Education Centre"
                  className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-xl border border-[#0055D4]/20 shadow-xs group-hover:scale-105 transition-transform shrink-0"
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-[#0055D4] tracking-tight text-sm sm:text-base">
                      {institute?.name || 'OMEGA EDUCATION CENTRE'}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold hidden sm:inline leading-none">
                    {institute?.tagline || 'एक अद्भुत शिक्षण शैली...'}
                  </span>
                </div>
              </Link>
            </div>

            {/* Right Status & Action */}
            <div className="flex items-center gap-2 sm:gap-3">
              <NetworkIndicator />

              {/* User Profile & Sign Out Button */}
              {isAuthenticated && (
                <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                  <div className="hidden md:flex flex-col text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xs font-bold text-slate-900 max-w-[130px] truncate">
                        {profile?.full_name || user?.email?.split('@')[0]}
                      </span>
                      {profile?.role && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                            roleBadgeColors[profile.role] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {profile.role === 'owner' && <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />}
                          {roleLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {institute?.name || 'Shared Institute'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => logout()}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={onOpenCreateModal}
                className="hidden sm:inline-flex shadow-xs"
              >
                New Paper
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
