import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Layout } from './Layout'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('Layout', () => {
  it('renders the topbar nav links and its children', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider>
          <Layout>
            <p>page content</p>
          </Layout>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(html).toContain('page content')
    expect(html).toContain('/legacy/profil.html')
    expect(html).toContain('/legacy/changelog.html')
  })
})
