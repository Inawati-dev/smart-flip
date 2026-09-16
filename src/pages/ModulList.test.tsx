// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import ModulList from './ModulList'

afterEach(cleanup)

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as { role: string } | null,
  role: null as 'mahasiswa' | 'dosen' | null,
  loading: false,
}))

vi.mock('../lib/topik', () => ({
  // Kunci topik diuji di lib/topik.test.ts; halaman ini diuji dengan semua topik terbuka.
  useTopikStatus: () => ({ statusOf: () => 'open', loading: false }),
}))
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
  },
  isSupabaseConfigured: false,
}))

const navigateMock = vi.hoisted(() => vi.fn())
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

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
const NINE_MODULES = Array.from({ length: 9 }, (_, i) => makeModule(i + 1))

function renderModulList(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/modul']}>
        <ModulList />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ModulList', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    mockAuth.role = null
    mockAuth.loading = false
  })

  it('redirects a mahasiswa to the first module whose progress is below 100%, ordered by order_num', async () => {
    mockAuth.role = 'mahasiswa'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], NINE_MODULES)
    queryClient.setQueryData(['progress', 'all'], {
      'books/modul-01.pdf': { pct: 100, currentPage: 5, lastOpened: null },
      'books/modul-02.pdf': { pct: 40, currentPage: 2, lastOpened: null },
    })

    renderModulList(queryClient)

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/modul/2', { replace: true }))
  })

  it('falls back to the first module when every module is either complete or untouched', async () => {
    mockAuth.role = 'mahasiswa'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], NINE_MODULES)
    queryClient.setQueryData(['progress', 'all'], {})

    renderModulList(queryClient)

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/modul/1', { replace: true }))
  })

  it('shows a management table with 9 rows for a dosen, without redirecting', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], NINE_MODULES)
    queryClient.setQueryData(
      ['manajemen', 'customs', NINE_MODULES.map((m) => m.id)],
      {},
    )

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(10)) // header + 9 modules
    expect(navigateMock).not.toHaveBeenCalled()
  })

  // Antrean 16 Sep 2026: dosen bisa menambah dan menghapus modul dari tabel ini.
  it('shows a "Tambah topik" button for a dosen', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(10))
    expect(screen.getByText(/Tambah topik/)).toBeTruthy()
  })

  // Antrean #43 (16 Sep 2026): modal Tambah Topik juga menawarkan unggah PDF.
  it('shows a PDF file input in the Tambah Topik modal', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(10))
    fireEvent.click(screen.getByText(/\+ Tambah topik/))

    expect(screen.getByText('PDF topik (opsional)')).toBeTruthy()
    expect(document.querySelector('input[type="file"][accept="application/pdf,.pdf"]')).toBeTruthy()
  })

  it('clicking Hapus on a row opens a delete confirmation modal', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(10))
    fireEvent.click(screen.getByLabelText('Hapus topik Modul 1'))

    expect(screen.getByText(/Hapus topik/)).toBeTruthy()
    expect(screen.getByText(/ikut terhapus/)).toBeTruthy()
    expect(screen.getByText('Ya, Hapus')).toBeTruthy()
  })
})
