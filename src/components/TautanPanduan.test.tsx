// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import skrip from '../../docs/panduan-smartflip/buat-pdf.py?raw'

afterEach(cleanup)

vi.mock('./PembacaPdf', () => ({
  PembacaPdf: ({ src, aksi }: { src: string; aksi: React.ReactNode }) => (
    <div data-testid="pembaca" data-src={src}>
      {aksi}
    </div>
  ),
}))

import { TautanPanduan, ALAMAT_PANDUAN, EDISI_PANDUAN } from './TautanPanduan'

describe('TautanPanduan (antrean #290)', () => {
  it('menautkan unduhan ke PDF panduan di public/', () => {
    render(<TautanPanduan />)
    const unduh = screen.getByRole('link', { name: /Unduh PDF/ })
    expect(unduh.getAttribute('href')).toBe('/panduan-smartflip.pdf')
    expect(unduh.hasAttribute('download')).toBe(true)
  })

  it('Baca Panduan membuka pembaca PDF dan Tutup menutupnya', () => {
    render(<TautanPanduan />)
    fireEvent.click(screen.getByRole('button', { name: /Baca Panduan/ }))
    expect(screen.getByTestId('pembaca').getAttribute('data-src')).toBe(ALAMAT_PANDUAN)
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(screen.queryByTestId('pembaca')).toBeNull()
  })

  it('edisi sama dengan yang ditulis penyusun PDF', () => {
    const edisi = skrip.match(/^EDISI = '(.+)'$/m)?.[1]
    expect(edisi).toBeTruthy()
    expect(EDISI_PANDUAN.startsWith(edisi!)).toBe(true)
  })
})
