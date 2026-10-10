// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TanggalInput } from './TanggalInput'

afterEach(cleanup)

const bukaPanel = () => fireEvent.click(screen.getByRole('button', { expanded: false }))
const hari = (k: string) => document.querySelector<HTMLButtonElement>(`[data-tgl="${k}"]`)!

describe('TanggalInput', () => {
  it('menampilkan tanggal berbahasa Indonesia di pemicu, dan teks pengganti saat kosong', () => {
    const { rerender } = render(<TanggalInput value="2026-10-12" onChange={() => {}} />)
    expect(screen.getByRole('button').textContent).toContain('Senin, 12 Oktober 2026')
    rerender(<TanggalInput value="" onChange={() => {}} />)
    expect(screen.getByRole('button').textContent).toContain('Pilih tanggal')
  })

  it('memilih tanggal memanggil onChange dengan YYYY-MM-DD lalu menutup panel', () => {
    const onChange = vi.fn()
    render(<TanggalInput value="2026-10-15" onChange={onChange} />)
    bukaPanel()
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(hari('2026-10-20'))
    expect(onChange).toHaveBeenCalledWith('2026-10-20')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('denganJam menghasilkan YYYY-MM-DDTHH:mm dan tetap terbuka sampai Selesai', () => {
    const onChange = vi.fn()
    render(<TanggalInput denganJam value="2026-10-15T09:30" onChange={onChange} />)
    bukaPanel()
    fireEvent.click(hari('2026-10-20'))
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20T09:30')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Jam'), { target: { value: '14' } })
    expect(onChange).toHaveBeenLastCalledWith('2026-10-15T14:30')
    fireEvent.change(screen.getByLabelText('Menit'), { target: { value: '5' } })
    expect(onChange).toHaveBeenLastCalledWith('2026-10-15T09:05')
    fireEvent.click(screen.getByText('Selesai'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('tanggal di luar min/max tidak bisa dipilih', () => {
    const onChange = vi.fn()
    render(<TanggalInput value="2026-10-15" min="2026-10-10" max="2026-10-20" onChange={onChange} />)
    bukaPanel()
    expect(hari('2026-10-09').disabled).toBe(true)
    expect(hari('2026-10-21').disabled).toBe(true)
    expect(hari('2026-10-10').disabled).toBe(false)
    expect(hari('2026-10-20').disabled).toBe(false)
    fireEvent.click(hari('2026-10-09'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Kosongkan memanggil onChange dengan string kosong', () => {
    const onChange = vi.fn()
    render(<TanggalInput value="2026-10-15" onChange={onChange} />)
    bukaPanel()
    fireEvent.click(screen.getByText('Kosongkan'))
    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('pindah bulan lintas tahun, Desember ke Januari dan sebaliknya', () => {
    render(<TanggalInput value="2026-12-10" onChange={() => {}} />)
    bukaPanel()
    expect(screen.getByRole('dialog').textContent).toContain('Desember 2026')
    fireEvent.click(screen.getByLabelText('Bulan berikutnya'))
    expect(screen.getByRole('dialog').textContent).toContain('Januari 2027')
    expect(hari('2027-01-01')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Bulan sebelumnya'))
    expect(screen.getByRole('dialog').textContent).toContain('Desember 2026')
  })

  it('minggu dimulai Senin: 1 Oktober 2026 (Kamis) ada di kolom keempat', () => {
    render(<TanggalInput value="2026-10-15" onChange={() => {}} />)
    bukaPanel()
    const sel = hari('2026-10-01').parentElement!
    expect(Array.from(sel.children).indexOf(hari('2026-10-01'))).toBe(3)
    expect(screen.getByRole('dialog').textContent).toContain('Sen')
  })

  it('tanggal terpilih memakai aria-pressed, dan panah menggeser fokus', () => {
    render(<TanggalInput value="2026-10-15" onChange={() => {}} />)
    bukaPanel()
    expect(hari('2026-10-15').getAttribute('aria-pressed')).toBe('true')
    expect(hari('2026-10-16').getAttribute('aria-pressed')).toBe('false')
    expect(document.activeElement).toBe(hari('2026-10-15'))
    fireEvent.keyDown(hari('2026-10-15'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(hari('2026-10-16'))
    fireEvent.keyDown(hari('2026-10-16'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(hari('2026-10-23'))
  })

  it('Escape menutup panel, begitu juga klik di luar', () => {
    render(<TanggalInput value="2026-10-15" onChange={() => {}} />)
    bukaPanel()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    bukaPanel()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
