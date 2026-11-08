// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

afterEach(cleanup)

function Rusak({ pesan }: { pesan: string }): never {
  throw new Error(pesan)
}

describe('ErrorBoundary', () => {
  it('galat unduh paket (internet tidak stabil) tampil sebagai modal koneksi dengan tombol Coba Lagi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Rusak pesan="Failed to fetch dynamically imported module: /assets/Formatif.js" />
      </ErrorBoundary>,
    )
    const modal = screen.getByRole('alertdialog')
    expect(modal.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('Koneksi Internet Tidak Stabil')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Coba Lagi' })).toBeTruthy()
    expect(screen.getByText(/Jawaban tes yang sedang dikerjakan tersimpan/)).toBeTruthy()
  })

  it('galat kode biasa tetap tampil sebagai modal Terjadi Kesalahan', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Rusak pesan="Cannot read properties of undefined" />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Terjadi Kesalahan')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Muat Ulang' })).toBeTruthy()
  })
})
