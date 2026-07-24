// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { Profil } from './Profil'

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  profile: null as { full_name: string; role: string; nim_nidn: string | null } | null,
  role: null as 'mahasiswa' | 'dosen' | null,
  loading: false,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: async () => ({}),
      getUser: async () => ({ data: { user: mockAuth.user } }),
    },
  },
  isSupabaseConfigured: false,
}))

function renderProfil(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Profil />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedEmptyQueryCache(queryClient: QueryClient) {
  queryClient.setQueryData(['modules'], [])
  queryClient.setQueryData(['progress', 'all'], {})
  queryClient.setQueryData(['progress', 'totalTimeSpent'], 0)
  queryClient.setQueryData(['quizAttempts', 'all'], [])
  queryClient.setQueryData(['vark'], null)
  queryClient.setQueryData(['profil', 'extra'], null)
}

describe('Profil', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.user = null
    mockAuth.profile = null
    mockAuth.role = null
    mockAuth.loading = false
  })

  it('shows a loading state while AuthContext is still resolving the session', () => {
    mockAuth.loading = true
    const queryClient = new QueryClient()
    const html = renderProfil(queryClient)
    expect(html).toContain('Memuat')
  })

  it('renders the mahasiswa view — hero card, VARK card, and quiz history table', () => {
    mockAuth.user = { id: 'u1', email: 'ahmad.rizki@student.um.ac.id' }
    mockAuth.profile = { full_name: 'Ahmad Rizki', role: 'mahasiswa', nim_nidn: '220341600001' }
    mockAuth.role = 'mahasiswa'
    const queryClient = new QueryClient()
    seedEmptyQueryCache(queryClient)
    const html = renderProfil(queryClient)

    expect(html).toContain('Profil Saya')
    expect(html).toContain('Ahmad Rizki')
    expect(html).toContain('220341600001')
    expect(html).toContain('Gaya Belajar VARK')
    expect(html).toContain('Riwayat Kuis')
    // dosen-only sections must not leak into the mahasiswa view
    expect(html).not.toContain('Aktivitas Kelas Terkini')
    expect(html).not.toContain('Statistik Mengajar')
  })

  it('renders the dosen view — teaching stats and class activity, no VARK card', () => {
    mockAuth.user = { id: 'u2', email: 'ahmad.fauzi@um.ac.id' }
    mockAuth.profile = { full_name: 'Dr. Ahmad Fauzi, M.Pd.', role: 'dosen', nim_nidn: '0012345678' }
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    seedEmptyQueryCache(queryClient)
    const html = renderProfil(queryClient)

    expect(html).toContain('Profil Dosen')
    expect(html).toContain('Dr. Ahmad Fauzi, M.Pd.')
    expect(html).toContain('NIDN')
    expect(html).toContain('Statistik Mengajar')
    expect(html).toContain('Aktivitas Kelas Terkini')
    // mahasiswa-only VARK card must not leak into the dosen view
    expect(html).not.toContain('Gaya Belajar VARK')
  })

  it('applies the legacy demo-fallback numbers when every real learning stat is zero', () => {
    mockAuth.user = { id: 'u1', email: 'ahmad.rizki@student.um.ac.id' }
    mockAuth.profile = { full_name: 'Ahmad Rizki', role: 'mahasiswa', nim_nidn: '220341600001' }
    mockAuth.role = 'mahasiswa'
    const queryClient = new QueryClient()
    seedEmptyQueryCache(queryClient)
    const html = renderProfil(queryClient)

    // ported from legacy/profil.html:1094-1103 — modulSelesai=3, avgScore=73%, bestScore=100%
    expect(html).toContain('3/9')
    expect(html).toContain('73%')
    expect(html).toContain('100%')
  })
})
