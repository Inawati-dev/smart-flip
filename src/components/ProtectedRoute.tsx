import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Array<'mahasiswa' | 'dosen'>
  children: ReactNode
}) {
  const { user, role, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  if (roles && role && !roles.includes(role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
