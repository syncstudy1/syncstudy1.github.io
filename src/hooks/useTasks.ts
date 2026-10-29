import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Task, TaskStatus } from '@/types/database'

export interface CreateTaskInput {
  title: string
  subject_id?: string | null
  description?: string | null
  deadline?: string
  estimated_hours?: number
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuthStore()

  const loadTasks = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setTasks([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, subject:subjects(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTasks((data as Task[]) || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setTasks([])
      setError(err instanceof Error ? err.message : 'Could not load tasks.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const createTask = async (data: CreateTaskInput): Promise<Task> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to create tasks.')
    }

    const todayStr = new Date().toISOString().split('T')[0]

    const { data: created, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: data.title.trim(),
        subject_id: data.subject_id || null,
        description: data.description || null,
        deadline: data.deadline || todayStr,
        status: 'pending',
        estimated_hours: data.estimated_hours || 1,
      })
      .select('*, subject:subjects(*)')
      .single()

    if (error) throw error

    const taskData = created as Task
    setTasks((prev) => [taskData, ...prev])
    window.dispatchEvent(new CustomEvent('syncstudy:data-changed', { detail: { type: 'task-added' } }))
    return taskData
  }

  const updateTaskStatus = async (id: string, status: TaskStatus): Promise<void> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to update tasks.')
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)))
    window.dispatchEvent(new CustomEvent('syncstudy:data-changed', { detail: { type: 'task-updated' } }))
  }

  const deleteTask = async (id: string): Promise<void> => {
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to delete tasks.')
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    setTasks((prev) => prev.filter((t) => t.id !== id))
    window.dispatchEvent(new CustomEvent('syncstudy:data-changed', { detail: { type: 'task-deleted' } }))
  }

  return {
    tasks,
    loading,
    error,
    refreshTasks: loadTasks,
    createTask,
    updateTaskStatus,
    deleteTask,
  }
}
