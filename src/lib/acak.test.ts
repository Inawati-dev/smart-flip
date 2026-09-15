import { describe, it, expect } from 'vitest'
import { shuffle, acakSoal, nilai } from './acak'
import type { KuisSoal } from './kuisSoal'

// rng deterministik (mulberry32) — sama seed selalu menghasilkan urutan sama,
// jadi tesnya tidak flaky seperti Math.random().
function mulberry32(seed: number): () => number {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function soal(n: number): KuisSoal[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    kind: 'formatif' as const,
    module_id: 1,
    question: `Soal ${i + 1}`,
    options: ['A benar', 'B', 'C', 'D'],
    answer_idx: 0,
    explanation: null,
    order_num: i + 1,
  }))
}

describe('shuffle', () => {
  it('mengembalikan permutasi (elemen sama) dengan rng deterministik', () => {
    const rng = mulberry32(42)
    const result = shuffle([1, 2, 3, 4, 5], rng)
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('acakSoal', () => {
  it('kunci tetap menunjuk jawaban benar sesudah opsi diacak (rng deterministik)', () => {
    const rng = mulberry32(7)
    const { tampil, urut } = acakSoal(soal(5), rng)
    expect(urut).toHaveLength(5)
    for (const s of tampil) {
      expect(s.kunciTampil).not.toBeNull()
      expect(s.options[s.kunciTampil as number]).toBe('A benar')
    }
  })

  it('urut panjangnya = jumlah soal', () => {
    const rng = mulberry32(3)
    const { urut } = acakSoal(soal(9), rng)
    expect(urut).toHaveLength(9)
  })
})

describe('nilai', () => {
  it('skor 4/5 benar = 80, 3/5 benar = 60', () => {
    const rng = mulberry32(2)
    const { tampil } = acakSoal(soal(5), rng)
    const semuaBenar = tampil.map((s) => s.kunciTampil as number)

    const empatBenar = [...semuaBenar]
    empatBenar[4] = (empatBenar[4] + 1) % 4
    expect(nilai(tampil, empatBenar)).toEqual({ benar: 4, total: 5, score: 80 })

    const tigaBenar = [...empatBenar]
    tigaBenar[3] = (tigaBenar[3] + 1) % 4
    expect(nilai(tampil, tigaBenar)).toEqual({ benar: 3, total: 5, score: 60 })
  })
})
