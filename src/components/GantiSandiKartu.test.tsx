// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

const h = vi.hoisted(() => ({ updateUser: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { updateUser: (a: unknown) => h.updateUser(a) } },
}))

import { GantiSandiKartu, galatSandiBaru, pesanGalatSandi } from './GantiSandiKartu'

describe('galatSandiBaru', () => {
  it('menolak kurang dari 8, hanya spasi, lebih dari 72 byte, dan isian tidak sama', () => {
    expect(galatSandiBaru('pendek7', 'pendek7')).toMatch(/minimal 8/)
    expect(galatSandiBaru('        ', '        ')).toMatch(/hanya spasi/)
    expect(galatSandiBaru('a'.repeat(73), 'a'.repeat(73))).toMatch(/terlalu panjang/)
    expect(galatSandiBaru('é'.repeat(37), 'é'.repeat(37))).toMatch(/72 byte/) // 37 huruf beraksen = 74 byte
    expect(galatSandiBaru('abcde   ', 'abcde   ')).toBe('') // 8 karakter, bukan hanya spasi
    expect(galatSandiBaru('sandi-baru-1', 'sandi-baru-2')).toMatch(/belum sama/)
    expect(galatSandiBaru('sandi-baru-1', 'sandi-baru-1')).toBe('')
  })
})

describe('pesanGalatSandi', () => {
  it('menerjemahkan galat Supabase Auth yang umum', () => {
    expect(pesanGalatSandi({ code: 'same_password', message: 'New password should be different from the old password.' })).toMatch(/sama dengan yang lama/)
    expect(pesanGalatSandi(new Error('Auth session missing!'))).toMatch(/Sesi masuk/)
    expect(pesanGalatSandi(new TypeError('Failed to fetch'))).toMatch(/koneksi/)
  })
})

describe('GantiSandiKartu', () => {
  beforeEach(() => h.updateUser.mockReset())
  afterEach(cleanup)

  it('membuka modal, menyimpan lewat updateUser, lalu menampilkan pesan berhasil', async () => {
    h.updateUser.mockResolvedValue({ error: null })
    const { container } = render(<GantiSandiKartu />)
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Kata Sandi' }))
    const isian = container.querySelectorAll('input')
    fireEvent.change(isian[0], { target: { value: 'sandi-baru-1' } })
    fireEvent.change(isian[1], { target: { value: 'sandi-baru-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(screen.getByText(/sudah disimpan/)).toBeTruthy())
    expect(h.updateUser).toHaveBeenCalledWith({ password: 'sandi-baru-1' })
  })

  it('tidak memanggil updateUser bila kedua isian berbeda', () => {
    const { container } = render(<GantiSandiKartu />)
    fireEvent.click(screen.getByRole('button', { name: 'Ganti Kata Sandi' }))
    const isian = container.querySelectorAll('input')
    fireEvent.change(isian[0], { target: { value: 'sandi-baru-1' } })
    fireEvent.change(isian[1], { target: { value: 'sandi-baru-9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByRole('alert').textContent).toMatch(/belum sama/)
    expect(h.updateUser).not.toHaveBeenCalled()
  })
})
