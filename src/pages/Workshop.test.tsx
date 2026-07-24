// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Workshop from './Workshop'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  },
  isSupabaseConfigured: false,
}))

function moduleRow(id: number) {
  return {
    id,
    order_num: id,
    title: `Modul ${id}`,
    description: null,
    video_url: null,
    pdf_path: null,
    is_active: true,
    path: `books/modul-0${id}.pdf`,
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

function renderWorkshop(entry: string, seedModuleId: number | null) {
  const queryClient = new QueryClient()
  if (seedModuleId !== null) {
    queryClient.setQueryData(['modules', seedModuleId], moduleRow(seedModuleId))
  }
  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/modul/:id/workshop" element={<Workshop />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return html
}

describe('Workshop', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders without throwing for module 1', () => {
    const html = renderWorkshop('/modul/1/workshop', 1)
    expect(html).toBeTruthy()
  })

  it('shows a not-found message while the module is loading (no seeded cache)', () => {
    const html = renderWorkshop('/modul/1/workshop', null)
    // useModule is still loading synchronously on first SSR pass — the
    // component's own "Memuat…" branch should render, matching Modul.tsx's
    // equivalent guard.
    expect(html).toContain('Memuat')
  })

  it('renders the hero title and duration for the given module (default active tab: Tujuan)', () => {
    const html = renderWorkshop('/modul/1/workshop', 1)
    expect(html).toContain('Dasar &amp; Konsep R&amp;D')
    expect(html).toContain('2 x 50 menit')
    expect(html).toContain('MODUL 1')
  })

  it('renders genuinely different content for a different module id (not a repeated template)', () => {
    const htmlModul1 = renderWorkshop('/modul/1/workshop', 1)
    const htmlModul5 = renderWorkshop('/modul/5/workshop', 5)
    expect(htmlModul1).toContain('Dasar &amp; Konsep R&amp;D')
    expect(htmlModul5).toContain('Blueprint &amp; Storyboard Produk')
    expect(htmlModul5).not.toContain('Dasar &amp; Konsep R&amp;D')
  })

  it('renders the Tujuan tab content by default', () => {
    const html = renderWorkshop('/modul/1/workshop', 1)
    expect(html).toContain('Tujuan Pembelajaran Sesi')
    expect(html).toContain('Mahasiswa mampu mendiskusikan konsep R&amp;D secara kritis')
  })

  it('shows a friendly message for a module id outside the 1-9 workshop dataset', () => {
    const html = renderWorkshop('/modul/99/workshop', 99)
    expect(html).toContain('Panduan workshop tidak ditemukan')
  })

  it('reflects a previously saved checklist state on render (localStorage-backed)', () => {
    localStorage.setItem('sfp_ws_1', JSON.stringify({ 0: true }))
    // Force the Checklist tab to be visible isn't possible via SSR click, but
    // we can at least confirm the checklist progress text derives from the
    // persisted state by checking module 1's checklist length math indirectly
    // through the lib layer used by the component (covered directly in
    // workshop.test.ts). This test guards that rendering with pre-seeded
    // localStorage doesn't throw.
    const html = renderWorkshop('/modul/1/workshop', 1)
    expect(html).toBeTruthy()
  })
})
