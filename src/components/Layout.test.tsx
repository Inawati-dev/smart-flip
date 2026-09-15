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
    // Tata letak C "Jalur Pertemuan" (spec 2026-09-15 §8.0): lima menu datar,
    // SAMA untuk semua peran — Dashboard, Modul, Video, Asesmen, Akun.
    expect(html).toContain('href="/dashboard"')
    expect(html).toContain('href="/modul"')
    expect(html).toContain('href="/video"')
    expect(html).toContain('href="/asesmen"')
    expect(html).toContain('href="/akun"')
    // Menu lama disembunyikan dari navigasi (route-nya tetap ada di App.tsx).
    expect(html).not.toContain('href="/profil"')
    expect(html).not.toContain('href="/pengaturan"')
    expect(html).not.toContain('href="/changelog"')
    expect(html).not.toContain('href="/forum"')
    expect(html).not.toContain('/legacy/')
    // Flyout rel (WP-B, 16 Sep 2026): keterangan singkat tiap menu ikut ter-
    // render (CSS-only via group-hover, jadi selalu ada di markup).
    expect(html).toContain('PDF tiap pertemuan')
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
