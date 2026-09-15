// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Modul, { formatLastOpened } from './Modul'

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as { role: string } | null,
  role: null as 'mahasiswa' | 'dosen' | null,
  loading: false,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  },
  isSupabaseConfigured: false,
}))

const FAKE_MODULE = {
  id: 1,
  order_num: 1,
  title: 'Modul Uji',
  description: 'Deskripsi modul uji',
  video_url: null,
  pdf_path: null as string | null,
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

function renderModul(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/modul/1']}>
        <Routes>
          <Route path="/modul/:id" element={<Modul />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Modul', () => {
  beforeEach(() => {
    mockAuth.role = 'mahasiswa'
    mockAuth.loading = false
  })

  it('renders the stepper and a "Baca modul" button when a PDF is set', () => {
    const withPdf = { ...FAKE_MODULE, pdf_path: 'https://example.test/modul-pdf/modul-1.pdf' }
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 1], withPdf)
    queryClient.setQueryData(['modules'], [withPdf])
    queryClient.setQueryData(['progress', 'all'], {})
    queryClient.setQueryData(['quizAttempts', 1], [])

    const html = renderModul(queryClient)
    expect(html).toContain('tablist') // PertemuanStepper's role="tablist"
    expect(html).toContain('Baca modul')
    expect(html).not.toContain('belum mengunggah')
  })

  it('shows "belum mengunggah" instead of the read button when pdf_path and path are both empty', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 1], { ...FAKE_MODULE, pdf_path: null, path: '' })
    queryClient.setQueryData(['modules'], [FAKE_MODULE])
    queryClient.setQueryData(['progress', 'all'], {})
    queryClient.setQueryData(['quizAttempts', 1], [])

    const html = renderModul(queryClient)
    expect(html).toContain('belum mengunggah')
    expect(html).not.toContain('Baca modul')
  })

  it('renders the dosen module table instead of the reading layout for role=dosen', () => {
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 1], FAKE_MODULE)
    queryClient.setQueryData(['modules'], [FAKE_MODULE])
    queryClient.setQueryData(['manajemen', 'customs', [1]], {})

    const html = renderModul(queryClient)
    expect(html).toContain('Berkas PDF')
    expect(html).not.toContain('Baca modul')
  })

  it('formats a valid ISO date and falls back to em dash for missing/invalid input', () => {
    expect(formatLastOpened(null)).toBe('—')
    expect(formatLastOpened(undefined)).toBe('—')
    expect(formatLastOpened('not-a-date')).toBe('—')
    expect(formatLastOpened('2026-07-24T04:04:55.479+00:00')).not.toBe('—')
  })
})
