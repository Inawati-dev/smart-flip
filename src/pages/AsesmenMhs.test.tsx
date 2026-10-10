// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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
          <Route path="/asesmen" element={<AsesmenMhs />} />
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

    expect(await screen.findByText('Lanjut Tanpa Tes Diagnostik Awal')).toBeTruthy()
    expect(screen.getByText('Dosen belum menyiapkan tes diagnostik awal.')).toBeTruthy()
  })

  it('pre-test yang sudah dikerjakan langsung menampilkan skor tersimpan', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['bank-soal', 'pre', 1], [])
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [
      { score: 70, answers: [], completedAt: '2026-01-01', date: '01 Jan 2026', kind: 'pre' },
    ])
    renderAt('/asesmen/pre', queryClient)

    expect(await screen.findByText('Skor Kamu')).toBeTruthy()
    expect(screen.getByText('70')).toBeTruthy()
    expect(screen.getByText('Ke Dashboard')).toBeTruthy()
  })

  // Antrean #138: benar/salah tidak muncul saat mengerjakan, baru di akhir.
  it('jawaban tidak dinilai di layar soal; tinjauan muncul sesudah dikirim', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['bank-soal', 'pre', 1], [
      { id: 1, kind: 'pre', module_id: null, question: 'Soal uji?', options: ['Salah satu', 'Benar ini', 'Salah dua', 'Salah tiga'], answer_idx: 1, explanation: null, order_num: 1 },
    ])
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [])
    renderAt('/asesmen/pre', queryClient)

    fireEvent.click(await screen.findByText('Mulai'))
    fireEvent.click(screen.getByText('Salah satu'))
    expect(document.body.textContent).not.toMatch(/Jawaban kamu|Jawaban benar/)
    // Pilihan masih boleh diganti sebelum dikirim.
    fireEvent.click(screen.getByText('Salah dua'))
    fireEvent.click(screen.getByText('Kirim ✓'))

    expect(await screen.findByText('Skor Kamu')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('Tinjauan jawaban · benar 0 dari 1')).toBeTruthy()
    expect(screen.getByText('Jawaban benar').previousElementSibling?.textContent).toBe('Benar ini')
    expect(screen.getByText('Pilihanmu').previousElementSibling?.textContent).toBe('Salah dua')
  })
})

describe('AsesmenMhs — post-test (spec §9 WP6 poin 5c)', () => {
  it('belum ada sesi post-test menampilkan pesan menunggu dosen', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['attempts-by-kind', 'post', 1], [])
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [])
    renderAt('/asesmen/post', queryClient)

    expect(await screen.findByText('Post-test dibuka oleh dosen.')).toBeTruthy()
  })
})

// Antrean #170: tes khusus dan tes kelompok dihilangkan dari halaman Asesmen
// mahasiswa; tugas akhir tampil sebagai mini projek.
describe('AsesmenMhs — daftar /asesmen tanpa tes khusus dan tes kelompok', () => {
  it('tidak ada tautan ke tes khusus/kelompok dan tidak ada teks yang menyebutnya', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['attempts-by-kind', 'pre', 1], [])
    queryClient.setQueryData(['final-projects-mhs', 1], [])
    renderAt('/asesmen', queryClient)

    expect(await screen.findByText('Mini Projek')).toBeTruthy()
    expect(screen.getByText('Post-test')).toBeTruthy()
    expect(document.querySelector('a[href^="/asesmen/tes"], a[href^="/asesmen/kelompok"]')).toBeNull()
    const teks = document.body.textContent ?? ''
    expect(teks).not.toMatch(/tes khusus|tes kelompok|tugas akhir/i)
  })
})
