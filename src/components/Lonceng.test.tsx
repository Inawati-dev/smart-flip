// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { PanelLonceng, type ButirLonceng } from './Lonceng'
import { kunciNotif } from '../lib/notifPref'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

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

  it('saklar notifikasi (antrean #360): mati = lencana hilang, daftar diganti pesan, tersimpan; nyala lagi memulihkan', () => {
    render(<PanelLonceng letak="rel" butir={butir(2)} jumlahBaru={4} kosong="Kosong" />)
    fireEvent.click(screen.getByRole('button', { name: 'Notifikasi, 4 baru' }))
    const saklar = screen.getByRole('switch', { name: 'Matikan notifikasi' })
    expect(saklar.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(saklar)
    expect(localStorage.getItem(kunciNotif(undefined))).toBe('0')
    expect(screen.getByRole('button', { name: 'Notifikasi dimatikan' }).textContent).toBe('')
    expect(screen.getByText(/Lencana dan kabar baru tidak ditampilkan/)).toBeTruthy()
    expect(screen.queryByText('Judul 1')).toBeNull()
    fireEvent.click(screen.getByRole('switch', { name: 'Nyalakan notifikasi' }))
    expect(localStorage.getItem(kunciNotif(undefined))).toBe('1')
    expect(screen.getByText('Judul 1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Notifikasi, 4 baru' }).textContent).toBe('4')
  })

  it('pilihan mati tersimpan: lonceng baru langsung tampil mati', () => {
    localStorage.setItem(kunciNotif(undefined), '0')
    render(<PanelLonceng letak="atas" butir={butir(1)} jumlahBaru={3} kosong="Kosong" />)
    expect(screen.getByRole('button', { name: 'Notifikasi dimatikan' }).textContent).toBe('')
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
