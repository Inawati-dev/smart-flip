import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { usePreTestDone } from '../lib/topik'

// Path yang boleh diakses mahasiswa SEBELUM pre-test selesai (spec §4.1,
// §9 WP6 poin 3) — termasuk /asesmen/pre sendiri, VARK (tidak menggerbang),
// dan akun/pengaturan (logout, dsb harus selalu bisa diakses).
const PRETEST_EXEMPT_PATHS = ['/asesmen/pre', '/akun', '/pengaturan']

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Array<'mahasiswa' | 'dosen'>
  children: ReactNode
}) {
  const { user, role, loading } = useAuth()
  const location = useLocation()
  const { data: preTestDone, isLoading: preTestLoading } = usePreTestDone()

  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (roles && (!role || !roles.includes(role))) return <Navigate to="/dashboard" replace />

  if (role === 'mahasiswa' && !PRETEST_EXEMPT_PATHS.includes(location.pathname)) {
    // Saat masih memuat: null, bukan alihkan — supaya tidak berkedip ke
    // /asesmen/pre lalu balik lagi begitu query selesai.
    if (preTestLoading) return null
    if (!preTestDone) return <Navigate to="/asesmen/pre" replace />
  }

  return <>{children}</>
}
