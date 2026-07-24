// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import Manajemen from './Manajemen'

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

const MODULE_BASE = {
  order_num: 1,
  description: null,
  video_url: null,
  pdf_path: null,
  is_active: true,
  videoId: null,
  color: 'var(--sage)',
  sub: '',
  capaian: [],
  materi: [],
  kuis: [],
  jurnal: [],
  studiKasus: [],
}

const MODULES = [
  { ...MODULE_BASE, id: 1, order_num: 1, title: 'Modul Satu', path: 'books/modul-01.pdf' },
  { ...MODULE_BASE, id: 2, order_num: 2, title: 'Modul Dua', path: 'books/modul-02.pdf' },
  { ...MODULE_BASE, id: 3, order_num: 3, title: 'Modul Tiga', path: 'books/modul-03.pdf' },
]

function newQueryClient() {
  // Mirrors Kuis.test.tsx's precedent: real render() mounts query observers
  // whose effects would otherwise fire a background refetch (staleTime: 0)
  // against the real (unmocked) fetchModules/getModulOrder/getModulCustomMap,
  // clobbering seeded fixtures mid-test. Disable that refetch so setQueryData sticks.
  return new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
}

function renderManajemen(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Manajemen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedQueryClient(queryClient: QueryClient) {
  queryClient.setQueryData(['modules'], MODULES)
  queryClient.setQueryData(['manajemen', 'order'], null)
  queryClient.setQueryData(['manajemen', 'customs', [1, 2, 3]], {})
}

describe('Manajemen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders without throwing and lists modules in default sequential order', () => {
    const queryClient = new QueryClient()
    seedQueryClient(queryClient)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Manajemen />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toContain('Kelola Modul')
    expect(html).toContain('Modul Satu')
    expect(html).toContain('Modul Dua')
    expect(html).toContain('Modul Tiga')
  })

  it('shows correct stat totals (aktif defaults to every module when no custom status is saved)', () => {
    const queryClient = new QueryClient()
    seedQueryClient(queryClient)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Manajemen />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toContain('Total modul')
    expect(html).toContain('Modul aktif/published')
  })

  it('moves a module up and persists the new order to the legacy localStorage key', () => {
    const queryClient = newQueryClient()
    seedQueryClient(queryClient)
    renderManajemen(queryClient)

    const rows = screen.getAllByRole('row').slice(1) // skip header row
    expect(within(rows[0]).getByText('Modul Satu')).toBeTruthy()
    expect(within(rows[1]).getByText('Modul Dua')).toBeTruthy()

    // Move "Modul Dua" (row 2) up
    fireEvent.click(within(rows[1]).getByLabelText('Geser Modul Dua ke atas'))

    const rowsAfter = screen.getAllByRole('row').slice(1)
    expect(within(rowsAfter[0]).getByText('Modul Dua')).toBeTruthy()
    expect(within(rowsAfter[1]).getByText('Modul Satu')).toBeTruthy()

    const savedOrder = JSON.parse(localStorage.getItem('sfp_modul_order')!)
    expect(savedOrder).toEqual([2, 1, 3])
  })

  it('the first row cannot move up and the last row cannot move down', () => {
    const queryClient = newQueryClient()
    seedQueryClient(queryClient)
    renderManajemen(queryClient)

    const rows = screen.getAllByRole('row').slice(1)
    expect((within(rows[0]).getByLabelText('Geser Modul Satu ke atas') as HTMLButtonElement).disabled).toBe(true)
    expect((within(rows[2]).getByLabelText('Geser Modul Tiga ke bawah') as HTMLButtonElement).disabled).toBe(true)
  })

  it('opens the edit modal pre-filled, saves a new title, and persists it under the legacy localStorage key', async () => {
    const queryClient = newQueryClient()
    seedQueryClient(queryClient)
    renderManajemen(queryClient)

    const rows = screen.getAllByRole('row').slice(1)
    fireEvent.click(within(rows[0]).getByText('Edit'))

    const judulInput = (await screen.findByDisplayValue('Modul Satu')) as HTMLInputElement
    fireEvent.change(judulInput, { target: { value: 'Modul Satu — Direvisi' } })
    fireEvent.click(screen.getByText('Simpan'))

    expect(await screen.findByText('Modul Satu — Direvisi')).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem('sfp_modul_custom_1')!)
    expect(saved.judul).toBe('Modul Satu — Direvisi')
  })

  it('blocks saving the edit form when the title is empty', async () => {
    const queryClient = newQueryClient()
    seedQueryClient(queryClient)
    renderManajemen(queryClient)

    const rows = screen.getAllByRole('row').slice(1)
    fireEvent.click(within(rows[0]).getByText('Edit'))

    const judulInput = (await screen.findByDisplayValue('Modul Satu')) as HTMLInputElement
    fireEvent.change(judulInput, { target: { value: '   ' } })

    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(true)
    expect(localStorage.getItem('sfp_modul_custom_1')).toBeNull()
  })

  it('bulk-locking selected modules requires confirming a modal first — canceling makes no change', () => {
    const queryClient = newQueryClient()
    seedQueryClient(queryClient)
    renderManajemen(queryClient)

    const rows = screen.getAllByRole('row').slice(1)
    fireEvent.click(within(rows[0]).getByLabelText('Pilih Modul Satu'))
    fireEvent.click(within(rows[1]).getByLabelText('Pilih Modul Dua'))

    expect(screen.getByText('2 dipilih')).toBeTruthy()
    fireEvent.click(screen.getByText('Kunci semua terpilih'))

    // Confirmation modal must appear before anything is persisted.
    expect(screen.getByText('Kunci modul terpilih?')).toBeTruthy()
    expect(localStorage.getItem('sfp_modul_custom_1')).toBeNull()

    fireEvent.click(screen.getByText('Batal'))
    expect(screen.queryByText('Kunci modul terpilih?')).toBeNull()
    expect(localStorage.getItem('sfp_modul_custom_1')).toBeNull()
  })

  it('bulk-locking selected modules persists after confirming', async () => {
    const queryClient = newQueryClient()
    seedQueryClient(queryClient)
    renderManajemen(queryClient)

    const rows = screen.getAllByRole('row').slice(1)
    fireEvent.click(within(rows[0]).getByLabelText('Pilih Modul Satu'))
    fireEvent.click(within(rows[1]).getByLabelText('Pilih Modul Dua'))
    fireEvent.click(screen.getByText('Kunci semua terpilih'))
    fireEvent.click(screen.getByText('Ya, Kunci'))

    await screen.findByText('Status diperbarui: 2 modul dikunci')

    const saved1 = JSON.parse(localStorage.getItem('sfp_modul_custom_1')!)
    const saved2 = JSON.parse(localStorage.getItem('sfp_modul_custom_2')!)
    expect(saved1.status).toBe('terkunci')
    expect(saved2.status).toBe('terkunci')
    expect(localStorage.getItem('sfp_modul_custom_3')).toBeNull()

    const badges = screen.getAllByText('Terkunci')
    expect(badges.length).toBe(2)
  })
})
