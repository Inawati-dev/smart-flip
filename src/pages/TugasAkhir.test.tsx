// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import TugasAkhir, { TugasAkhirPanel, isoKeLokal } from './TugasAkhir'
import { RUBRIK_BAWAAN, type FinalProject } from '../lib/tugasAkhir'
import { PAKET_PROPOSAL } from '../lib/paketProposal'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: true,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'dosen-1' }, profile: null, role: 'dosen', loading: false }),
}))

vi.mock('../hooks/useKelas', () => ({ useKelasByDosen: () => ({ data: [] }) }))
vi.mock('../hooks/useModules', () => ({ useModules: () => ({ data: [] }) }))

// Daftar brief yang dikembalikan fetchProjectsDosen; tiap uji boleh menggantinya.
const state = vi.hoisted(() => ({ projects: [] as unknown[] }))

const project = {
  id: 'brief-1',
  dosen_id: 'dosen-1',
  title: 'Laporan proyek akhir',
  description: 'Deskripsi brief',
  deadline: null,
  rubric: RUBRIK_BAWAAN,
  class_ids: [],
  is_open: true,
  created_at: '2026-09-01T00:00:00Z',
}

const submissions = [
  {
    id: 'sub-1',
    project_id: 'brief-1',
    user_id: 'mhs-1',
    file_path: 'mhs-1/brief-1-1.pdf',
    file_name: 'laporan.pdf',
    link: null,
    note: null,
    submitted_at: '2026-09-10T00:00:00Z',
    scores: null,
    total: null,
    feedback: null,
    graded_at: null,
    full_name: 'Budi Santoso',
    class_id: null,
  },
  {
    id: 'sub-2',
    project_id: 'brief-1',
    user_id: 'mhs-2',
    file_path: null,
    file_name: null,
    link: 'https://example.com/laporan',
    note: null,
    submitted_at: '2026-09-11T00:00:00Z',
    scores: [80, 80, 80, 80],
    total: 80,
    feedback: 'Bagus',
    graded_at: '2026-09-12T00:00:00Z',
    full_name: 'Sari Dewi',
    class_id: null,
  },
]

vi.mock('../lib/tugasAkhir', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/tugasAkhir')>()
  return {
    ...actual,
    fetchProjectsDosen: async () => state.projects,
    fetchSubmissionsDosen: async () => submissions,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    gradeSubmission: vi.fn(),
    signedFileUrl: vi.fn(async () => 'https://signed.example/url'),
  }
})

vi.mock('../lib/paketProposal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/paketProposal')>()
  return { ...actual, buatPaketProposal: vi.fn(), simpanBobotPaket: vi.fn() }
})

beforeEach(() => {
  state.projects = [project]
})

const briefPaketUji: FinalProject[] = PAKET_PROPOSAL.map((b) => ({
  id: `paket-${b.urutan}`,
  dosen_id: 'dosen-1',
  title: b.judul,
  description: b.ringkas,
  deadline: null,
  rubric: b.rubrik,
  class_ids: [],
  is_open: true,
  created_at: '2026-10-01T00:00:00Z',
  paket_id: 'p1',
  urutan: b.urutan,
  bobot: b.bobot,
}))

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
}

function renderPanel() {
  return render(
    <QueryClientProvider client={newQueryClient()}>
      <MemoryRouter initialEntries={['/asesmen/bank?tab=tugas']}>
        <TugasAkhirPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// TugasAkhir.tsx sekarang jadi cangkang tab di BankSoal.tsx (v23, permintaan
// Johan 16 Sep 2026). /asesmen/tugas-akhir mengalihkan ke
// /asesmen/bank?tab=tugas; isi lamanya sekarang TugasAkhirPanel.
// Antrean #171: membuka lalu menyimpan ulang brief tidak boleh menggeser tenggat.
describe('isoKeLokal', () => {
  it('bolak-balik simpan: tenggat tidak bergeser, di zona waktu mana pun uji dijalankan', () => {
    for (const iso of ['2026-10-12T16:59:00.000Z', '2026-12-31T23:30:00.000Z', '2028-02-29T00:05:00.000Z']) {
      const lokal = isoKeLokal(iso)
      expect(lokal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(new Date(lokal).toISOString()).toBe(iso)
    }
  })

  it('jam yang tampil adalah jam setempat, bukan potongan teks UTC', () => {
    const iso = '2026-10-12T16:59:00.000Z'
    const t = new Date(iso)
    expect(isoKeLokal(iso).slice(11)).toBe(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`)
  })

  it('teks yang bukan tanggal menghasilkan isian kosong', () => {
    expect(isoKeLokal('bukan tanggal')).toBe('')
  })
})

describe('TugasAkhir — dialihkan ke tab bank soal', () => {
  it('membuka /asesmen/tugas-akhir mengalihkan ke /asesmen/bank?tab=tugas', () => {
    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={['/asesmen/tugas-akhir']}>
          <Routes>
            <Route path="/asesmen/tugas-akhir" element={<TugasAkhir />} />
            <Route path="/asesmen/bank" element={<div>cangkang bank soal</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('cangkang bank soal')).toBeTruthy()
  })
})

describe('TugasAkhirPanel — dosen', () => {
  it('menampilkan judul brief', async () => {
    renderPanel()
    expect(await screen.findByText('Laporan proyek akhir')).toBeTruthy()
  })

  it('klik "Lihat Kiriman" menampilkan nama mahasiswa', async () => {
    renderPanel()
    await screen.findByText('Laporan proyek akhir')
    fireEvent.click(screen.getByText('Lihat Kiriman'))
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeTruthy()
      expect(screen.getByText('Sari Dewi')).toBeTruthy()
    })
  })

  it('tombol "Nilai" membuka modal berisi nama kriteria rubrik', async () => {
    renderPanel()
    await screen.findByText('Laporan proyek akhir')
    fireEvent.click(screen.getByText('Lihat Kiriman'))
    await screen.findByText('Budi Santoso')
    fireEvent.click(screen.getByRole('button', { name: 'Nilai' }))
    await waitFor(() => {
      expect(screen.getByText(RUBRIK_BAWAAN[0].nama)).toBeTruthy()
    })
  })
})

describe('TugasAkhirPanel — Paket Rancangan Proposal', () => {
  it('tanpa paket: tombol "Buat Paket Proposal" tampil dan tabel paket tidak ada', async () => {
    renderPanel()
    await screen.findByText('Laporan proyek akhir')
    expect(screen.getByRole('button', { name: 'Buat Paket Proposal' })).toBeTruthy()
    expect(screen.queryByText('Ubah Bobot')).toBeNull()
  })

  it('dengan paket: tabel empat baris tampil dan tombol "Buat Paket Proposal" hilang', async () => {
    state.projects = [...briefPaketUji, project]
    renderPanel()
    await screen.findByText('Rancangan Proposal Lengkap')
    expect(screen.queryByRole('button', { name: 'Buat Paket Proposal' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Lihat Kiriman' })).toHaveLength(5) // 4 paket + 1 brief biasa
    expect(screen.getByText('Topik 1 sampai 6')).toBeTruthy()
    expect(screen.getByText('6 + tautan prototipe')).toBeTruthy()
    expect(screen.getByText('3 bab + Daftar Pustaka')).toBeTruthy()
    expect(screen.getByText(/20% Bab 1 \+ 20% Bab 2 \+ 25% Bab 3 \+ 35% Rancangan Proposal Lengkap/)).toBeTruthy()
  })

  it('modal Ubah Bobot menolak simpan saat jumlah bukan 100', async () => {
    state.projects = briefPaketUji
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: 'Ubah Bobot' }))
    const simpan = screen.getByRole('button', { name: 'Simpan Bobot' }) as HTMLButtonElement
    expect(simpan.disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('Bobot Bab 1 · Pendahuluan'), { target: { value: '30' } })
    expect(simpan.disabled).toBe(true)
    expect(screen.getByText(/Jumlah sekarang 110/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Bobot Bab 2 · Landasan Teori'), { target: { value: '10' } })
    expect(simpan.disabled).toBe(false)
  })

  it('brief paket tidak muncul di daftar brief biasa', async () => {
    state.projects = [...briefPaketUji, project]
    renderPanel()
    await screen.findByText('Laporan proyek akhir')
    // Judul paket hanya sekali: di tabel paket, bukan juga sebagai kartu brief.
    expect(screen.getAllByText('Bab 1 · Pendahuluan')).toHaveLength(1)
  })

  it('Hapus Paket meminta konfirmasi lalu menghapus keempat brief', async () => {
    const { deleteProject } = await import('../lib/tugasAkhir')
    state.projects = briefPaketUji
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Hapus Paket/ }))
    expect(screen.getByText(/semua kiriman serta nilai mahasiswa/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Hapus Paket' }))
    await waitFor(() => expect(vi.mocked(deleteProject)).toHaveBeenCalledTimes(4))
  })

  it('modal nilai menampilkan teks "ukur" kriteria bila ada', async () => {
    state.projects = briefPaketUji
    renderPanel()
    await screen.findByText('Rancangan Proposal Lengkap')
    fireEvent.click(screen.getAllByRole('button', { name: 'Lihat Kiriman' })[0])
    await screen.findByText('Budi Santoso')
    fireEvent.click(screen.getAllByRole('button', { name: 'Nilai' })[0])
    await waitFor(() => expect(screen.getByText(PAKET_PROPOSAL[0].rubrik[0].ukur as string)).toBeTruthy())
  })
})
