// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import type { ModuleRow } from '../lib/modules'
import type { SumberAktivitas } from '../lib/aktivitas'
import { Dashboard, DashboardMhs, DosenHome } from './Dashboard'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
    }),
  },
  isSupabaseConfigured: false,
}))

// Fixture tetap (bukan tanggal relatif "sekarang") supaya perluPerhatian
// (perhitungan real yang dipakai) deterministik di baris "belum pre-test".
// matriksProgres dan perluPerhatian di-stub langsung supaya jumlah baris
// tabnya pasti, terlepas dari logika rentang aktif/remedial di aktivitas.ts
// (sudah dites sendiri lewat aktivitas.test.ts, bukan tanggung jawab tes ini).
const SUMBER_KOSONG: SumberAktivitas = { profiles: [], attempts: [], progress: [], video: [], modules: [] }

vi.mock('../lib/aktivitas', async () => {
  const actual = await vi.importActual<typeof import('../lib/aktivitas')>('../lib/aktivitas')
  return {
    ...actual,
    fetchSumberAktivitas: async () => SUMBER_KOSONG,
    perluPerhatian: () => [
      { judul: 'Ani', keterangan: 'Belum mengerjakan pre-test', tautan: '/analitik' },
      { judul: 'Budi', keterangan: 'Tidak aktif lebih dari 7 hari', tautan: '/analitik' },
    ],
    matriksProgres: () => [{ userId: 'u1', nama: 'Ani', sel: [{ moduleId: 1, orderNum: 1, status: 'L' as const }] }],
  }
})

function fakeModule(id: number): ModuleRow {
  return {
    id,
    course_id: 1,
  order_num: id,
    title: `Modul ${id}`,
    description: null,
    video_url: null,
  duration_sec: null,
    pdf_path: null,
    is_active: true,
    path: '',
    videoId: null,
    color: '',
    sub: '',
    capaian: [],
    materi: [],
    kuis: [],
    jurnal: [],
    studiKasus: [],
  }
}

describe('Dashboard', () => {
  it('renders without throwing when there are no modules yet', () => {
    const queryClient = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toBeTruthy()
  })
})

// DashboardMhs dites lewat props langsung (bukan hook async fetch data) —
// deterministik, tidak butuh mock Supabase. Menggantikan RoadmapWidget lama
// (spec §4.0/§9 WP8): kartu "Langkah berikutnya" adalah pusat tampilan baru.
describe('DashboardMhs', () => {
  const modules = [fakeModule(1), fakeModule(2)]

  it('belum baca modul 1: tombol utama "Baca modul 1"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs modules={modules} progress={{}} attempts={[]} />
      </MemoryRouter>,
    )
    expect(html).toContain('Langkah berikutnya')
    expect(html).toContain('Baca topik 1')
    expect(html).toContain('Topik 1 dari 2')
  })

  it('modul 1 sudah dibaca penuh: tombol utama "Kerjakan tes formatif 1"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs
          modules={modules}
          progress={{ 'books/modul-01.pdf': { pct: 100, currentPage: 20, lastOpened: null } }}
          attempts={[]}
        />
      </MemoryRouter>,
    )
    expect(html).toContain('Kerjakan tes formatif 1')
  })
})

// Antrean 16 Sep 2026 (permintaan Johan): tiga bagian dashboard dosen jadi
// tab + badge notifikasi. Data lewat mock '../lib/aktivitas' di atas, bukan
// props langsung — DosenHome menariknya sendiri lewat useQuery.
describe('DosenHome', () => {
  function renderDosenHome() {
    const queryClient = new QueryClient()
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DosenHome />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('menampilkan tiga tab: Aktivitas, Perlu perhatian, Progres', async () => {
    renderDosenHome()
    expect(await screen.findByRole('button', { name: /Aktivitas/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Perlu perhatian/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Progres/ })).toBeTruthy()
  })

  it('badge tab "Perlu perhatian" menampilkan jumlah baris dari data mock (2)', async () => {
    renderDosenHome()
    const tabPerhatian = await screen.findByRole('button', { name: /Perlu perhatian/ })
    await waitFor(() => expect(tabPerhatian.textContent).toContain('2'))
  })

  it('klik tab Progres menampilkan tabel matriks', async () => {
    renderDosenHome()
    const tabProgres = await screen.findByRole('button', { name: /Progres/ })
    fireEvent.click(tabProgres)
    expect(await screen.findByText('Ani')).toBeTruthy()
    expect(screen.getByText('M1')).toBeTruthy()
  })
})
