// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Layout, activeTo } from './Layout'

afterEach(cleanup)

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

// Rute PDF dan Kelas (dosenOnly) dipindah keluar dari Akun ke rel navigasi
// sendiri (16 Sep 2026). Dipakai dua tes di bawah untuk hitung tautan menu persis.
const ALL_NAV_HREFS = ['/dashboard', '/modul', '/video', '/asesmen', '/akun/pdf', '/kelas', '/akun']

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

  it('mahasiswa melihat 5 tautan menu, tanpa /akun/pdf dan /kelas', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u1', email: 'mhs@test.local' }
    mockAuth.role = 'mahasiswa'
    mockAuth.profile = { full_name: 'Mahasiswa Test', avatar_url: null }
    const html = renderLayout()
    const hrefs = presentNavHrefs(html)
    expect(hrefs).toHaveLength(5)
    expect(hrefs).not.toContain('/akun/pdf')
    expect(hrefs).not.toContain('/kelas')
  })

  it('dosen melihat 7 tautan menu, termasuk /akun/pdf dan /kelas', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u2', email: 'dos@test.local' }
    mockAuth.role = 'dosen'
    mockAuth.profile = { full_name: 'Dosen Test', avatar_url: null }
    const html = renderLayout()
    const hrefs = presentNavHrefs(html)
    expect(hrefs).toHaveLength(7)
    expect(hrefs).toContain('/akun/pdf')
    expect(hrefs).toContain('/kelas')
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

// Tema jadi toggle di rel/topbar (koreksi Johan 16 Sep 2026 "Tema jadi toggle
// di sidebar saja", menggantikan kartu Tema di Pengaturan.tsx). Rail
// (desktop) dan topbar (mobile) keduanya dirender di markup sekaligus -- CSS
// (hidden/sm:hidden) yang memutuskan mana yang tampak, bukan jsdom -- jadi
// tiap label toggle muncul dua kali di DOM.
describe('Layout theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u1', email: 'mhs@test.local' }
    mockAuth.role = 'mahasiswa'
    mockAuth.profile = { full_name: 'Mahasiswa Test', avatar_url: null }
  })

  it('klik toggle mengganti label dan menyimpan tema ke localStorage', () => {
    render(
      <MemoryRouter>
        <Layout>
          <p>page content</p>
        </Layout>
      </MemoryRouter>,
    )
    const buttons = screen.getAllByLabelText('Ganti ke tema gelap')
    expect(buttons.length).toBeGreaterThan(0)
    fireEvent.click(buttons[0])
    expect(screen.getAllByLabelText('Ganti ke tema terang').length).toBeGreaterThan(0)
    expect(localStorage.getItem('sfp_theme')).toBe('dark')
  })
})
