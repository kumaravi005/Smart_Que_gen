import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ScanText,
  UploadCloud,
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Wifi
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import type { SectionContent } from '../types'

export const OcrView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()
  const { isOnline } = useNetworkStatus()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, saveContent } = usePaperDetails(paperId)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedPrompt, setExtractedPrompt] = useState<string | null>(null)
  const [imported, setImported] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
        setExtractedPrompt(null)
        setImported(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSimulateOCR = () => {
    if (!imagePreview) return
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setExtractedPrompt(
        'A metallic sphere of radius 4.2 cm is melted and recast into the shape of a cylinder of radius 6 cm. Find the height of the cylinder. (Take π = 22/7)'
      )
    }, 1500)
  }

  const handleImportToActiveSection = async () => {
    if (!paper || !extractedPrompt) return
    const firstSec = paper.content.sections[0]
    if (!firstSec) return

    const newQ = {
      id: `q_ocr_${Date.now()}`,
      sectionId: firstSec.sectionId,
      orderNumber: (firstSec.questions?.length || 0) + 1,
      type: 'short_answer' as const,
      prompt: extractedPrompt,
      marks: 3,
      difficulty: 'medium' as const,
      topic: 'Surface Areas and Volumes',
      tags: ['OCR Import', 'Mathematics', 'Mensuration'],
      source: 'ocr' as const
    }

    const updatedSections = paper.content.sections.map((sec: SectionContent, idx: number) =>
      idx === 0 ? { ...sec, questions: [...sec.questions, newQ] } : sec
    )

    await saveContent({
      ...paper.content,
      sections: updatedSections
    })

    setImported(true)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-50 text-violet-700 border border-violet-100">
            <ScanText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Module 9</span>
              <Badge variant="purple" size="sm">OCR & Vision</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Image & OCR Processing</h1>
            <p className="text-xs text-slate-500">
              Extract questions and mathematical statements directly from photos of textbooks or handwritten sheets.
            </p>
          </div>
        </div>

        {/* Network requirement badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          isOnline
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}>
          <Wifi className="w-4 h-4" />
          <span>{isOnline ? 'Cloud Vision Available' : 'Offline: Local OCR Mode'}</span>
        </div>
      </div>

      {/* Upload & Camera Box */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div className="border-2 border-dashed border-slate-300 hover:border-violet-500 rounded-2xl p-8 text-center space-y-4 bg-slate-50/50 transition-colors">
          <div className="w-14 h-14 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7" />
          </div>

          <div>
            <h3 className="font-bold text-slate-800 text-base">Capture or Upload Textbook Photo</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Supports JPEG, PNG, or camera snap from your smartphone or tablet.
            </p>
          </div>

          <label className="inline-block cursor-pointer">
            <span className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl shadow-sm inline-flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              Choose Photo / Open Camera
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {imagePreview && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase">Selected Image Preview</h4>
            <div className="max-h-60 overflow-hidden rounded-xl border border-slate-300 flex items-center justify-center bg-black/5">
              <img src={imagePreview} alt="OCR Preview" className="max-h-60 object-contain" />
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full bg-violet-600 hover:bg-violet-700"
              isLoading={isProcessing}
              onClick={handleSimulateOCR}
            >
              Run OCR Extraction
            </Button>
          </div>
        )}

        {extractedPrompt && (
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                OCR Extracted Text
              </span>
              <Badge variant="success" size="sm">High Confidence (98%)</Badge>
            </div>

            <p className="text-sm font-medium text-slate-900 bg-white p-3 rounded-xl border border-emerald-100 leading-relaxed">
              {extractedPrompt}
            </p>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Target: {paper ? paper.metadata.title : 'Active Paper'}
              </span>

              {imported ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Imported into Paper!
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/editor?paperId=${paperId}`)}
                  >
                    View in Editor
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImportToActiveSection}
                  disabled={!paper}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Import as Question
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
