// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import Kuis from './Kuis'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  },
  isSupabaseConfigured: false,
}))

const saveQuizAttemptMock = vi.fn(async (_moduleId: number, _attempt: unknown) => {})
vi.mock('../lib/quizAttempts', () => ({
  saveQuizAttempt: (moduleId: number, attempt: unknown) => saveQuizAttemptMock(moduleId, attempt),
}))

const MODULE_BASE = {
  id: 1,
  order_num: 1,
  title: 'Dasar Penelitian R&D',
  description: null,
  video_url: null,
  pdf_path: null,
  is_active: true,
  path: 'books/modul-01.pdf',
  videoId: null,
  color: 'var(--sage)',
  sub: '',
  capaian: [],
  materi: [],
  jurnal: [],
  studiKasus: [],
}

const TWO_QUESTIONS = [
  { id: 1, module_id: 1, question: 'Soal pertama?', options: ['Salah A', 'Benar B'], answer_idx: 1, explanation: null, order_num: 1 },
  { id: 2, module_id: 1, question: 'Soal kedua?', options: ['Benar A', 'Salah B'], answer_idx: 0, explanation: null, order_num: 2 },
]

function newQueryClient() {
  // Real render() (unlike renderToStaticMarkup) mounts query observers, whose
  // effects fire a background refetch by default (staleTime: 0). That refetch
  // hits the real fetchModuleById -> fetchModules (unmocked here), which
  // returns [] since Supabase isn't configured, clobbering the seeded fixture
  // with null mid-test. Disable that refetch so setQueryData sticks.
  return new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  })
}

function renderKuis(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/modul/1/kuis']}>
        <Routes>
          <Route path="/modul/:id/kuis" element={<Kuis />} />
          <Route path="/modul/:id" element={<div>Halaman Modul 1</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Kuis', () => {
  it('renders without throwing once module data loads', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 1], MODULE_BASE)
    queryClient.setQueryData(['kuis-soal', 1], TWO_QUESTIONS)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/modul/1/kuis']}>
          <Routes>
            <Route path="/modul/:id/kuis" element={<Kuis />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toBeTruthy()
    expect(html).toContain('Soal pertama?')
  })

  it('shows an empty-state message when the module has no quiz questions yet', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['modules', 1], MODULE_BASE)
    queryClient.setQueryData(['kuis-soal', 1], [])
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/modul/1/kuis']}>
          <Routes>
            <Route path="/modul/:id/kuis" element={<Kuis />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toContain('Soal kuis untuk modul ini belum tersedia.')
  })

  it('locks in an answer on click, shows immediate feedback, and enables Selanjutnya', () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['modules', 1], MODULE_BASE)
    queryClient.setQueryData(['kuis-soal', 1], TWO_QUESTIONS)
    renderKuis(queryClient)

    const nextBtn = screen.getByText('Selanjutnya →') as HTMLButtonElement
    expect(nextBtn.disabled).toBe(true)

    fireEvent.click(screen.getByText('Benar B'))

    expect(screen.getByText('✓ Jawaban kamu benar!')).toBeTruthy()
    expect((screen.getByText('Selanjutnya →') as HTMLButtonElement).disabled).toBe(false)
  })

  it('computes the percentage score correctly, saves the attempt via saveQuizAttempt, and shows the pass/fail result', async () => {
    saveQuizAttemptMock.mockClear()
    const queryClient = newQueryClient()
    queryClient.setQueryData(['modules', 1], MODULE_BASE)
    queryClient.setQueryData(['kuis-soal', 1], TWO_QUESTIONS)
    renderKuis(queryClient)

    // Q1: pick the correct option ("Benar B", index 1)
    fireEvent.click(screen.getByText('Benar B'))
    fireEvent.click(screen.getByText('Selanjutnya →'))

    // Q2: pick the wrong option ("Salah B", index 1; correct is index 0)
    fireEvent.click(screen.getByText('Salah B'))
    const finishBtn = await screen.findByText('Lihat Hasil ✓')
    fireEvent.click(finishBtn)

    // 1 of 2 correct -> 50% -> below the 60% pass threshold
    expect(await screen.findByText('50%')).toBeTruthy()
    expect(screen.getByText('Perlu Mengulang')).toBeTruthy()

    expect(saveQuizAttemptMock).toHaveBeenCalledTimes(1)
    expect(saveQuizAttemptMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ score: 50, answers: [1, 1] }),
    )
  })

  it('navigates back to the module detail page when "Kembali ke Modul" is clicked on the result screen', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['modules', 1], MODULE_BASE)
    queryClient.setQueryData(['kuis-soal', 1], TWO_QUESTIONS)
    renderKuis(queryClient)

    fireEvent.click(screen.getByText('Benar B'))
    fireEvent.click(screen.getByText('Selanjutnya →'))
    fireEvent.click(screen.getByText('Benar A'))
    const finishBtn = await screen.findByText('Lihat Hasil ✓')
    fireEvent.click(finishBtn)

    const backBtn = await screen.findByText('← Kembali ke Modul')
    fireEvent.click(backBtn)

    expect(await screen.findByText('Halaman Modul 1')).toBeTruthy()
  })
})
