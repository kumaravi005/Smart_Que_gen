import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Palette,
  Undo2,
  Redo2,
  Eye,
  FileEdit,
  Sliders,
  Type,
  Square,
  Minus,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  BookmarkPlus,
  AlertTriangle
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import { Modal } from '../components/common/Modal'
import { DesignerCanvas } from '../components/designer/DesignerCanvas'
import { DesignerPropertiesPanel } from '../components/designer/DesignerPropertiesPanel'
import { paginatePaper, getPhysicalPageDimensions } from '../utils/paginationEngine'
import { convertAutomaticToManualElements, checkElementOverlaps } from '../utils/designerConversion'
import { templateService } from '../services/templateService'
import { generateId } from '../utils/id'
import type { DesignerElement, DesignMode } from '../types'

export const DesignerView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers, loading: papersLoading } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading: paperLoading, saveLayout } = usePaperDetails(paperId)

  // Synchronize paperId in URL
  useEffect(() => {
    if (!searchParams.get('paperId') && papers.length > 0) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('paperId', papers[0].id)
        return next
      }, { replace: true })
    }
  }, [papers, searchParams, setSearchParams])

  // Design state
  const [mode, setMode] = useState<DesignMode>('automatic')
  const [activePageIndex, setActivePageIndex] = useState<number>(0)
  const [elements, setElements] = useState<DesignerElement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(100)
  const [isMobilePropertiesOpen, setIsMobilePropertiesOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('Saved to IndexedDB')

  // History for Undo / Redo
  const [history, setHistory] = useState<DesignerElement[][]>([])
  const [future, setFuture] = useState<DesignerElement[][]>([])

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isModeSwitchModalOpen, setIsModeSwitchModalOpen] = useState(false)

  // Initialize or hydrate manual design elements from paper layout or automatic pagination
  useEffect(() => {
    if (!paper) return
    const currentDesignData = paper.layout?.designData

    if (currentDesignData && currentDesignData.elements && currentDesignData.elements.length > 0) {
      setMode(currentDesignData.mode || 'automatic')
      setElements(currentDesignData.elements)
      if (currentDesignData.activePage !== undefined) {
        setActivePageIndex(currentDesignData.activePage)
      }
    } else {
      // Initialize elements from automatic pagination
      const pagination = paginatePaper({
        settings: paper.settings,
        content: paper.content,
        layout: paper.layout
      })
      const converted = convertAutomaticToManualElements(pagination, paper.layout)
      setElements(converted)
      setMode('automatic')
    }
  }, [paper?.metadata?.id])

  // Push state to undo history before mutations
  const pushHistory = useCallback((currentElements: DesignerElement[]) => {
    setHistory(prev => [...prev.slice(-25), currentElements])
    setFuture([])
  }, [])

  // Auto-save debounced helper
  const persistElements = useCallback(
    async (updatedElements: DesignerElement[], updatedMode?: DesignMode) => {
      if (!paper) return
      try {
        setSaveStatus('Saving...')
        const finalMode = updatedMode || mode
        await saveLayout({
          ...paper.layout,
          designData: {
            mode: finalMode,
            elements: updatedElements,
            activePage: activePageIndex
          }
        })
        setSaveStatus('Saved to IndexedDB')
      } catch (err) {
        console.error('Failed to save layout:', err)
        setSaveStatus('Save error')
      }
    },
    [paper, mode, activePageIndex, saveLayout]
  )

  // Undo Handler
  const handleUndo = () => {
    if (history.length === 0) return
    const previous = history[history.length - 1]
    setFuture(prev => [elements, ...prev])
    setHistory(prev => prev.slice(0, -1))
    setElements(previous)
    persistElements(previous)
  }

  // Redo Handler
  const handleRedo = () => {
    if (future.length === 0) return
    const next = future[0]
    setHistory(prev => [...prev, elements])
    setFuture(prev => prev.slice(1))
    setElements(next)
    persistElements(next)
  }

  // Update single element
  const handleUpdateElement = (updated: DesignerElement) => {
    pushHistory(elements)
    const newElements = elements.map(el => (el.id === updated.id ? updated : el))
    setElements(newElements)
    persistElements(newElements)
  }

  // Add new element
  const handleAddElement = (type: DesignerElement['type']) => {
    if (!paper) return
    pushHistory(elements)

    const margins = paper.layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }
    const dimensions = getPhysicalPageDimensions(paper.layout.pageSize, paper.layout.orientation)
    const printableWidth = dimensions.width - margins.left - margins.right

    let newEl: DesignerElement = {
      id: generateId('el'),
      type,
      pageIndex: activePageIndex,
      x: margins.left + 10,
      y: margins.top + 20,
      width: Math.min(100, printableWidth),
      height: 20,
      zIndex: elements.length + 1,
      fontSizePt: paper.layout.fontSizePt || 11,
      paddingMm: 2
    }

    if (type === 'text') {
      newEl.text = 'Click to edit text block'
      newEl.height = 14
    } else if (type === 'box') {
      newEl.borderWidth = 1
      newEl.borderColor = '#0f172a'
      newEl.borderStyle = 'solid'
      newEl.backgroundColor = '#f8fafc'
      newEl.height = 30
    } else if (type === 'line_h') {
      newEl.height = 4
      newEl.width = printableWidth
      newEl.x = margins.left
    } else if (type === 'line_v') {
      newEl.width = 4
      newEl.height = 60
    } else if (type === 'logo') {
      newEl.width = 30
      newEl.height = 30
      newEl.imageUrl = paper.settings.institute.logoUrl
    } else if (type === 'image') {
      newEl.width = 50
      newEl.height = 35
    }

    const updatedList = [...elements, newEl]
    setElements(updatedList)
    setSelectedId(newEl.id)
    setIsMobilePropertiesOpen(true)
    persistElements(updatedList)
  }

  // Delete element
  const handleDeleteElement = (id: string) => {
    pushHistory(elements)
    const updated = elements.filter(el => el.id !== id)
    setElements(updated)
    setSelectedId(null)
    persistElements(updated)
  }

  // Duplicate element
  const handleDuplicateElement = (el: DesignerElement) => {
    pushHistory(elements)
    const duplicated: DesignerElement = {
      ...el,
      id: generateId('el'),
      x: el.x + 5,
      y: el.y + 5,
      zIndex: elements.length + 1
    }
    const updated = [...elements, duplicated]
    setElements(updated)
    setSelectedId(duplicated.id)
    persistElements(updated)
  }

  // Layering
  const handleBringForward = (id: string) => {
    const el = elements.find(e => e.id === id)
    if (!el) return
    handleUpdateElement({ ...el, zIndex: el.zIndex + 2 })
  }

  const handleSendBackward = (id: string) => {
    const el = elements.find(e => e.id === id)
    if (!el) return
    handleUpdateElement({ ...el, zIndex: Math.max(1, el.zIndex - 2) })
  }

  // Alignment to Page Margins
  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedId || !paper) return
    const el = elements.find(e => e.id === selectedId)
    if (!el) return

    const margins = paper.layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }
    const dimensions = getPhysicalPageDimensions(paper.layout.pageSize, paper.layout.orientation)
    const printableWidth = dimensions.width - margins.left - margins.right

    let newX = el.x
    let newY = el.y

    switch (alignment) {
      case 'left':
        newX = margins.left
        break
      case 'center':
        newX = Math.round((margins.left + (printableWidth - el.width) / 2) * 10) / 10
        break
      case 'right':
        newX = dimensions.width - margins.right - el.width
        break
      case 'top':
        newY = margins.top
        break
      case 'middle':
        newY = Math.round((dimensions.height - el.height) / 2 * 10) / 10
        break
      case 'bottom':
        newY = dimensions.height - margins.bottom - el.height
        break
    }

    handleUpdateElement({ ...el, x: newX, y: newY })
  }

  // Switch between Automatic and Manual Design modes
  const handleToggleMode = () => {
    if (mode === 'automatic') {
      // Switch to manual mode
      setMode('manual')
      persistElements(elements, 'manual')
    } else {
      // Confirm before resetting to automatic
      setIsModeSwitchModalOpen(true)
    }
  }

  const handleConfirmResetToAutomatic = () => {
    if (!paper) return
    const pagination = paginatePaper({
      settings: paper.settings,
      content: paper.content,
      layout: paper.layout
    })
    const converted = convertAutomaticToManualElements(pagination, paper.layout)
    setMode('automatic')
    setElements(converted)
    setIsModeSwitchModalOpen(false)
    persistElements(converted, 'automatic')
  }

  // Save as reusable template
  const handleSaveAsTemplate = async () => {
    if (!paper || !templateName.trim()) return
    await templateService.saveAsTemplate({
      name: templateName.trim(),
      description: `Saved from ${paper.metadata.title}`,
      settings: paper.settings,
      layout: {
        ...paper.layout,
        designData: {
          mode,
          elements,
          activePage: activePageIndex
        }
      }
    })
    setIsTemplateModalOpen(false)
    setTemplateName('')
  }

  if (papersLoading || (paperId && paperLoading)) {
    return (
      <div className="p-16 text-center text-slate-500 space-y-3">
        <div className="inline-block w-8 h-8 border-3 border-pink-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="font-bold text-slate-800 text-base">Loading Visual Paper Designer...</h3>
        <p className="text-xs text-slate-400">Loading interactive typography and canvas elements</p>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12">
        <Palette className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Paper Selected</h2>
        <p className="text-sm text-slate-500">Please choose an examination paper to launch the designer.</p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const dimensions = getPhysicalPageDimensions(paper.layout.pageSize, paper.layout.orientation)
  const margins = paper.layout.pageMarginsMm || { top: 15, bottom: 15, left: 15, right: 15 }

  // Overlap and boundary detection
  const overlaps = checkElementOverlaps(elements, activePageIndex)
  const pageElements = elements.filter(e => e.pageIndex === activePageIndex)
  const totalPagesCount = Math.max(1, ...elements.map(e => e.pageIndex + 1))
  const selectedElement = elements.find(e => e.id === selectedId) || null

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-24">
      {/* Top Header and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-pink-50 text-pink-700 border border-pink-100">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">Module 5</span>
              <Badge variant="purple" size="sm">{paper.settings.className} • {paper.settings.subject}</Badge>
              <Badge variant={mode === 'manual' ? 'warning' : 'info'} size="sm">
                {mode === 'manual' ? 'Manual Freeform' : 'Automatic Flow'}
              </Badge>
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                {saveStatus}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Visual Paper Designer
            </h1>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              disabled={history.length === 0}
              onClick={handleUndo}
              className="p-1.5 text-slate-600 disabled:text-slate-300 hover:text-slate-900 rounded"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={future.length === 0}
              onClick={handleRedo}
              className="p-1.5 text-slate-600 disabled:text-slate-300 hover:text-slate-900 rounded"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <Button
            type="button"
            variant={mode === 'manual' ? 'primary' : 'outline'}
            size="sm"
            onClick={handleToggleMode}
            leftIcon={<Sliders className="w-3.5 h-3.5" />}
          >
            {mode === 'manual' ? 'Manual Mode (Active)' : 'Switch to Manual Mode'}
          </Button>

          {/* Save Template */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTemplateName(`${paper.settings.className} ${paper.settings.subject} Design`)
              setIsTemplateModalOpen(true)
            }}
            leftIcon={<BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />}
          >
            Save Template
          </Button>

          {/* Navigation to Preview / Editor */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/editor?paperId=${paper.metadata.id}`)}
            leftIcon={<FileEdit className="w-3.5 h-3.5" />}
          >
            Editor
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/preview?paperId=${paper.metadata.id}`)}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* Secondary Tools: Add Elements & Page Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
        {/* Add Supported Elements */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            + Add:
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleAddElement('text')}
            leftIcon={<Type className="w-3.5 h-3.5 text-blue-600" />}
          >
            Text Block
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleAddElement('box')}
            leftIcon={<Square className="w-3.5 h-3.5 text-purple-600" />}
          >
            Rectangle Box
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleAddElement('line_h')}
            leftIcon={<Minus className="w-3.5 h-3.5 text-slate-700" />}
          >
            H-Line
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleAddElement('image')}
            leftIcon={<ImageIcon className="w-3.5 h-3.5 text-teal-600" />}
          >
            Diagram / Image
          </Button>
        </div>

        {/* Page Switcher & Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
              className="p-1 rounded text-slate-600 hover:text-slate-900 disabled:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-bold text-slate-800">
              Page {activePageIndex + 1} of {totalPagesCount}
            </span>
            <button
              type="button"
              disabled={activePageIndex >= totalPagesCount - 1}
              onClick={() => setActivePageIndex(prev => Math.min(totalPagesCount - 1, prev + 1))}
              className="p-1 rounded text-slate-600 hover:text-slate-900 disabled:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-slate-300">|</span>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(70, prev - 10))}
              className="p-1 text-slate-600 hover:text-slate-900"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 font-bold">{zoom}%</span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(130, prev + 10))}
              className="p-1 text-slate-600 hover:text-slate-900"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlap & Boundary Warning Banner (if any) */}
      {overlaps.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Warning:</strong> {overlaps.length} element{overlaps.length === 1 ? '' : 's'} overlap on Page {activePageIndex + 1}. Adjust position or size to prevent overlapping in print.
          </span>
        </div>
      )}

      {/* Main Designer Layout: Canvas + Properties Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Canvas Area (3 cols on large screen) */}
        <div className="lg:col-span-3 bg-slate-100/70 p-4 sm:p-6 rounded-3xl border border-slate-200/80 min-h-[600px] flex justify-center overflow-auto">
          <DesignerCanvas
            elements={pageElements}
            selectedId={selectedId}
            onSelectElement={id => {
              setSelectedId(id)
              if (id) setIsMobilePropertiesOpen(true)
            }}
            onUpdateElement={handleUpdateElement}
            dimensions={dimensions}
            margins={margins}
            zoom={zoom}
            mode={mode}
            paper={paper}
            overlaps={overlaps}
          />
        </div>

        {/* Properties Panel (1 col on large screen, hidden or modal on mobile) */}
        <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/90 shadow-xs sticky top-4 max-h-[80vh] overflow-y-auto">
          <DesignerPropertiesPanel
            element={selectedElement}
            onUpdate={handleUpdateElement}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicateElement}
            onBringForward={handleBringForward}
            onSendBackward={handleSendBackward}
            onAlign={handleAlign}
            pageDimensions={dimensions}
            margins={margins}
          />
        </div>
      </div>

      {/* Mobile Floating Properties Button */}
      {selectedElement && (
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsMobilePropertiesOpen(true)}
            leftIcon={<Sliders className="w-4 h-4" />}
          >
            Edit Properties
          </Button>
        </div>
      )}

      {/* Mobile Properties Modal / Drawer */}
      {isMobilePropertiesOpen && selectedElement && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full bg-white rounded-t-3xl max-h-[75vh] overflow-y-auto p-4 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            <DesignerPropertiesPanel
              element={selectedElement}
              onUpdate={handleUpdateElement}
              onDelete={id => {
                handleDeleteElement(id)
                setIsMobilePropertiesOpen(false)
              }}
              onDuplicate={handleDuplicateElement}
              onBringForward={handleBringForward}
              onSendBackward={handleSendBackward}
              onAlign={handleAlign}
              onCloseMobile={() => setIsMobilePropertiesOpen(false)}
              pageDimensions={dimensions}
              margins={margins}
            />
          </div>
        </div>
      )}

      {/* Mode Switch Reset Warning Modal */}
      {isModeSwitchModalOpen && (
        <Modal
          isOpen={isModeSwitchModalOpen}
          onClose={() => setIsModeSwitchModalOpen(false)}
          title="Switch to Automatic Flow?"
          description="Automatic pagination flow recalculates positions and flows questions sequentially"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Switching back to <strong>Automatic Mode</strong> will re-align all questions and sections according to the standard pagination engine. Any freeform coordinates will be recalculated.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsModeSwitchModalOpen(false)}>
                Keep Manual Layout
              </Button>
              <Button type="button" variant="primary" onClick={handleConfirmResetToAutomatic}>
                Reset to Automatic Flow
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Save Template Modal */}
      {isTemplateModalOpen && (
        <Modal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          title="Save as Reusable Paper Template"
          description="Store this visual design layout in IndexedDB for reuse across future question papers"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. CBSE Class 10 Standard Math Layout"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsTemplateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={!templateName.trim()}
                onClick={handleSaveAsTemplate}
                leftIcon={<BookmarkPlus className="w-4 h-4" />}
              >
                Save Template
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
