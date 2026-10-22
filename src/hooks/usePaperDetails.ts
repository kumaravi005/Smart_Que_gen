import { useState, useEffect, useCallback } from 'react'
import type { FullPaper } from '../types'
import { paperService } from '../services/paperService'

export function usePaperDetails(paperId?: string) {
  const [paper, setPaper] = useState<FullPaper | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadPaper = useCallback(async () => {
    if (!paperId) {
      setPaper(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await paperService.getFullPaper(paperId)
      setPaper(data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load full paper:', err)
      setError(err?.message || 'Failed to load paper details')
    } finally {
      setLoading(false)
    }
  }, [paperId])

  useEffect(() => {
    loadPaper()
  }, [loadPaper])

  const saveSettings = async (settings: FullPaper['settings']) => {
    if (!paper) return
    try {
      setSaving(true)
      await paperService.updateExamSettings(settings)
      setPaper(prev => (prev ? { ...prev, settings } : null))
    } finally {
      setSaving(false)
    }
  }

  const saveContent = async (content: FullPaper['content']) => {
    if (!paper) return
    try {
      setSaving(true)
      await paperService.updateContent(content)
      setPaper(prev => (prev ? { ...prev, content } : null))
    } finally {
      setSaving(false)
    }
  }

  const saveLayout = async (layout: FullPaper['layout']) => {
    if (!paper) return
    try {
      setSaving(true)
      await paperService.updateVisualLayout(layout)
      setPaper(prev => (prev ? { ...prev, layout } : null))
    } finally {
      setSaving(false)
    }
  }

  return {
    paper,
    loading,
    saving,
    error,
    refresh: loadPaper,
    saveSettings,
    saveContent,
    saveLayout
  }
}
