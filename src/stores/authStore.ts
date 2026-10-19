import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  initialize: () => Promise<void>
  signInWithGoogle: (targetPath?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      try {
        localStorage.removeItem('syncstudy_demo_user')
      } catch {}

      if (!isSupabaseConfigured) {
        set({ user: null, profile: null, isLoading: false, isInitialized: true })
        return
      }

      // Check current active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      if (session?.user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        // If trigger hasn't finished inserting yet, wait briefly and retry once
        if (!profile) {
          await new Promise((r) => setTimeout(r, 600))
          const { data: retryProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
          profile = retryProfile
        }

        const effectiveProfile: Profile = profile || {
          id: session.user.id,
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Student',
          avatar_url: session.user.user_metadata?.avatar_url || null,
          tier: 'free',
          premium_expires_at: null,
          redeem_code_used: null,
          redeem_used_at: null,
          created_at: new Date().toISOString(),
        }

        set({
          user: session.user,
          profile: effectiveProfile,
          isLoading: false,
          isInitialized: true,
        })
      } else {
        set({ user: null, profile: null, isLoading: false, isInitialized: true })
      }

      // Subscribe to real-time auth changes (including OAuth redirects)
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .maybeSingle()

          if (!profile) {
            await new Promise((r) => setTimeout(r, 600))
            const { data: retryProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newSession.user.id)
              .maybeSingle()
            profile = retryProfile
          }

          const effectiveProfile: Profile = profile || {
            id: newSession.user.id,
            full_name:
              newSession.user.user_metadata?.full_name ||
              newSession.user.user_metadata?.name ||
              newSession.user.email?.split('@')[0] ||
              'Student',
            avatar_url: newSession.user.user_metadata?.avatar_url || null,
            tier: 'free',
            premium_expires_at: null,
            redeem_code_used: null,
            redeem_used_at: null,
            created_at: new Date().toISOString(),
          }

          set({
            user: newSession.user,
            profile: effectiveProfile,
            isLoading: false,
            isInitialized: true,
          })
        } else {
          set({
            user: null,
            profile: null,
            isLoading: false,
            isInitialized: true,
          })
        }
      })
    } catch (err: any) {
      console.warn('Auth initialization error:', err?.message)
      set({ user: null, profile: null, isLoading: false, isInitialized: true })
    }
  },

  signInWithGoogle: async (targetPath?: string) => {
    set({ isLoading: true, error: null })
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Please check your environment variables.')
      }

      const path = targetPath || '/dashboard'
      const redirectUrl = `${window.location.origin}${path}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
      return { success: true }
    } catch (err: any) {
      const msg = err?.message || 'Failed to initiate Google sign-in. Please try again.'
      set({ isLoading: false, error: msg })
      return { success: false, error: msg }
    }
  },

  signOut: async () => {
    try {
      localStorage.removeItem('syncstudy_demo_user')
    } catch {}

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Sign out error:', err)
      }
    }

    set({ user: null, profile: null, error: null, isLoading: false })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user || !isSupabaseConfigured) return

    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        set({ profile: data })
      }
    } catch (err) {
      console.error('Error refreshing profile:', err)
    }
  },
}))
