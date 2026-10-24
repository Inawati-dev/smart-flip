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
  useTopikStatus: () => ({ statusOf: () => 'open', bukaPada: () => null, formatifPada: () => null, loading: false }),
  usePreTestDone: () => ({ data: true }),
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

const uploadMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/manajemen', async (asli) => ({ ...(await asli<typeof import('../lib/manajemen')>()), uploadModulPdf: uploadMock }))
// pdfjs tidak jalan di jsdom: halaman pertama cukup berupa objek palsu (canvas jsdom tanpa konteks 2D).
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: async () => ({ getViewport: () => ({ width: 100, height: 140 }), render: () => ({ promise: Promise.resolve() }) }),
      destroy: async () => {},
    }),
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

  // Antrean #289: satu PDF per topik untuk dua pertemuannya; PDF pertemuan kedua tidak membuat kartu kedua.
  it('shows a mahasiswa one card per topic labelled with both meetings', async () => {
    mockAuth.role = 'mahasiswa'
    const queryClient = new QueryClient()
    const modul = NINE_MODULES.map((m, i) => (i === 0 ? { ...m, pdf_path_2: '/books/modul-01b.pdf' } : m))
    queryClient.setQueryData(['modules', 'course', 1], modul)
    queryClient.setQueryData(['progress', 'all'], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByText(/^Topik 0\d/).length).toBe(9))
    expect([...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/ebook?book=1&p=2')).toBe(false)
    expect(screen.getAllByText('Pertemuan 1-2').length).toBeGreaterThan(0)
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

    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    expect(navigateMock).not.toHaveBeenCalled()
  })

  // Antrean #289: rak dosen satu kartu per topik berlabel rentang pertemuan, tanpa kotak PDF pertemuan kedua.
  it('shows the dosen one PDF card per topic without a second-meeting PDF box', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    expect(screen.queryByText(/\+ PDF Pertemuan/)).toBeNull()
    expect(screen.queryByRole('region')).toBeNull()
  })

  // Antrean 16 Sep 2026: dosen bisa menambah dan menghapus modul dari tabel ini.
  it('shows a "Tambah topik" button for a dosen', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    expect(screen.getByText(/Tambah Topik/)).toBeTruthy()
  })

  // Antrean #43 (16 Sep 2026): modal Tambah Topik juga menawarkan unggah PDF.
  it('shows a PDF file input in the Tambah Topik modal', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    fireEvent.click(screen.getByText(/\+ Tambah Topik/))

    expect(screen.getByText('PDF topik (opsional)')).toBeTruthy()
    expect(document.querySelector('input[type="file"][accept="application/pdf,.pdf"]')).toBeTruthy()
  })

  it('clicking Hapus on a row opens a delete confirmation modal', async () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], NINE_MODULES)
    queryClient.setQueryData(['manajemen', 'customs', NINE_MODULES.map((m) => m.id)], {})

    renderModulList(queryClient)

    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    fireEvent.click(screen.getByLabelText('Aksi lain untuk Modul 1'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hapus topik' }))

    expect(screen.getByText(/Hapus Topik/)).toBeTruthy()
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

    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    expect(screen.getByLabelText('Pilih mata kuliah')).toBeTruthy()
    fireEvent.click(screen.getByText(/^Atur/))
    expect(screen.getByRole('menuitem', { name: 'Kelola mata kuliah' })).toBeTruthy()

    // Antrean #141: tiap mata kuliah punya sakelar buka-tutup untuk mahasiswa.
    fireEvent.click(screen.getByRole('menuitem', { name: 'Kelola mata kuliah' }))
    const sakelar = screen.getAllByRole('switch')
    expect(sakelar.map((s) => [s.textContent, s.getAttribute('aria-checked'), (s as HTMLButtonElement).disabled])).toEqual([
      ['Tutup Akses', 'true', false],
      ['Tutup Akses', 'true', false],
    ])
  })

  function renderDosen(modul: Array<{ id: number }> = NINE_MODULES) {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 'course', 1], modul)
    queryClient.setQueryData(['manajemen', 'customs', modul.map((m) => m.id)], {})
    renderModulList(queryClient)
  }

  // Antrean #298/#299: kepala rak satu baris dengan menu Atur.
  it('dosen: kepala rak memuat ringkasan dan menu Atur yang menutup dengan Escape', async () => {
    renderDosen()
    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    expect(screen.getByText('9 topik · 0 punya PDF')).toBeTruthy()
    const atur = screen.getByText(/^Atur/)
    expect(atur.getAttribute('aria-haspopup')).toBe('menu')
    expect(atur.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(atur)
    expect(atur.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual([
      'Watermark PDF: Mati',
      'Jadwal pertemuan',
      'Urutkan topik',
      'Kelola mata kuliah',
    ])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(atur)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('dosen: menu ⋯ kartu memuat Pratinjau (nonaktif tanpa PDF), Ubah topik, Hapus topik', async () => {
    renderDosen()
    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    fireEvent.click(screen.getByLabelText('Aksi lain untuk Modul 2'))
    const [pratinjau, ubah, hapus] = screen.getAllByRole('menuitem') as HTMLButtonElement[]
    expect([pratinjau.textContent, ubah.textContent, hapus.textContent]).toEqual(['Pratinjau', 'Ubah topik', 'Hapus topik'])
    expect(pratinjau.disabled).toBe(true)
    fireEvent.click(ubah)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByText('Ubah Topik')).toBeTruthy()
  })

  it('dosen: sampul tanpa PDF tidak menjadi tombol pratinjau', async () => {
    renderDosen()
    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    expect(screen.queryByLabelText(/^Pratinjau PDF/)).toBeNull()
  })

  it('dosen: sampul ber-PDF membuka pratinjau dan tombol Ganti PDF menggantikan Unggah PDF', async () => {
    renderDosen(NINE_MODULES.map((m, i) => (i === 0 ? { ...m, pdf_path: '/books/modul-01.pdf' } : m)))
    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(8))
    expect(screen.getAllByText('Ganti PDF')).toHaveLength(1)
    expect(screen.getByText('9 topik · 1 punya PDF')).toBeTruthy()
    expect(screen.getByLabelText('Pratinjau PDF Modul 1')).toBeTruthy()
  })

  // Antrean #292: modal Ganti PDF, pratinjau berkas, progres, tutup otomatis.
  it('dosen: modal Ganti PDF menampilkan pratinjau, progres, lalu menutup setelah sukses', async () => {
    const dibuat = vi.fn(() => 'blob:uji')
    const dicabut = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: dibuat, revokeObjectURL: dicabut }))
    let selesai: () => void = () => {}
    uploadMock.mockImplementation(async (_id: number, _f: File, _p: number, onProgress: (n: number) => void) => {
      onProgress(42)
      await new Promise<void>((r) => (selesai = r))
      return 'x'
    })
    renderDosen()
    await waitFor(() => expect(screen.getAllByText('Unggah PDF')).toHaveLength(9))
    fireEvent.click(screen.getAllByText('Unggah PDF')[0])
    expect(screen.getByText('Ganti PDF Topik')).toBeTruthy()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'baru.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(screen.getByTestId('pratinjau-berkas')).toBeTruthy())
    expect(screen.getByText('Lihat semua halaman')).toBeTruthy()
    expect(dibuat).toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Unggah PDF' }).at(-1)!)
    await waitFor(() => expect(screen.getByText('42%')).toBeTruthy())
    selesai()
    await waitFor(() => expect(screen.queryByText('Ganti PDF Topik')).toBeNull())
    expect(screen.getByText('PDF topik berhasil diunggah')).toBeTruthy()
    expect(dicabut).toHaveBeenCalledWith('blob:uji')
    vi.unstubAllGlobals()
  })
})
