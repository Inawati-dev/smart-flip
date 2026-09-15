// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Video from './Video'
import { AuthProvider } from '../contexts/AuthContext'

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
        <AuthProvider>
          <Routes>
            <Route path="/video/:id" element={<Video />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Video (mahasiswa)', () => {
  it('renders an iframe for a module with a YouTube URL', async () => {
    renderVideo(1)
    await waitFor(() => expect(document.querySelector('[data-testid="video-player"] iframe')).toBeTruthy())
  })

  it('shows the "belum memasang video" message when the module has no URL', async () => {
    renderVideo(2)
    await waitFor(() => expect(screen.getByText(/belum memasang video/)).toBeTruthy())
  })
})
