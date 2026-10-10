// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import MiniProjek from './MiniProjek'
import { PAKET_PROPOSAL } from '../lib/paketProposal'
import type { FinalProject, FinalSubmission } from '../lib/tugasAkhir'

afterEach(cleanup)

const state = vi.hoisted(() => ({
  projects: [] as unknown[],
  subs: {} as Record<string, unknown>,
  mulai: null as string | null,
  submit: vi.fn(async () => ({})),
}))

vi.mock('../lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: true }))
vi.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('../components/MataKuliahSelect', () => ({ MataKuliahSelect: () => null }))
vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({ courseId: 1, course: { mulai_kuliah: state.mulai } }),
}))
vi.mock('../hooks/useModules', () => ({
  useModules: () => ({ data: [1, 2, 3, 4, 5, 6].map((n) => ({ id: 10 + n, order_num: n })) }),
}))
vi.mock('../lib/tugasAkhir', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/tugasAkhir')>()
  return {
    ...actual,
    fetchProjectsMhs: async () => state.projects,
    fetchMySubmission: async (id: string) => state.subs[id] ?? null,
    submitTugasAkhir: (...a: unknown[]) => (state.submit as (...x: unknown[]) => unknown)(...a),
    signedFileUrl: vi.fn(async () => 'https://signed.example/url'),
  }
})

const brief = (urutan: number): FinalProject => ({
  id: `b${urutan}`,
  dosen_id: 'd1',
  title: PAKET_PROPOSAL[urutan - 1].judul,
  description: '',
  deadline: null,
  rubric: PAKET_PROPOSAL[urutan - 1].rubrik,
  class_ids: [],
  is_open: true,
  created_at: '2026-10-01T00:00:00Z',
  paket_id: 'p1',
  urutan,
  bobot: PAKET_PROPOSAL[urutan - 1].bobot,
})

const kirimanContoh = (projectId: string, patch: Partial<FinalSubmission> = {}): FinalSubmission => ({
  id: `s-${projectId}`,
  project_id: projectId,
  user_id: 'm1',
  file_path: `m1/${projectId}.docx`,
  file_name: `${projectId}.docx`,
  link: null,
  note: null,
  submitted_at: '2026-10-05T03:00:00Z',
  scores: null,
  total: null,
  feedback: null,
  graded_at: null,
  ...patch,
})

const hariLalu = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

function tampil() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MiniProjek />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function berkasDocx() {
  return new File(['x'], 'bab.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

function pilihBerkas() {
  const input = document.querySelector('input[type=file]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [berkasDocx()] } })
}

beforeEach(() => {
  state.projects = [1, 2, 3, 4].map(brief)
  state.subs = {}
  state.mulai = hariLalu(1)
  state.submit = vi.fn(async () => ({}))
})

describe('MiniProjek', () => {
  it('tanpa paket menampilkan keadaan kosong', async () => {
    state.projects = []
    tampil()
    expect(await screen.findByText('Dosen belum membuat Paket Rancangan Proposal.')).toBeTruthy()
  })

  it('Bab 1 belum dikirim punya tombol kirim; Bab 2 terkunci menyebut syaratnya', async () => {
    tampil()
    expect(await screen.findByRole('button', { name: 'Kirim Bab 1 (.docx)' })).toBeTruthy()
    expect(screen.getByText('Terbuka Sesudah Topik 4')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Kirim Bab 2 (.docx)' })).toBeNull()
    expect(screen.getByText('0 dari 3 bab dinilai')).toBeTruthy()
  })

  it('tombol Kirim nonaktif sampai berkas dipilih dan semua kotak dicentang', async () => {
    tampil()
    fireEvent.click(await screen.findByRole('button', { name: 'Kirim Bab 1 (.docx)' }))
    const dialog = screen.getByRole('dialog')
    const kirim = within(dialog).getByRole('button', { name: 'Kirim' }) as HTMLButtonElement
    expect(kirim.disabled).toBe(true)

    pilihBerkas()
    expect(kirim.disabled).toBe(true)

    const kotak = within(dialog).getAllByRole('checkbox')
    fireEvent.click(kotak[0])
    expect(kirim.disabled).toBe(true)
    fireEvent.click(kotak[1])
    await waitFor(() => expect(kirim.disabled).toBe(false))

    fireEvent.click(kirim)
    await waitFor(() => expect(state.submit).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Bab 1 terkirim')).toBeTruthy()
  })

  it('Bab 3 menolak kirim tanpa tautan prototipe yang sah', async () => {
    state.mulai = hariLalu(80) // Topik 1 sampai 5 terbuka
    tampil()
    fireEvent.click(await screen.findByRole('button', { name: 'Kirim Bab 3 (.docx)' }))
    const dialog = screen.getByRole('dialog')
    const kirim = within(dialog).getByRole('button', { name: 'Kirim' }) as HTMLButtonElement

    pilihBerkas()
    within(dialog).getAllByRole('checkbox').forEach((c) => fireEvent.click(c))
    expect(kirim.disabled).toBe(true) // tautan kosong

    const tautan = within(dialog).getByPlaceholderText('https://')
    fireEvent.change(tautan, { target: { value: 'bukan tautan' } })
    expect(kirim.disabled).toBe(true)
    expect(within(dialog).getByText('Tautan harus diawali http:// atau https://.')).toBeTruthy()

    fireEvent.change(tautan, { target: { value: 'https://figma.com/file/abc' } })
    await waitFor(() => expect(kirim.disabled).toBe(false))
  })

  it('bab yang sudah dinilai menampilkan nilai dan tanpa Kirim Ulang; yang terkirim punya Kirim Ulang', async () => {
    state.subs = {
      b1: kirimanContoh('b1', { total: 82, scores: [80, 80, 80, 90, 85], feedback: 'Rapi.', graded_at: '2026-10-08T00:00:00Z' }),
    }
    tampil()
    expect(await screen.findByText('Dinilai · 82 dari 100')).toBeTruthy()
    expect(screen.getByText('1 dari 3 bab dinilai')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lihat Rincian Nilai' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Kirim Ulang' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Lihat Rincian Nilai' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Latar Belakang Masalah')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Tutup' })).toBeTruthy()
  })

  it('bab terkirim menampilkan Kirim Ulang', async () => {
    state.subs = { b1: kirimanContoh('b1') }
    tampil()
    expect(await screen.findByText('Terkirim · Menunggu Nilai')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Kirim Ulang' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lihat Berkas' })).toBeTruthy()
  })
})
