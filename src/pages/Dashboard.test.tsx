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

afterEach(() => {
  cleanup()
  uji.sumber = null
})

// Kartu Kabar Terbaru butuh penyedia kueri dan mata kuliah; uji Dashboard tidak memeriksanya.
vi.mock('../components/KabarPaket', () => ({ KabarTerbaruCard: () => null }))
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
const uji = vi.hoisted(() => ({ sumber: null as SumberAktivitas | null }))

vi.mock('../lib/aktivitas', async () => {
  const actual = await vi.importActual<typeof import('../lib/aktivitas')>('../lib/aktivitas')
  return {
    ...actual,
    fetchSumberAktivitas: async () => uji.sumber ?? SUMBER_KOSONG,
    perluPerhatian: () => [
      { judul: 'Ani', keterangan: 'Belum mengerjakan tes diagnostik awal', tautan: '/analitik' },
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

  it('belum baca modul 1: tombol utama "Baca Modul 1"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs modules={modules} progress={{}} attempts={[]} />
      </MemoryRouter>,
    )
    expect(html).toContain('Langkah Berikutnya')
    expect(html).toContain('Baca Topik 1')
    expect(html).toContain('Topik 1 dari 2')
  })

  it('modul 1 sudah dibaca penuh: tombol utama "Kerjakan Tes Formatif 1"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs
          modules={modules}
          progress={{ 'books/modul-01.pdf': { pct: 100, currentPage: 20, lastOpened: null } }}
          attempts={[]}
        />
      </MemoryRouter>,
    )
    expect(html).toContain('Kerjakan Tes Formatif 1')
  })

  // Antrean #153: tes yang belum waktunya tidak ditawarkan; topik yang belum dibuka menampilkan tanggalnya.
  it('jadwal: tes formatif belum dibuka tidak ditawarkan, topik terkunci menampilkan tanggal buka', () => {
    const progress = { 'books/modul-01.pdf': { pct: 100, currentPage: 20, lastOpened: null } }
    const nanti = new Date(2099, 0, 5)
    const tesNanti = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs modules={modules} progress={progress} attempts={[]} formatifPada={() => nanti} />
      </MemoryRouter>,
    )
    expect(tesNanti).not.toContain('Kerjakan Tes Formatif 1')
    expect(tesNanti).toContain('Baca Topik 1')
    const topikNanti = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs modules={modules} progress={progress} attempts={[]} bukaPada={() => nanti} formatifPada={() => nanti} />
      </MemoryRouter>,
    )
    expect(topikNanti).toContain('Topik 1 dibuka')
    expect(topikNanti).not.toContain('Baca Topik 1')
  })

  // Antrean #143: kepala memuat nama, kelas, angkatan, dan golongan.
  it('kepala menampilkan nama, kelas, angkatan, dan golongan tes diagnostik', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs
          modules={modules}
          progress={{}}
          attempts={[]}
          pre={{ skor: 30, golongan: 'remedial' }}
          identitas={{ nama: 'Budi', kelas: { name: 'Kelas A', angkatan: 2026 } }}
        />
      </MemoryRouter>,
    )
    expect(html).toContain('Selamat Datang, Budi')
    expect(html).toContain('Kelas A · Angkatan 2026')
    expect(html).toContain('Belajar Mendalam')
    expect(html).not.toContain('Tes Diagnostik Awal · ')
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

  it('menampilkan tiga tab: Aktivitas, Perlu Perhatian, Progres', async () => {
    renderDosenHome()
    expect(await screen.findByRole('button', { name: /Aktivitas/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Perlu Perhatian/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Progres/ })).toBeTruthy()
  })

  it('badge tab "Perlu Perhatian" menampilkan jumlah baris dari data mock (2)', async () => {
    renderDosenHome()
    const tabPerhatian = await screen.findByRole('button', { name: /Perlu Perhatian/ })
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

// Antrean #301: kepala satu baris + empat kartu bermakna.
describe('DosenHome kepala dan kartu', () => {
  const profil = (id: string) => ({ id, fullName: id, classId: null, kelasNama: null, createdAt: '2026-01-01T00:00:00Z', varkCompletedAt: null })
  const baru = new Date().toISOString()
  const mods = [1, 2, 3].map((n) => ({ id: n, orderNum: n, title: `T${n}` }))

  function renderDosen() {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <DosenHome nama="Dewi" />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('kepala: sapaan, tanggal panjang hari ini, tombol rentang', async () => {
    renderDosen()
    expect(await screen.findByText('Halo, Dewi')).toBeTruthy()
    expect(screen.getByText(/Dashboard Dosen · \S+, \d{1,2} \S+ \d{4}/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '30 hari' })).toBeTruthy()
  })

  it('belum ada formatif: kartu baru, "Topik 1 dari 3" (bukan P0), dan bilah langkah ke /modul', async () => {
    uji.sumber = {
      ...SUMBER_KOSONG,
      modules: mods,
      profiles: [profil('a'), profil('b')],
      attempts: [
        { userId: 'a', moduleId: null, score: 90, kind: 'pre', attemptedAt: baru, sessionId: null },
        { userId: 'b', moduleId: null, score: 20, kind: 'pre', attemptedAt: baru, sessionId: null },
      ],
    }
    renderDosen()
    expect(await screen.findByText(/Jalur Cepat 1 · Belajar Mendalam 1/)).toBeTruthy()
    // Rentang 7 hari: data percobaan terpotong, jadi "Belum ada" diberi keterangan rentang dan bilah langkah belum muncul.
    expect(document.body.textContent).toContain('Belum ada dalam 7 hari')
    expect(screen.queryByText(/Langkah berikutnya/)).toBeNull()
    expect(document.body.textContent).toContain('dari 3')
    expect(document.body.textContent).not.toContain('P0')
    expect(screen.getByText(/Mahasiswa aktif · 7 HARI/i)).toBeTruthy()
    expect(screen.getByText(/Batas lulus \d+ · remedial 7 hari: 0 percobaan/)).toBeTruthy()
    // Rentang Semester: belum ada formatif sama sekali, bilah langkah muncul.
    fireEvent.click(screen.getByRole('button', { name: 'Semester' }))
    expect(await screen.findByText(/Langkah berikutnya: buka tes formatif Topik 1 supaya kelas bisa lanjut\./)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Atur Jadwal Tes' }).getAttribute('href')).toBe('/modul')
  })

  it('sudah ada formatif: bilah langkah tidak tampil dan rata-rata formatif terlihat', async () => {
    uji.sumber = {
      ...SUMBER_KOSONG,
      modules: mods,
      profiles: [profil('a')],
      attempts: [{ userId: 'a', moduleId: 1, score: 85, kind: 'formatif', attemptedAt: baru, sessionId: null }],
    }
    renderDosen()
    expect(await screen.findByText('Semua membuka modul')).toBeTruthy()
    expect(screen.queryByText(/Langkah berikutnya/)).toBeNull()
    expect(screen.getByText('85')).toBeTruthy()
  })
})
