// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { UrutkanTopikModal, pindahUrutan } from './UrutkanTopik'
import type { ModuleRow } from '../lib/modules'

afterEach(cleanup)

const MODULES = [
  { id: 1, order_num: 1, title: 'Satu' },
  { id: 2, order_num: 2, title: 'Dua' },
  { id: 3, order_num: 3, title: 'Tiga' },
] as ModuleRow[]

describe('pindahUrutan', () => {
  it('moves an id to the target position', () => {
    expect(pindahUrutan([1, 2, 3], 1, 3)).toEqual([2, 3, 1])
    expect(pindahUrutan([1, 2, 3], 3, 1)).toEqual([3, 1, 2])
    expect(pindahUrutan([1, 2, 3], 2, 2)).toEqual([1, 2, 3])
  })
})

// Antrean #104 opsi C: modal daftar tegak, panah naik/turun, Simpan mengirim urutan id.
describe('UrutkanTopikModal', () => {
  it('arrow down then Simpan calls onSimpan with the swapped order', async () => {
    const onSimpan = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<UrutkanTopikModal open modules={MODULES} onClose={onClose} onSimpan={onSimpan} />)
    fireEvent.click(screen.getByLabelText('Turunkan Satu'))
    fireEvent.click(screen.getByText('Simpan Urutan'))
    await waitFor(() => expect(onSimpan).toHaveBeenCalledWith([2, 1, 3]))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  // Antrean #167: klik di luar kartu tidak boleh menutup modal; hanya Batal yang menutup.
  it('klik latar tidak menutup modal, tombol Batal menutup', () => {
    const onClose = vi.fn()
    render(<UrutkanTopikModal open modules={MODULES} onClose={onClose} onSimpan={async () => {}} />)
    const latar = screen.getByRole('dialog').parentElement!
    fireEvent.click(latar)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Batal'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('first row cannot go up, last row cannot go down', () => {
    render(<UrutkanTopikModal open modules={MODULES} onClose={() => {}} onSimpan={async () => {}} />)
    expect((screen.getByLabelText('Naikkan Satu') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Turunkan Tiga') as HTMLButtonElement).disabled).toBe(true)
  })
})
