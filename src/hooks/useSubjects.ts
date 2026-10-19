import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Subject } from '@/types/database'

const DEFAULT_SUBJECTS: Omit<Subject, 'id' | 'user_id'>[] = [
  { name: 'Mathematics', color: '#3b82f6' },
  { name: 'Physics', color: '#8b5cf6' },
  { name: 'Chemistry', color: '#10b981' },
  { name: 'English', color: '#f59e0b' },
  { name: 'History', color: '#ec4899' },
]

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useAuthStore()

  const loadSubjects = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setSubjects([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (data && data.length > 0) {
        setSubjects(data as Subject[])
      } else {
        // Seed default starter subjects for a new authenticated user
        const seeds = DEFAULT_SUBJECTS.map((s) => ({
          user_id: user.id,
          name: s.name,
          color: s.color,
        }))
        const { data: inserted, error: insertError } = await supabase
          .from('subjects')
          .insert(seeds)
          .select()

        if (!insertError && inserted) {
          setSubjects(inserted as Subject[])
        } else {
          setSubjects([])
        }
      }
    } catch (err) {
      console.error('Failed to load subjects:', err)
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  const createSubject = async (name: string, color: string): Promise<Subject> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to add subjects.')
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: color || '#6366f1',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating subject in Supabase:', error)
      throw error
    }

    const created = data as Subject
    setSubjects((prev) => [...prev, created])
    return created
  }

  const deleteSubject = async (id: string): Promise<void> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to delete subjects.')
    }

    const { error } = await supabase.from('subjects').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error

    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  return {
    subjects,
    loading,
    refreshSubjects: loadSubjects,
    createSubject,
    deleteSubject,
  }
}
