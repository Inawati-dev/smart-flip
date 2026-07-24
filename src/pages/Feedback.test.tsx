// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Feedback } from './Feedback'

afterEach(cleanup)

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

function renderFeedback(queryClient: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Feedback />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Feedback', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the heading, module select, and all four rating aspects', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [
      { id: 1, order_num: 1, title: 'Dasar R&D', description: null, video_url: null, pdf_path: null, is_active: true, path: 'books/modul-01.pdf', videoId: null, color: 'var(--sage)', sub: '', capaian: [], materi: [], kuis: [], jurnal: [], studiKasus: [] },
    ])
    queryClient.setQueryData(['feedback', null, null], [])

    const html = renderFeedback(queryClient)
    expect(html).toContain('Penilaian Kepraktisan Modul')
    expect(html).toContain('Kualitas Konten')
    expect(html).toContain('Kemudahan Penggunaan')
    expect(html).toContain('Keterbacaan')
    expect(html).toContain('Kebermanfaatan')

    // Module list feeds the custom <Select> (src/components/Select.tsx) —
    // unlike a native <select>, its option list only mounts once opened, so
    // it won't show up in static markup the way a native <select>'s always-
    // present <option>s would. Open it interactively instead to confirm the
    // module made it into the dropdown.
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Feedback />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('Modul 1 — Dasar R&D')).toBeTruthy()
  })

  it('renders without throwing when there are no modules or feedback yet', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules'], [])
    queryClient.setQueryData(['feedback', null, null], [])
    const html = renderFeedback(queryClient)
    expect(html).toContain('Kirim Penilaian')
  })
})
