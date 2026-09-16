// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import TugasAkhir, { TugasAkhirPanel } from './TugasAkhir'
import { RUBRIK_BAWAAN } from '../lib/tugasAkhir'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: true,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'dosen-1' }, profile: null, role: 'dosen', loading: false }),
}))

vi.mock('../hooks/useKelas', () => ({ useKelasByDosen: () => ({ data: [] }) }))

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
    fetchProjectsDosen: async () => [project],
    fetchSubmissionsDosen: async () => submissions,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    gradeSubmission: vi.fn(),
    signedFileUrl: vi.fn(async () => 'https://signed.example/url'),
  }
})

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

  it('klik "Lihat kiriman" menampilkan nama mahasiswa', async () => {
    renderPanel()
    await screen.findByText('Laporan proyek akhir')
    fireEvent.click(screen.getByText('Lihat kiriman'))
    await waitFor(() => {
      expect(screen.getByText('Budi Santoso')).toBeTruthy()
      expect(screen.getByText('Sari Dewi')).toBeTruthy()
    })
  })

  it('tombol "Nilai" membuka modal berisi nama kriteria rubrik', async () => {
    renderPanel()
    await screen.findByText('Laporan proyek akhir')
    fireEvent.click(screen.getByText('Lihat kiriman'))
    await screen.findByText('Budi Santoso')
    fireEvent.click(screen.getByRole('button', { name: 'Nilai' }))
    await waitFor(() => {
      expect(screen.getByText(RUBRIK_BAWAAN[0].nama)).toBeTruthy()
    })
  })
})
