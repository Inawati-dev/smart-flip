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

vi.mock('./KabarPaket', () => ({ TitikKabarPaket: () => null }))
vi.mock('./Lonceng', () => ({ Lonceng: () => null }))
const mockPre = vi.hoisted(() => ({ data: true as boolean | undefined }))
vi.mock('../lib/topik', () => ({ usePreTestDone: () => ({ data: mockPre.data }) }))
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
const ALL_NAV_HREFS = ['/dashboard', '/modul', '/video', '/asesmen', '/mini-projek', '/akun/pdf', '/kelas', '/akun']

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

  it('mahasiswa melihat 6 tautan menu termasuk /mini-projek, tanpa /akun/pdf dan /kelas', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u1', email: 'mhs@test.local' }
    mockAuth.role = 'mahasiswa'
    mockAuth.profile = { full_name: 'Mahasiswa Test', avatar_url: null }
    const html = renderLayout()
    const hrefs = presentNavHrefs(html)
    expect(hrefs).toHaveLength(6)
    expect(hrefs).toContain('/mini-projek')
    expect(hrefs).not.toContain('/akun/pdf')
    expect(hrefs).not.toContain('/kelas')
  })

  // Antrean #168: menu Berkas (/akun/pdf) disembunyikan.
  it('dosen melihat 6 tautan menu, termasuk /kelas, tanpa /akun/pdf', () => {
    mockIsSupabaseConfigured.value = false
    mockAuth.user = { id: 'u2', email: 'dos@test.local' }
    mockAuth.role = 'dosen'
    mockAuth.profile = { full_name: 'Dosen Test', avatar_url: null }
    const html = renderLayout()
    const hrefs = presentNavHrefs(html)
    expect(hrefs).toHaveLength(6)
    expect(hrefs).not.toContain('/mini-projek')
    expect(hrefs).not.toContain('/akun/pdf')
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

// Antrean #332: mahasiswa sebelum tes diagnostik awal hanya melihat Asesmen dan Akun.
// Antrean #331: tur panduan sekali per akun sesudah WelcomeModal ditutup.
describe('Layout: menu terbatas dan tur panduan', () => {
  beforeEach(() => {
    mockIsSupabaseConfigured.value = false
    mockAuth.profile = { full_name: 'Uji', avatar_url: null }
    localStorage.clear()
  })
  afterEach(() => {
    mockPre.data = true
    localStorage.clear()
  })

  it('mahasiswa belum tes diagnostik: hanya /asesmen dan /akun', () => {
    mockAuth.user = { id: 'm1', email: 'm@x' }
    mockAuth.role = 'mahasiswa'
    mockPre.data = false
    // dihitung dari butir menu (data-tur), bukan tautan logo ke /dashboard
    const menu = [...renderLayout().matchAll(/data-tur="(\/[^"]*)"/g)].map((m) => m[1])
    expect([...new Set(menu)]).toEqual(['/asesmen', '/akun'])
  })

  it('mahasiswa sudah tes diagnostik: semua menu mahasiswa', () => {
    mockAuth.user = { id: 'm1', email: 'm@x' }
    mockAuth.role = 'mahasiswa'
    mockPre.data = true
    expect(presentNavHrefs(renderLayout())).toEqual(['/dashboard', '/modul', '/video', '/asesmen', '/mini-projek', '/akun'])
  })

  it('dosen tidak terpengaruh status tes diagnostik', () => {
    mockAuth.user = { id: 'd1', email: 'd@x' }
    mockAuth.role = 'dosen'
    mockPre.data = false
    expect(presentNavHrefs(renderLayout())).toContain('/kelas')
  })

  function renderDom(path = '/dashboard') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <p>isi</p>
        </Layout>
      </MemoryRouter>,
    )
  }

  it('tur muncul sesudah WelcomeModal ditutup, sekali per akun', () => {
    mockAuth.user = { id: 'd1', email: 'd@x' }
    mockAuth.role = 'dosen'
    localStorage.setItem('sfp_onboarded_dos_v1', '1')
    renderDom()
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Dashboard')
    expect(dialog.textContent).toContain('1 / 9')
    fireEvent.click(screen.getByRole('button', { name: 'Lewati' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem('sfp_tur_v1_d1')).toBe('1')
    cleanup()
    renderDom()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('tur tidak muncul sebelum WelcomeModal ditutup, atau untuk mahasiswa yang belum tes diagnostik', () => {
    mockAuth.user = { id: 'd1', email: 'd@x' }
    mockAuth.role = 'dosen'
    renderDom()
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()
    mockAuth.user = { id: 'm1', email: 'm@x' }
    mockAuth.role = 'mahasiswa'
    mockPre.data = false
    localStorage.setItem('sfp_onboarded_v1', '1')
    renderDom()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('tur otomatis tidak muncul di luar Dashboard (mis. halaman tes), dan Esc menutup walau fokus di luar kartu', () => {
    mockAuth.user = { id: 'd2', email: 'd@x' }
    mockAuth.role = 'dosen'
    localStorage.setItem('sfp_onboarded_dos_v1', '1')
    renderDom('/asesmen/pre')
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()
    renderDom()
    expect(screen.getByRole('dialog')).toBeTruthy()
    ;(document.activeElement as HTMLElement | null)?.blur()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
