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

export interface CoachHistoryItem {
  id: number
  question: string
  answer: string
  created_at: string
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
  history: CoachHistoryItem[]
  historyLoading: boolean
  loadHistory: () => Promise<void>
}

export function useCoachData(): UseCoachDataReturn {
  const [summary, setSummary] = useState<CoachSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [questionsUsed, setQuestionsUsed] = useState(0)
  const [questionsMax, setQuestionsMax] = useState(10)
  const [history, setHistory] = useState<CoachHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch('https://jfayqffmmkwjrbdanqsm.supabase.co/functions/v1/ai-coach-weekly', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYXlxZmZtbWt3anJiZGFucXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDU0OTQsImV4cCI6MjA4ODg4MTQ5NH0.IM4xu2MRouTAe5DkzWyBtPtekW7J2o6-aKej2vXBeBU',
        },
      })

      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)

      setSummary(body as CoachSummary)
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
      const { data, error } = await supabase.functions.invoke('ai-coach-ask', {
        body: { question },
      })

      if (error) {
        if (typeof data === 'object' && data?.questions_used !== undefined) {
          setQuestionsUsed(data.questions_used)
          setQuestionsMax(data.questions_max ?? 10)
        }
        const msg = typeof data === 'object' && data?.error ? data.error : error.message
        throw new Error(msg ?? 'Failed to ask')
      }

      const result = data as CoachAnswer
      setQuestionsUsed(result.questions_used)
      setQuestionsMax(result.questions_max)
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setAskError(msg)
      throw e
    } finally {
      setAskLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('coach_questions')
        .select('id, question, answer, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) setHistory(data as CoachHistoryItem[])
    } catch { /* ignore */ }
    finally { setHistoryLoading(false) }
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
    history,
    historyLoading,
    loadHistory,
  }
}
