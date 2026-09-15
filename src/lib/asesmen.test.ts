import { describe, it, expect } from 'vitest'
import { hitungPeningkatanKelas, rekapPerModul, buildAsesmenCsv, type AsesmenAttempt } from './asesmen'

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

  it('ambang lulus mengikuti kolom `passed` dari DB (>=80), bukan angka 60', () => {
    const rekap = rekapPerModul(rows)
    expect(rekap[0].lulus).toBe(1)
    expect(rekap[0].persenLulus).toBe(50)
  })
})

describe('buildAsesmenCsv', () => {
  it('menggabungkan tabel per mahasiswa dan tabel formatif per modul, dipisah baris kosong', () => {
    const csv = buildAsesmenCsv(
      [{ userId: 'u1', nama: 'Ani', kelasId: 'A', pre: 55, post: 78, peningkatan: 0.5111, kategori: 'sedang' }],
      [{ moduleId: 1, judul: 'Modul 1', jumlahPengerjaan: 2, jumlahMahasiswa: 2, rataRata: 80, tertinggi: 90, terendah: 70, lulus: 1, persenLulus: 50 }],
    )
    expect(csv).toContain('Nama,Kelas,Pre-test,Post-test,Peningkatan Skor,Kategori')
    expect(csv).toContain('Modul,Pengerjaan,Mahasiswa,Rata-rata,Tertinggi,Terendah,% Lulus')
    expect(csv.split('\n\n').length).toBeGreaterThan(1)
  })
})
