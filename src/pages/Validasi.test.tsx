// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Validasi } from './Validasi'
import { LABEL_MEDIA, LABEL_MATERI } from '../lib/validasi'

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

function renderValidasi(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Validasi />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Validasi', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the heading, identity fields, and tab navigation when no prior submission exists', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['validasi'], null)

    const html = renderValidasi(queryClient)
    expect(html).toContain('Instrumen Validasi Ahli')
    expect(html).toContain('Identitas Validator')
    expect(html).toContain('Nama Lengkap')
    expect(html).toContain('Institusi')
    expect(html).toContain('Bidang Keahlian')
    expect(html).toContain('Aspek Media')
    expect(html).toContain('Aspek Materi')
  })

  it('renders all 8 media indicator labels verbatim', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['validasi'], null)
    const html = renderValidasi(queryClient)
    for (const label of LABEL_MEDIA) {
      expect(html).toContain(label.replace('&', '&amp;'))
    }
  })

  it('renders all 8 materi indicator labels verbatim (materi tab is present in the DOM, just display:none)', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['validasi'], null)
    const html = renderValidasi(queryClient)
    for (const label of LABEL_MATERI) {
      expect(html).toContain(label.replace('&', '&amp;'))
    }
  })

  it('renders the submit button', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['validasi'], null)
    const html = renderValidasi(queryClient)
    expect(html).toContain('Kirim Validasi')
  })

  it('shows the result view directly when a validasi was already submitted', () => {
    const queryClient = new QueryClient()
    const existing = {
      aspekMedia: { scores: Array(8).fill(5), avg: 5, komentar: 'Sangat baik' },
      aspekMateri: { scores: Array(8).fill(5), avg: 5, komentar: '' },
      totalAvg: 5,
      validator: { nama: 'Dr. Ahmad', institusi: 'UM', keahlian: 'Teknologi Pendidikan' },
      timestamp: Date.now(),
    }
    queryClient.setQueryData(['validasi'], existing)

    const html = renderValidasi(queryClient)
    expect(html).toContain('Hasil Validasi')
    expect(html).toContain('Sangat Layak')
    // Riwayat detail (validator name) is collapsed by default, matching legacy's
    // riwayatToggle — only the toggle itself is expected to be present here.
    expect(html).toContain('Riwayat Validasi')
  })

  it('renders without throwing when there is no existing validasi and modules query is missing', () => {
    const queryClient = new QueryClient()
    const html = renderValidasi(queryClient)
    expect(html).toContain('Instrumen Validasi Ahli')
  })
})
