import { describe, it, expect } from 'vitest'
import { mingguBawaan, awalMinggu, jadwalTopik } from './jadwal'

const iso = (t: Date) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`

// Antrean #153: dua minggu per topik, minggu 7 dan 8 dilewati.
describe('jadwal', () => {
  it('minggu bawaan enam topik: 1, 3, 5, 9, 11, 13', () => {
    expect([0, 1, 2, 3, 4, 5].map(mingguBawaan)).toEqual([1, 3, 5, 9, 11, 13])
  })

  it('awal minggu dihitung dari tanggal mulai, lintas bulan', () => {
    expect(iso(awalMinggu('2026-10-12', 1))).toBe('2026-10-12')
    expect(iso(awalMinggu('2026-10-12', 2))).toBe('2026-10-19')
    expect(iso(awalMinggu('2026-10-12', 4))).toBe('2026-11-02')
  })

  it('tanpa tanggal mulai tidak ada jadwal', () => {
    expect(jadwalTopik(null, [{ id: 1 }])).toBeNull()
    expect(jadwalTopik('', [{ id: 1 }])).toBeNull()
  })

  it('tes formatif dibuka seminggu sesudah materi; minggu yang diisi dosen menang', () => {
    const j = jadwalTopik('2026-10-12', [{ id: 10 }, { id: 20, minggu_mulai: 4 }, { id: 30, minggu_mulai: null }])!
    expect([j.get(10)!.minggu, iso(j.get(10)!.materi), iso(j.get(10)!.formatif)]).toEqual([1, '2026-10-12', '2026-10-19'])
    expect([j.get(20)!.minggu, iso(j.get(20)!.materi), iso(j.get(20)!.formatif)]).toEqual([4, '2026-11-02', '2026-11-09'])
    expect(j.get(30)!.minggu).toBe(5)
  })
})
