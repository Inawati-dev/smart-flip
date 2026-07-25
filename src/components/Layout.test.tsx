import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Layout } from './Layout'

const mockIsSupabaseConfigured = vi.hoisted(() => ({ value: false }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
  },
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured.value
  },
}))

describe('Layout', () => {
  it('renders the topbar nav links and its children (demo mode, no session)', () => {
    mockIsSupabaseConfigured.value = false
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

  it('renders a minimal standalone header (no sidebar/menu) for an anonymous visitor on a real deploy', () => {
    mockIsSupabaseConfigured.value = true
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
    // No authenticated menu structure should leak to an anonymous visitor.
    expect(html).not.toContain('href="/profil"')
    expect(html).not.toContain('href="/dashboard"')
    expect(html).not.toContain('href="/forum"')
    expect(html).not.toContain('href="/draf"')
    expect(html).toContain('href="/"')
  })
})
