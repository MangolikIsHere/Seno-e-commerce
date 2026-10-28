'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  role: string
  full_name: string
  email: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())
  // Track mounted state to prevent state updates after unmount (e.g., if the
  // Supabase profile fetch resolves after a route change has unmounted this tree).
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled || !mountedRef.current) return
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (cancelled || !mountedRef.current) return
        setProfile(data)
      } else {
        if (!mountedRef.current) return
        setProfile(null)
      }
      if (!mountedRef.current) return
      setLoading(false)
    }

    fetchSessionAndProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mountedRef.current) return
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        if (currentSession?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single()
          if (!mountedRef.current) return
          setProfile(data)
        } else {
          if (!mountedRef.current) return
          setProfile(null)
        }
        if (!mountedRef.current) return
        setLoading(false)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  // Stable function reference — prevents StoreProvider (which reads useAuth())
  // from re-rendering whenever AuthProvider's internal state changes.
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
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
