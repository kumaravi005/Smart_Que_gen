import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Wand2, Plus, Database, Menu } from 'lucide-react'

interface MobileNavProps {
  onOpenCreateModal: () => void
  onOpenSidebar: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenCreateModal, onOpenSidebar }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </NavLink>

        {/* Wizard */}
        <NavLink
          to="/wizard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Wand2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Wizard</span>
        </NavLink>

        {/* Floating Quick Action: Create New Paper */}
        <div className="flex items-center justify-center -mt-6">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 hover:scale-105 active:scale-95 transition-transform border-2 border-white focus:outline-none"
            aria-label="Create New Paper"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Question Bank */}
        <NavLink
          to="/bank"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
              isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Database className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Bank</span>
        </NavLink>

        {/* All Modules Menu */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center w-16 h-12 rounded-xl text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Open Modules Menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Modules</span>
        </button>
      </div>
    </nav>
  )
}
