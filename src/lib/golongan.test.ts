import { describe, it, expect } from 'vitest'
import { golonganDariSkor } from './golongan'

// Antrean #105 opsi B: batas 80 (keputusan Johan 26 Sep 2026).
describe('golonganDariSkor', () => {
  it('80 ke atas Mahir, di bawah 80 Remedial, tanpa skor Belum dipetakan', () => {
    expect(golonganDariSkor(80)).toBe('mahir')
    expect(golonganDariSkor(100)).toBe('mahir')
    expect(golonganDariSkor(79)).toBe('remedial')
    expect(golonganDariSkor(0)).toBe('remedial')
    expect(golonganDariSkor(null)).toBe('belum')
    expect(golonganDariSkor(undefined)).toBe('belum')
  })
})
