// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import BankSoal from './BankSoal'
import { AuthProvider } from '../contexts/AuthContext'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

function makeModule(id: number) {
  return {
    id,
    order_num: id,
    title: `Modul ${id}`,
    description: null,
    video_url: null,
    pdf_path: null,
    is_active: true,
    path: '',
    videoId: null,
    color: 'var(--sage)',
    sub: '',
    capaian: [],
    materi: [],
    kuis: [],
    jurnal: [],
    studiKasus: [],
  }
}
const FAKE_MODULES = [makeModule(1), makeModule(2)]
vi.mock('../lib/modules', () => ({
  fetchModules: async () => FAKE_MODULES,
  fetchModuleById: async (id: number) => FAKE_MODULES.find((m) => m.id === id) ?? null,
}))

function makeSoal(id: number) {
  return { id, kind: 'formatif', module_id: 1, question: `Soal nomor ${id}`, options: ['A', 'B', 'C', 'D'], answer_idx: 0, explanation: null, order_num: id }
}

const mockFetchBankSoal = vi.fn()
const mockCreateKuisSoal = vi.fn()
const mockUpdateKuisSoal = vi.fn()
const mockDeleteKuisSoal = vi.fn()
vi.mock('../lib/kuisSoal', () => ({
  fetchBankSoal: (...args: unknown[]) => mockFetchBankSoal(...args),
  createKuisSoal: (...args: unknown[]) => mockCreateKuisSoal(...args),
  updateKuisSoal: (...args: unknown[]) => mockUpdateKuisSoal(...args),
  deleteKuisSoal: (...args: unknown[]) => mockDeleteKuisSoal(...args),
}))

// Panel tab lain butuh lib masing-masing dipalsukan supaya tidak menembak
// Supabase sungguhan saat tabnya dirender (isSupabaseConfigured: false di
// atas membuat semuanya jatuh ke mode demo, tapi query-nya tetap perlu ada).
vi.mock('../lib/testSessions', () => ({
  fetchSessionsByDosen: async () => [],
  createSession: vi.fn(),
  setSessionOpen: vi.fn(),
  verifyTestCode: async () => null,
  fetchSessionResults: async () => [],
  fetchMyAttemptForSession: async () => null,
  generateCode: () => 'ABCDEF',
}))
vi.mock('../lib/tesKelompok', () => ({
  fetchGroupSessions: async () => [],
  createGroupSession: vi.fn(),
  setGroupSessionOpen: vi.fn(),
  deleteGroupSession: vi.fn(),
  fetchGroupResults: async () => [],
  verifyGroupCode: async () => null,
  joinGroup: vi.fn(),
  fetchTeamView: async () => [],
  submitGroupAttempt: vi.fn(),
  kelompokkanHasil: () => [],
  rataKelompok: () => null,
  UKURAN_KELOMPOK_BAWAAN: 5,
}))
vi.mock('../lib/tugasAkhir', () => ({
  fetchProjectsDosen: async () => [],
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  fetchSubmissionsDosen: async () => [],
  gradeSubmission: vi.fn(),
  signedFileUrl: vi.fn(),
  hitungTotal: () => null,
  RUBRIK_BAWAAN: [{ nama: 'Kelengkapan laporan', bobot: 30 }],
}))
vi.mock('../hooks/useKelas', () => ({ useKelasByDosen: () => ({ data: [] }) }))

function renderBankSoal(initialUrl: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <AuthProvider>
          <Routes>
            <Route path="/asesmen/bank" element={<BankSoal />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('BankSoal', () => {
  afterEach(() => {
    mockFetchBankSoal.mockReset()
    mockCreateKuisSoal.mockReset()
    mockUpdateKuisSoal.mockReset()
    mockDeleteKuisSoal.mockReset()
  })

  it('renders one table row per formatif question returned by fetchBankSoal', async () => {
    mockFetchBankSoal.mockResolvedValue([makeSoal(1), makeSoal(2)])
    renderBankSoal('/asesmen/bank?jenis=formatif&modul=1')
    await waitFor(() => {
      expect(document.querySelectorAll('tbody tr').length).toBe(2)
    })
    expect(screen.getByText('Soal nomor 1')).toBeTruthy()
    expect(screen.getByText('Soal nomor 2')).toBeTruthy()
  })

  it('shows the delete confirmation modal ("Hapus soal…") when Hapus is clicked', async () => {
    mockFetchBankSoal.mockResolvedValue([makeSoal(1)])
    renderBankSoal('/asesmen/bank?jenis=formatif&modul=1')
    const delBtn = await screen.findByLabelText(/Hapus soal urutan/)
    fireEvent.click(delBtn)
    expect(screen.getByText(/Hapus Soal Nomor/)).toBeTruthy()
  })

  // Antrean #170: hanya dua tab (Soal, Mini Projek) dan tiga jenis soal.
  it('shows only two tabs: Soal and Mini Projek', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=pre')
    const tabGroup = await screen.findByRole('tablist', { name: 'Tab bank soal' })
    expect(within(tabGroup).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Soal', 'Mini Projek'])
    expect(within(tabGroup).queryByText('Tes Khusus')).toBeNull()
    expect(within(tabGroup).queryByText('Tes Kelompok')).toBeNull()
    expect(within(tabGroup).queryByText('Tugas Akhir')).toBeNull()
  })

  // Antrean #172: post-test tidak lagi ditawarkan, tes formatif mengambil perannya.
  it('jenis soal tinggal Tes Diagnostik Awal dan Tes Formatif (tanpa Post-test dan Tes Kelompok)', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=pre')
    const jenisGroup = await screen.findByRole('group', { name: 'Filter jenis soal' })
    expect(within(jenisGroup).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tes Diagnostik Awal', 'Tes Formatif'])
    expect(within(jenisGroup).queryByText('Tes Kelompok')).toBeNull()
    expect(within(jenisGroup).queryByText('Post-test')).toBeNull()
  })

  it('?jenis=post (tautan lama) jatuh ke Tes Diagnostik Awal tanpa galat', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?tab=soal&jenis=post')
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('pre', undefined, 1)
    })
    expect(mockFetchBankSoal).not.toHaveBeenCalledWith('post', expect.anything(), expect.anything())
  })

  it('?jenis=kelompok (tautan lama) jatuh ke Tes Diagnostik Awal tanpa galat', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?tab=soal&jenis=kelompok')
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('pre', undefined, 1)
    })
    expect(mockFetchBankSoal).not.toHaveBeenCalledWith('kelompok', undefined, 1)
  })

  it('falls back to "pre" for old ?jenis=diagnostik / ?jenis=vark links', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=diagnostik')
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('pre', undefined, 1)
    })
  })

  it.each(['khusus', 'kelompok'])('?tab=%s (tautan lama) jatuh ke tab Soal tanpa panel sesi tes', async (tab) => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal(`/asesmen/bank?tab=${tab}`)
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('pre', undefined, 1)
    })
    expect(screen.getByRole('tab', { name: 'Soal' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('+ Buat Sesi Tes')).toBeNull()
  })

  it('?tab=tugas menampilkan panel Mini Projek ("+ Buat Brief")', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?tab=tugas')
    expect(await screen.findByText('+ Buat Brief')).toBeTruthy()
  })
})
