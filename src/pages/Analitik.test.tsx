// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Analitik } from './Analitik'
import { DUMMY_STUDENTS } from '../lib/analitik'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
    }),
  },
  isSupabaseConfigured: false,
}))

function renderAnalitik(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Analitik />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedEmptyRealData(queryClient: QueryClient) {
  queryClient.setQueryData(['modules'], [])
  queryClient.setQueryData(['analitik', 'studentStats'], null)
  queryClient.setQueryData(['analitik', 'modulDistribution'], null)
  queryClient.setQueryData(['analitik', 'feedbackAspectAvg'], null)
}

describe('Analitik', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the heading and all 4 stat cards, falling back to demo data when Supabase is not configured', () => {
    const queryClient = new QueryClient()
    seedEmptyRealData(queryClient)

    const html = renderAnalitik(queryClient)
    expect(html).toContain('Analitik Kelas')
    expect(html).toContain('Mahasiswa Aktif')
    expect(html).toContain('Rata-rata Progress Modul')
    expect(html).toContain('Rata-rata Skor Kuis')
    expect(html).toContain('Rata-rata Kepraktisan')
  })

  it('renders the demo student roster (10 legacy dummy students) in the progress table', () => {
    const queryClient = new QueryClient()
    seedEmptyRealData(queryClient)

    const html = renderAnalitik(queryClient)
    expect(html).toContain('Ahmad Rizki')
    expect(html).toContain('Joko Susanto')
    expect(html).toContain(`dari ${DUMMY_STUDENTS.length} terdaftar`)
  })

  it('renders the inactive-student flag list from demo data', () => {
    const queryClient = new QueryClient()
    seedEmptyRealData(queryClient)

    const html = renderAnalitik(queryClient)
    expect(html).toContain('Mahasiswa Tidak Aktif')
    expect(html).toContain('Dian Pratama')
    expect(html).toContain('Gita Rahayu')
    expect(html).toContain('Belum memulai modul')
  })

  it('renders the module-distribution and kepraktisan charts', () => {
    const queryClient = new QueryClient()
    seedEmptyRealData(queryClient)

    const html = renderAnalitik(queryClient)
    expect(html).toContain('Penyelesaian per Modul')
    expect(html).toContain('Distribusi Skor Kuis')
    expect(html).toContain('Kepraktisan per Aspek')
    expect(html).toContain('Kualitas Konten')
  })

  it('renders an Export CSV control', () => {
    const queryClient = new QueryClient()
    seedEmptyRealData(queryClient)

    const html = renderAnalitik(queryClient)
    expect(html).toContain('Export CSV')
  })

  it('uses real student stats instead of demo data when Supabase returns a roster', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [])
    queryClient.setQueryData(
      ['analitik', 'studentStats'],
      [{ id: 'u1', nama: 'Zainal Arifin', modul: 5, kuis: 88, jam: 6.5, kepraktisan: 4.8, status: 'aktif' }],
    )
    queryClient.setQueryData(['analitik', 'modulDistribution'], null)
    queryClient.setQueryData(['analitik', 'feedbackAspectAvg'], null)

    const html = renderAnalitik(queryClient)
    expect(html).toContain('Zainal Arifin')
    expect(html).not.toContain('Ahmad Rizki')
    expect(html).toContain('dari 1 terdaftar')
  })
})
