import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
}

interface AuthState {
  user: User | null
  profile: AuthUser | null
  session: Session | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: AuthUser | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { error }

    set({ user: data.user, session: data.session })

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()

      set({ profile })
    }

    return { error: null }
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) return { error }

    set({ user: data.user, session: data.session })

    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },

  initialize: async () => {
    set({ loading: true })

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      set({
        user: session.user,
        session,
        profile,
        loading: false
      })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        set({ user: session.user, session, profile })
      } else {
        set({ user: null, session: null, profile: null })
      }
    })
  },
}))
