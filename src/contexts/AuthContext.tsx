'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const fetchProfile = async (userId: string, username?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (data) {
        setProfile(data)
        return
      }
      
      // Create profile only if it doesn't exist
      const newUsername = username || `user_${userId.slice(0, 8)}`
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: newUsername,
          total_points: 0
        })
        .select()
        .maybeSingle()
      
      if (newProfile) {
        setProfile(newProfile)
      } else if (error?.code === '23505') {
        // Duplicate - try to fetch again
        const { data: existing } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (existing) setProfile(existing)
      }
    } catch (e) {
      console.error('Error fetching profile:', e)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    if (initialized) return
    
    let mounted = true
    
    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - forcing load complete')
        setLoading(false)
      }
    }, 5000)

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (e) {
        console.error('Auth init error:', e)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Don't block on profile fetch
          fetchProfile(session.user.id).catch(console.error)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [initialized])

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      })
      
      if (error) return { error }
      
      if (data.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username,
            total_points: 0
          }, { onConflict: 'id' })
      }
      
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) {
        // Give a moment for auth state to propagate
        await new Promise(r => setTimeout(r, 100))
      }
      setLoading(false)
      return { error }
    } catch (error) {
      setLoading(false)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
