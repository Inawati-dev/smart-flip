import { describe, it, expect, vi } from 'vitest'
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
