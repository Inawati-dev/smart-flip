import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Profile {
  full_name: string
  role: 'mahasiswa' | 'dosen'
  nim_nidn: string | null
  learning_style: string | null
  jalur: 'cepat' | 'mendalam' | null
  avatar_url: string | null
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
        .select('full_name, role, nim_nidn, learning_style, jalur, avatar_url')
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

    // Pratinjau tampilan tanpa login, HANYA di dev server (import.meta.env.DEV)
    // dan hanya bila VITE_UI_PREVIEW_ROLE diisi di .env.development.local
    // (berkas itu diabaikan git). Dipakai sesi Claude untuk memotret dua
    // viewport wajib tanpa memasukkan kata sandi siapa pun. Build produksi
    // tidak pernah masuk cabang ini.
    const previewRole = import.meta.env.DEV ? (import.meta.env.VITE_UI_PREVIEW_ROLE as string | undefined) : undefined
    if (previewRole === 'mahasiswa' || previewRole === 'dosen') {
      setUser({ id: `preview-${previewRole}`, email: `${previewRole}@pratinjau.local` } as unknown as User)
      setProfile({
        full_name: previewRole === 'dosen' ? 'Dosen Pratinjau' : 'Mahasiswa Pratinjau',
        role: previewRole,
        nim_nidn: previewRole === 'dosen' ? '0012345678' : '230512345',
        learning_style: null,
        jalur: null,
        avatar_url: null,
      })
      setLoading(false)
      return () => {
        active = false
        mountedRef.current = false
      }
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
