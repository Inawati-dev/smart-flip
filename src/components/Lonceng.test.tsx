// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PanelLonceng, type ButirLonceng } from './Lonceng'

afterEach(cleanup)

function butir(n: number, buka = vi.fn()): ButirLonceng[] {
  return Array.from({ length: n }, (_, i) => ({ kunci: `b${i}`, judul: `Judul ${i}`, ket: `Ket ${i}`, baru: i === 0, buka }))
}

describe('PanelLonceng', () => {
  it('lencana menunjukkan jumlah baru (9+ di atas sembilan) dan label tombolnya', () => {
    render(<PanelLonceng letak="atas" butir={[]} jumlahBaru={12} kosong="Kosong" />)
    expect(screen.getByRole('button', { name: 'Notifikasi, 12 baru' }).textContent).toBe('9+')
    cleanup()
    render(<PanelLonceng letak="atas" butir={[]} jumlahBaru={0} kosong="Kosong" />)
    expect(screen.getByRole('button', { name: 'Notifikasi' }).textContent).toBe('')
  })

  it('klik membuka panel; klik butir memanggil buka dan menutup panel; Esc menutup', () => {
    const buka = vi.fn()
    render(<PanelLonceng letak="rel" butir={butir(2, buka)} jumlahBaru={1} kosong="Kosong" />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi, 1 baru' }))
    expect(screen.getByRole('dialog', { name: 'Notifikasi' })).toBeTruthy()
    fireEvent.click(screen.getByText('Judul 1'))
    expect(buka).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi, 1 baru' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('fokus pindah ke butir pertama saat dibuka; Esc dan pilih butir mengembalikannya ke tombol lonceng', () => {
    render(<PanelLonceng letak="atas" butir={butir(2)} jumlahBaru={0} kosong="Kosong" />)
    const tombol = screen.getByRole('button', { name: 'Notifikasi' })
    fireEvent.click(tombol)
    expect(document.activeElement?.textContent).toContain('Judul 0')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(tombol)
    fireEvent.click(tombol)
    fireEvent.click(screen.getByText('Judul 1'))
    expect(document.activeElement).toBe(tombol)
  })

  it('panel kosong menerima fokus; klik di luar tidak memindah fokus ke tombol', () => {
    render(
      <>
        <PanelLonceng letak="atas" butir={[]} jumlahBaru={0} kosong="Kosong" />
        <input aria-label="lain" />
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi' }))
    expect(document.activeElement).toBe(screen.getByRole('dialog', { name: 'Notifikasi' }))
    const lain = screen.getByRole('textbox', { name: 'lain' })
    lain.focus()
    fireEvent.mouseDown(lain)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(lain)
  })

  it('tanpa butir menampilkan teks kosong; tombol kaki dipanggil', () => {
    const kaki = vi.fn()
    render(<PanelLonceng letak="atas" butir={[]} jumlahBaru={0} kosong="Belum ada notifikasi." kaki={{ label: 'Buka', buka: kaki }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi' }))
    expect(screen.getByText('Belum ada notifikasi.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Buka' }))
    expect(kaki).toHaveBeenCalledTimes(1)
  })
})
