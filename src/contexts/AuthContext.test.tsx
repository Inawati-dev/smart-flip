// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './AuthContext'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('AuthProvider', () => {
  it('renders children without throwing when no session exists', () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>,
    )
    expect(html).toContain('child')
  })
})

describe('ProtectedRoute fail-closed behavior', () => {
  it('redirects away from a role-gated route when the profile fetch errors', async () => {
    vi.resetModules()
    vi.doMock('../lib/supabase', () => ({
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: 'user-1' } } },
          }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'boom' } }),
            }),
          }),
        }),
      },
      isSupabaseConfigured: false,
    }))

    const { AuthProvider: MockedAuthProvider } = await import('./AuthContext')
    const { ProtectedRoute: MockedProtectedRoute } = await import(
      '../components/ProtectedRoute'
    )

    render(
      <MemoryRouter initialEntries={['/dosen-only']}>
        <MockedAuthProvider>
          <Routes>
            <Route
              path="/dosen-only"
              element={
                <MockedProtectedRoute roles={['dosen']}>
                  <div>Dosen Secret Content</div>
                </MockedProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<div>Dashboard Fallback</div>} />
          </Routes>
        </MockedAuthProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.queryByText('Dosen Secret Content')).toBeNull()
      expect(screen.getByText('Dashboard Fallback')).toBeTruthy()
    })
  })
})
