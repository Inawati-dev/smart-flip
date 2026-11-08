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
  it('skala tetap 0..100: nilai 25 hanya 25 persen lebar, ambang 70 di dalam jalur', () => {
    const { container } = render(<GrafikBatang data={[{ label: 'Topik', value: 25 }]} ambang={70} ariaLabel="x" />)
    expect((container.querySelector('[data-batang]') as HTMLElement).style.width).toBe('25%')
    expect((container.querySelector('[data-ambang]') as HTMLElement).style.left).toBe('70%')
  })

  it('render 3 batang untuk 3 data', () => {
    const { container } = render(<GrafikBatang data={DATA} ariaLabel="Rata-rata per topik" />)
    expect(container.querySelectorAll('[data-batang]').length).toBe(3)
  })

  it('menampilkan garis ambang saat ambang diberi', () => {
    const { container } = render(<GrafikBatang data={DATA} ambang={80} ambangLabel="Lulus 80" ariaLabel="Rata-rata per topik" />)
    expect(container.querySelectorAll('[data-ambang]').length).toBe(3)
  })

  it('tidak ada garis ambang saat ambang tidak diberi', () => {
    const { container } = render(<GrafikBatang data={DATA} ariaLabel="Rata-rata per topik" />)
    expect(container.querySelector('[data-ambang]')).toBeFalsy()
  })

  it('data kosong menampilkan pesan "Belum ada data"', () => {
    const { getByText } = render(<GrafikBatang data={[]} ariaLabel="Rata-rata per topik" />)
    expect(getByText('Belum ada data')).toBeTruthy()
  })
})
