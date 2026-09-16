// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { GrafikBatang } from './GrafikBatang'

afterEach(cleanup)

const DATA = [
  { label: 'Topik 1', value: 70 },
  { label: 'Topik 2', value: 85 },
  { label: 'Topik 3', value: 90 },
]

describe('GrafikBatang', () => {
  it('render 3 batang untuk 3 data', () => {
    const { container } = render(<GrafikBatang data={DATA} ariaLabel="Rata-rata per topik" />)
    expect(container.querySelectorAll('rect').length).toBe(3)
  })

  it('menampilkan garis ambang saat ambang diberi', () => {
    const { container } = render(<GrafikBatang data={DATA} ambang={80} ambangLabel="Lulus 80" ariaLabel="Rata-rata per topik" />)
    expect(container.querySelector('line')).toBeTruthy()
  })

  it('tidak ada garis ambang saat ambang tidak diberi', () => {
    const { container } = render(<GrafikBatang data={DATA} ariaLabel="Rata-rata per topik" />)
    expect(container.querySelector('line')).toBeFalsy()
  })

  it('data kosong menampilkan pesan "Belum ada data"', () => {
    const { getByText } = render(<GrafikBatang data={[]} ariaLabel="Rata-rata per topik" />)
    expect(getByText('Belum ada data')).toBeTruthy()
  })
})
