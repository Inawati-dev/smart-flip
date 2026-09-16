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

// Dua mata kuliah tetap (antrean #68) — cocok dengan query key
// ['modules', 'course', 1] yang dipakai tes di bawah (courseId bawaan 1).
const TWO_COURSES = [
  { id: 1, code: 'MPP', name: 'Metode Penelitian dan Pengembangan', description: '', dosen_id: null, order_num: 1, is_active: true },
  { id: 2, code: 'PD', name: 'Perpustakaan Digital', description: '', dosen_id: null, order_num: 2, is_active: true },
]
vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({
    courses: TWO_COURSES,
    courseId: 1,
    course: TWO_COURSES[0],
    setCourseId: () => {},
    isLoading: false,
  }),
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

  // Antrean #85 (16 Sep 2026): /modul jadi rak sampul, mahasiswa tidak lagi
  // dialihkan otomatis ke topik aktifnya.
  it('shows a mahasiswa the topic shelf without redirecting', async () => {
    mockAuth.role = 'mahasiswa'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['progress', 'all'], {
      'books/modul-01.pdf': { pct: 100, currentPage: 5, lastOpened: null },
      'books/modul-02.pdf': { pct: 40, currentPage: 2, lastOpened: null },
    })

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getByText('Topik 01')).toBeTruthy())
    expect(screen.getByText('Topik 09')).toBeTruthy()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows a rak of 9 topic cards for a dosen, without redirecting', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(
      ['manajemen', 'customs', NINE_MODULES.map((m) => m.id)],
      {},
    )

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByLabelText('Ubah topik')).toHaveLength(9))
    expect(navigateMock).not.toHaveBeenCalled()
  })

  // Antrean 16 Sep 2026: dosen bisa menambah dan menghapus modul dari tabel ini.
  it('shows a "Tambah topik" button for a dosen', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByLabelText('Ubah topik')).toHaveLength(9))
    expect(screen.getByText(/Tambah topik/)).toBeTruthy()
  })

  // Antrean #43 (16 Sep 2026): modal Tambah Topik juga menawarkan unggah PDF.
  it('shows a PDF file input in the Tambah Topik modal', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByLabelText('Ubah topik')).toHaveLength(9))
    fireEvent.click(screen.getByText(/\+ Tambah topik/))

    expect(screen.getByText('PDF topik (opsional)')).toBeTruthy()
    expect(document.querySelector('input[type="file"][accept="application/pdf,.pdf"]')).toBeTruthy()
  })

  it('clicking Hapus on a row opens a delete confirmation modal', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByLabelText('Ubah topik')).toHaveLength(9))
    fireEvent.click(screen.getByLabelText('Hapus topik Modul 1'))

    expect(screen.getByText(/Hapus topik/)).toBeTruthy()
    expect(screen.getByText(/ikut terhapus/)).toBeTruthy()
    expect(screen.getByText('Ya, Hapus')).toBeTruthy()
  })

  // Antrean #68 (16 Sep 2026): pemilih mata kuliah tampil di judul saat
  // context punya lebih dari satu mata kuliah.
  it('shows the mata kuliah select when there are two courses', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByLabelText('Ubah topik')).toHaveLength(9))
    expect(screen.getByLabelText('Pilih mata kuliah')).toBeTruthy()
    expect(screen.getByText('Kelola mata kuliah')).toBeTruthy()
  })
})
