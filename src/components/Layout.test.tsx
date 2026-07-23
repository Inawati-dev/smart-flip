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
    // Profil and Pengaturan are visible to every role — nav must link to them
    // in-app, not exit to legacy/*.html. Changelog is dosenOnly, so it's
    // deliberately absent here (no role/dosen mocked in this render).
    expect(html).toContain('href="/profil"')
    expect(html).toContain('href="/pengaturan"')
    expect(html).not.toContain('href="/changelog"')
    expect(html).not.toContain('/legacy/')
  })
})
