// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import TesKelompok, { DosenTesKelompokPanel } from './TesKelompok'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: true,
}))

const authMock = { role: 'dosen' as 'dosen' | 'mahasiswa' }
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, profile: null, role: authMock.role, loading: false }),
}))

vi.mock('../lib/kuisSoal', () => ({
  fetchBankSoal: async () => [
    { id: 1, kind: 'kelompok', module_id: null, question: 'Soal 1', options: ['A', 'B', 'C', 'D'], answer_idx: 0, explanation: null, order_num: 1 },
    { id: 2, kind: 'kelompok', module_id: null, question: 'Soal 2', options: ['A', 'B', 'C', 'D'], answer_idx: 1, explanation: null, order_num: 2 },
    { id: 3, kind: 'kelompok', module_id: null, question: 'Soal 3', options: ['A', 'B', 'C', 'D'], answer_idx: 2, explanation: null, order_num: 3 },
  ],
}))

const oneSession = {
  id: 'sess-1',
  name: 'Sesi Tes Kelompok 1',
  dosen_id: 'user-1',
  group_size: 5,
  shuffle: true,
  is_open: true,
  created_at: '2026-09-01T00:00:00Z',
  teams: [
    { id: 'team-1', session_id: 'sess-1', number: 1, code: 'ABCDEF' },
    { id: 'team-2', session_id: 'sess-1', number: 2, code: 'GHIJKL' },
  ],
}

const verifiedGroup = {
  session_id: 'sess-1',
  name: 'Sesi Tes Kelompok 1',
  shuffle: true,
  team_id: 'team-1',
  team_number: 1,
  member_count: 2,
  group_size: 5,
  already_member: true,
  already_done: false,
}

// kelompokkanHasil/rataKelompok/UKURAN_KELOMPOK_BAWAAN tetap implementasi asli
// (fungsi murni), cuma sisi Supabase-nya yang dipalsukan.
vi.mock('../lib/tesKelompok', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/tesKelompok')>()
  return {
    ...actual,
    fetchGroupSessions: async () => [oneSession],
    createGroupSession: vi.fn(),
    setGroupSessionOpen: vi.fn(),
    deleteGroupSession: vi.fn(),
    fetchGroupResults: async () => [],
    verifyGroupCode: async (_code: string) => verifiedGroup,
    joinGroup: async () => 'team-1',
    fetchTeamView: async () => [
      { user_id: 'user-1', full_name: 'Mahasiswa Satu', score: null, attempted_at: null },
      { user_id: 'user-2', full_name: 'Mahasiswa Dua', score: null, attempted_at: null },
    ],
    submitGroupAttempt: vi.fn(),
  }
})

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={newQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/asesmen/kelompok" element={<TesKelompok />} />
          <Route path="/asesmen/kelompok/:code" element={<TesKelompok />} />
          <Route path="/asesmen/bank" element={<div>cangkang bank soal</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// TesKelompok.tsx sekarang jadi cangkang tab di BankSoal.tsx (v23, permintaan
// Johan 16 Sep 2026). Dosen yang membuka /asesmen/kelompok dialihkan ke
// /asesmen/bank?tab=kelompok; isi lamanya sekarang DosenTesKelompokPanel.
describe('TesKelompok — dosen dialihkan ke tab bank soal', () => {
  it('membuka /asesmen/kelompok sebagai dosen mengalihkan ke /asesmen/bank?tab=kelompok', () => {
    authMock.role = 'dosen'
    renderAt('/asesmen/kelompok')
    expect(screen.getByText('cangkang bank soal')).toBeTruthy()
  })
})

describe('DosenTesKelompokPanel', () => {
  it('menampilkan nama sesi dan kode tiap kelompok', async () => {
    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={['/asesmen/bank?tab=kelompok']}>
          <DosenTesKelompokPanel />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('Sesi Tes Kelompok 1')).toBeTruthy()
    })
    expect(screen.getByText('ABCDEF')).toBeTruthy()
    expect(screen.getByText('GHIJKL')).toBeTruthy()
  })
})

describe('TesKelompok — mahasiswa', () => {
  it('memasukkan kode lalu melihat "Kelompok 1" dan tombol "Mulai"', async () => {
    authMock.role = 'mahasiswa'
    renderAt('/asesmen/kelompok')

    const input = screen.getByPlaceholderText('mis. 7K3MQ2')
    fireEvent.change(input, { target: { value: 'ABCDEF' } })
    fireEvent.click(screen.getByText('Masuk'))

    await waitFor(() => {
      expect(screen.getAllByText(/Kelompok 1/).length).toBeGreaterThan(0)
    })
    expect(await screen.findByText('Mulai')).toBeTruthy()
  })
})
