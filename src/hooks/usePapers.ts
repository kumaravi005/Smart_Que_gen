import { useState, useEffect, useCallback } from 'react'
import type { PaperMetadata } from '../types'
import { paperService } from '../services/paperService'
import { seedInitialDataIfEmpty } from '../services/db'

export function usePapers() {
  const [papers, setPapers] = useState<PaperMetadata[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadPapers = useCallback(async () => {
    try {
      setLoading(true)
      await seedInitialDataIfEmpty()
      const data = await paperService.getAllPapers()
      setPapers(data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load papers:', err)
      setError(err?.message || 'Failed to load papers from local database')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPapers()
  }, [loadPapers])

  const createPaper = async (params?: {
    title?: string
    subject?: string
    className?: string
    examName?: string
    totalMarks?: number
  }) => {
    try {
      const newPaper = await paperService.createNewPaper(params)
      await loadPapers()
      return newPaper
    } catch (err: any) {
      console.error('Failed to create paper:', err)
      throw err
    }
  }

  const deletePaper = async (id: string) => {
    try {
      await paperService.deletePaper(id)
      await loadPapers()
    } catch (err: any) {
      console.error('Failed to delete paper:', err)
      throw err
    }
  }

  return {
    papers,
    loading,
    error,
    refresh: loadPapers,
    createPaper,
    deletePaper
  }
}
