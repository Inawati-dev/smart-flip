import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  full_name: string
  role: 'mahasiswa' | 'dosen'
  nim_nidn: string | null
  learning_style: string | null
  jalur: 'cepat' | 'mendalam' | null
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  role: 'mahasiswa' | 'dosen' | null
  loading: boolean
  // Re-fetches profile for the current user. Needed after any direct
  // Supabase UPDATE to the profiles row (e.g. diagnostic.ts's saveJalur) —
  // those don't go through onAuthStateChange, so without this the context
  // silently keeps serving the stale profile until next login/logout.
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, nim_nidn, learning_style, jalur')
        .eq('id', uid)
        .single()
      if (error) console.error('[AuthContext] failed to load profile:', error.message)
      if (mountedRef.current) setProfile(data as Profile | null)
    } catch (e) {
      console.error('[AuthContext] failed to load profile:', e)
      if (mountedRef.current) setProfile(null)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      if (data.session?.user) await loadProfile(data.session.user.id)
      if (active) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      active = false
      mountedRef.current = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id)
  }, [user, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
