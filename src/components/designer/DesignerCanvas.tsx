import React, { useRef, useState, useEffect } from 'react'
import type { DesignerElement, FullPaper } from '../../types'
import { checkBoundaryWarnings } from '../../utils/designerConversion'
import { AlertTriangle, Lock } from 'lucide-react'
import { FormattedMathText } from '../common/FormattedMathText'

interface DesignerCanvasProps {
  elements: DesignerElement[]
  selectedId: string | null
  onSelectElement: (id: string | null) => void
  onUpdateElement: (updated: DesignerElement) => void
  dimensions: { width: number; height: number }
  margins: { top: number; bottom: number; left: number; right: number }
  zoom: number
  mode: 'automatic' | 'manual'
  paper: FullPaper
  overlaps: { id1: string; id2: string }[]
}

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  elements,
  selectedId,
  onSelectElement,
  onUpdateElement,
  dimensions,
  margins,
  zoom,
  mode,
  paper,
  overlaps
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Drag & Resize internal tracking
  const [activeDrag, setActiveDrag] = useState<{
    id: string
    type: 'move' | 'resize-se' | 'resize-e' | 'resize-s'
    startX: number
    startY: number
    initialX: number
    initialY: number
    initialW: number
    initialH: number
  } | null>(null)

  // Pixel to mm conversion factor from active canvas bounding box
  const getMmPerPx = () => {
    if (!canvasRef.current) return 210 / 794
    const rect = canvasRef.current.getBoundingClientRect()
    return dimensions.width / rect.width
  }

  // Pointer Move (Mouse & Touch via PointerEvents)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!activeDrag) return
      const targetEl = elements.find(el => el.id === activeDrag.id)
      if (!targetEl || targetEl.locked) return

      const mmPerPx = getMmPerPx()
      const deltaX = (e.clientX - activeDrag.startX) * mmPerPx
      const deltaY = (e.clientY - activeDrag.startY) * mmPerPx

      if (activeDrag.type === 'move') {
        const newX = Math.round(Math.max(0, Math.min(dimensions.width - targetEl.width, activeDrag.initialX + deltaX)) * 10) / 10
        const newY = Math.round(Math.max(0, Math.min(dimensions.height - targetEl.height, activeDrag.initialY + deltaY)) * 10) / 10

        onUpdateElement({
          ...targetEl,
          x: newX,
          y: newY
        })
      } else if (activeDrag.type === 'resize-se') {
        const newW = Math.round(Math.max(15, activeDrag.initialW + deltaX) * 10) / 10
        const newH = Math.round(Math.max(6, activeDrag.initialH + deltaY) * 10) / 10

        onUpdateElement({
          ...targetEl,
          width: newW,
          height: newH
        })
      } else if (activeDrag.type === 'resize-e') {
        const newW = Math.round(Math.max(15, activeDrag.initialW + deltaX) * 10) / 10
        onUpdateElement({
          ...targetEl,
          width: newW
        })
      } else if (activeDrag.type === 'resize-s') {
        const newH = Math.round(Math.max(6, activeDrag.initialH + deltaY) * 10) / 10
        onUpdateElement({
          ...targetEl,
          height: newH
        })
      }
    }

    const handlePointerUp = () => {
      setActiveDrag(null)
    }

    if (activeDrag) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [activeDrag, elements, dimensions, onUpdateElement])

  // Deselect when clicking canvas background
  const handleCanvasBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectElement(null)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 overflow-auto">
      {/* Physical A4 Sheet Container */}
      <div
        ref={canvasRef}
        onClick={handleCanvasBackgroundClick}
        className="relative bg-white shadow-2xl rounded border border-slate-300 select-none overflow-hidden transition-all duration-150"
        style={{
          width: `${dimensions.width}mm`,
          height: `${dimensions.height}mm`,
          maxWidth: '100%',
          transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
          transformOrigin: 'top center',
          boxSizing: 'border-box'
        }}
      >
        {/* Printable Margins Alignment Guides (Dashed line) */}
        <div
          className="absolute pointer-events-none border border-dashed border-blue-400/40 z-0"
          style={{
            top: `${margins.top}mm`,
            bottom: `${margins.bottom}mm`,
            left: `${margins.left}mm`,
            right: `${margins.right}mm`
          }}
        >
          <span className="absolute top-1 left-1 text-[9px] font-mono text-blue-400 select-none">
            Printable Margin Boundary
          </span>
        </div>

        {/* Center Guide Line when moving */}
        {activeDrag && (
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-indigo-400/50 pointer-events-none z-0"
            style={{ left: `${dimensions.width / 2}mm` }}
          />
        )}

        {/* Elements Rendering */}
        {elements.map(el => {
          const isSelected = el.id === selectedId
          const isOverlapping = overlaps.some(o => o.id1 === el.id || o.id2 === el.id)
          const boundaryWarnings = checkBoundaryWarnings(el, dimensions.width, dimensions.height, margins)
          const hasBoundaryWarning = boundaryWarnings.length > 0

          // Linked Question Data if question block
          const linkedQuestion = el.questionId
            ? paper.content.sections
                .flatMap(s => s.questions)
                .find(q => q.id === el.questionId)
            : null

          return (
            <div
              key={el.id}
              onClick={e => {
                e.stopPropagation()
                onSelectElement(el.id)
              }}
              onPointerDown={e => {
                if (mode !== 'manual' || el.locked) return
                // Check if user clicked on a resize handle
                const target = e.target as HTMLElement
                if (target.dataset.handle) return

                e.stopPropagation()
                onSelectElement(el.id)
                setActiveDrag({
                  id: el.id,
                  type: 'move',
                  startX: e.clientX,
                  startY: e.clientY,
                  initialX: el.x,
                  initialY: el.y,
                  initialW: el.width,
                  initialH: el.height
                })
              }}
              className={`absolute transition-shadow ${
                mode === 'manual' ? 'cursor-move touch-none' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'ring-2 ring-blue-600 shadow-md z-30'
                  : isOverlapping || hasBoundaryWarning
                  ? 'ring-1 ring-amber-400 z-10'
                  : 'hover:ring-1 hover:ring-slate-300'
              }`}
              style={{
                left: `${el.x}mm`,
                top: `${el.y}mm`,
                width: `${el.width}mm`,
                height: `${el.height}mm`,
                zIndex: isSelected ? 40 : el.zIndex,
                backgroundColor: el.backgroundColor || 'transparent',
                borderWidth: el.borderWidth !== undefined ? `${el.borderWidth}px` : undefined,
                borderColor: el.borderColor || '#cbd5e1',
                borderStyle: el.borderStyle || 'none',
                padding: el.paddingMm ? `${el.paddingMm}mm` : undefined,
                boxSizing: 'border-box'
              }}
            >
              {/* Element Content Rendering */}
              <div
                className="w-full h-full overflow-hidden text-slate-900 select-text font-serif leading-snug"
                style={{
                  fontSize: el.fontSizePt ? `${el.fontSizePt}pt` : '11pt',
                  fontWeight: el.bold ? 'bold' : 'normal',
                  fontStyle: el.italic ? 'italic' : 'normal',
                  textAlign: el.alignment || 'left',
                  color: el.color || '#0f172a'
                }}
              >
                {el.type === 'header' ? (
                  <div className="w-full text-center space-y-1">
                    <h2 className="text-base font-extrabold uppercase font-serif tracking-wider">
                      {paper.settings.institute.name}
                    </h2>
                    <p className="text-xs font-sans font-bold text-slate-800">
                      {paper.settings.examName} • {paper.settings.subject} ({paper.settings.className})
                    </p>
                    <div className="flex justify-between text-[11px] font-sans border-t border-slate-300 pt-1">
                      <span>Time: {paper.settings.durationMinutes} Mins</span>
                      <span>Max Marks: {paper.settings.totalMarks}</span>
                    </div>
                  </div>
                ) : el.type === 'logo' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    {el.imageUrl || paper.settings.institute.logoUrl ? (
                      <img
                        src={el.imageUrl || paper.settings.institute.logoUrl}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <span className="text-xs font-sans text-slate-400">Institute Logo</span>
                    )}
                  </div>
                ) : el.type === 'image' ? (
                  <div className="w-full h-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded">
                    {el.imageUrl ? (
                      <img
                        src={el.imageUrl}
                        alt="Figure"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <span className="text-xs font-sans text-slate-400">Figure / Diagram</span>
                    )}
                  </div>
                ) : el.type === 'line_h' ? (
                  <div className="w-full h-full flex items-center">
                    <hr className="w-full border-t border-slate-900" />
                  </div>
                ) : el.type === 'line_v' ? (
                  <div className="w-full h-full flex justify-center">
                    <div className="h-full border-l border-slate-900" />
                  </div>
                ) : el.type === 'section_header' ? (
                  <div className="w-full h-full flex items-center justify-center font-sans font-bold uppercase text-xs tracking-wider bg-slate-100 border-y border-slate-300 px-2">
                    {el.text || 'Section Header'}
                  </div>
                ) : el.type === 'question_block' ? (
                  <div className="w-full h-full space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-slate-900 shrink-0">
                        {el.displayNumber || ''}
                      </span>
                      <div className="flex-1 text-slate-800 text-xs sm:text-sm font-medium leading-relaxed">
                        <FormattedMathText text={linkedQuestion?.prompt || el.text || ''} />
                      </div>
                      {linkedQuestion?.marks && (
                        <span className="text-xs font-bold font-sans text-slate-700 shrink-0">
                          [{linkedQuestion.marks}]
                        </span>
                      )}
                    </div>

                    {/* MCQ Options preview if applicable */}
                    {linkedQuestion?.options && (
                      <div className="grid grid-cols-2 gap-1 text-[11px] font-sans pt-1">
                        {linkedQuestion.options.map(opt => (
                          <div key={opt.id} className="flex items-center gap-1 min-h-[26px]">
                            <span className="font-bold shrink-0">({opt.label})</span>
                            <FormattedMathText text={opt.text} isOption={true} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : el.type === 'footer' ? (
                  <div className="w-full flex items-center justify-between text-[11px] font-sans border-t border-slate-300 pt-1 text-slate-500">
                    <span>{paper.settings.examName}</span>
                    <span>Page Number</span>
                  </div>
                ) : (
                  // General Text Block or Box
                  <div className="w-full h-full break-words">
                    {el.text || (el.type === 'box' ? '' : 'Text block')}
                  </div>
                )}
              </div>

              {/* Warning Badges on Element */}
              {(isOverlapping || hasBoundaryWarning) && (
                <div
                  className="absolute -top-3 -right-3 z-30 p-1 bg-amber-500 text-white rounded-full shadow-md"
                  title={hasBoundaryWarning ? boundaryWarnings.join('; ') : 'Overlapping another element'}
                >
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}

              {/* Locked Indicator */}
              {el.locked && (
                <div className="absolute top-1 right-1 p-0.5 bg-slate-100 text-slate-500 rounded">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}

              {/* Selected Resize Handles (Visible only in Manual Mode when selected) */}
              {mode === 'manual' && isSelected && !el.locked && (
                <>
                  {/* Tooltip showing element size */}
                  <div className="absolute -top-6 left-0 bg-slate-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-50">
                    {el.width}mm × {el.height}mm (x: {el.x}, y: {el.y})
                  </div>

                  {/* Corner SE Resize Handle */}
                  <div
                    data-handle="resize-se"
                    onPointerDown={e => {
                      e.stopPropagation()
                      setActiveDrag({
                        id: el.id,
                        type: 'resize-se',
                        startX: e.clientX,
                        startY: e.clientY,
                        initialX: el.x,
                        initialY: el.y,
                        initialW: el.width,
                        initialH: el.height
                      })
                    }}
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nwse-resize z-50 shadow-xs touch-none"
                  />

                  {/* Right Edge Resize Handle */}
                  <div
                    data-handle="resize-e"
                    onPointerDown={e => {
                      e.stopPropagation()
                      setActiveDrag({
                        id: el.id,
                        type: 'resize-e',
                        startX: e.clientX,
                        startY: e.clientY,
                        initialX: el.x,
                        initialY: el.y,
                        initialW: el.width,
                        initialH: el.height
                      })
                    }}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-blue-600 border border-white rounded-xs cursor-ew-resize z-50 touch-none"
                  />

                  {/* Bottom Edge Resize Handle */}
                  <div
                    data-handle="resize-s"
                    onPointerDown={e => {
                      e.stopPropagation()
                      setActiveDrag({
                        id: el.id,
                        type: 'resize-s',
                        startX: e.clientX,
                        startY: e.clientY,
                        initialX: el.x,
                        initialY: el.y,
                        initialW: el.width,
                        initialH: el.height
                      })
                    }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-blue-600 border border-white rounded-xs cursor-ns-resize z-50 touch-none"
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
