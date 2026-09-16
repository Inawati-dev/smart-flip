// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import Asesmen from './Asesmen'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: false,
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'dosen-1' }, profile: null, role: 'dosen', loading: false }),
}))

vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({ courses: [], courseId: 1, course: null, setCourseId: () => {}, isLoading: false }),
}))

vi.mock('../hooks/useKelas', () => ({
  useKelasByDosen: () => ({ data: [] }),
}))

function newQueryClient() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  qc.setQueryData(['asesmen-prepost', 1], [])
  qc.setQueryData(['asesmen-formatif', 1], [])
  qc.setQueryData(['final-projects', 1], [])
  return qc
}

function renderPage() {
  const queryClient = newQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/asesmen']}>
        <Asesmen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Asesmen — header dan grafik (spec asesmen 16 Sep 2026)', () => {
  it('hanya menampilkan tombol Bank soal, tanpa Tes khusus/Tes kelompok/Tugas akhir/Unduh CSV', async () => {
    renderPage()
    expect(await screen.findByText('Bank soal')).toBeTruthy()
    expect(screen.queryByText('Tes khusus')).toBeFalsy()
    expect(screen.queryByText('Tes kelompok')).toBeFalsy()
    expect(screen.queryByText('Tugas akhir')).toBeFalsy()
    expect(screen.queryByText('Unduh CSV')).toBeFalsy()
  })

  it('menampilkan dua kartu grafik: rata-rata formatif dan persentase lulus per topik', async () => {
    renderPage()
    expect(await screen.findByText('Rata-rata formatif per topik')).toBeTruthy()
    expect(screen.getByText('Persentase lulus per topik')).toBeTruthy()
  })
})
