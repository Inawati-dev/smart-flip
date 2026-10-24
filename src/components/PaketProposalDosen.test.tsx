// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AktivitasBaris, RubrikBaris } from './PaketProposalDosen'

afterEach(cleanup)

describe('baris lipat paket proposal', () => {
  it('rubrik menampilkan jumlah kriteria, total bobot, dan ikon', () => {
    const { container } = render(
      <RubrikBaris judul="Bab 1" rubric={[{ nama: 'A', bobot: 60 }, { nama: 'B', ukur: 'x', bobot: 40 }]} />,
    )
    expect(screen.getByText('2 kriteria · 100')).toBeTruthy()
    expect(container.querySelector('summary svg[aria-hidden="true"]')).toBeTruthy()
  })
  it('aktivitas menampilkan jumlah langkah dan nomor', () => {
    render(<AktivitasBaris judul="Topik 1" langkah={['satu', 'dua']} />)
    expect(screen.getByText('2 langkah')).toBeTruthy()
    expect(screen.getByText('dua')).toBeTruthy()
  })
})
