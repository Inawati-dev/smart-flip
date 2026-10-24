// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { bacaBarisSoal, buatTemplat, bacaBerkasXlsx, kepalaTemplat } from './imporSoal'

const BAB = [
  { id: 11, title: 'Konsep Dasar dan Paradigma Penelitian' },
  { id: 12, title: 'Rumusan Masalah' },
]

describe('bacaBarisSoal (antrean #329)', () => {
  it('memisahkan baris sah dan galat dengan nomor baris Excel', () => {
    const { sah, galat } = bacaBarisSoal(
      [
        kepalaTemplat(true),
        ['Apa itu R&D?', 'a', 'b', 'c', 'd', 'c', '', 'Bab 2'],
        [],
        ['', 'a', '', 'c', 'd', 'E', '', ''],
        ['Soal kunci angka', 'a', 'b', 'c', 'd', '4', 'bahas', 'rumusan masalah'],
        ['Topik salah', 'a', 'b', 'c', 'd', 'A', '', '9'],
      ],
      { denganTopik: true, babList: BAB },
    )
    expect(sah).toEqual([
      { baris: 2, question: 'Apa itu R&D?', options: ['a', 'b', 'c', 'd'], answer_idx: 2, explanation: null, topik_id: 12 },
      { baris: 5, question: 'Soal kunci angka', options: ['a', 'b', 'c', 'd'], answer_idx: 3, explanation: 'bahas', topik_id: 12 },
    ])
    expect(galat).toEqual([
      { baris: 4, pesan: 'Pertanyaan kosong; Opsi B kosong; Kunci "E" bukan A, B, C, atau D' },
      { baris: 6, pesan: 'Topik "9" tidak dikenal' },
    ])
  })

  it('kepala kolom hilang menghasilkan satu galat di baris 1', () => {
    const { sah, galat } = bacaBarisSoal([['Soal', 'A', 'B']], { denganTopik: false, babList: [] })
    expect(sah).toEqual([])
    expect(galat[0].baris).toBe(1)
    expect(galat[0].pesan).toContain('Pertanyaan')
  })

  it('tanpa kolom Topik (formatif) topik_id selalu null', () => {
    const { sah } = bacaBarisSoal([kepalaTemplat(false), ['Q', 'a', 'b', 'c', 'd', 'b', '']], { denganTopik: false, babList: BAB })
    expect(sah[0].topik_id).toBeNull()
    expect(sah[0].answer_idx).toBe(1)
  })
})

describe('templat .xlsx bolak-balik', () => {
  it('templat yang diunduh bisa dibaca lagi: baris contoh sah', async () => {
    const blob = await buatTemplat(true, BAB)
    const baris = await bacaBerkasXlsx(new File([await blob.arrayBuffer()], 'templat.xlsx'))
    expect(baris[0]).toEqual(kepalaTemplat(true))
    const { sah, galat } = bacaBarisSoal(baris, { denganTopik: true, babList: BAB })
    expect(galat).toEqual([])
    expect(sah).toHaveLength(1)
    expect(sah[0].answer_idx).toBe(2)
    expect(sah[0].topik_id).toBe(11)
  }, 30000)
})
