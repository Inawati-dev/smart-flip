// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const buat = vi.fn()
vi.mock('../lib/sampulPdf', async (asli) => ({ ...(await asli<typeof import('../lib/sampulPdf')>()), buatSampul: (u: string) => buat(u) }))

import { SampulTopik } from './KartuTopik'

const PDF = 'https://x.supabase.co/storage/v1/object/public/modul-pdf/topik-1-1.pdf'
afterEach(() => {
  cleanup()
  buat.mockReset()
})

describe('SampulTopik', () => {
  it('tanpa PDF di bucket memakai sampul rancangan bertulisan judul', () => {
    render(<SampulTopik nomor={2} judul="Needs Assessment" adaPdf={false} />)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('Needs Assessment')).toBeTruthy()
    expect(screen.getByText('Belum Ada PDF')).toBeTruthy()
  })

  it('dengan PDF di bucket menampilkan gambar polos; nomor, judul, dan keterangan di bawahnya', () => {
    render(<SampulTopik nomor={1} judul="Dasar R&D" keterangan="18 hal" adaPdf pdf={PDF} />)
    const img = document.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe(PDF + '.sampul.jpg')
    expect(screen.getByText('Dasar R&D')).toBeTruthy()
    expect(screen.getByText('Topik 01 · 18 hal')).toBeTruthy()
  })

  it('mahasiswa: gambar gagal dimuat kembali ke sampul rancangan, tanpa mencoba membuat', () => {
    render(<SampulTopik nomor={1} judul="Dasar R&D" adaPdf pdf={PDF} />)
    fireEvent.error(document.querySelector('img') as HTMLImageElement)
    expect(document.querySelector('img')).toBeNull()
    expect(screen.getByText('Dasar R&D')).toBeTruthy()
    expect(buat).not.toHaveBeenCalled()
  })

  it('dosen: gambar belum ada dibuatkan sekali lalu dimuat ulang; gagal kedua kali tidak diulang', async () => {
    buat.mockResolvedValue(true)
    render(<SampulTopik nomor={1} judul="Dasar R&D" adaPdf pdf={PDF} buat />)
    fireEvent.error(document.querySelector('img') as HTMLImageElement)
    await waitFor(() => expect(document.querySelector('img')?.getAttribute('src')).toContain('.sampul.jpg?v='))
    expect(buat).toHaveBeenCalledTimes(1)
    fireEvent.error(document.querySelector('img') as HTMLImageElement)
    expect(document.querySelector('img')).toBeNull()
    expect(buat).toHaveBeenCalledTimes(1)
  })

  it('dosen: pembuatan gagal berakhir di sampul rancangan', async () => {
    buat.mockResolvedValue(false)
    render(<SampulTopik nomor={1} judul="Dasar R&D" adaPdf pdf={PDF} buat />)
    fireEvent.error(document.querySelector('img') as HTMLImageElement)
    await waitFor(() => expect(buat).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(document.querySelector('img')).toBeNull())
    expect(screen.getByText('PDF')).toBeTruthy()
  })
})
