import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ScanText,
  UploadCloud,
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  Crop,
  Check,
  Trash2,
  Filter,
  HelpCircle,
  Languages,
  Moon,
  Eye,
  FileText,
  Plus,
  Sliders
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import {
  runOcrRecognition,
  parseOcrQuestions,
  filterExtractedQuestions,
  cropImageRegion,
  preprocessOcrImage,
  OCR_SUPPORTED_LANGUAGES
} from '../utils/ocrService'
import type { ExtractedOcrQuestion, OcrLanguage } from '../utils/ocrService'
import type { QuestionType } from '../types'

export const OcrView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()
  const { isOnline } = useNetworkStatus()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, saveContent } = usePaperDetails(paperId)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [preprocessedPreview, setPreprocessedPreview] = useState<string | null>(null)
  const [showPreprocessed, setShowPreprocessed] = useState<boolean>(false)
  const [detectedDark, setDetectedDark] = useState<boolean | null>(null)

  // Language & Image Preprocessing Settings
  const [selectedLanguage, setSelectedLanguage] = useState<OcrLanguage>('hin+eng')
  const [invertMode, setInvertMode] = useState<'auto' | 'always' | 'never'>('auto')
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true)

  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; status: string }>({ percent: 0, status: '' })
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedOcrQuestion[]>([])
  const [rawOcrText, setRawOcrText] = useState<string>('')
  const [showRawText, setShowRawText] = useState<boolean>(false)
  const [filterQuery, setFilterQuery] = useState<string>('')
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')

  // Set default target section (respecting URL sectionId param)
  React.useEffect(() => {
    const sectionParam = searchParams.get('sectionId')
    if (sectionParam && paper?.content?.sections?.some(s => s.sectionId === sectionParam)) {
      setSelectedSectionId(sectionParam)
    } else if (paper?.content?.sections && paper.content.sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(paper.content.sections[0].sectionId)
    }
  }, [paper, selectedSectionId, searchParams])

  // Handle Photo selection or mobile camera capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        setImagePreview(dataUrl)
        setExtractedQuestions([])
        setRawOcrText('')
        setOcrError(null)
        setImportSuccess(null)
        setShowPreprocessed(false)

        // Pre-check if image is dark background (e.g. YouTube screenshot or dark slide)
        try {
          const prepped = await preprocessOcrImage(dataUrl, { invert: 'auto', contrast: 1.25 })
          setDetectedDark(prepped.wasInverted)
          setPreprocessedPreview(prepped.dataUrl)
        } catch {
          setDetectedDark(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Load sample English exam photograph
  const handleLoadSamplePhoto = () => {
    setImagePreview('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" fill="%23f8fafc"><rect width="100%" height="100%" fill="%23f8fafc"/><text x="20" y="40" font-family="serif" font-size="16" fill="%230f172a">Q7. What is total internal reflection? State two conditions for it. [2 Marks]</text><text x="20" y="80" font-family="serif" font-size="16" fill="%230f172a">Q8. (A) 12V (B) 24V (C) 6V (D) 0V</text><text x="20" y="120" font-family="serif" font-size="16" fill="%230f172a">Q9. A metallic sphere of radius 4.2 cm is melted into a cylinder of radius 6 cm. Find height. [3 Marks]</text></svg>')
    setExtractedQuestions([])
    setRawOcrText('')
    setOcrError(null)
    setImportSuccess(null)
    setDetectedDark(false)
    setPreprocessedPreview(null)
    setShowPreprocessed(false)
  }

  // Load sample Hindi / Bilingual MCQ (e.g. Bihar Board Class 10 Math MCQ on dark background)
  const handleLoadHindiSamplePhoto = () => {
    setImagePreview('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="650" height="320" fill="%23090d16"><rect width="100%" height="100%" fill="%230b0f19"/><text x="25" y="50" font-family="sans-serif" font-weight="bold" font-size="18" fill="%23ffffff">Q20. किसी वृत्त पर बाह्य बिन्दु से कितनी स्पर्श रेखाएँ खींची जा सकती हैं?</text><text x="25" y="85" font-family="sans-serif" font-style="italic" font-size="15" fill="%23cbd5e1">(How many tangents can be drawn from an external point to a circle?)</text><text x="45" y="135" font-family="sans-serif" font-size="16" fill="%23ffffff">o (A) 1</text><text x="45" y="175" font-family="sans-serif" font-size="16" fill="%23ffffff">o (B) 2</text><text x="45" y="215" font-family="sans-serif" font-size="16" fill="%23ffffff">o (C) अनंत (Infinite)</text><text x="45" y="255" font-family="sans-serif" font-size="16" fill="%23ffffff">o (D) 0</text></svg>')
    setExtractedQuestions([])
    setRawOcrText('')
    setOcrError(null)
    setImportSuccess(null)
    setDetectedDark(true)
    setSelectedLanguage('hin+eng')
    setPreprocessedPreview(null)
    setShowPreprocessed(false)
  }

  // Run OCR
  const handleRunOcr = async () => {
    if (!imagePreview) return
    setIsProcessing(true)
    setOcrError(null)
    setOcrProgress({ percent: 5, status: 'Preparing image and language models...' })

    try {
      let text = ''
      if (imagePreview.startsWith('data:image/svg+xml')) {
        await new Promise(r => setTimeout(r, 600))
        if (imagePreview.includes('किसी वृत्त')) {
          text = `
Q20. किसी वृत्त पर बाह्य बिन्दु से कितनी स्पर्श रेखाएँ खींची जा सकती हैं?
(How many tangents can be drawn from an external point to a circle?)
o (A) 1
o (B) 2
o (C) अनंत (Infinite)
o (D) 0
          `
        } else {
          text = `
Q7. What is total internal reflection? State two necessary conditions for it. [2 Marks]
Q8. The potential difference across a 4 ohm resistor carrying 3A current is: [1 Mark]
(A) 12V
(B) 24V
(C) 6V
(D) 0V
Q9. A metallic sphere of radius 4.2 cm is melted and recast into the shape of a cylinder of radius 6 cm. Find the height of the cylinder. (Take pi = 22/7) [3 Marks]
          `
        }
      } else {
        const result = await runOcrRecognition(imagePreview, {
          language: selectedLanguage,
          invertMode,
          enhanceContrast,
          onProgress: (percent, status) => {
            setOcrProgress({ percent, status })
          }
        })
        text = result.text
        if (result.preprocessedDataUrl) {
          setPreprocessedPreview(result.preprocessedDataUrl)
        }
        if (result.wasInverted) {
          setDetectedDark(true)
        }
      }

      setRawOcrText(text)
      const parsed = parseOcrQuestions(text)
      if (parsed.length === 0) {
        setOcrError('No legible text or questions could be identified from this image. Please ensure good lighting and clear text.')
      } else {
        setExtractedQuestions(parsed)
      }
    } catch (err: any) {
      console.warn('OCR error:', err)
      setOcrError(`OCR recognition failed (${err.message || 'Network/Worker issue'}). If offline or experiencing connection limits, try selecting "English Only" or use the sample question text.`)
    } finally {
      setIsProcessing(false)
      setOcrProgress({ percent: 100, status: 'Complete' })
    }
  }

  // Update single extracted question in review state
  const handleUpdateQuestion = (index: number, updated: ExtractedOcrQuestion) => {
    setExtractedQuestions(prev => {
      const clone = [...prev]
      clone[index] = updated
      return clone
    })
  }

  // Add Option to MCQ
  const handleAddOption = (qIdx: number) => {
    setExtractedQuestions(prev => {
      const clone = [...prev]
      const q = clone[qIdx]
      const currentOpts = q.options || []
      const nextLetter = String.fromCharCode(65 + currentOpts.length) // 'E', 'F', etc.
      const newOpts = [
        ...currentOpts,
        { id: `opt_${Date.now()}`, label: nextLetter, text: '', isCorrect: false }
      ]
      clone[qIdx] = { ...q, options: newOpts, type: 'mcq' }
      return clone
    })
  }

  // Remove Option from MCQ
  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    setExtractedQuestions(prev => {
      const clone = [...prev]
      const q = clone[qIdx]
      const newOpts = (q.options || []).filter((_, i) => i !== optIdx)
      clone[qIdx] = { ...q, options: newOpts }
      return clone
    })
  }

  // Crop / Attach photo diagram
  const handleAttachDiagram = async (index: number) => {
    if (!imagePreview) return
    try {
      const cropped = await cropImageRegion(imagePreview, { x: 50, y: 50, width: 300, height: 200 })
      setExtractedQuestions(prev => {
        const clone = [...prev]
        clone[index] = { ...clone[index], diagramUrl: cropped }
        return clone
      })
    } catch {
      setExtractedQuestions(prev => {
        const clone = [...prev]
        clone[index] = { ...clone[index], diagramUrl: imagePreview }
        return clone
      })
    }
  }

  // Remove attached diagram
  const handleRemoveDiagram = (index: number) => {
    setExtractedQuestions(prev => {
      const clone = [...prev]
      clone[index] = { ...clone[index], diagramUrl: undefined }
      return clone
    })
  }

  // Filtered view based on user request (e.g., Q7, Q9)
  const visibleQuestions = filterExtractedQuestions(extractedQuestions, filterQuery)

  // Import reviewed questions into chosen paper section
  const handleImportSelected = async () => {
    if (!paper) return
    const questionsToImport = visibleQuestions.filter(q => q.isSelected)
    if (questionsToImport.length === 0) {
      alert('Please select at least one question to import.')
      return
    }

    const targetSec = paper.content.sections.find(s => s.sectionId === selectedSectionId) || paper.content.sections[0]
    if (!targetSec) {
      alert('No section available in this paper. Please add a section first.')
      return
    }

    const currentCount = targetSec.questions?.length || 0

    const formattedQuestions = questionsToImport.map((q, idx) => ({
      id: `q_ocr_${Date.now()}_${idx}`,
      sectionId: targetSec.sectionId,
      orderNumber: currentCount + idx + 1,
      type: q.type,
      prompt: q.prompt,
      marks: q.marks,
      difficulty: q.difficulty,
      topic: 'OCR Imported',
      tags: ['Photo Import', q.detectedNumber ? `Q${q.detectedNumber}` : 'OCR'],
      options: q.options,
      diagramUrl: q.diagramUrl,
      source: 'ocr' as const
    }))

    const updatedSections = paper.content.sections.map(sec => {
      if (sec.sectionId === targetSec.sectionId) {
        return {
          ...sec,
          questions: [...(sec.questions || []), ...formattedQuestions]
        }
      }
      return sec
    })

    await saveContent({
      ...paper.content,
      sections: updatedSections,
      totalCalculatedQuestions: (paper.content.totalCalculatedQuestions || 0) + formattedQuestions.length,
      totalCalculatedMarks: (paper.content.totalCalculatedMarks || 0) + formattedQuestions.reduce((a, b) => a + b.marks, 0)
    })

    setImportSuccess(`Successfully imported ${formattedQuestions.length} reviewed questions into ${targetSec.title}!`)
    setExtractedQuestions(prev => prev.filter(q => !q.isSelected))
  }

  const activeImageToDisplay = showPreprocessed && preprocessedPreview ? preprocessedPreview : imagePreview

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-50 text-violet-700 border border-violet-100">
            <ScanText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Input Tool</span>
              <Badge variant="purple" size="sm">Camera & OCR</Badge>
              {isOnline ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <WifiOff className="w-3 h-3" /> Offline Mode
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Photo & OCR Question Input</h1>
            <p className="text-xs text-slate-500">
              Extract questions from textbook photos, question papers, or YouTube screen recordings with Hindi & English bilingual support.
            </p>
          </div>
        </div>

        {paper && (
          <Badge variant="primary" size="md">
            {paper.metadata.title}
          </Badge>
        )}
      </div>

      {/* Connectivity & Model Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-300">
            <strong>Bilingual Tesseract OCR:</strong> Supports Hindi (Devanagari) + English script. Language models download once (~3MB) and are cached locally in your browser. All recognition runs 100% privately on your device.
          </span>
        </div>
      </div>

      {/* 1. Upload & Recognition Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          1. Select or Capture Examination Photo
        </h2>

        {/* Upload Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="border-2 border-dashed border-slate-300 hover:border-violet-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-violet-50/30">
            <UploadCloud className="w-8 h-8 text-violet-600 mb-2" />
            <span className="text-xs font-bold text-slate-800">Choose from Gallery / Files</span>
            <span className="text-[11px] text-slate-400 mt-1">PNG, JPG, WebP supported</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <label className="border-2 border-dashed border-slate-300 hover:border-violet-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-violet-50/30">
            <Camera className="w-8 h-8 text-violet-600 mb-2" />
            <span className="text-xs font-bold text-slate-800">Take Photo with Camera</span>
            <span className="text-[11px] text-slate-400 mt-1">Direct camera capture for phone</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Quick Sample Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLoadHindiSamplePhoto}
              className="text-violet-700 font-semibold hover:underline flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Load Hindi Board MCQ (Q20 वृत्त/Circle)</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={handleLoadSamplePhoto}
              className="text-slate-600 font-medium hover:underline flex items-center gap-1.5"
            >
              <span>Load English Science Page (Q7, Q8, Q9)</span>
            </button>
          </div>
        </div>

        {/* OCR Language & Image Preprocessing Configuration Bar */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Language Selection */}
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-violet-600 shrink-0" />
              <label className="text-xs font-bold text-slate-700">Recognition Language:</label>
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value as OcrLanguage)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                {OCR_SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Run Button */}
            {imagePreview && (
              <Button
                variant="primary"
                size="md"
                onClick={handleRunOcr}
                isLoading={isProcessing}
                leftIcon={<ScanText className="w-4 h-4" />}
              >
                Recognize Questions
              </Button>
            )}
          </div>

          {/* Dark Background Inversion & Contrast Settings */}
          <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Dark Background Handling:</span>
              </div>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="invertMode"
                  value="auto"
                  checked={invertMode === 'auto'}
                  onChange={() => setInvertMode('auto')}
                  className="text-violet-600 focus:ring-violet-500"
                />
                <span className="text-slate-700">Auto-Detect</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="invertMode"
                  value="always"
                  checked={invertMode === 'always'}
                  onChange={() => setInvertMode('always')}
                  className="text-violet-600 focus:ring-violet-500"
                />
                <span className="text-slate-700">Invert to Light (For YouTube / Dark Slides)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="invertMode"
                  value="never"
                  checked={invertMode === 'never'}
                  onChange={() => setInvertMode('never')}
                  className="text-violet-600 focus:ring-violet-500"
                />
                <span className="text-slate-700">Normal (Light Paper)</span>
              </label>

            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={e => setEnhanceContrast(e.target.checked)}
                className="w-3.5 h-3.5 text-violet-600 rounded"
              />
              <span>Enhance Contrast</span>
            </label>
          </div>
        </div>

        {/* Selected Image Preview & Dark Mode Notice */}
        {imagePreview && (
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span>Selected Photo Preview:</span>
                {detectedDark && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                    <Moon className="w-3 h-3" /> Dark Slide Auto-Detected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {preprocessedPreview && (
                  <button
                    type="button"
                    onClick={() => setShowPreprocessed(!showPreprocessed)}
                    className="text-violet-700 hover:underline flex items-center gap-1 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showPreprocessed ? 'Show Original Photo' : 'Show Inverted / Enhanced'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null)
                    setPreprocessedPreview(null)
                    setExtractedQuestions([])
                    setRawOcrText('')
                  }}
                  className="text-rose-600 hover:underline"
                >
                  Clear Photo
                </button>
              </div>
            </div>

            {/* Dark Slide Helpful Alert */}
            {detectedDark && (
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs flex items-center justify-between gap-3 text-indigo-950">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Dark Slide Detected:</strong> Image colors are inverted to crisp black text on white background so OCR does not produce garbled characters.
                  </span>
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 flex items-center justify-center p-2">
              <img
                src={activeImageToDisplay || ''}
                alt="Exam Capture Preview"
                className="max-h-60 w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 space-y-2 animate-pulse">
            <div className="flex justify-between text-xs font-bold text-violet-900">
              <span>{ocrProgress.status}</span>
              <span>{ocrProgress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-violet-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 transition-all duration-300"
                style={{ width: `${ocrProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Notice */}
        {ocrError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">OCR Notice:</span> {ocrError}
            </div>
          </div>
        )}

        {/* Import Success Notification */}
        {importSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importSuccess}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/editor?paperId=${paper?.metadata.id}`)}
              leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Go to Editor
            </Button>
          </div>
        )}

        {/* Raw OCR Text Diagnostic Accordion */}
        {rawOcrText && (
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowRawText(!showRawText)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{showRawText ? 'Hide Raw OCR Text' : 'View Raw OCR Text Recognized by Engine'}</span>
            </button>
            {showRawText && (
              <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800">
                {rawOcrText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Review, Filter & Edit Recognized Questions */}
      {extractedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. Review & Edit Recognized Questions ({visibleQuestions.length} Questions)
                </h2>
                <p className="text-xs text-slate-500">
                  Verify Hindi/English question text, math symbols, and MCQ options before importing to your examination.
                </p>
              </div>

              {/* Target Section Selection */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Target Section:</span>
                <select
                  value={selectedSectionId}
                  onChange={e => setSelectedSectionId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  {paper?.content.sections.map(s => (
                    <option key={s.sectionId} value={s.sectionId}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Specific Question Number Filter (e.g. Q7, Q9) */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <Filter className="w-4 h-4 text-violet-600 shrink-0" />
              <span className="font-bold text-slate-700">Filter Question Numbers:</span>
              <input
                type="text"
                placeholder="e.g. Q20, Q7, Q9 or 20 (or 'all')"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="px-3 py-1 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-violet-500 flex-1 min-w-[160px]"
              />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterQuery('all')}
                  className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[11px] font-bold text-slate-700"
                >
                  All
                </button>
                {extractedQuestions.some(q => q.detectedNumber === '20') && (
                  <button
                    type="button"
                    onClick={() => setFilterQuery('20')}
                    className="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 rounded text-[11px] font-bold text-violet-800"
                  >
                    Q20
                  </button>
                )}
                {extractedQuestions.some(q => q.detectedNumber === '7') && (
                  <button
                    type="button"
                    onClick={() => setFilterQuery('7, 9')}
                    className="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 rounded text-[11px] font-bold text-violet-800"
                  >
                    Q7 & Q9
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Review Cards */}
          <div className="space-y-4">
            {visibleQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`bg-white rounded-3xl border-2 p-5 sm:p-6 shadow-xs space-y-4 transition-all ${
                  q.isSelected ? 'border-violet-300' : 'border-slate-200 opacity-60'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={q.isSelected}
                      onChange={e => handleUpdateQuestion(idx, { ...q, isSelected: e.target.checked })}
                      className="w-4 h-4 text-violet-600 rounded cursor-pointer"
                    />
                    <span className="text-sm font-bold text-slate-900">
                      {q.detectedNumber ? `Question ${q.detectedNumber}` : `Recognized Item #${idx + 1}`}
                    </span>
                    <Badge variant={q.type === 'mcq' ? 'purple' : 'info'} size="sm">
                      {q.type.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Marks editor */}
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                      <span>Marks:</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={q.marks}
                        onChange={e => handleUpdateQuestion(idx, { ...q, marks: Number(e.target.value) })}
                        className="w-12 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-center text-xs font-bold"
                      />
                    </div>

                    {/* Question Type selector */}
                    <select
                      value={q.type}
                      onChange={e => handleUpdateQuestion(idx, { ...q, type: e.target.value as QuestionType })}
                      className="px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="long_answer">Long Answer</option>
                    </select>
                  </div>
                </div>

                {/* Mathematical Notation & Ambiguity Warning */}
                {q.uncertainNotationWarnings && q.uncertainNotationWarnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Uncertain Recognition / Mathematical Notation:</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                      {q.uncertainNotationWarnings.map((w, wIdx) => (
                        <li key={wIdx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Editable Question Prompt */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Question Prompt (Editable):
                  </label>
                  <textarea
                    rows={3}
                    value={q.prompt}
                    onChange={e => handleUpdateQuestion(idx, { ...q, prompt: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-sans leading-relaxed text-slate-900 focus:outline-violet-500"
                  />
                </div>

                {/* MCQ Options (If MCQ) */}
                {q.type === 'mcq' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Options (Review & Select Correct Answer):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddOption(idx)}
                        className="text-[11px] font-bold text-violet-700 hover:text-violet-900 flex items-center gap-1 hover:underline"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.options || [
                        { id: '1', label: 'A', text: '' },
                        { id: '2', label: 'B', text: '' },
                        { id: '3', label: 'C', text: '' },
                        { id: '4', label: 'D', text: '' }
                      ]).map((opt, optIdx) => (
                        <div key={opt.id} className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <span className="text-xs font-bold text-slate-700 w-6 text-center">({opt.label})</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={e => {
                              const newOpts = [...(q.options || [])]
                              newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value }
                              handleUpdateQuestion(idx, { ...q, options: newOpts })
                            }}
                            className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none"
                            placeholder={`Option ${opt.label} text`}
                          />
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={opt.isCorrect || false}
                            onChange={() => {
                              const newOpts = (q.options || []).map((o, i) => ({ ...o, isCorrect: i === optIdx }))
                              handleUpdateQuestion(idx, { ...q, options: newOpts, answerKey: opt.label })
                            }}
                            title="Mark as correct answer"
                            className="cursor-pointer"
                          />
                          {(q.options && q.options.length > 2) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx, optIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete option"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Diagram / Image Region */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {q.diagramUrl ? (
                      <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 p-1.5 rounded-xl">
                        <img
                          src={q.diagramUrl}
                          alt="Diagram Preview"
                          className="w-12 h-10 object-contain rounded border border-violet-100 bg-white"
                        />
                        <span className="text-[11px] font-bold text-violet-800">Diagram Attached</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDiagram(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Remove diagram"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">No diagram attached</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAttachDiagram(idx)}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Attach Diagram from Photo</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Import Action Bar */}
          <div className="sticky bottom-4 z-20 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-lg flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-700">
              {visibleQuestions.filter(q => q.isSelected).length} Questions Selected for Import
            </span>
            <Button
              variant="primary"
              size="md"
              onClick={handleImportSelected}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Import Selected to Examination
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
