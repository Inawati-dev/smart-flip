// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'

const auth = { user: { id: 'u1' }, role: 'mahasiswa' as 'mahasiswa' | 'dosen' }
vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../contexts/AuthContext')>()
  return { ...actual, useAuth: () => ({ ...actual.useAuth(), ...auth }) }
})
vi.mock('../components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

import Kirim from './Kirim'

function tampil(url = '/kirim') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Kirim />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('Kirim', () => {
  it('kirim saran: isi dibersihkan, pesan terima kasih, dan muncul di Kirimanku', async () => {
    auth.role = 'mahasiswa'
    tampil()
    expect(await screen.findByText('Belum ada kiriman.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Apa sarannya?'), { target: { value: 'Tambahkan grafik nilai di dashboard' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(await screen.findByText('Terima kasih, laporanmu sudah terkirim.')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Tambahkan grafik nilai di dashboard')).toBeTruthy())
    expect((screen.getByLabelText('Apa sarannya?') as HTMLTextAreaElement).value).toBe('')
  })

  it('isi terlalu pendek: pesan galat dan tidak tersimpan; jenis Bug mengganti pertanyaan', async () => {
    auth.role = 'mahasiswa'
    tampil()
    fireEvent.click(screen.getByRole('button', { name: 'Laporan bug' }))
    expect(screen.getByLabelText(/Apa yang terjadi/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/Apa yang terjadi/), { target: { value: 'ab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(await screen.findByText(/minimal 5 karakter/)).toBeTruthy()
    expect(screen.getByText('Belum ada kiriman.')).toBeTruthy()
  })

  it('halaman terkait terisi dari parameter dari; dosen melihat judul Semua kiriman dan tombol tandai', async () => {
    auth.role = 'dosen'
    localStorage.setItem('sfp_laporan_demo', JSON.stringify([{ id: 'd1', userId: 'x', jenis: 'bug', isi: 'halaman putih saat kirim', halaman: null, status: 'baru', createdAt: '2026-11-08T03:00:00.000Z' }]))
    tampil('/kirim?dari=/asesmen/formatif/1')
    expect((screen.getByLabelText(/Halaman terkait/) as HTMLInputElement).value).toBe('/asesmen/formatif/1')
    expect(screen.getByText('Semua kiriman')).toBeTruthy()
    expect(await screen.findByText('halaman putih saat kirim')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tandai selesai' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tandai selesai' })).toBeNull())
    expect(screen.getByText('Selesai')).toBeTruthy()
  })
})

describe('Kirim: lampiran gambar (antrean #377)', () => {
  const gambar = (nama: string, type: string, ukuran: number) => new File([new Uint8Array(ukuran)], nama, { type })

  it('memilih gambar menampilkan pratinjau; Hapus lampiran membuangnya; terkirim bersama laporan dan bisa dilihat', async () => {
    auth.role = 'mahasiswa'
    tampil()
    expect(await screen.findByText('Belum ada kiriman.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Pilih gambar lampiran'), { target: { files: [gambar('layar.png', 'image/png', 2048)] } })
    expect(await screen.findByAltText('Pratinjau lampiran')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hapus lampiran' }))
    expect(screen.queryByAltText('Pratinjau lampiran')).toBeNull()

    fireEvent.change(screen.getByLabelText('Pilih gambar lampiran'), { target: { files: [gambar('layar.png', 'image/png', 2048)] } })
    await screen.findByAltText('Pratinjau lampiran')
    fireEvent.change(screen.getByLabelText('Apa sarannya?'), { target: { value: 'Ada gambar tampilan yang rusak di sini' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    expect(await screen.findByText('Terima kasih, laporanmu sudah terkirim.')).toBeTruthy()
    expect(screen.queryByAltText('Pratinjau lampiran')).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Lihat lampiran' }))
    expect(await screen.findByAltText('Lampiran laporan')).toBeTruthy()
  })

  it('gambar lebih dari 1 MB dan berkas bukan gambar ditolak dengan pesan, tanpa pratinjau', async () => {
    auth.role = 'mahasiswa'
    tampil()
    fireEvent.change(screen.getByLabelText('Pilih gambar lampiran'), { target: { files: [gambar('besar.png', 'image/png', 1024 * 1024 + 1)] } })
    expect(await screen.findByText(/Lampiran terlalu besar/)).toBeTruthy()
    expect(screen.queryByAltText('Pratinjau lampiran')).toBeNull()
    fireEvent.change(screen.getByLabelText('Pilih gambar lampiran'), { target: { files: [gambar('catatan.pdf', 'application/pdf', 100)] } })
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/harus gambar PNG, JPG, atau WebP/))
  })
})
