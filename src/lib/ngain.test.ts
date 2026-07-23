import { describe, it, expect } from 'vitest'
import { computeNGain, categorizeNGain, computeNGainDistribution, type NGainStudent } from './ngain'

// Known input/output pairs derived by hand from legacy/ngain.html's calcNGain()
// + kategori():
//   function calcNGain(pre, post, max) {
//     if (pre >= max) return 0;
//     const ng = (post - pre) / (max - pre);
//     return Math.max(-1, Math.min(1, ng)); // clamp
//   }
//   function kategori(ng) {
//     if (ng > 0.7) return 'Tinggi';
//     if (ng >= 0.3) return 'Sedang';
//     return 'Rendah';
//   }

describe('computeNGain', () => {
  it('computes g = (post - pre) / (max - pre)', () => {
    // Ahmad Rizki from legacy dummyData: (80-55)/(100-55) = 25/45 = 0.5556
    expect(computeNGain(55, 80, 100).gain).toBeCloseTo(0.5556, 4)
    // Diana Putri from legacy dummyData: (90-70)/(100-70) = 20/30 = 0.6667
    expect(computeNGain(70, 90, 100).gain).toBeCloseTo(0.6667, 4)
  })

  it('categorizes gain > 0.7 as tinggi', () => {
    // (95-50)/(100-50) = 45/50 = 0.9
    const r = computeNGain(50, 95, 100)
    expect(r.gain).toBeCloseTo(0.9, 4)
    expect(r.category).toBe('tinggi')
  })

  it('categorizes 0.3 <= gain <= 0.7 as sedang, boundaries inclusive per legacy (>0.7 / >=0.3)', () => {
    // exact boundary g = 0.7 → legacy kategori() only maps to Tinggi when g > 0.7,
    // so 0.7 itself falls into Sedang.
    expect(computeNGain(0, 70, 100).gain).toBeCloseTo(0.7, 4)
    expect(computeNGain(0, 70, 100).category).toBe('sedang')

    // exact boundary g = 0.3 → legacy kategori() maps to Sedang since g >= 0.3.
    expect(computeNGain(0, 30, 100).gain).toBeCloseTo(0.3, 4)
    expect(computeNGain(0, 30, 100).category).toBe('sedang')

    // mid-range from legacy dummyData: Eko Prasetyo (50,70,100) → 0.4
    expect(computeNGain(50, 70, 100).category).toBe('sedang')
  })

  it('categorizes gain < 0.3 as rendah', () => {
    // (55-50)/(100-50) = 5/50 = 0.1
    const r = computeNGain(50, 55, 100)
    expect(r.gain).toBeCloseTo(0.1, 4)
    expect(r.category).toBe('rendah')
  })

  it('returns gain 0 (rendah) when pre >= max, matching legacy calcNGain early return', () => {
    expect(computeNGain(100, 100, 100)).toEqual({ gain: 0, category: 'rendah' })
    expect(computeNGain(120, 150, 100)).toEqual({ gain: 0, category: 'rendah' })
  })

  it('clamps negative gain at -1 when post < pre, matching legacy Math.max(-1, ...)', () => {
    // (0-80)/(100-80) = -80/20 = -4 → clamped to -1
    const r = computeNGain(80, 0, 100)
    expect(r.gain).toBe(-1)
    expect(r.category).toBe('rendah')
  })

  it('clamps gain at 1 when post - pre already exceeds max - pre', () => {
    // (200-50)/(100-50) = 150/50 = 3 → clamped to 1
    const r = computeNGain(50, 200, 100)
    expect(r.gain).toBe(1)
    expect(r.category).toBe('tinggi')
  })
})

describe('categorizeNGain', () => {
  it('matches legacy kategori() thresholds exactly', () => {
    expect(categorizeNGain(0.71)).toBe('tinggi')
    expect(categorizeNGain(0.7)).toBe('sedang')
    expect(categorizeNGain(0.3)).toBe('sedang')
    expect(categorizeNGain(0.29)).toBe('rendah')
    expect(categorizeNGain(-1)).toBe('rendah')
  })
})

describe('computeNGainDistribution', () => {
  it('reproduces legacy hitungSemua()/showHasil() aggregation for the legacy dummyData set', () => {
    // legacy/ngain.html dummyData, all five land in "Sedang" at max=100:
    //   Ahmad Rizki  55→80  = 0.5556
    //   Budi Santoso 60→85  = 0.6250
    //   Citra Dewi   45→75  = 0.5455
    //   Diana Putri  70→90  = 0.6667
    //   Eko Prasetyo 50→70  = 0.4000
    const students: NGainStudent[] = [
      { nama: 'Ahmad Rizki', pre: 55, post: 80 },
      { nama: 'Budi Santoso', pre: 60, post: 85 },
      { nama: 'Citra Dewi', pre: 45, post: 75 },
      { nama: 'Diana Putri', pre: 70, post: 90 },
      { nama: 'Eko Prasetyo', pre: 50, post: 70 },
    ]
    const results = students.map((s) => computeNGain(s.pre, s.post, 100))
    const dist = computeNGainDistribution(results)

    expect(dist.total).toBe(5)
    expect(dist.tinggi).toBe(0)
    expect(dist.sedang).toBe(5)
    expect(dist.rendah).toBe(0)
    // average of the five gains above ≈ 0.55854
    expect(dist.average).toBeCloseTo(0.55854, 4)
    expect(dist.category).toBe('sedang')
  })

  it('returns average 0 / category rendah for an empty result set (no divide-by-zero)', () => {
    const dist = computeNGainDistribution([])
    expect(dist).toEqual({ average: 0, category: 'rendah', tinggi: 0, sedang: 0, rendah: 0, total: 0 })
  })

  it('splits a mixed set into all three categories correctly', () => {
    const results = [
      computeNGain(50, 95, 100), // 0.9 tinggi
      computeNGain(0, 50, 100), // 0.5 sedang
      computeNGain(50, 55, 100), // 0.1 rendah
    ]
    const dist = computeNGainDistribution(results)
    expect(dist).toMatchObject({ total: 3, tinggi: 1, sedang: 1, rendah: 1 })
  })
})
