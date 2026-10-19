import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { QuizSession, QuizQuestion, QuizDifficulty } from '@/types/database'

export interface SaveQuizInput {
  subject: string
  topic: string
  difficulty: QuizDifficulty
  questions_json: QuizQuestion[]
  score: number
  total: number
}

export function useQuizSessions() {
  const [quizHistory, setQuizHistory] = useState<QuizSession[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useAuthStore()

  const loadQuizzes = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setQuizHistory([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false })

      if (error) throw error

      setQuizHistory((data as QuizSession[]) || [])
    } catch (err) {
      console.error('Failed to load quiz sessions:', err)
      setQuizHistory([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadQuizzes()
  }, [loadQuizzes])

  const saveQuizSession = async (data: SaveQuizInput): Promise<QuizSession> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to save quiz sessions.')
    }

    const { data: created, error } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        subject: data.subject,
        topic: data.topic,
        difficulty: data.difficulty,
        questions_json: data.questions_json,
        score: data.score,
        total: data.total,
        taken_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    const sessionData = created as QuizSession
    setQuizHistory((prev) => [sessionData, ...prev])
    return sessionData
  }

  // Count quizzes completed today
  const todayQuizCount = useMemo(() => {
    const todayStr = new Date().toDateString()
    return quizHistory.filter(
      (q) => new Date(q.taken_at).toDateString() === todayStr
    ).length
  }, [quizHistory])

  return {
    quizHistory,
    loading,
    todayQuizCount,
    saveQuizSession,
    refreshQuizzes: loadQuizzes,
  }
}
