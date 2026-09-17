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
    expect(screen.getByText(/Hapus soal nomor/)).toBeTruthy()
  })

  it('shows all four tabs (Soal, Tes khusus, Tes kelompok, Tugas akhir)', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=pre')
    const tabGroup = await screen.findByRole('tablist', { name: 'Tab bank soal' })
    expect(within(tabGroup).getByText('Soal')).toBeTruthy()
    expect(within(tabGroup).getByText('Tes khusus')).toBeTruthy()
    expect(within(tabGroup).getByText('Tes kelompok')).toBeTruthy()
    expect(within(tabGroup).getByText('Tugas akhir')).toBeTruthy()
  })

  it('clicking the "Tes kelompok" jenis pill (not the outer tab) calls fetchBankSoal with kind "kelompok"', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=pre')
    const jenisGroup = await screen.findByRole('group', { name: 'Filter jenis soal' })
    fireEvent.click(within(jenisGroup).getByText('Tes kelompok'))
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('kelompok', undefined, 1)
    })
  })

  it('falls back to "pre" for old ?jenis=diagnostik / ?jenis=vark links', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=diagnostik')
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('pre', undefined, 1)
    })
  })

  it('?tab=khusus renders the tes-khusus panel content ("+ Buat sesi tes")', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?tab=khusus')
    expect(await screen.findByText('+ Buat sesi tes')).toBeTruthy()
  })
})
