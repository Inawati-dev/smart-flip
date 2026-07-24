// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Draf } from './Draf'

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

function renderDraf(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Draf />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Draf', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders without throwing and shows the empty state when there are no drafts', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [])
    queryClient.setQueryData(['drafts', false, null], [])
    const html = renderDraf(queryClient)
    expect(html).toContain('Draf Saya')
    expect(html).toContain('Belum ada draf')
    // mahasiswa (default/no role yet) view shows the "+ Draf Baru" button
    expect(html).toContain('Draf Baru')
  })

  it('renders seeded drafts and escapes user content as plain text (no raw HTML injection)', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [
      { id: 1, order_num: 1, title: 'Dasar R&D', description: null, video_url: null, pdf_path: null, is_active: true, path: 'books/modul-01.pdf', videoId: null, color: 'var(--sage)', sub: '', capaian: [], materi: [], kuis: [], jurnal: [], studiKasus: [] },
    ])
    queryClient.setQueryData(['drafts', false, null], [
      {
        id: 'draft_1', moduleId: 1, moduleName: 'Dasar R&D', authorName: 'Budi Santoso',
        title: '<script>alert(1)</script> Judul Draf', version: 1,
        content: 'Isi draf yang aman', status: 'submitted',
        submittedAt: new Date().toISOString(),
        comments: [
          { id: 'c1', authorName: 'Dr. Ahmad', authorRole: 'dosen', text: 'Perbaiki bagian ini', createdAt: new Date().toISOString() },
        ],
      },
    ])

    const html = renderDraf(queryClient)
    expect(html).toContain('1 draf')
    // Content must be escaped by React's JSX text interpolation, never injected raw.
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
