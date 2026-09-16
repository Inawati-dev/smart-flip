// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import AsesmenMhs from './AsesmenMhs'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
  },
  isSupabaseConfigured: false,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, role: 'mahasiswa', loading: false }),
}))

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
}

function renderAt(path: string, queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/asesmen/pre" element={<AsesmenMhs />} />
          <Route path="/asesmen/post" element={<AsesmenMhs />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AsesmenMhs — pre-test (spec §9 WP6 poin 5b)', () => {
  beforeEach(() => localStorage.clear())

  it('bank soal pre-test kosong menampilkan tombol "Lanjut tanpa pre-test"', async () => {
    const queryClient = newQueryClient()
    // courseId bawaan (tanpa CourseProvider) = 1, lihat CourseContext.tsx.
    queryClient.setQueryData(['bank-soal', 'pre', 1], [])
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [])
    renderAt('/asesmen/pre', queryClient)

    expect(await screen.findByText('Lanjut tanpa pre-test')).toBeTruthy()
    expect(screen.getByText('Dosen belum menyiapkan pre-test.')).toBeTruthy()
  })

  it('pre-test yang sudah dikerjakan langsung menampilkan skor tersimpan', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['bank-soal', 'pre', 1], [])
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [
      { score: 70, answers: [], completedAt: '2026-01-01', date: '01 Jan 2026', kind: 'pre' },
    ])
    renderAt('/asesmen/pre', queryClient)

    expect(await screen.findByText('Skor pre-test 70 tersimpan.')).toBeTruthy()
    expect(screen.getByText('Mulai belajar')).toBeTruthy()
  })
})

describe('AsesmenMhs — post-test (spec §9 WP6 poin 5c)', () => {
  it('belum ada sesi post-test menampilkan pesan menunggu dosen', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['attempts-by-kind', 'post', 1], [])
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [])
    renderAt('/asesmen/post', queryClient)

    expect(await screen.findByText('Post-test dibuka dosen lewat tes khusus.')).toBeTruthy()
  })
})
