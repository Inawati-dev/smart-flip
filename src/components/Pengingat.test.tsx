// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IngatkanModal } from './Pengingat'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'dosen-1' } }) }))

afterEach(cleanup)
beforeEach(() => localStorage.clear())

function tampil(sasaran: Array<{ userId: string; nama: string; keterangan: string }>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <IngatkanModal sasaran={sasaran} mataKuliah="Metodologi" onClose={() => {}} />
    </QueryClientProvider>,
  )
}

describe('IngatkanModal', () => {
  it('menampilkan contoh pesan berisi nama dan alasan, lalu melaporkan hasil kirim', async () => {
    tampil([{ userId: 'm1', nama: 'Budi', keterangan: 'Belum tes diagnostik awal' }])
    expect(screen.getByRole('dialog', { name: 'Ingatkan Budi' })).toBeTruthy()
    expect(screen.getByText(/Halo Budi,/).textContent).toContain('Catatan: Belum tes diagnostik awal')
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengingat' }))
    expect(await screen.findByText('Terkirim ke 1 mahasiswa.')).toBeTruthy()
  })

  it('kiriman kedua dalam 24 jam menyebut nama yang gagal', async () => {
    const s = [{ userId: 'm1', nama: 'Budi', keterangan: 'x' }, { userId: 'm2', nama: 'Sari', keterangan: 'y' }]
    tampil([s[0]])
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengingat' }))
    await screen.findByText('Terkirim ke 1 mahasiswa.')
    cleanup()
    tampil(s)
    expect(screen.getByRole('dialog', { name: 'Ingatkan 2 mahasiswa' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengingat' }))
    expect(await screen.findByText(/Gagal untuk Budi\./)).toBeTruthy()
    expect(screen.getByText('Terkirim ke 1 mahasiswa.')).toBeTruthy()
  })

  it('tombol kirim mati bila pesan dikosongkan', () => {
    tampil([{ userId: 'm1', nama: 'Budi', keterangan: 'x' }])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    expect((screen.getByRole('button', { name: 'Kirim Pengingat' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
