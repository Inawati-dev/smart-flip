import { describe, it, expect } from 'vitest'
import { hitungTotal, lewatTenggat, RUBRIK_BAWAAN } from './tugasAkhir'

describe('hitungTotal', () => {
  it('rata-rata berbobot dibulatkan', () => {
    const rubrik = [{ nama: 'a', bobot: 50 }, { nama: 'b', bobot: 50 }]
    expect(hitungTotal(rubrik, [80, 60])).toBe(70)
    expect(hitungTotal(RUBRIK_BAWAAN, [100, 100, 100, 100])).toBe(100)
    expect(hitungTotal([{ nama: 'a', bobot: 30 }, { nama: 'b', bobot: 10 }], [100, 0])).toBe(75)
  })
  it('null bila ada kriteria kosong atau rubrik kosong', () => {
    expect(hitungTotal([{ nama: 'a', bobot: 1 }], [null])).toBeNull()
    expect(hitungTotal([], [])).toBeNull()
    expect(hitungTotal([{ nama: 'a', bobot: 0 }], [50])).toBeNull()
  })
  it('nilai di luar 0..100 dipotong', () => {
    expect(hitungTotal([{ nama: 'a', bobot: 1 }], [150])).toBe(100)
  })
})

describe('lewatTenggat', () => {
  it('tanpa tenggat tidak pernah lewat', () => {
    expect(lewatTenggat(null)).toBe(false)
  })
  it('membandingkan dengan waktu sekarang', () => {
    const now = new Date('2026-09-16T10:00:00Z')
    expect(lewatTenggat('2026-09-15T00:00:00Z', now)).toBe(true)
    expect(lewatTenggat('2026-09-17T00:00:00Z', now)).toBe(false)
  })
})
