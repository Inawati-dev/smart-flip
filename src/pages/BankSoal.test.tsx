// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
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

  it('shows the "Tes kelompok" tab and clicking it calls fetchBankSoal with kind "kelompok"', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=pre')
    const tab = await screen.findByText('Tes kelompok')
    fireEvent.click(tab)
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('kelompok', undefined)
    })
  })

  it('falls back to "pre" for old ?jenis=diagnostik / ?jenis=vark links', async () => {
    mockFetchBankSoal.mockResolvedValue([])
    renderBankSoal('/asesmen/bank?jenis=diagnostik')
    await waitFor(() => {
      expect(mockFetchBankSoal).toHaveBeenCalledWith('pre', undefined)
    })
  })
})
