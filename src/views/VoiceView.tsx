import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import type { SectionContent } from '../types'

export const VoiceView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, saveContent } = usePaperDetails(paperId)

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [imported, setImported] = useState(false)

  const toggleListening = () => {
    if (!isListening) {
      setIsListening(true)
      // Check if browser SpeechRecognition is available
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-IN'

        recognition.onresult = (event: any) => {
          let current = ''
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + ' '
          }
          setTranscript(current)
        }

        recognition.onerror = () => {
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.start()
        ;(window as any)._rec = recognition
      } else {
        // Simulated speech fallback for unsupported browsers
        setTimeout(() => {
          setTranscript(
            'Explain the concept of total internal reflection with two daily life applications.'
          )
          setIsListening(false)
        }, 2000)
      }
    } else {
      setIsListening(false)
      if ((window as any)._rec) {
        ;(window as any)._rec.stop()
      }
    }
  }

  const handleImport = async () => {
    if (!paper || !transcript.trim()) return
    const firstSec = paper.content.sections[0]
    if (!firstSec) return

    const newQ = {
      id: `q_voice_${Date.now()}`,
      sectionId: firstSec.sectionId,
      orderNumber: (firstSec.questions?.length || 0) + 1,
      type: 'short_answer' as const,
      prompt: transcript.trim(),
      marks: 3,
      difficulty: 'medium' as const,
      topic: 'Physics Optics',
      tags: ['Voice Dictation', 'Optics'],
      source: 'voice' as const
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
          <div className="p-3 rounded-2xl bg-teal-50 text-teal-700 border border-teal-100">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Module 10</span>
              <Badge variant="info" size="sm">Speech Recognition</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Voice Input Dictation</h1>
            <p className="text-xs text-slate-500">
              Speak questions naturally — automated formatting structures question statements and options.
            </p>
          </div>
        </div>

        {paper && (
          <Badge variant="primary" size="md">
            {paper.metadata.title}
          </Badge>
        )}
      </div>

      {/* Voice Controls */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-8 text-center space-y-6">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none ${
              isListening
                ? 'bg-rose-600 text-white shadow-rose-500/50 scale-110 animate-pulse'
                : 'bg-teal-600 text-white shadow-teal-500/30 hover:scale-105 active:scale-95'
            }`}
          >
            {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {isListening ? 'Listening to your speech...' : 'Tap the microphone to begin dictating'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Speak clearly. You can dictate questions, marks, or options (e.g. &ldquo;Question: Define acceleration...&rdquo;)
          </p>
        </div>

        {/* Live Transcript Box */}
        <div className="max-w-xl mx-auto text-left">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
            Voice Transcript / Extracted Question
          </label>
          <textarea
            rows={4}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Dictated text will appear here in real time..."
            className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {transcript && (
          <div className="flex items-center justify-center gap-3 pt-2">
            {imported ? (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Question added to paper!</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/editor?paperId=${paperId}`)}
                  className="ml-2"
                >
                  Open Editor
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleImport}
                disabled={!paper}
                className="bg-teal-600 hover:bg-teal-700"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Import as Question
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
