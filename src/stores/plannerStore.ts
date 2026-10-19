import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { callGemini } from '@/lib/gemini'
import type { StudyPlan, StudyPlanJson } from '@/types/database'

interface PlannerState {
  currentPlan: StudyPlan | null
  savedPlans: StudyPlan[]
  isGenerating: boolean
  error: string | null

  generatePlan: (params: {
    subjects: string[]
    tasks: string[]
    availableHours: number
    startDate: string
    endDate: string
  }) => Promise<void>
  approvePlan: (planId?: string) => Promise<void>
  discardPlan: () => void
  loadSavedPlans: () => Promise<void>
  deletePlan: (planId: string) => Promise<void>
  updatePlanBlock: (blockId: string, durationMinutes: number, tips?: string) => void
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  currentPlan: null,
  savedPlans: [],
  isGenerating: false,
  error: null,

  loadSavedPlans: async () => {
    const user = useAuthStore.getState().user

    if (!isSupabaseConfigured || !user) {
      set({ savedPlans: [] })
      return
    }

    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })

      if (error) throw error

      set({ savedPlans: (data as StudyPlan[]) || [] })
    } catch (err: any) {
      console.error('Failed to load study plans:', err)
      set({ savedPlans: [] })
    }
  },

  generatePlan: async (params) => {
    set({ isGenerating: true, error: null })
    const user = useAuthStore.getState().user

    if (!user) {
      set({ isGenerating: false, error: 'You must be signed in to generate a study plan.' })
      throw new Error('Authentication required')
    }

    try {
      const planJson = (await callGemini({
        type: 'schedule',
        data: params,
      })) as StudyPlanJson

      const newPlan: StudyPlan = {
        id: `plan-${Date.now()}`,
        user_id: user.id,
        generated_at: new Date().toISOString(),
        approved: false,
        plan_json: planJson,
      }

      set({ currentPlan: newPlan, isGenerating: false })
    } catch (err: any) {
      console.error('Error generating study plan:', err)
      set({
        isGenerating: false,
        error: err.message || 'Failed to generate study plan. Please verify your inputs.',
      })
      throw err
    }
  },

  approvePlan: async (planId?: string) => {
    const { currentPlan, savedPlans } = get()
    const target = currentPlan || savedPlans.find((p) => p.id === planId)
    if (!target) return

    const user = useAuthStore.getState().user
    if (!user || !isSupabaseConfigured) {
      throw new Error('You must be signed in to save study plans.')
    }

    const approvedPlan: StudyPlan = {
      ...target,
      approved: true,
    }

    try {
      const { data, error } = await supabase
        .from('study_plans')
        .insert({
          user_id: user.id,
          generated_at: approvedPlan.generated_at,
          approved: true,
          plan_json: approvedPlan.plan_json,
        })
        .select()
        .single()

      if (error) throw error

      const created = data as StudyPlan
      set((state) => ({
        savedPlans: [created, ...state.savedPlans],
        currentPlan: null,
      }))
    } catch (err: any) {
      console.error('Error saving approved study plan:', err)
      throw err
    }
  },

  discardPlan: () => {
    set({ currentPlan: null, error: null })
  },

  deletePlan: async (planId: string) => {
    const user = useAuthStore.getState().user
    if (!user || !isSupabaseConfigured) return

    try {
      const { error } = await supabase.from('study_plans').delete().eq('id', planId).eq('user_id', user.id)
      if (error) throw error

      set((state) => ({
        savedPlans: state.savedPlans.filter((p) => p.id !== planId),
      }))
    } catch (err) {
      console.error('Failed to delete plan:', err)
    }
  },

  updatePlanBlock: (blockId: string, durationMinutes: number, tips?: string) => {
    const { currentPlan } = get()
    if (!currentPlan) return

    const updatedBlocks = currentPlan.plan_json.schedule.map((block) => {
      if (block.id === blockId) {
        return {
          ...block,
          durationMinutes,
          tips: tips !== undefined ? tips : block.tips,
        }
      }
      return block
    })

    set({
      currentPlan: {
        ...currentPlan,
        plan_json: {
          ...currentPlan.plan_json,
          schedule: updatedBlocks,
        },
      },
    })
  },
}))
