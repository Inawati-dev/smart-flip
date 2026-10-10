// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AktivitasMandiriPanel } from './AktivitasMandiriPanel'

const pasang = (nomor: number, peran: string) =>
  render(
    <MemoryRouter>
      <AktivitasMandiriPanel nomorTopik={nomor} judulTopik="Judul" peran={peran} />
    </MemoryRouter>,
  )

describe('AktivitasMandiriPanel', () => {
  afterEach(cleanup)

  it('Topik 2 menampilkan enam langkah dan Mini Projek Bab 1', () => {
    pasang(2, 'mahasiswa')
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getByText('Mini Projek Bab 1 · Pendahuluan')).toBeTruthy()
    expect(document.getElementById('aktivitas-mandiri')).toBeTruthy()
  })

  it('mahasiswa melihat tombol ke /mini-projek, dosen tidak', () => {
    const { unmount } = pasang(2, 'mahasiswa')
    expect(screen.getByRole('link', { name: 'Buka Mini Projek Bab 1' }).getAttribute('href')).toBe('/mini-projek')
    unmount()
    pasang(2, 'dosen')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('topik 7 tidak merender apa pun', () => {
    const { container } = pasang(7, 'mahasiswa')
    expect(container.innerHTML).toBe('')
  })
})
