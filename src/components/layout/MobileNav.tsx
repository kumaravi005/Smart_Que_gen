import React from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { LayoutDashboard, Wand2, Plus, FileEdit, Eye } from 'lucide-react'
import { usePapers } from '../../hooks/usePapers'

interface MobileNavProps {
  onOpenCreateModal: () => void
  onOpenSidebar: () => void
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenCreateModal }) => {
  const [searchParams] = useSearchParams()
  const { papers } = usePapers()

  const activePaperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const paperQuery = activePaperId ? `?paperId=${activePaperId}` : ''

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {/* Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
              isActive ? 'text-[#0055D4] font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
        </NavLink>

        {/* Step 1: Setup */}
        <NavLink
          to={`/wizard${paperQuery}`}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
              isActive ? 'text-[#0055D4] font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Wand2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">1. Setup</span>
        </NavLink>

        {/* Floating Quick Action: Create New Paper */}
        <div className="flex items-center justify-center -mt-6">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-13 h-13 rounded-full bg-[#0055D4] text-white flex items-center justify-center shadow-lg shadow-blue-900/30 hover:scale-105 active:scale-95 transition-transform border-2 border-[#FFE600] focus:outline-none"
            aria-label="Create New Paper"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Step 2: Questions */}
        <NavLink
          to={`/editor${paperQuery}`}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
              isActive ? 'text-[#0055D4] font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <FileEdit className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">2. Questions</span>
        </NavLink>

        {/* Step 3: Preview */}
        <NavLink
          to={`/preview${paperQuery}`}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all ${
              isActive ? 'text-[#0055D4] font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Eye className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">3. Preview</span>
        </NavLink>
      </div>
    </nav>
  )
}
