// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Video from './Video'

afterEach(cleanup)

vi.mock('../lib/topik', () => ({
  // Kunci topik diuji di lib/topik.test.ts; halaman ini diuji dengan semua topik terbuka.
  useTopikStatus: () => ({ statusOf: () => 'open', loading: false }),
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
})

// Antrean 16 Sep 2026: label tombol dosen berubah sesuai ada/tidaknya
// video_url, dan tautan yang sudah ada dapat ikon pratinjau (buka tab baru).
describe('Video (dosen)', () => {
  beforeEach(() => {
    mockAuth.role = 'dosen'
  })

  it('shows "Tambah tautan" for a module without a URL', async () => {
    renderVideo(2)
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)) // header + 2 modules
    expect(screen.getByText('Tambah tautan')).toBeTruthy()
  })

  it('shows a preview button for a module with a URL', async () => {
    renderVideo(1)
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3))
    expect(screen.getByText('Ubah')).toBeTruthy()
    const preview = document.querySelector('button[aria-label="Pratinjau video"]')
    expect(preview).toBeTruthy()
  })

  // Antrean #44b (16 Sep 2026): kolom Video menampilkan thumbnail YouTube.
  it('shows a YouTube thumbnail image in the table for a module with a YouTube URL', async () => {
    renderVideo(1)
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3))
    const img = document.querySelector('img[src*="i.ytimg.com"]')
    expect(img).toBeTruthy()
  })

  // Antrean #44a: modal Ubah/Tambah tautan juga menawarkan unggah berkas video.
  it('shows a video file input in the Ubah tautan modal', async () => {
    renderVideo(1)
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3))
    fireEvent.click(screen.getByText('Ubah'))
    const input = document.querySelector('input[type="file"][accept="video/mp4,video/webm"]')
    expect(input).toBeTruthy()
  })
})
