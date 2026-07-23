import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
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
