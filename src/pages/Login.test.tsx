// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Login } from './Login'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('Login', () => {
  it('renders the email and password fields', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
  })
})

describe('Login — galat tautan email di hash URL', () => {
  afterEach(() => {
    cleanup()
    window.history.replaceState(null, '', '/')
  })

  it('menampilkan pesan otp_expired lalu membersihkan hash', () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_code=otp_expired&error_description=x')
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(container.textContent).toContain('Tautan konfirmasi sudah dipakai atau kedaluwarsa.')
    expect(window.location.hash).toBe('')
  })
})
