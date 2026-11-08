// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { KartuUmpanBalik, kunciUmpanDilihat } from './KartuUmpanBalik'

const kiriman = { id: 'k1', feedback: 'Rumusan masalah sudah jelas.\nPerbaiki tinjauan pustaka.', total: 82, graded_at: '2026-11-07T03:00:00.000Z' }

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('KartuUmpanBalik', () => {
  it('menampilkan nilai, catatan dengan baris baru, waktu dinilai, dan lencana Baru pada kunjungan pertama', () => {
    render(<KartuUmpanBalik kiriman={kiriman} />)
    expect(screen.getByRole('region', { name: 'Umpan balik dosen' })).toBeTruthy()
    expect(screen.getByText('Nilai 82')).toBeTruthy()
    expect(screen.getByText(/Perbaiki tinjauan pustaka/).textContent).toContain('Rumusan masalah sudah jelas.')
    expect(screen.getByText(/Dinilai /)).toBeTruthy()
    expect(screen.getByText('Baru')).toBeTruthy()
  })

  it('sesudah tampil 4 detik ditandai dilihat; kunjungan berikutnya tanpa lencana', () => {
    const { unmount } = render(<KartuUmpanBalik kiriman={kiriman} />)
    act(() => {
      vi.advanceTimersByTime(4100)
    })
    expect(localStorage.getItem(kunciUmpanDilihat('k1'))).toBe('1')
    unmount()
    render(<KartuUmpanBalik kiriman={kiriman} />)
    expect(screen.queryByText('Baru')).toBeNull()
  })

  it('tanpa catatan dan tanpa nilai: pesan pengganti, tidak ada "Nilai"', () => {
    render(<KartuUmpanBalik kiriman={{ id: 'k2', feedback: '  ', total: null, graded_at: null }} />)
    expect(screen.getByText('Dosen belum menulis catatan untuk kiriman ini.')).toBeTruthy()
    expect(screen.queryByText(/^Nilai /)).toBeNull()
    expect(screen.queryByText(/Dinilai /)).toBeNull()
  })
})
