import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  CheckCircle2,
  ArrowRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Volume2
} from 'lucide-react'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePapers } from '../hooks/usePapers'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { Button } from '../components/common/Button'
import { Badge } from '../components/common/Badge'
import type { QuestionType, DifficultyLevel } from '../types'

export const VoiceView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { papers } = usePapers()
  const { isOnline } = useNetworkStatus()

  const paperId = searchParams.get('paperId') || (papers.length > 0 ? papers[0].id : '')
  const { paper, saveContent } = usePaperDetails(paperId)

  // Speech Recognition support check
  const SpeechRecognitionClass =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null
  const isSpeechSupported = !!SpeechRecognitionClass

  // Mode: 'guided' (step-by-step for question + options) vs 'continuous' (freeform keyword dictation)
  const [dictationMode, setDictationMode] = useState<'guided' | 'continuous'>('guided')

  // Active listening target in guided mode: 'prompt' | 'optA' | 'optB' | 'optC' | 'optD' | 'continuous' | null
  const [activeListeningField, setActiveListeningField] = useState<string | null>(null)

  // Question Structured State
  const [prompt, setPrompt] = useState('')
  const [questionType, setQuestionType] = useState<QuestionType>('mcq')
  const [marks, setMarks] = useState<number>(1)
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [optionC, setOptionC] = useState('')
  const [optionD, setOptionD] = useState('')
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A')

  // Continuous transcript state
  const [continuousTranscript, setContinuousTranscript] = useState('')

  // Section target
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState<string | null>(null)

  // Set default target section (respecting URL sectionId param)
  useEffect(() => {
    const sectionParam = searchParams.get('sectionId')
    if (sectionParam && paper?.content?.sections?.some(s => s.sectionId === sectionParam)) {
      setSelectedSectionId(sectionParam)
    } else if (paper?.content?.sections && paper.content.sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(paper.content.sections[0].sectionId)
    }
  }, [paper, selectedSectionId, searchParams])

  // Stop recognition on unmount
  useEffect(() => {
    return () => {
      if ((window as any)._voiceRecognition) {
        try {
          ;(window as any)._voiceRecognition.stop()
        } catch {}
      }
    }
  }, [])

  // Start or stop listening on a specific target field
  const toggleListening = (field: string) => {
    setSpeechError(null)

    if (activeListeningField === field) {
      // Stop listening
      if ((window as any)._voiceRecognition) {
        try {
          ;(window as any)._voiceRecognition.stop()
        } catch {}
      }
      setActiveListeningField(null)
      return
    }

    if (!isSpeechSupported) {
      // Offline fallback: simulated dictation
      setActiveListeningField(field)
      setTimeout(() => {
        if (field === 'prompt') {
          setPrompt('Explain why water droplets assume a spherical shape in free fall.')
        } else if (field === 'optA') {
          setOptionA('Surface Tension')
        } else if (field === 'optB') {
          setOptionB('Atmospheric Pressure')
        } else if (field === 'optC') {
          setOptionC('Viscosity')
        } else if (field === 'optD') {
          setOptionD('Gravity')
        } else if (field === 'continuous') {
          setContinuousTranscript(
            'Question: What is the SI unit of electric potential difference? Option A Ampere Option B Volt Option C Ohm Option D Coulomb Marks: 1'
          )
          handleParseContinuous(
            'Question: What is the SI unit of electric potential difference? Option A Ampere Option B Volt Option C Ohm Option D Coulomb Marks: 1'
          )
        }
        setActiveListeningField(null)
      }, 1200)
      return
    }

    try {
      const recognition = new SpeechRecognitionClass()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-IN'

      recognition.onresult = (event: any) => {
        let text = ''
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript + ' '
        }
        text = text.trim()

        if (field === 'prompt') {
          setPrompt(text)
        } else if (field === 'optA') {
          setOptionA(text)
        } else if (field === 'optB') {
          setOptionB(text)
        } else if (field === 'optC') {
          setOptionC(text)
        } else if (field === 'optD') {
          setOptionD(text)
        } else if (field === 'continuous') {
          setContinuousTranscript(text)
          handleParseContinuous(text)
        }
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition error:', event.error)
        setSpeechError(`Speech recognition notice: ${event.error}. Note that browser speech recognition requires an internet connection.`)
        setActiveListeningField(null)
      }

      recognition.onend = () => {
        setActiveListeningField(null)
      }

      recognition.start()
      ;(window as any)._voiceRecognition = recognition
      setActiveListeningField(field)
    } catch (err: any) {
      console.warn('Speech initialization failed:', err)
      setSpeechError('Could not start microphone. Please ensure microphone permissions are granted.')
      setActiveListeningField(null)
    }
  }

  // Smart parser for continuous speech mode
  const handleParseContinuous = (text: string) => {
    // Looks for Question: ... Option A ... Option B ... Option C ... Option D ...
    const qMatch = text.match(/(?:Question|Q)\s*[:.-]?\s*(.*?)(?=\s*(?:Option\s*A|\(A\)|A[.)]|$))/i)
    if (qMatch && qMatch[1]) {
      setPrompt(qMatch[1].trim())
    }

    const optAMatch = text.match(/(?:Option\s*A|\(A\)|A[.)])\s*[:.-]?\s*(.*?)(?=\s*(?:Option\s*B|\(B\)|B[.)]|$))/i)
    if (optAMatch && optAMatch[1]) {
      setOptionA(optAMatch[1].trim())
      setQuestionType('mcq')
    }

    const optBMatch = text.match(/(?:Option\s*B|\(B\)|B[.)])\s*[:.-]?\s*(.*?)(?=\s*(?:Option\s*C|\(C\)|C[.)]|$))/i)
    if (optBMatch && optBMatch[1]) {
      setOptionB(optBMatch[1].trim())
    }

    const optCMatch = text.match(/(?:Option\s*C|\(C\)|C[.)])\s*[:.-]?\s*(.*?)(?=\s*(?:Option\s*D|\(D\)|D[.)]|$))/i)
    if (optCMatch && optCMatch[1]) {
      setOptionC(optCMatch[1].trim())
    }

    const optDMatch = text.match(/(?:Option\s*D|\(D\)|D[.)])\s*[:.-]?\s*(.*?)(?=\s*(?:Marks|Answer|$))/i)
    if (optDMatch && optDMatch[1]) {
      setOptionD(optDMatch[1].trim())
    }

    const marksMatch = text.match(/Marks?\s*[:.-]?\s*(\d+)/i)
    if (marksMatch && marksMatch[1]) {
      setMarks(Number(marksMatch[1]))
    }
  }

  // Load sample speech text for offline testing
  const handleLoadSampleSpeech = () => {
    setPrompt('What is the SI unit of electric potential difference?')
    setQuestionType('mcq')
    setOptionA('Ampere')
    setOptionB('Volt')
    setOptionC('Ohm')
    setOptionD('Coulomb')
    setCorrectOption('B')
    setMarks(1)
  }

  // Import finalized question into target examination section
  const handleImportToSection = async () => {
    if (!paper) return
    if (!prompt.trim()) {
      alert('Please enter or dictate a question prompt.')
      return
    }

    const targetSec = paper.content.sections.find(s => s.sectionId === selectedSectionId) || paper.content.sections[0]
    if (!targetSec) {
      alert('No section available in this paper.')
      return
    }

    const options =
      questionType === 'mcq'
        ? [
            { id: 'opt_1', label: 'A', text: optionA, isCorrect: correctOption === 'A' },
            { id: 'opt_2', label: 'B', text: optionB, isCorrect: correctOption === 'B' },
            { id: 'opt_3', label: 'C', text: optionC, isCorrect: correctOption === 'C' },
            { id: 'opt_4', label: 'D', text: optionD, isCorrect: correctOption === 'D' }
          ]
        : undefined

    const newQuestion = {
      id: `q_voice_${Date.now()}`,
      sectionId: targetSec.sectionId,
      orderNumber: (targetSec.questions?.length || 0) + 1,
      type: questionType,
      prompt: prompt.trim(),
      marks: Number(marks) || 1,
      difficulty,
      topic: 'Voice Dictation',
      tags: ['Voice Input', questionType.toUpperCase()],
      options,
      answerKey: questionType === 'mcq' ? correctOption : undefined,
      source: 'voice' as const
    }

    const updatedSections = paper.content.sections.map(sec => {
      if (sec.sectionId === targetSec.sectionId) {
        return {
          ...sec,
          questions: [...(sec.questions || []), newQuestion]
        }
      }
      return sec
    })

    await saveContent({
      ...paper.content,
      sections: updatedSections,
      totalCalculatedQuestions: (paper.content.totalCalculatedQuestions || 0) + 1,
      totalCalculatedMarks: (paper.content.totalCalculatedMarks || 0) + (Number(marks) || 1)
    })

    setImportSuccess(`Question successfully added to ${targetSec.title}!`)
    // Reset form for next question
    setPrompt('')
    setOptionA('')
    setOptionB('')
    setOptionC('')
    setOptionD('')
    setContinuousTranscript('')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Input Tool</span>
              <Badge variant="purple" size="sm">Voice Dictation</Badge>
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
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Voice Dictation & Speech Input</h1>
            <p className="text-xs text-slate-500">
              Dictate questions and MCQ options with structured speech recognition and live review.
            </p>
          </div>
        </div>

        {paper && (
          <Badge variant="primary" size="md">
            {paper.metadata.title}
          </Badge>
        )}
      </div>

      {/* Network Requirement Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-slate-300">
            <strong>Speech Connectivity Notice:</strong> Web Speech recognition relies on browser cloud services (Google/Apple) and requires an active internet connection. On offline or unsupported devices, voice simulation fallback and editable review cards are provided.
          </span>
        </div>
      </div>

      {speechError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

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

      {/* Mode Selector */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDictationMode('guided')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              dictationMode === 'guided'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Guided Workflow (Step-by-Step)
          </button>
          <button
            type="button"
            onClick={() => setDictationMode('continuous')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              dictationMode === 'continuous'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Continuous Dictation (Keywords)
          </button>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleSpeech}
          className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Load Sample Question</span>
        </button>
      </div>

      {/* CONTINUOUS DICTATION MODE */}
      {dictationMode === 'continuous' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Continuous Speech Recognition</h2>
              <p className="text-xs text-slate-500">
                Speak fluently using spoken tags like: <em>&ldquo;Question: ... Option A ... Option B ... Option C ... Option D ... Marks: 1&rdquo;</em>
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleListening('continuous')}
              className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center gap-2 text-xs font-bold ${
                activeListeningField === 'continuous'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {activeListeningField === 'continuous' ? (
                <>
                  <MicOff className="w-4 h-4" /> Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Start Dictating
                </>
              )}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Live Speech Transcript:
            </label>
            <textarea
              rows={4}
              value={continuousTranscript}
              onChange={e => {
                setContinuousTranscript(e.target.value)
                handleParseContinuous(e.target.value)
              }}
              placeholder="Speech transcript will appear here. You can also paste or type dictation..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-sans text-slate-900 focus:outline-blue-500"
            />
          </div>
        </div>
      )}

      {/* GUIDED WORKFLOW (Structured Question + Option A, B, C, D) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Structured Question Review & Editing
            </h2>
            <p className="text-xs text-slate-500">
              Tap the microphone icons to dictate individual fields or type directly.
            </p>
          </div>

          {/* Section Selection */}
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

        {/* 1. Question Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span>1. Question Prompt</span>
              {activeListeningField === 'prompt' && (
                <span className="text-[11px] text-rose-600 font-bold animate-pulse flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> Listening to question...
                </span>
              )}
            </label>

            <button
              type="button"
              onClick={() => toggleListening('prompt')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeListeningField === 'prompt'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{activeListeningField === 'prompt' ? 'Stop' : 'Dictate Prompt'}</span>
            </button>
          </div>

          <textarea
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. State Ohm's law and write its mathematical formula."
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-serif leading-relaxed text-slate-900 focus:outline-blue-500"
          />
        </div>

        {/* 2. Type & Marks Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={e => setQuestionType(e.target.value as QuestionType)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="mcq">Multiple Choice (MCQ)</option>
              <option value="short_answer">Short Answer</option>
              <option value="long_answer">Long Answer</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Marks
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={marks}
              onChange={e => setMarks(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* 3. Structured MCQ Options (If MCQ) */}
        {questionType === 'mcq' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Dictate MCQ Options (A, B, C, D)
              </label>
              <span className="text-[11px] text-slate-400">Select radio button for correct answer</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={correctOption === 'A'}
                      onChange={() => setCorrectOption('A')}
                      className="cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Option (A)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleListening('optA')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      activeListeningField === 'optA'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{activeListeningField === 'optA' ? 'Stop' : 'Speak A'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={optionA}
                  onChange={e => setOptionA(e.target.value)}
                  placeholder="Option A text..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-blue-500"
                />
              </div>

              {/* Option B */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={correctOption === 'B'}
                      onChange={() => setCorrectOption('B')}
                      className="cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Option (B)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleListening('optB')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      activeListeningField === 'optB'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{activeListeningField === 'optB' ? 'Stop' : 'Speak B'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={optionB}
                  onChange={e => setOptionB(e.target.value)}
                  placeholder="Option B text..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-blue-500"
                />
              </div>

              {/* Option C */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={correctOption === 'C'}
                      onChange={() => setCorrectOption('C')}
                      className="cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Option (C)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleListening('optC')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      activeListeningField === 'optC'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{activeListeningField === 'optC' ? 'Stop' : 'Speak C'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={optionC}
                  onChange={e => setOptionC(e.target.value)}
                  placeholder="Option C text..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-blue-500"
                />
              </div>

              {/* Option D */}
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="correct_option"
                      checked={correctOption === 'D'}
                      onChange={() => setCorrectOption('D')}
                      className="cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">Option (D)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleListening('optD')}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      activeListeningField === 'optD'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{activeListeningField === 'optD' ? 'Stop' : 'Speak D'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={optionD}
                  onChange={e => setOptionD(e.target.value)}
                  placeholder="Option D text..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrompt('')
              setOptionA('')
              setOptionB('')
              setOptionC('')
              setOptionD('')
            }}
          >
            Clear Fields
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleImportToSection}
            disabled={!prompt.trim()}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Save Question to Examination
          </Button>
        </div>
      </div>
    </div>
  )
}
