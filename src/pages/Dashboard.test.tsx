import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import type { ModuleRow } from '../lib/modules'
import { Dashboard, DashboardMhs } from './Dashboard'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
    }),
  },
  isSupabaseConfigured: false,
}))

function fakeModule(id: number): ModuleRow {
  return {
    id,
    order_num: id,
    title: `Modul ${id}`,
    description: null,
    video_url: null,
    pdf_path: null,
    is_active: true,
    path: '',
    videoId: null,
    color: '',
    sub: '',
    capaian: [],
    materi: [],
    kuis: [],
    jurnal: [],
    studiKasus: [],
  }
}

describe('Dashboard', () => {
  it('renders without throwing when there are no modules yet', () => {
    const queryClient = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toBeTruthy()
  })
})

// DashboardMhs dites lewat props langsung (bukan hook async fetch data) —
// deterministik, tidak butuh mock Supabase. Menggantikan RoadmapWidget lama
// (spec §4.0/§9 WP8): kartu "Langkah berikutnya" adalah pusat tampilan baru.
describe('DashboardMhs', () => {
  const modules = [fakeModule(1), fakeModule(2)]

  it('belum baca modul 1: tombol utama "Baca modul 1"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs modules={modules} progress={{}} attempts={[]} />
      </MemoryRouter>,
    )
    expect(html).toContain('Langkah berikutnya')
    expect(html).toContain('Baca modul 1')
    expect(html).toContain('Topik 1 dari 2')
  })

  it('modul 1 sudah dibaca penuh: tombol utama "Kerjakan tes formatif 1"', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <DashboardMhs
          modules={modules}
          progress={{ 'books/modul-01.pdf': { pct: 100, currentPage: 20, lastOpened: null } }}
          attempts={[]}
        />
      </MemoryRouter>,
    )
    expect(html).toContain('Kerjakan tes formatif 1')
  })
})
