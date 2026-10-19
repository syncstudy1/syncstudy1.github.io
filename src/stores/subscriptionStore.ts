import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import type { UserTier } from '@/types/database'

interface SubscriptionState {
  isChecking: boolean
  redeemError: string | null
  redeemSuccess: string | null
  
  isPremium: () => boolean
  getRemainingDays: () => number
  redeemCode: (code: string) => Promise<{ success: boolean; message: string }>
  canAccess: (feature: 'planner' | 'quiz_unlimited' | 'camera_unlimited' | 'analytics_history' | 'streak_calendar' | 'export_data') => boolean
  clearRedeemMessages: () => void
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isChecking: false,
  redeemError: null,
  redeemSuccess: null,

  isPremium: () => {
    const profile = useAuthStore.getState().profile
    if (!profile) return false
    if (profile.tier !== 'premium') return false
    // Always require a valid expiry timestamp — null means no entitlement was
    // ever properly set (inconsistent state), so default to free.
    if (!profile.premium_expires_at) return false
    return new Date(profile.premium_expires_at).getTime() > Date.now()
  },

  getRemainingDays: () => {
    const profile = useAuthStore.getState().profile
    if (!profile || profile.tier !== 'premium' || !profile.premium_expires_at) return 0
    const expiry = new Date(profile.premium_expires_at).getTime()
    const diff = expiry - Date.now()
    if (diff <= 0) return 0
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  },

  canAccess: (feature) => {
    const premium = get().isPremium()
    switch (feature) {
      case 'planner':
      case 'camera_unlimited':
      case 'analytics_history':
      case 'streak_calendar':
      case 'export_data':
      case 'quiz_unlimited':
        return premium
      default:
        return true
    }
  },

  clearRedeemMessages: () => {
    set({ redeemError: null, redeemSuccess: null })
  },

  redeemCode: async (code: string) => {
    set({ isChecking: true, redeemError: null, redeemSuccess: null })
    const trimmed = code.trim().toUpperCase()

    if (!trimmed) {
      const err = 'Please enter a redeem code.'
      set({ isChecking: false, redeemError: err })
      return { success: false, message: err }
    }

    const { user, profile } = useAuthStore.getState()
    if (!user) {
      const err = 'Please sign in first to redeem a code.'
      set({ isChecking: false, redeemError: err })
      return { success: false, message: err }
    }

    try {
      if (!isSupabaseConfigured) {
        const err = 'Database service not configured. Please verify your environment variables.'
        set({ isChecking: false, redeemError: err })
        return { success: false, message: err }
      }

      // Live Supabase Edge Function call
      const { data, error } = await supabase.functions.invoke('redeem-code', {
        body: { code: trimmed },
      })

      if (error) {
        throw new Error(error.message || 'Failed to redeem code')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Invalid or already used redeem code')
      }

      // Refresh user profile
      await useAuthStore.getState().refreshProfile()

      const successMsg = data.message || 'Code redeemed successfully! Premium activated.'
      set({ isChecking: false, redeemSuccess: successMsg })
      return { success: true, message: successMsg }
    } catch (err: any) {
      const msg = err.message || 'Could not redeem code. Please try again.'
      set({ isChecking: false, redeemError: msg })
      return { success: false, message: msg }
    }
  },
}))
