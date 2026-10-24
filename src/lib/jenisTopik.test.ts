import { describe, it, expect } from 'vitest'
import { indeksJadwal, labelNomor, nomorBab, nomorBabDi, babSaja } from './jenisTopik'
import { mingguBawaan } from './jadwal'

// Antrean #321: Pendahuluan (bagian) + Bab 1-6 + Penutup (bagian).
const urut = [
  { id: 10, jenis: 'bagian' },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: n, jenis: 'bab' })),
  { id: 20, jenis: 'bagian' },
]

describe('jenis topik Bab/Bagian', () => {
  it('nomor Bab melewati Bagian', () => {
    expect(nomorBab(urut, 10)).toBeNull()
    expect(nomorBab(urut, 1)).toBe(1)
    expect(nomorBab(urut, 6)).toBe(6)
    expect(nomorBab(urut, 20)).toBeNull()
    expect(babSaja(urut).map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6])
  })
  it('label kartu: Bagian I, Topik 01-06, Bagian III', () => {
    expect(urut.map((_, i) => labelNomor(urut, i))).toEqual(['Bagian I', 'Topik 01', 'Topik 02', 'Topik 03', 'Topik 04', 'Topik 05', 'Topik 06', 'Bagian III'])
  })
  it('jadwal bawaan: Bagian ikut bab tetangga, Penutup tidak melewati 16 pertemuan', () => {
    const minggu = urut.map((_, i) => mingguBawaan(indeksJadwal(urut, i)))
    expect(minggu).toEqual([1, 1, 3, 5, 9, 11, 13, 13])
    expect(Math.max(...minggu) + 1).toBeLessThanOrEqual(16)
  })
  it('tanpa kolom jenis (sebelum migrasi v54) semua dianggap Bab, sama dengan perilaku lama', () => {
    const lama = [{ id: 1 }, { id: 2 }, { id: 3 }]
    expect(lama.map((_, i) => indeksJadwal(lama, i))).toEqual([0, 1, 2])
    expect(nomorBabDi(lama, 2)).toBe(3)
    expect(labelNomor(lama, 0)).toBe('Topik 01')
  })
})
