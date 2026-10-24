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
  it('header tanpa tombol Bank Soal (sudah jadi item rel), tanpa Tes Khusus/Tes Kelompok/Tugas Akhir/Unduh CSV', async () => {
    renderPage()
    expect(await screen.findByText('Hasil Kelas')).toBeTruthy()
    // Tautan Bank soal hanya boleh ada di rel navigasi, bukan di header halaman.
    const main = document.querySelector('main')!
    expect(main.querySelector('a[href="/asesmen/bank"]')).toBeNull()
    expect(screen.queryByText('Tes Khusus')).toBeFalsy()
    expect(screen.queryByText('Tes Kelompok')).toBeFalsy()
    expect(screen.queryByText('Tugas Akhir')).toBeFalsy()
    expect(screen.queryByText('Mini Projek')).toBeFalsy()
    expect(screen.queryByText('Unduh CSV')).toBeFalsy()
  })

  it('menampilkan dua kartu grafik: Rata-rata formatif dan persentase lulus per topik', async () => {
    renderPage()
    expect(await screen.findByText('Rata-rata Formatif per Topik')).toBeTruthy()
    expect(screen.getByText('Persentase Lulus per Topik')).toBeTruthy()
  })

  // Antrean #105 opsi B: golongan pre-test per mahasiswa, batas 80.
  it('menghitung golongan pre-test: Jalur Cepat dan Belajar Mendalam per mahasiswa', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['asesmen-prepost', 1], [
      { userId: 'a', nama: 'Ani', kelasId: 'A', pre: 85, post: 90 },
      { userId: 'b', nama: 'Budi', kelasId: 'A', pre: 60 },
    ])
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/asesmen']}>
          <Asesmen />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Ani')).toBeTruthy()
    const teks = document.body.textContent ?? ''
    expect(teks).toContain('Jalur Cepat 1')
    expect(teks).toContain('Belajar Mendalam 1')
    expect(screen.getByText('Golongan')).toBeTruthy()
    expect(screen.getAllByText('Jalur Cepat').length).toBe(1)
    expect(screen.getAllByText('Belajar Mendalam').length).toBe(1)
  })

  // Antrean #179: kolom Mini Projek dari empat brief paket berbobot.
  it('kolom Mini Projek: kemajuan "2 dari 4 dinilai" selama paket belum lengkap, angka bobot bila lengkap', async () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(['asesmen-prepost', 1], [
      { userId: 'a', nama: 'Ani', kelasId: 'A', pre: 85, post: 90 },
      { userId: 'b', nama: 'Budi', kelasId: 'A', pre: 60, post: 70 },
    ])
    const bobot = [20, 20, 25, 35]
    queryClient.setQueryData(
      ['final-projects', 1],
      bobot.map((b, i) => ({ id: `p${i + 1}`, paket_id: 'x', urutan: i + 1, bobot: b, rubric: [], class_ids: [], created_at: '2026-10-01' })),
    )
    const nilai = (uid: string, total: number) => ({ user_id: uid, total, graded_at: '2026-10-02' })
    queryClient.setQueryData(['final-submissions', 'p1'], [nilai('a', 80), nilai('b', 70)])
    queryClient.setQueryData(['final-submissions', 'p2'], [nilai('a', 60), nilai('b', 90)])
    queryClient.setQueryData(['final-submissions', 'p3'], [nilai('a', 100)])
    queryClient.setQueryData(['final-submissions', 'p4'], [nilai('a', 100)])
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/asesmen']}>
          <Asesmen />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Ani')).toBeTruthy()
    // Ani: 80*.20 + 60*.20 + 100*.25 + 100*.35 = 88
    expect(screen.getByText('88')).toBeTruthy()
    expect(screen.getByText('2 dari 4 dinilai')).toBeTruthy()
  })

  // Antrean #294: pembanding visual pada tiga kartu ringkasan.
  it('kartu ringkasan: penanda ambang, selisih lulus, ruas kategori aktif', async () => {
    const queryClient = newQueryClient()
    // pre 60, formatif 65: gain (65-60)/(100-60) = 0,125 rendah
    queryClient.setQueryData(['asesmen-prepost', 1], [{ userId: 'a', nama: 'Ani', kelasId: 'A', pre: 60 }])
    queryClient.setQueryData(['asesmen-formatif', 1], [
      { id: 1, userId: 'a', nama: 'Ani', kelas: 'A', moduleId: 1, modulJudul: 'T1', score: 65, passed: false, attemptedAt: '2026-10-01' },
    ])
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/asesmen']}>
          <Asesmen />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Ani')).toBeTruthy()
    const penanda = screen.getAllByTestId('bilah-penanda') as HTMLElement[]
    expect(penanda.length).toBe(2)
    expect(penanda[0].style.left).toBe('80%')
    const teks = document.body.textContent ?? ''
    expect(teks).toContain('dari 100 · ambang Jalur Cepat 80')
    expect(teks).toMatch(/dari 100 · lulus [0-9]+/)
    expect(screen.getByTestId('selisih-lulus').textContent).toBe('5 poin di bawah batas lulus')
    expect((screen.getAllByTestId('bilah-isi')[0] as HTMLElement).style.width).toBe('60%')
    expect(screen.getByTestId('ruas-rendah').getAttribute('data-aktif')).toBe('ya')
    expect(screen.getByTestId('ruas-sedang').getAttribute('data-aktif')).toBe('tidak')
    expect(screen.getByTestId('ruas-tinggi').getAttribute('data-aktif')).toBe('tidak')
  })

  it('kartu ringkasan tanpa data: bilah kosong dan "Belum ada data"', async () => {
    renderPage()
    expect(await screen.findByText('Hasil Kelas')).toBeTruthy()
    expect(screen.queryAllByTestId('bilah-isi').length).toBe(0)
    expect(screen.queryAllByTestId('bilah-penanda').length).toBe(0)
    expect(screen.getAllByText('Belum ada data').length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByTestId('selisih-lulus')).toBeNull()
    for (const k of ['rendah', 'sedang', 'tinggi']) expect(screen.getByTestId(`ruas-${k}`).getAttribute('data-aktif')).toBe('tidak')
  })
})
