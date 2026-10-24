import { describe, it, expect } from 'vitest'
import { mingguBawaan, awalMinggu, jadwalTopik, labelPertemuan, mingguDariTanggal } from './jadwal'

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

// Antrean #273: label kartu mengikuti jadwal, bukan nomor urut topik.
describe('labelPertemuan', () => {
  it('bawaan melewati minggu 7 dan 8', () => {
    expect(labelPertemuan(0)).toBe('Pertemuan 1-2')
    expect(labelPertemuan(2)).toBe('Pertemuan 5-6')
    expect(labelPertemuan(3)).toBe('Pertemuan 9-10')
    expect(labelPertemuan(5)).toBe('Pertemuan 13-14')
  })
  it('minggu yang diatur dosen menang atas bawaan', () => {
    expect(labelPertemuan(3, 4)).toBe('Pertemuan 4-5')
    expect(labelPertemuan(3, null)).toBe('Pertemuan 9-10')
  })
})

// Antrean #309: tanggal buka yang diisi sendiri menang atas hitungan minggu.
describe('tanggal_buka', () => {
  it('menang atas minggu, formatif +7 hari, minggu turunan dari tanggal mulai', () => {
    const j = jadwalTopik('2026-10-12', [{ id: 1 }, { id: 2, minggu_mulai: 4, tanggal_buka: '2026-11-04' }])!
    const t = j.get(2)!
    expect([iso(t.materi), iso(t.formatif), t.minggu]).toEqual(['2026-11-04', '2026-11-11', 4])
    expect(j.get(1)!.minggu).toBe(1)
  })
  it('mingguDariTanggal: batas minggu dan minimal 1', () => {
    expect(mingguDariTanggal('2026-10-12', '2026-10-18')).toBe(1)
    expect(mingguDariTanggal('2026-10-12', '2026-10-19')).toBe(2)
    expect(mingguDariTanggal('2026-10-12', '2026-09-01')).toBe(1)
  })
  it('tanpa tanggal mulai hanya topik ber-tanggal sendiri yang punya jadwal', () => {
    const j = jadwalTopik(null, [{ id: 1 }, { id: 2, tanggal_buka: '2026-11-04' }])!
    expect(j.has(1)).toBe(false)
    expect(iso(j.get(2)!.materi)).toBe('2026-11-04')
    expect(jadwalTopik(null, [{ id: 1, tanggal_buka: null }])).toBeNull()
  })
})
