// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Video from './Video'

afterEach(cleanup)

vi.mock('../lib/topik', () => ({
  // Kunci topik diuji di lib/topik.test.ts; halaman ini diuji dengan semua topik terbuka.
  useTopikStatus: () => ({ statusOf: () => 'open', bukaPada: () => null, formatifPada: () => null, loading: false }),
}))
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

// mahasiswa test tidak butuh role tertentu (Video() hanya cabang ke
// VideoDosen kalau role === 'dosen'), jadi mock ini cukup untuk keduanya —
// tes dosen di bawah mengubah mockAuth.role sebelum render.
const mockAuth = vi.hoisted(() => ({ role: 'mahasiswa' as 'mahasiswa' | 'dosen', loading: false }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }))

function makeModule(id: number, videoUrl: string | null) {
  return {
    id,
    order_num: id,
    title: `Modul ${id}`,
    description: null,
    video_url: videoUrl,
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

// Module 1 has a YouTube URL, module 2 has none — each test navigates to the
// id it needs (mirrors Ebook.test.tsx's single fixed FAKE_MODULES approach).
const FAKE_MODULES = [
  makeModule(1, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
  makeModule(2, null),
]

const mockUpload = vi.hoisted(() => vi.fn())
vi.mock('../lib/manajemen', async (orig) => ({ ...(await orig<typeof import('../lib/manajemen')>()), uploadModulVideo: mockUpload }))

vi.mock('../lib/modules', () => ({
  fetchModules: async () => FAKE_MODULES,
  fetchModuleById: async (id: number) => FAKE_MODULES.find((m) => m.id === id) ?? null,
}))

function renderVideo(moduleId: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/video/${moduleId}`]}>
        <Routes>
          <Route path="/video/:id" element={<Video />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderVideoRak() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/video']}>
        <Routes>
          <Route path="/video" element={<Video />} />
          <Route path="/video/:id" element={<Video />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Video (mahasiswa)', () => {
  beforeEach(() => {
    mockAuth.role = 'mahasiswa'
  })

  it('renders an iframe for a module with a YouTube URL', async () => {
    renderVideo(1)
    await waitFor(() => expect(document.querySelector('[data-testid="video-player"] iframe')).toBeTruthy())
  })

  it('shows the "belum memasang video" message when the module has no URL', async () => {
    renderVideo(2)
    await waitFor(() => expect(screen.getByText(/belum memasang video/)).toBeTruthy())
  })

  // Antrean #273: label kartu mengikuti jadwal (topik pertama = pertemuan 1-2).
  it('shows the rak at /video with "Topik 1 · Pertemuan 1-2" and does not redirect to a single video', async () => {
    renderVideoRak()
    await waitFor(() => expect(screen.getByText('Topik 1 · Pertemuan 1-2')).toBeTruthy())
    expect(screen.getByText('Topik 2 · Pertemuan 3-4')).toBeTruthy()
    expect(screen.getByText('Modul 1')).toBeTruthy()
    expect(screen.getByText('Modul 2')).toBeTruthy()
  })
})

// Antrean 16 Sep 2026: label tombol dosen berubah sesuai ada/tidaknya
// video_url, dan tautan yang sudah ada dapat ikon pratinjau (buka tab baru).
describe('Video (dosen)', () => {
  beforeEach(() => {
    mockAuth.role = 'dosen'
  })

  it('shows "Tambah Video" for a module without a URL', async () => {
    renderVideo(2)
    await waitFor(() => expect(screen.getByText('Modul 2')).toBeTruthy())
    expect(screen.getByText('Tambah Video')).toBeTruthy()
  })

  it('shows a preview button for a module with a URL', async () => {
    renderVideo(1)
    await waitFor(() => expect(screen.getByText('Modul 1')).toBeTruthy())
    expect(screen.getAllByTitle('Ubah Video').length).toBeGreaterThan(0) // label kotak kini 'Ubah' (antrean #279)
    const preview = document.querySelector('button[aria-label*="Putar video"]')
    expect(preview).toBeTruthy()
  })

  // Antrean #44b (16 Sep 2026): kartu video menampilkan thumbnail YouTube.
  it('shows a YouTube thumbnail image on the card for a module with a YouTube URL', async () => {
    renderVideo(1)
    await waitFor(() => expect(screen.getByText('Modul 1')).toBeTruthy())
    const img = document.querySelector('img[src*="i.ytimg.com"]')
    expect(img).toBeTruthy()
  })

  // Antrean #44a: modal Ubah/Tambah tautan juga menawarkan unggah berkas video.
  it('shows a video file input in the Ubah tautan modal', async () => {
    renderVideo(1)
    await waitFor(() => expect(screen.getByText('Modul 1')).toBeTruthy())
    fireEvent.click(screen.getAllByTitle('Ubah Video')[0])
    const input = document.querySelector('input[type="file"][accept="video/mp4,video/webm,.mp4,.webm"]')
    expect(input).toBeTruthy()
  })

  // Antrean #304: modal Ubah Video memakai kerangka ModalBerkas, satu tombol utama, progres nyata.
  it('uses one primary button and shows the upload bar while uploading', async () => {
    let selesai: (u: string) => void = () => {}
    mockUpload.mockImplementation((_id: number, _f: File, _s: number, onProgress?: (p: number) => void) => {
      onProgress?.(42)
      return new Promise<string>((r) => (selesai = r))
    })
    renderVideo(1)
    await waitFor(() => expect(screen.getByText('Modul 1')).toBeTruthy())
    fireEvent.click(screen.getAllByTitle('Ubah Video')[0])
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Unggah' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeTruthy()
    const input = document.querySelector('input[type="file"][accept="video/mp4,video/webm,.mp4,.webm"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'v.mp4', { type: 'video/mp4' })] } })
    fireEvent.click(screen.getByRole('button', { name: 'Unggah dan Simpan' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('42%'))
    expect(screen.getByRole('button', { name: 'Mengunggah…' })).toBeTruthy()
    selesai('https://x.test/storage/v1/object/public/modul-video/v.mp4')
  })

  // Antrean #85: kartu Rak per topik punya tombol Ubah/Tambah video sendiri
  // (bukan tabel).
  it('shows "Ubah Video"/"Tambah Video" buttons per card', async () => {
    renderVideoRak()
    await waitFor(() => expect(screen.getByText('Modul 1')).toBeTruthy())
    expect(screen.getAllByTitle('Ubah Video').length).toBeGreaterThan(0) // label kotak kini 'Ubah' (antrean #279)
    expect(screen.getByText('Tambah Video')).toBeTruthy()
  })

  // Antrean #279: rak dikelompokkan per topik; pertemuan kedua tanpa video jadi kotak tambah.
  it('groups the rak per topik with a separate box for the second meeting', async () => {
    renderVideoRak()
    await waitFor(() => expect(screen.getByText('Modul 1')).toBeTruthy())
    expect(screen.getByRole('region', { name: 'Topik 1: Modul 1' })).toBeTruthy()
    expect(screen.getByText('+ Video Pertemuan 2')).toBeTruthy()
    expect(screen.getByText('+ Video Pertemuan 4')).toBeTruthy()
  })
})
