// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useNavigate } from 'react-router'
import Ebook from './Ebook'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

// ?book= now carries a module id (not the raw PDF source) — useModules()
// resolves the actual pdf.js source from this fixed fake catalog, so the
// storage URL/path never has to round-trip through the address bar.
const FAKE_MODULES = [
  {
    id: 1,
    order_num: 1,
    title: 'Modul 1',
    description: null,
    video_url: null,
    pdf_path: null,
    is_active: true,
    path: 'books/modul-01.pdf',
    videoId: null,
    color: 'var(--sage)',
    sub: '',
    capaian: [],
    materi: [],
    kuis: [],
    jurnal: [],
    studiKasus: [],
  },
  {
    id: 2,
    order_num: 2,
    title: 'Modul Hilang',
    description: null,
    video_url: null,
    pdf_path: null,
    is_active: true,
    path: 'books/missing.pdf',
    videoId: null,
    color: 'var(--sage)',
    sub: '',
    capaian: [],
    materi: [],
    kuis: [],
    jurnal: [],
    studiKasus: [],
  },
]

vi.mock('../lib/modules', () => ({
  fetchModules: async () => FAKE_MODULES,
  fetchModuleById: async (id: number) => FAKE_MODULES.find((m) => m.id === id) ?? null,
}))

const saveProgressMock = vi.fn(async (_path: string, _data: unknown) => {})
// Saklar untuk meniru Supabase yang gagal menjawab saat catatan lama dibaca.
const catatan = vi.hoisted(() => ({ gagal: false }))
vi.mock('../lib/progress', async (asli) => {
  const a = await asli<typeof import('../lib/progress')>()
  return {
    ...a,
    saveProgress: (path: string, data: unknown) => saveProgressMock(path, data),
    fetchCatatanTopik: (id: number) => (catatan.gagal ? Promise.reject(new Error('putus')) : a.fetchCatatanTopik(id)),
  }
})

// A fake PDF with `pageCount` pages; getDocument resolves/rejects depending on
// the requested path, so tests can exercise both the happy path and the
// "file not found" error path (mirrors legacy/script.js's openBook() catch).
function makeFakeDoc(pageCount: number) {
  const page = {
    getViewport: () => ({ width: 100, height: 150 }),
    render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
  }
  return {
    numPages: pageCount,
    getPage: async () => page,
    destroy: async () => {},
  }
}

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (src: string) => ({
    promise:
      src === 'books/missing.pdf'
        ? Promise.reject(new Error('Failed to fetch: 404'))
        : Promise.resolve(makeFakeDoc(3)),
  }),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.js?url', () => ({ default: '' }))

// Setelan watermark mata kuliah (antrean #157) dibaca dari useCourse().
const setelan = vi.hoisted(() => ({ watermark: false }))
vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({ courses: [], courseId: 1, course: { id: 1, watermark_pdf: setelan.watermark }, setCourseId: () => {}, isLoading: false }),
}))

function lebarLayar(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: px })
}

function renderEbook(moduleId: number | null) {
  const queryClient = new QueryClient()
  const path = moduleId != null ? `/ebook?book=${moduleId}` : '/ebook'
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Ebook />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Ebook', () => {
  // Bawaan uji: layar sempit, satu halaman per balikan.
  beforeEach(() => {
    lebarLayar(500)
    setelan.watermark = false
    localStorage.clear() // pilihan gaya baca tersimpan antaruji
  })

  it('shows a loading state before the PDF resolves', () => {
    renderEbook(1)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('Membuka PDF…')).toBeTruthy()
  })

  it('shows the page counter and navigation once the PDF loads', async () => {
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Sebelumnya') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTitle('Berikutnya') as HTMLButtonElement).disabled).toBe(false)
  })

  it('navigates forward/back and disables buttons at the first/last page boundary', async () => {
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByTitle('Berikutnya'))
    await waitFor(() => expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByTitle('Halaman terakhir'))
    await waitFor(() => expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Berikutnya') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTitle('Halaman terakhir') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByTitle('Halaman pertama'))
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Sebelumnya') as HTMLButtonElement).disabled).toBe(true)
  })

  // Antrean #191: posisi baca disimpan seketika, persen baru naik sesudah halaman tampil 5 detik.
  it('menyimpan posisi seketika, dan persen baru naik sesudah halaman tampil cukup lama', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      saveProgressMock.mockClear()
      renderEbook(1)
      await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
      await waitFor(() =>
        expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 0, currentPage: 1, totalPages: 3 })),
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 33, currentPage: 1 }))

      // membalik cepat ke halaman 2 lalu 3: posisi ikut, persen tetap 33 karena belum ada yang tampil 5 detik
      saveProgressMock.mockClear()
      fireEvent.click(screen.getByTitle('Berikutnya'))
      await waitFor(() => expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0))
      fireEvent.click(screen.getByTitle('Berikutnya'))
      await waitFor(() => expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0))
      await waitFor(() =>
        expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 33, currentPage: 3 })),
      )

      // halaman 3 tampil 5 detik: tetap 33, karena halaman 2 belum pernah tampil 5 detik (dilewati)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(saveProgressMock.mock.calls.some(([, d]) => (d as { pct: number }).pct > 33)).toBe(false)
      expect(screen.getByText('Tercatat dibaca 33%')).toBeTruthy()

      // kembali ke halaman 2 dan menunggu 5 detik: 67; lalu halaman 3 selama 5 detik: 100
      fireEvent.click(screen.getByTitle('Sebelumnya'))
      await waitFor(() => expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 67, currentPage: 2 }))
      fireEvent.click(screen.getByTitle('Berikutnya'))
      await waitFor(() => expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 100, currentPage: 3 }))

      // mundur ke halaman 1 tidak menurunkan persen
      saveProgressMock.mockClear()
      fireEvent.click(screen.getByTitle('Halaman pertama'))
      await waitFor(() =>
        expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 100, currentPage: 1 })),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  // Temuan pemeriksa #191: catatan lama dibaca langsung tiap pembaca dibuka, jadi persen tersimpan tidak tertimpa.
  it('membuka lagi topik yang sudah 67% tidak menulis persen yang lebih kecil', async () => {
    localStorage.setItem('sfp_books/modul-01.pdf', JSON.stringify({ pct: 67, currentPage: 2, totalPages: 3, lastOpened: 'x' }))
    localStorage.setItem('sfp_time_1', '500')
    try {
      saveProgressMock.mockClear()
      renderEbook(1)
      await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
      await waitFor(() =>
        expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 67, currentPage: 1 })),
      )
      expect(saveProgressMock.mock.calls.every(([, d]) => (d as { pct: number }).pct >= 67)).toBe(true)
      expect(saveProgressMock.mock.calls.every(([, d]) => (d as { timeSpent: number }).timeSpent >= 500)).toBe(true)
    } finally {
      localStorage.removeItem('sfp_books/modul-01.pdf')
      localStorage.removeItem('sfp_time_1')
    }
  })

  it('selama catatan lama gagal dibaca tidak ada yang ditulis; begitu terbaca, penulisan jalan lagi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    catatan.gagal = true
    try {
      saveProgressMock.mockClear()
      renderEbook(1)
      await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000)
      })
      expect(saveProgressMock).not.toHaveBeenCalled()

      catatan.gagal = false
      fireEvent.click(screen.getByTitle('Berikutnya'))
      await waitFor(() =>
        expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 0, currentPage: 2 })),
      )
    } finally {
      catatan.gagal = false
      vi.useRealTimers()
    }
  })

  it('tab tersembunyi tidak dihitung; sesudah terlihat lagi hitungan 5 detik mulai dari awal', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const tampak = (v: 'visible' | 'hidden') => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
      document.dispatchEvent(new Event('visibilitychange'))
    }
    try {
      saveProgressMock.mockClear()
      renderEbook(1)
      await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
      await waitFor(() => expect(saveProgressMock).toHaveBeenCalled())
      act(() => tampak('hidden'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000)
      })
      expect(saveProgressMock.mock.calls.some(([, d]) => (d as { pct: number }).pct > 0)).toBe(false)

      act(() => tampak('visible'))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
      expect(saveProgressMock.mock.calls.some(([, d]) => (d as { pct: number }).pct > 0)).toBe(false)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })
      expect(saveProgressMock).toHaveBeenCalledWith('books/modul-01.pdf', expect.objectContaining({ pct: 33, currentPage: 1 }))
    } finally {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      vi.useRealTimers()
    }
  })

  it('shows the catalog picker (not an error) when no ?book= param is present', async () => {
    renderEbook(null)
    await waitFor(() => expect(screen.getByText(/Modul 1/)).toBeTruthy())
  })

  it('shows the catalog picker (not a stuck spinner) when ?book= is non-numeric', async () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/ebook?book=abc']}>
          <Ebook />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText(/Modul 1/)).toBeTruthy())
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText('Membuka PDF…')).toBeNull()
  })

  it('shows a friendly "not available yet" message when the PDF fails to load (404)', async () => {
    renderEbook(2)
    await waitFor(() => expect(screen.getByText(/belum tersedia/)).toBeTruthy())
  })

  it('pemilih gaya baca: Flip dan Gulir, pilihan berpindah saat diklik', async () => {
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect(screen.getByRole('group', { name: 'Gaya baca' })).toBeTruthy()
    const gulir = screen.getByRole('button', { name: 'Gulir' })
    fireEvent.click(gulir)
    expect(gulir.getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelectorAll('[data-hal]').length).toBe(3)
  })

  // Antrean #165: satu halaman per layar, juga di layar lebar.
  it('layar lebar: tetap satu halaman per balikan', async () => {
    lebarLayar(1280)
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByTitle('Berikutnya'))
    await waitFor(() => expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Berikutnya') as HTMLButtonElement).disabled).toBe(false)
    expect(document.querySelector('.pembaca-lembar.tunggal.balik')).toBeTruthy()
    fireEvent.click(screen.getByTitle('Sebelumnya'))
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
  })

  it('kendali bisa disembunyikan dengan klik tengah halaman dan dimunculkan lagi', async () => {
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    const panggung = document.querySelector('.pembaca-panggung') as HTMLElement
    panggung.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.click(panggung, { clientX: 200 })
    expect(screen.queryByTitle('Berikutnya')).toBeNull()
    fireEvent.click(panggung, { clientX: 390 })
    fireEvent.click(screen.getByText(/ketuk tengah untuk kendali/))
    expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0)
  })

  // Antrean #157: watermark hanya tampil bila dosen menyalakannya.
  it('watermark tampil di halaman hanya bila setelan mata kuliah hidup', async () => {
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect(document.querySelector('.pembaca-cap')).toBeNull()
    cleanup()
    setelan.watermark = true
    renderEbook(1)
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect(document.querySelectorAll('.pembaca-cap').length).toBeGreaterThan(0)
  })

  // Temuan pemeriksa akhir #148: ganti ?book= tidak boleh menulis progres buku lama ke id buku baru.
  it('ganti buku: progres buku lama tidak tertulis ke buku baru', async () => {
    const queryClient = new QueryClient()
    let pindah: (ke: string) => void = () => {}
    function Pemindah() {
      pindah = useNavigate()
      return null
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/ebook?book=1']}>
          <Pemindah />
          <Ebook />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByTitle('Halaman terakhir'))
    await waitFor(() => expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0))
    saveProgressMock.mockClear()
    act(() => pindah('/ebook?book=2'))
    await waitFor(() => expect(screen.getByText(/belum tersedia/)).toBeTruthy())
    expect(saveProgressMock.mock.calls.filter(([path]) => path === 'books/modul-02.pdf')).toEqual([])
  })
})
