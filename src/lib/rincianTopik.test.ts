import { describe, it, expect } from 'vitest'
import { rincianDariBenar, rincianDariPercobaan } from './rincianTopik'

const soal = [
  { id: 1, answer_idx: 0, topik_id: 10 },
  { id: 2, answer_idx: 2, topik_id: 10 },
  { id: 3, answer_idx: 1, topik_id: 20 },
  { id: 4, answer_idx: 3 }, // tanpa tanda topik
]

describe('rincian benar per topik (antrean #142 opsi B)', () => {
  it('mengelompokkan per topik; soal tanpa tanda masuk kelompok null', () => {
    const r = rincianDariBenar(soal, new Map([[1, true], [2, false], [3, true], [4, true]]))
    expect(r).toEqual([
      { topikId: 10, benar: 1, total: 2 },
      { topikId: 20, benar: 1, total: 1 },
      { topikId: null, benar: 1, total: 1 },
    ])
  })

  it('percobaan tersimpan: jawaban dibaca lewat urutan opsi yang diacak', () => {
    // Soal 2 tampil dulu dengan opsi diacak [2,0,1,3]: memilih posisi 0 = opsi asli 2 = benar.
    // Soal 1 opsi [1,0,2,3]: memilih posisi 0 = opsi asli 1 = salah. Soal 3 tidak dijawab (-1).
    const urut = [
      { question_id: 2, option_order: [2, 0, 1, 3] },
      { question_id: 1, option_order: [1, 0, 2, 3] },
      { question_id: 3, option_order: [0, 1, 2, 3] },
    ]
    expect(rincianDariPercobaan(soal, [0, 0, -1], urut)).toEqual([
      { topikId: 10, benar: 1, total: 2 },
      { topikId: 20, benar: 0, total: 1 },
    ])
  })

  it('bentuk data lama atau soal yang sudah dihapus tidak melempar galat', () => {
    expect(rincianDariPercobaan(soal, null, null)).toBeNull()
    expect(rincianDariPercobaan(soal, [0], [{ question_id: 999, option_order: [0, 1] }])).toBeNull()
  })
})
