// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import TesKhusus from './TesKhusus'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
  isSupabaseConfigured: false,
}))

const authMock = { role: 'dosen' as 'dosen' | 'mahasiswa' }
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, profile: null, role: authMock.role, loading: false }),
}))

vi.mock('../hooks/useModules', () => ({ useModules: () => ({ data: [] }) }))
vi.mock('../hooks/useKelas', () => ({ useKelasByDosen: () => ({ data: [] }) }))

const testSessionsMock = {
  verifyTestCode: vi.fn(async (_code: string) => null as null),
}
vi.mock('../lib/testSessions', () => ({
  fetchSessionsByDosen: async () => [],
  createSession: async () => {
    throw new Error('not used in this test')
  },
  setSessionOpen: async () => {},
  verifyTestCode: (code: string) => testSessionsMock.verifyTestCode(code),
  fetchSessionResults: async () => [],
  fetchMyAttemptForSession: async () => null,
}))

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={newQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/asesmen/tes" element={<TesKhusus />} />
          <Route path="/asesmen/tes/:code" element={<TesKhusus />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TesKhusus — dosen (spec §9 WP6b)', () => {
  it('menampilkan tombol "Buat sesi tes"', () => {
    authMock.role = 'dosen'
    renderAt('/asesmen/tes')
    expect(screen.getByText('+ Buat sesi tes')).toBeTruthy()
  })
})

describe('TesKhusus — mahasiswa (spec §9 WP6b)', () => {
  it('kode salah menampilkan pesan "Kode tidak dikenal…"', async () => {
    authMock.role = 'mahasiswa'
    testSessionsMock.verifyTestCode.mockResolvedValueOnce(null)
    renderAt('/asesmen/tes')

    const input = screen.getByPlaceholderText('mis. 7K3MQ2')
    fireEvent.change(input, { target: { value: 'SALAH1' } })
    fireEvent.click(screen.getByText('Masuk'))

    await waitFor(() => {
      expect(screen.getByText('Kode tidak dikenal atau sesi sudah ditutup')).toBeTruthy()
    })
  })
})
