// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ simpan: vi.fn(async () => undefined) }))
vi.mock('../lib/jadwal', async (orig) => ({ ...(await orig<typeof import('../lib/jadwal')>()), simpanJadwal: h.simpan }))
vi.mock('./TanggalInput', () => ({
  TanggalInput: ({ ariaLabel, value, onChange }: { ariaLabel?: string; value: string; onChange: (v: string) => void }) => (
    <input aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))
import { JadwalModal } from './JadwalModal'
import type { Course } from '../lib/courses'
import type { ModuleRow } from '../lib/modules'

afterEach(cleanup)

// Antrean #309
describe('JadwalModal tanggal sendiri', () => {
  it('memilih Tanggal sendiri lalu Simpan mengirim tanggal dan minggu turunannya', async () => {
    const course = { id: 5, name: 'MK', mulai_kuliah: '2026-10-12' } as unknown as Course
    const modules = [{ id: 7, order_num: 1, title: 'Satu', minggu_mulai: null, tanggal_buka: null }] as unknown as ModuleRow[]
    render(
      <QueryClientProvider client={new QueryClient()}>
        <JadwalModal course={course} modules={modules} onClose={() => {}} />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByText('Tanggal sendiri'))
    fireEvent.change(screen.getByLabelText('Tanggal buka topik 1'), { target: { value: '2026-11-04' } })
    fireEvent.click(screen.getByText('Simpan'))
    await waitFor(() => expect(h.simpan).toHaveBeenCalled())
    expect(h.simpan).toHaveBeenCalledWith(5, '2026-10-12', { 7: 4 }, { 7: '2026-11-04' })
  })
})

describe('JadwalModal batas tanggal (sanggahan pemeriksa #309)', () => {
  const pasang = (minggu: number | null) => {
    const course = { id: 5, name: 'MK', mulai_kuliah: '2026-08-24' } as unknown as Course
    const modules = [{ id: 7, order_num: 1, title: 'Satu', minggu_mulai: minggu, tanggal_buka: null }] as unknown as ModuleRow[]
    render(
      <QueryClientProvider client={new QueryClient()}>
        <JadwalModal course={course} modules={modules} onClose={() => {}} />
      </QueryClientProvider>,
    )
  }
  it('tanggal lebih dari 52 minggu sesudah pertemuan pertama ditolak sebelum simpan', () => {
    pasang(null)
    fireEvent.click(screen.getByText('Tanggal sendiri'))
    fireEvent.change(screen.getByLabelText('Tanggal buka topik 1'), { target: { value: '2027-09-01' } })
    expect(screen.getByText(/paling lambat 52 minggu/)).toBeTruthy()
    expect((screen.getByText('Simpan').closest('button') as HTMLButtonElement).disabled).toBe(true)
  })
  it('angka minggu tak sah yang tersembunyi di mode Tanggal sendiri tidak memblokir simpan', () => {
    pasang(null)
    fireEvent.change(screen.getByLabelText('Minggu ke berapa topik 1 dibuka'), { target: { value: '99' } })
    fireEvent.click(screen.getByText('Tanggal sendiri'))
    fireEvent.change(screen.getByLabelText('Tanggal buka topik 1'), { target: { value: '2026-09-01' } })
    expect((screen.getByText('Simpan').closest('button') as HTMLButtonElement).disabled).toBe(false)
  })
})
