// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Formatif from './Formatif'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  },
  isSupabaseConfigured: false,
}))

const saveQuizAttemptMock = vi.fn(async (_moduleId: number, _attempt: unknown) => {})
vi.mock('../lib/quizAttempts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/quizAttempts')>()
  return { ...actual, saveQuizAttempt: (moduleId: number, attempt: unknown) => saveQuizAttemptMock(moduleId, attempt) }
})

// rng deterministik: identitas (tanpa acak) — cukup untuk menguji alur skor,
// urutan soal/opsi sendiri sudah diuji di src/lib/acak.test.ts.
vi.mock('../lib/acak', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/acak')>()
  return {
    ...actual,
    acakSoal: (soal: Array<{ id: number; question: string; options: string[]; answer_idx: number | null }>) => ({
      urut: soal.map((s) => ({ question_id: s.id, option_order: s.options.map((_, i) => i) })),
      tampil: soal.map((s) => ({ id: s.id, question: s.question, options: s.options, kunciTampil: s.answer_idx })),
    }),
  }
})

vi.mock('../lib/topik', () => ({
  useTopikStatus: () => ({ statusOf: () => 'open', loading: false }),
}))

const MODULE_BASE = {
  id: 1,
  order_num: 1,
  title: 'Dasar Penelitian R&D',
  description: null,
  video_url: null,
  pdf_path: null,
  is_active: true,
  path: '',
  videoId: null,
  color: 'var(--sage)',
  sub: '',
  capaian: [],
  materi: [],
  kuis: [],
  jurnal: [],
  studiKasus: [],
}

function limaSoal() {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    kind: 'formatif' as const,
    module_id: 1,
    question: `Soal ke-${i + 1}?`,
    options: [`Benar ${i}`, `Salah ${i}`],
    answer_idx: 0,
    explanation: null,
    order_num: i + 1,
  }))
}

function seedBase(queryClient: QueryClient, soal: ReturnType<typeof limaSoal>) {
  queryClient.setQueryData(['modules', 1], MODULE_BASE)
  queryClient.setQueryData(['modules', 'course', 1], [MODULE_BASE])
  queryClient.setQueryData(['bank-soal', 'formatif', 1], soal)
  queryClient.setQueryData(['quizAttempts', 1], [])
}

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
}

function renderFormatif(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/asesmen/formatif/1']}>
        <Routes>
          <Route path="/asesmen/formatif/:id" element={<Formatif />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Formatif', () => {
  it('menampilkan pesan saat bank soal kosong (tanpa tombol mulai)', () => {
    const queryClient = newQueryClient()
    seedBase(queryClient, [])
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/asesmen/formatif/1']}>
          <Routes>
            <Route path="/asesmen/formatif/:id" element={<Formatif />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toContain('Dosen belum menyiapkan soal untuk topik ini.')
    expect(html).not.toContain('Mulai')
  })

  it('skor 80 (4/5 benar) menampilkan modal apresiasi "Selamat"', async () => {
    const queryClient = newQueryClient()
    seedBase(queryClient, limaSoal())
    renderFormatif(queryClient)

    fireEvent.click(screen.getByText('Mulai'))
    // Soal ke-1..4 (index 0-3): jawab benar, masih ada soal berikutnya.
    for (let i = 0; i < 4; i++) {
      fireEvent.click(await screen.findByText(`Benar ${i}`))
      fireEvent.click(screen.getByText('Selanjutnya →'))
    }
    // Soal ke-5 (index 4, terakhir): jawab salah -> 4/5 benar -> skor 80
    fireEvent.click(await screen.findByText('Salah 4'))
    fireEvent.click(screen.getByText('Lihat Hasil ✓'))

    expect(await screen.findByText('Selamat, skor 80')).toBeTruthy()
    expect(saveQuizAttemptMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ score: 80, kind: 'formatif' }),
    )
  })

  it('skor 60 (3/5 benar) menampilkan modal remedial "Belum lulus"', async () => {
    const queryClient = newQueryClient()
    seedBase(queryClient, limaSoal())
    renderFormatif(queryClient)

    fireEvent.click(screen.getByText('Mulai'))
    // Soal ke-1..3 (index 0-2): jawab benar, masih ada soal berikutnya.
    for (let i = 0; i < 3; i++) {
      fireEvent.click(await screen.findByText(`Benar ${i}`))
      fireEvent.click(screen.getByText('Selanjutnya →'))
    }
    // Soal ke-4 (index 3): jawab salah, masih ada soal berikutnya.
    fireEvent.click(await screen.findByText('Salah 3'))
    fireEvent.click(screen.getByText('Selanjutnya →'))
    // Soal ke-5 (index 4, terakhir): jawab salah -> 3/5 benar -> skor 60
    fireEvent.click(await screen.findByText('Salah 4'))
    fireEvent.click(screen.getByText('Lihat Hasil ✓'))

    expect(await screen.findByText('Belum lulus, skor 60')).toBeTruthy()
  })
})
