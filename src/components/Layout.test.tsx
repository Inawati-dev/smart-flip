import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { Layout, activeTo } from './Layout'

const mockIsSupabaseConfigured = vi.hoisted(() => ({ value: false }))
const mockAuth = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  role: null as 'mahasiswa' | 'dosen' | null,
  profile: null as { full_name: string; avatar_url: string | null } | null,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: async () => ({ error: null }),
    },
  },
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured.value
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

// Rute PDF (dosenOnly) ditambahkan 16 Sep 2026 — dipindah keluar dari Akun
// ke rel navigasi. Dipakai dua tes di bawah untuk hitung tautan menu persis.
const ALL_NAV_HREFS = ['/dashboard', '/modul', '/video', '/asesmen', '/akun/pdf', '/akun']

function presentNavHrefs(html: string): string[] {
  return ALL_NAV_HREFS.filter((href) => html.includes(`href="${href}"`))
}

function renderLayout() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Layout>
        <p>page content</p>
      </Layout>
    </MemoryRouter>,
  )
}

describe('Layout', () => {
  it('renders the topbar nav links and its children (demo mode, no session)', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = null
    mockAuth.role = null
    mockAuth.profile = null
    const html = renderLayout()
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

  it('mahasiswa melihat 5 tautan menu, tanpa /akun/pdf', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u1', email: 'mhs@test.local' }
    mockAuth.role = 'mahasiswa'
    mockAuth.profile = { full_name: 'Mahasiswa Test', avatar_url: null }
    const html = renderLayout()
    const hrefs = presentNavHrefs(html)
    expect(hrefs).toHaveLength(5)
    expect(hrefs).not.toContain('/akun/pdf')
  })

  it('dosen melihat 6 tautan menu, termasuk /akun/pdf', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u2', email: 'dos@test.local' }
    mockAuth.role = 'dosen'
    mockAuth.profile = { full_name: 'Dosen Test', avatar_url: null }
    const html = renderLayout()
    const hrefs = presentNavHrefs(html)
    expect(hrefs).toHaveLength(6)
    expect(hrefs).toContain('/akun/pdf')
  })

  it('renders a minimal standalone header (no sidebar/menu) for an anonymous visitor on a real deploy', () => {
    mockIsSupabaseConfigured.value = true
    mockAuth.user = null
    mockAuth.role = null
    mockAuth.profile = null
    const html = renderLayout()
    expect(html).toContain('page content')
    // No authenticated menu structure should leak to an anonymous visitor.
    expect(html).not.toContain('href="/profil"')
    expect(html).not.toContain('href="/dashboard"')
    expect(html).not.toContain('href="/forum"')
    expect(html).not.toContain('href="/draf"')
    expect(html).toContain('href="/"')
  })
})

// /akun/pdf harus menyalakan PDF saja, bukan PDF dan Akun bersamaan.
describe('Layout active item', () => {
  it('hanya satu item aktif di /akun/pdf untuk dosen', () => {
    expect(typeof activeTo).toBe('function')
    expect(activeTo('/akun/pdf', [{ to: '/akun' }, { to: '/akun/pdf' }, { to: '/modul' }])).toBe('/akun/pdf')
    expect(activeTo('/akun', [{ to: '/akun' }, { to: '/akun/pdf' }])).toBe('/akun')
  })
})
