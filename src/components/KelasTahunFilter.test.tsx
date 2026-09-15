// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { KelasTahunFilter } from './KelasTahunFilter'
import type { FilterTahunKelas } from '../lib/kelas'

afterEach(cleanup)

const KELAS = [
  { name: 'Kelas A', angkatan: 2024 },
  { name: 'Kelas A', angkatan: 2025 },
  { name: 'Kelas B', angkatan: 2026 },
  { name: 'Kelas D', angkatan: 2026 },
]

function Controlled({ onChange }: { onChange?: (f: FilterTahunKelas) => void }) {
  const [filter, setFilter] = useState<FilterTahunKelas>({ tahun: null, kelas: null })
  return (
    <KelasTahunFilter
      kelasList={KELAS}
      tahun={filter.tahun}
      kelas={filter.kelas}
      onChange={(f) => {
        setFilter(f)
        onChange?.(f)
      }}
    />
  )
}

describe('KelasTahunFilter', () => {
  it('renders two comboboxes: tahun and kelas', () => {
    render(<Controlled />)
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes).toHaveLength(2)
  })

  it('kelas options list every unique nama across all years when tahun belum dipilih', () => {
    render(<Controlled />)
    const [, kelasTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(kelasTrigger)
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Semua kelas', 'Kelas A', 'Kelas B', 'Kelas D'])
  })

  it('changing tahun narrows kelas options to that year only', () => {
    render(<Controlled />)
    const [tahunTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(tahunTrigger)
    fireEvent.click(screen.getByText('2026'))

    const [, kelasTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(kelasTrigger)
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Semua kelas', 'Kelas B', 'Kelas D'])
  })

  it('changing tahun away from a year that had the selected kelas clears the kelas filter', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)

    // Pilih tahun 2024 dulu, lalu kelas "Kelas A" (satu-satunya opsi selain "Semua kelas").
    const [tahunTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(tahunTrigger)
    fireEvent.click(screen.getByText('2024'))

    const [, kelasTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(kelasTrigger)
    fireEvent.click(screen.getByText('Kelas A'))
    expect(onChange).toHaveBeenLastCalledWith({ tahun: 2024, kelas: 'Kelas A' })

    // Ganti tahun ke 2026, di mana "Kelas A" tidak ada -> kelas kembali null.
    const [tahunTrigger2] = screen.getAllByRole('combobox')
    fireEvent.click(tahunTrigger2)
    fireEvent.click(screen.getByText('2026'))
    expect(onChange).toHaveBeenLastCalledWith({ tahun: 2026, kelas: null })
  })

  it('changing tahun to a different year that still has the selected kelas keeps it', () => {
    const onChange = vi.fn()
    render(<Controlled onChange={onChange} />)

    // "Kelas A" exists in both 2024 and 2025 (see KELAS above).
    const [tahunTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(tahunTrigger)
    fireEvent.click(screen.getByText('2024'))
    const [, kelasTrigger] = screen.getAllByRole('combobox')
    fireEvent.click(kelasTrigger)
    fireEvent.click(screen.getByText('Kelas A'))
    expect(onChange).toHaveBeenLastCalledWith({ tahun: 2024, kelas: 'Kelas A' })

    const [tahunTrigger2] = screen.getAllByRole('combobox')
    fireEvent.click(tahunTrigger2)
    fireEvent.click(screen.getByText('2025'))
    expect(onChange).toHaveBeenLastCalledWith({ tahun: 2025, kelas: 'Kelas A' })
  })
})
