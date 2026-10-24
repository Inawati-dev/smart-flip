import { describe, it, expect } from 'vitest'
import { hitungStatusTopik } from './topik'
import { hitungLangkah } from './langkah'
import { topikTerbukaDari } from './paketProposal'

// Antrean #321: Pendahuluan (bagian, id 10) + Bab 1-3 (id 1-3) + Penutup (bagian, id 20).
const urut = [
  { id: 10, order_num: 1, title: 'Pendahuluan', jenis: 'bagian' },
  { id: 1, order_num: 2, title: 'Bab 1', jenis: 'bab' },
  { id: 2, order_num: 3, title: 'Bab 2', jenis: 'bab' },
  { id: 3, order_num: 4, title: 'Bab 3', jenis: 'bab' },
  { id: 20, order_num: 5, title: 'Penutup', jenis: 'bagian' },
]

describe('kunci urutan Belajar Mendalam dengan Bagian', () => {
  it('Bab 1 tidak terkunci oleh Pendahuluan yang tanpa tes formatif', () => {
    const status = hitungStatusTopik(urut, {}, true, 70)
    expect(status(10)).toBe('open')
    expect(status(1)).toBe('open')
    expect(status(2)).toBe('locked')
    expect(status(20)).toBe('open')
  })
  it('Bab 2 menunggu formatif Bab 1, bukan Bagian di antaranya', () => {
    const status = hitungStatusTopik(urut, { 1: 80 }, true, 70)
    expect(status(1)).toBe('done')
    expect(status(2)).toBe('open')
    expect(status(3)).toBe('locked')
  })
  it('sebelum tes diagnostik semua tetap terkunci, termasuk Bagian', () => {
    const status = hitungStatusTopik(urut, {}, false, 70)
    expect([10, 1, 20].map(status)).toEqual(['locked', 'locked', 'locked'])
  })
})

describe('langkah berikutnya di Dashboard', () => {
  it('topik aktif adalah Bab pertama yang belum lulus, bernomor Bab', () => {
    const h = hitungLangkah({ modules: urut, progress: {}, attempts: [], passScore: 70 })
    expect(h.topikAktif).toMatchObject({ id: 1, orderNum: 1 })
    expect(h.topikSelesai).toBe(0)
  })
})

describe('Mini Projek memakai nomor Bab', () => {
  it('topik nomor 1 di paket = Bab 1, bukan Pendahuluan', () => {
    const urutJadwal = urut.map((m) => ({ ...m, tanggal_buka: m.id === 10 ? '2026-01-05' : m.id === 1 ? '2099-01-05' : null }))
    const terbuka = topikTerbukaDari(null, urutJadwal, new Date('2026-06-01'))
    expect(terbuka(1)).toBe(false) // Bab 1 baru dibuka 2099, walau Pendahuluan sudah terbuka
  })
})
