import React from 'react'
import {
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Sliders,
  X
} from 'lucide-react'
import type { DesignerElement } from '../../types'

interface DesignerPropertiesPanelProps {
  element: DesignerElement | null
  onUpdate: (updated: DesignerElement) => void
  onDelete: (id: string) => void
  onDuplicate: (el: DesignerElement) => void
  onBringForward: (id: string) => void
  onSendBackward: (id: string) => void
  onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  onCloseMobile?: () => void
  pageDimensions: { width: number; height: number }
  margins?: { top: number; bottom: number; left: number; right: number }
}

export const DesignerPropertiesPanel: React.FC<DesignerPropertiesPanelProps> = ({
  element,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onAlign,
  onCloseMobile,
  pageDimensions,
  margins: _margins
}) => {
  if (!element) {
    return (
      <div className="p-5 text-center text-slate-400 space-y-2">
        <Sliders className="w-8 h-8 mx-auto text-slate-300" />
        <p className="text-xs font-semibold text-slate-600">No Element Selected</p>
        <p className="text-[11px] text-slate-400">
          Click any text block, logo, shape, or question on the canvas to inspect and edit properties.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
            Properties Panel
          </span>
          <h3 className="font-bold text-slate-900 capitalize text-sm">
            {element.type.replace('_', ' ')}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ ...element, locked: !element.locked })}
            className={`p-1.5 rounded-lg border transition-colors ${
              element.locked
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'text-slate-400 hover:text-slate-700 border-slate-200'
            }`}
            title={element.locked ? 'Unlock element' : 'Lock element position'}
          >
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onDuplicate(element)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 border border-slate-200 rounded-lg hover:bg-indigo-50"
            title="Duplicate element"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(element.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg hover:bg-rose-50"
            title="Delete element"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-slate-800 sm:hidden ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Text Content (if applicable) */}
      {(element.type === 'text' || element.type === 'section_header' || element.type === 'box') && (
        <div className="space-y-1">
          <label className="font-semibold text-slate-700 block">Text Content</label>
          <textarea
            rows={2}
            value={element.text || ''}
            onChange={e => onUpdate({ ...element, text: e.target.value })}
            placeholder="Type content..."
            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Typography Controls */}
      <div className="space-y-2">
        <label className="font-semibold text-slate-700 block">Typography & Formatting</label>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Font Size */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Type className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="number"
              min="8"
              max="48"
              value={element.fontSizePt || 11}
              onChange={e => onUpdate({ ...element, fontSizePt: Number(e.target.value) })}
              className="w-10 bg-transparent text-xs font-bold text-center focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">pt</span>
          </div>

          {/* Bold */}
          <button
            type="button"
            onClick={() => onUpdate({ ...element, bold: !element.bold })}
            className={`p-1.5 rounded-lg border transition-colors ${
              element.bold
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => onUpdate({ ...element, italic: !element.italic })}
            className={`p-1.5 rounded-lg border transition-colors ${
              element.italic
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Alignment */}
          <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => onUpdate({ ...element, alignment: 'left' })}
              className={`p-1 rounded ${element.alignment === 'left' || !element.alignment ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400'}`}
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ ...element, alignment: 'center' })}
              className={`p-1 rounded ${element.alignment === 'center' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400'}`}
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ ...element, alignment: 'right' })}
              className={`p-1 rounded ${element.alignment === 'right' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400'}`}
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Geometry: Dimensions & Position (in mm) */}
      <div className="space-y-2">
        <label className="font-semibold text-slate-700 block">Position & Geometry (mm)</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block">X Pos (mm)</span>
            <input
              type="number"
              min="0"
              max={pageDimensions.width}
              value={element.x}
              onChange={e => onUpdate({ ...element, x: Number(e.target.value) })}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Y Pos (mm)</span>
            <input
              type="number"
              min="0"
              max={pageDimensions.height}
              value={element.y}
              onChange={e => onUpdate({ ...element, y: Number(e.target.value) })}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Width (mm)</span>
            <input
              type="number"
              min="10"
              max={pageDimensions.width}
              value={element.width}
              onChange={e => onUpdate({ ...element, width: Number(e.target.value) })}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Height (mm)</span>
            <input
              type="number"
              min="5"
              max={pageDimensions.height}
              value={element.height}
              onChange={e => onUpdate({ ...element, height: Number(e.target.value) })}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Border & Styling */}
      <div className="space-y-2">
        <label className="font-semibold text-slate-700 block">Border & Colors</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block">Border Thickness</span>
            <select
              value={element.borderWidth ?? 0}
              onChange={e => onUpdate({ ...element, borderWidth: Number(e.target.value), borderStyle: Number(e.target.value) > 0 ? 'solid' : 'none' })}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="0">None (0px)</option>
              <option value="1">Thin (1px)</option>
              <option value="2">Medium (2px)</option>
              <option value="3">Thick (3px)</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Border Style</span>
            <select
              value={element.borderStyle || 'none'}
              onChange={e => onUpdate({ ...element, borderStyle: e.target.value as any })}
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="double">Double</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block">Background Fill</span>
            <input
              type="color"
              value={element.backgroundColor && element.backgroundColor !== 'transparent' ? element.backgroundColor : '#ffffff'}
              onChange={e => onUpdate({ ...element, backgroundColor: e.target.value })}
              className="w-full h-8 p-0.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Text Color</span>
            <input
              type="color"
              value={element.color || '#0f172a'}
              onChange={e => onUpdate({ ...element, color: e.target.value })}
              className="w-full h-8 p-0.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Layering & Quick Alignment */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <label className="font-semibold text-slate-700 block">Layering & Page Alignment</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onBringForward(element.id)}
            className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-center font-medium"
          >
            Bring Forward
          </button>
          <button
            type="button"
            onClick={() => onSendBackward(element.id)}
            className="py-1 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-center font-medium"
          >
            Send Backward
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1">
          <button
            type="button"
            onClick={() => onAlign('left')}
            className="py-1 px-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-[11px]"
          >
            Align Left
          </button>
          <button
            type="button"
            onClick={() => onAlign('center')}
            className="py-1 px-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-[11px]"
          >
            Center H
          </button>
          <button
            type="button"
            onClick={() => onAlign('right')}
            className="py-1 px-1.5 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-[11px]"
          >
            Align Right
          </button>
        </div>
      </div>
    </div>
  )
}
