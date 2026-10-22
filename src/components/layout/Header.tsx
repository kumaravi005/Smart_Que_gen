import React from 'react'
import { Link } from 'react-router-dom'
import { Menu, Plus, GraduationCap } from 'lucide-react'
import { NetworkIndicator } from '../common/NetworkIndicator'
import { Button } from '../common/Button'

interface HeaderProps {
  onToggleSidebar: () => void
  onOpenCreateModal: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onOpenCreateModal }) => {

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
                    OMEGA
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                    Edu
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline leading-none">
                  Smart Question Paper Generator
                </span>
              </div>
            </Link>
          </div>

          {/* Right Status & Action */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NetworkIndicator />

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
  )
}
