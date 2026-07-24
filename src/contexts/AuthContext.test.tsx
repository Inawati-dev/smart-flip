// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './AuthContext'

// This file makes several real `render()` calls (RTL appends to
// document.body and does not auto-cleanup unless vitest's `globals: true`
// is set, which this project does not use). Without this, a later test's
// `screen` queries can match stale DOM left behind by an earlier test.
afterEach(cleanup)

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

describe('AuthProvider initial session load', () => {
  it('does not clear loading (and so does not let ProtectedRoute fail-closed) until the profile fetch resolves', async () => {
    vi.resetModules()

    let resolveProfileFetch: (value: { data: unknown; error: unknown }) => void = () => {}
    const profileFetch = new Promise<{ data: unknown; error: unknown }>((resolve) => {
      resolveProfileFetch = resolve
    })

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
              // Deliberately does not resolve until the test tells it to —
              // this simulates the profile fetch still being in flight.
              single: () => profileFetch,
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

    // Flush the getSession() microtask chain. loadProfile() is now awaiting
    // profileFetch, which we control and have not resolved yet — so `loading`
    // must still be true, meaning ProtectedRoute renders nothing rather than
    // fail-closed redirecting to /dashboard.
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.queryByText('Dashboard Fallback')).toBeNull()
    expect(screen.queryByText('Dosen Secret Content')).toBeNull()

    // Now let the profile fetch resolve with a legitimate dosen role.
    await act(async () => {
      resolveProfileFetch({
        data: { full_name: 'Dr. Test', role: 'dosen', nim_nidn: null, learning_style: null },
        error: null,
      })
      await profileFetch
    })

    await waitFor(() => {
      expect(screen.getByText('Dosen Secret Content')).toBeTruthy()
    })
    expect(screen.queryByText('Dashboard Fallback')).toBeNull()
  })
})
