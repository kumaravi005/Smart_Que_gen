import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Palette, Check, Shield, Eye } from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'

export const DesignerView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, loading, saving, saveLayout } = usePaperDetails(paperId)

  const [headerStyle, setHeaderStyle] = useState<'modern' | 'classic' | 'bordered'>('modern')
  const [showWatermark, setShowWatermark] = useState(true)
  const [watermarkText, setWatermarkText] = useState('OMEGA EDUCATION CENTER')
  const [showLogo, setShowLogo] = useState(true)
  const [footerNote, setFooterNote] = useState('Omega Education Center — Academic Excellence')
  const [saved, setSaved] = useState(false)

  React.useEffect(() => {
    if (paper?.layout) {
      setHeaderStyle((paper.layout.headerStyle as any) || 'modern')
      setShowWatermark(paper.layout.showWatermark ?? true)
      setWatermarkText(paper.layout.watermarkText || 'OMEGA EDUCATION CENTER')
      setShowLogo(paper.layout.showInstituteLogo ?? true)
      setFooterNote(paper.layout.footerNote || '')
    }
  }, [paper])

  const handleSave = async () => {
    if (!paper) return
    await saveLayout({
      ...paper.layout,
      headerStyle: headerStyle as any,
      showWatermark,
      watermarkText,
      showInstituteLogo: showLogo,
      footerNote
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading designer configuration...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-pink-50 text-pink-700 border border-pink-100">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-pink-600 uppercase tracking-wider">Module 5</span>
              <Badge variant="purple" size="sm">Brand & Watermark</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Visual Paper Designer</h1>
            <p className="text-xs text-slate-500">
              Customize institute logos, border styles, watermarks, and header branding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={saved ? <Check className="w-4 h-4 text-emerald-600" /> : undefined}
          >
            {saved ? 'Saved!' : 'Save Styling'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/preview?paperId=${paperId}`)}
            leftIcon={<Eye className="w-4 h-4" />}
          >
            Live Preview
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-3">Header Aesthetic Style</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'modern', name: 'Modern Clean', desc: 'Centered bold institute title with thin dividers' },
              { id: 'classic', name: 'Classic Formal', desc: 'Traditional board exam layout with uppercase headers' },
              { id: 'bordered', name: 'Double Border Box', desc: 'Distinct outlined header container with meta box' }
            ].map(item => (
              <div
                key={item.id}
                onClick={() => setHeaderStyle(item.id as any)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  headerStyle === item.id
                    ? 'border-pink-600 bg-pink-50/40 text-pink-950'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-sm">{item.name}</div>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Watermark Section */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-pink-600" />
                <span>Anti-Piracy Watermark</span>
              </div>
              <p className="text-xs text-slate-500">
                Displays translucent diagonal center watermark across all printed pages.
              </p>
            </div>
            <input
              type="checkbox"
              checked={showWatermark}
              onChange={e => setShowWatermark(e.target.checked)}
              className="w-5 h-5 accent-pink-600 rounded"
            />
          </div>

          {showWatermark && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Watermark Text
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={e => setWatermarkText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Footer Running Text
          </label>
          <input
            type="text"
            value={footerNote}
            onChange={e => setFooterNote(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
        </div>
      </div>
    </div>
  )
}
