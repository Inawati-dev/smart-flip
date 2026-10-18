// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { KelasWithCount } from '../lib/kelas'

// Halaman Kelas sesudah antrean #228: kelas otomatis dari tes diagnostik,
// tanpa buat kelas, kode kelas, atau impor CSV. Mode demo (tanpa Supabase).
afterEach(cleanup)

vi.mock('../lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: false }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'd1' }, profile: null, role: 'dosen', loading: false }) }))
vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({ courses: [], courseId: 1, setCourseId: () => {}, course: { id: 1, name: 'Metode', ambang_diagnostik: 80 } }),
}))

const k = (id: string, o: Partial<KelasWithCount>): KelasWithCount => ({
  id, name: id, angkatan: 2026, code: id, dosen_id: 'd1', max_students: 25, created_at: '', studentCount: 0, ...o,
})
const KELAS = [
  k('ja', { name: 'Jalur Cepat A', course_id: 1, golongan: 'mahir', urutan: 1, studentCount: 25 }),
  k('jb', { name: 'Jalur Cepat B', course_id: 1, golongan: 'mahir', urutan: 2, studentCount: 1 }),
  k('bm', { name: 'Belajar Mendalam A', course_id: 1, golongan: 'remedial', urutan: 1, studentCount: 3 }),
  k('pd', { name: 'Jalur Cepat A', course_id: 2, golongan: 'mahir', urutan: 1, studentCount: 9 }),
  k('lama', { name: 'Kelas A', golongan: null, course_id: null, max_students: 40 }),
  // Antrean #239: kelas dipisah per angkatan, nama sama boleh muncul di angkatan lain.
  k('ja25', { name: 'Jalur Cepat A', course_id: 1, golongan: 'mahir', urutan: 1, angkatan: 2025, studentCount: 7 }),
]
vi.mock('../hooks/useKelas', () => ({ useKelasByDosen: () => ({ data: KELAS, isLoading: false }) }))

const h = vi.hoisted(() => ({ pindah: vi.fn<(u: string, kelas: string) => Promise<void>>(async () => {}) }))
vi.mock('../lib/kelas', async (asli) => ({
  ...(await asli<typeof import('../lib/kelas')>()),
  fetchGolonganKelas: async () => ({ jb: [{ id: 'u1', nama: 'Budi', skor: 90, golongan: 'mahir' }] }),
  fetchBelumTes: async () => [{ id: 'u8', nama: 'Cici' }, { id: 'u9', nama: 'Dodi' }],
  pindahMahasiswa: (u: string, kelas: string) => h.pindah(u, kelas),
}))

import { KelasPanel } from './Kelas'

function tampil() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <KelasPanel />
    </QueryClientProvider>,
  )
}

describe('KelasPanel (antrean #228)', () => {
  it('menampilkan kelas otomatis mata kuliah terpilih dengan kuota, kelas lama bertanda, tanpa buat kelas dan impor', async () => {
    tampil()
    expect(screen.getByText('25/25')).toBeTruthy()
    expect(screen.getByText('1/25')).toBeTruthy()
    expect(screen.queryByText('9/25')).toBeNull() // kelas mata kuliah lain
    expect(screen.getByText('Kelas lama, sebelum kelas otomatis')).toBeTruthy()
    expect(screen.queryByText(/Buat Kelas Baru/)).toBeNull()
    expect(screen.queryByText(/Kode Kelas/)).toBeNull()
    expect(screen.queryByLabelText(/Import CSV/)).toBeNull()
    expect(screen.getByText('Tidak tersedia di mode demo.')).toBeTruthy()
    expect(await screen.findByText(/2 mahasiswa belum tes diagnostik/)).toBeTruthy()
  })

  it('kelas otomatis dengan nama sama di dua angkatan tampil terpisah di bawah judul angkatannya (antrean #239)', () => {
    tampil()
    const a26 = document.getElementById('angkatan-2026') as HTMLElement
    const a25 = document.getElementById('angkatan-2025') as HTMLElement
    expect(within(a26).getByText('25/25')).toBeTruthy()
    expect(within(a25).getByText('7/25')).toBeTruthy()
    expect(within(a25).getByRole('button', { name: /Lihat daftar mahasiswa kelas Jalur Cepat A/ })).toBeTruthy()
    expect(within(a25).queryByText('25/25')).toBeNull()
  })

  it('daftar belum tes dibuka dalam modal tanpa tombol pindah', async () => {
    tampil()
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat Daftar' }))
    expect(screen.getByText('Belum Tes Diagnostik · 2')).toBeTruthy()
    expect(screen.getByText('Dodi')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Pindahkan/ })).toBeNull()
  })

  it('pindah mahasiswa lewat modal memanggil pindah_mahasiswa ke kelas tujuan', async () => {
    tampil()
    const baris = screen.getByRole('button', { name: /Lihat daftar mahasiswa kelas Jalur Cepat B/ }).closest('tr') as HTMLElement
    await waitFor(() => expect(within(baris).getByText(/Cepat 1/)).toBeTruthy())
    fireEvent.click(within(baris).getByRole('button', { name: 'Kelola' }))
    fireEvent.click(screen.getByLabelText('Pilih Budi'))
    fireEvent.click(screen.getByRole('button', { name: 'Pindahkan (1)' }))
    expect(screen.getByText('Pindahkan 1 Mahasiswa')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pindahkan' }))
    await waitFor(() => expect(h.pindah).toHaveBeenCalledTimes(1))
    // tujuan bawaan = kelas otomatis pertama selain kelas asal (urutan: Belajar Mendalam A dulu)
    expect(h.pindah).toHaveBeenCalledWith('u1', 'bm')
  })
})
