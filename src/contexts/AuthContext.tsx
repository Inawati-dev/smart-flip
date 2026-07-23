import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadProfile(uid: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, nim_nidn, learning_style, jalur')
        .eq('id', uid)
        .single()
      if (error) console.error('[AuthContext] failed to load profile:', error.message)
      if (active) setProfile(data as Profile | null)
    }

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
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
