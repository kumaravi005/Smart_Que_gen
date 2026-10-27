import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { CreatePaperModal } from '../common/CreatePaperModal'
import { syncService } from '../../services/syncService'

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    syncService.init()
    return () => {
      syncService.unsubscribeRealtime()
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased overflow-x-clip selection:bg-[#0055D4] selection:text-white">
      {/* Top Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      {/* Main Container with Sidebar + Outlet */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 min-w-0 pb-24 lg:pb-12 px-3 sm:px-6 lg:px-8 py-3 sm:py-5 overflow-x-clip">
          <Outlet context={{ openCreateModal: () => setCreateModalOpen(true) }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {/* Reusable Create Paper Modal */}
      <CreatePaperModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
