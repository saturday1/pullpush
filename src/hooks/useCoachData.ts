import { useState, useCallback } from 'react'
import { supabase } from '../supabase'

export interface CoachInsight {
  title: string
  body: string
  type: 'progress' | 'nutrition' | 'recovery' | 'tip'
}

export interface CoachSummary {
  summary: string[]
  insights: CoachInsight[]
}

export interface CoachAnswer {
  answer: string
  questions_used: number
  questions_max: number
}

interface UseCoachDataReturn {
  summary: CoachSummary | null
  summaryLoading: boolean
  summaryError: string | null
  loadSummary: () => Promise<void>
  askQuestion: (question: string) => Promise<CoachAnswer>
  askLoading: boolean
  askError: string | null
  questionsUsed: number
  questionsMax: number
}

export function useCoachData(): UseCoachDataReturn {
  const [summary, setSummary] = useState<CoachSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [questionsUsed, setQuestionsUsed] = useState(0)
  const [questionsMax, setQuestionsMax] = useState(10)

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await supabase.functions.invoke('ai-coach-weekly', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.error) throw new Error(res.error.message ?? 'Failed to load summary')

      const data = res.data as CoachSummary
      setSummary(data)
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : String(e))
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const askQuestion = useCallback(async (question: string): Promise<CoachAnswer> => {
    setAskLoading(true)
    setAskError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await supabase.functions.invoke('ai-coach-ask', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { question },
      })

      if (res.error) {
        const errorData = res.data as { error?: string; questions_used?: number; questions_max?: number } | undefined
        if (errorData?.questions_used !== undefined) {
          setQuestionsUsed(errorData.questions_used)
          setQuestionsMax(errorData.questions_max ?? 10)
        }
        throw new Error(errorData?.error ?? res.error.message ?? 'Failed to ask')
      }

      const data = res.data as CoachAnswer
      setQuestionsUsed(data.questions_used)
      setQuestionsMax(data.questions_max)
      return data
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setAskError(msg)
      throw e
    } finally {
      setAskLoading(false)
    }
  }, [])

  return {
    summary,
    summaryLoading,
    summaryError,
    loadSummary,
    askQuestion,
    askLoading,
    askError,
    questionsUsed,
    questionsMax,
  }
}
