import { describe, it, expect } from 'vitest'
import { hitungPeningkatanKelas, rekapPerModul, pakaiFormatifSebagaiPost, type AsesmenAttempt } from './asesmen'

describe('hitungPeningkatanKelas', () => {
  it('pre 55/post 78 → gain 0,51 kategori sedang', () => {
    const r = hitungPeningkatanKelas([{ userId: 'u1', nama: 'Ani', kelasId: 'A', pre: 55, post: 78 }])
    const m = r.perMahasiswa[0]
    expect(m.peningkatan).toBeCloseTo(0.5111, 3)
    expect(m.kategori).toBe('sedang')
  })

  it('pre 100 dilewati dari rata-rata kelas (bukan dihitung 0)', () => {
    const r = hitungPeningkatanKelas([{ userId: 'u1', nama: 'Budi', kelasId: 'A', pre: 100, post: 100 }])
    const m = r.perMahasiswa[0]
    expect(m.peningkatan).toBeNull()
    expect(m.kategori).toBeNull()
    expect(r.rataPeningkatan).toBeNull()
    expect(r.sebaran).toEqual({ tinggi: 0, sedang: 0, rendah: 0 })
  })

  it('mahasiswa tanpa post-test tampil "—" (peningkatan null)', () => {
    const r = hitungPeningkatanKelas([{ userId: 'u1', nama: 'Citra', kelasId: 'A', pre: 60 }])
    const m = r.perMahasiswa[0]
    expect(m.pre).toBe(60)
    expect(m.post).toBeNull()
    expect(m.peningkatan).toBeNull()
    expect(m.kategori).toBeNull()
  })

  it('rata-rata kelas dari 3 mahasiswa: rata-rata pre/post/peningkatan dan sebaran kategori', () => {
    const r = hitungPeningkatanKelas([
      { userId: 'u1', nama: 'Ani', kelasId: 'A', pre: 50, post: 95 }, // gain 0.9 tinggi
      { userId: 'u2', nama: 'Budi', kelasId: 'A', pre: 55, post: 78 }, // gain ~0.51 sedang
      { userId: 'u3', nama: 'Citra', kelasId: 'A', pre: 60, post: 65 }, // gain 0.125 rendah
    ])
    expect(r.rataPre).toBeCloseTo((50 + 55 + 60) / 3, 4)
    expect(r.rataPost).toBeCloseTo((95 + 78 + 65) / 3, 4)
    expect(r.rataPeningkatan).toBeCloseTo((0.9 + 0.5111 + 0.125) / 3, 3)
    expect(r.sebaran).toEqual({ tinggi: 1, sedang: 1, rendah: 1 })
  })
})

describe('rekapPerModul', () => {
  const rows: AsesmenAttempt[] = [
    { id: 1, userId: 'u1', nama: 'Ani', kelas: 'A', moduleId: 1, modulJudul: 'Modul 1', score: 80, passed: true, attemptedAt: '2026-09-01' },
    { id: 2, userId: 'u2', nama: 'Budi', kelas: 'A', moduleId: 1, modulJudul: 'Modul 1', score: 79, passed: false, attemptedAt: '2026-09-02' },
  ]

  // Antrean #136: lulus dihitung dari skor terhadap batas mata kuliah, bukan kolom `passed`.
  it('ambang lulus mengikuti batas yang diberikan, bawaan 70', () => {
    expect(rekapPerModul(rows)[0].lulus).toBe(2)
    const rekap = rekapPerModul(rows, 80)
    expect(rekap[0].lulus).toBe(1)
    expect(rekap[0].persenLulus).toBe(50)
  })
})

// Antrean #172: tes formatif menggantikan post-test sebagai pembanding tes diagnostik.
describe('pakaiFormatifSebagaiPost', () => {
  const f = (userId: string, moduleId: number, score: number, nama = userId, kelas: string | null = 'A') => ({ userId, nama, kelas, moduleId, score })

  it('pembanding = rata-rata skor terbaik tiap topik yang dikerjakan', () => {
    const hasil = pakaiFormatifSebagaiPost(
      [{ userId: 'u1', nama: 'Ani', kelasId: 'A', pre: 40 }],
      [f('u1', 1, 50), f('u1', 1, 90), f('u1', 2, 70)],
    )
    expect(hasil).toEqual([{ userId: 'u1', nama: 'Ani', kelasId: 'A', pre: 40, post: 80 }])
    const kelas = hitungPeningkatanKelas(hasil)
    expect(kelas.rataPost).toBe(80)
    expect(kelas.perMahasiswa[0].peningkatan).toBeCloseTo((80 - 40) / (100 - 40), 5)
  })

  it('post-test lama diabaikan; tanpa tes formatif pembandingnya kosong', () => {
    const hasil = pakaiFormatifSebagaiPost([{ userId: 'u1', nama: 'Ani', kelasId: 'A', pre: 40, post: 95 }], [])
    expect(hasil[0].post).toBeUndefined()
    expect(hitungPeningkatanKelas(hasil).perMahasiswa[0].peningkatan).toBeNull()
  })

  it('mahasiswa dengan tes formatif tetapi tanpa tes diagnostik tetap muncul, tanpa angka peningkatan', () => {
    const hasil = pakaiFormatifSebagaiPost([], [f('u2', 3, 65, 'Budi', 'B')])
    expect(hasil).toEqual([{ userId: 'u2', nama: 'Budi', kelasId: 'B', pre: undefined, post: 65 }])
    expect(hitungPeningkatanKelas(hasil).perMahasiswa[0].peningkatan).toBeNull()
  })
})
