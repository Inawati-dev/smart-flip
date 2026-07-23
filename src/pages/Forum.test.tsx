// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Forum } from './Forum'

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

function renderForum(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Forum />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Forum', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders without throwing and shows the empty state when there are no posts', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [])
    queryClient.setQueryData(['forum', 'posts', null], [])
    const html = renderForum(queryClient)
    expect(html).toContain('Belum ada diskusi di sini')
  })

  it('renders seeded posts and escapes user content as plain text (no raw HTML injection)', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [
      { id: 1, order_num: 1, title: 'Dasar R&D', description: null, video_url: null, pdf_path: null, is_active: true, path: 'books/modul-01.pdf', videoId: null, color: 'var(--sage)', sub: '', capaian: [], materi: [], kuis: [], jurnal: [], studiKasus: [] },
    ])
    queryClient.setQueryData(['forum', 'posts', null], [
      {
        id: 'post_1', moduleId: 1, authorName: 'Budi Santoso', authorRole: 'mahasiswa',
        content: '<script>alert(1)</script> apakah aman?',
        createdAt: new Date().toISOString(), likes: 2,
        replies: [{ id: 'r1', authorName: 'Dr. Ahmad', authorRole: 'dosen', content: 'balasan dosen', createdAt: new Date().toISOString() }],
      },
    ])

    const html = renderForum(queryClient)
    expect(html).toContain('Budi Santoso')
    expect(html).toContain('1 diskusi')
    // Content must be escaped by React's JSX text interpolation, never injected raw.
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
