// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { validasiLaporan, kirimLaporan, fetchLaporan, ubahStatusLaporan, ISI_MIN, ISI_MAKS, HALAMAN_MAKS } from './laporan'

beforeEach(() => localStorage.clear())

describe('validasiLaporan', () => {
  it('menolak isi terlalu pendek (setelah dipangkas), terlalu panjang, dan halaman terlalu panjang', () => {
    expect(validasiLaporan('   ab  ')).toMatch(new RegExp(`minimal ${ISI_MIN}`))
    expect(validasiLaporan('x'.repeat(ISI_MAKS + 1))).toMatch(new RegExp(`${ISI_MAKS}`))
    expect(validasiLaporan('isi cukup panjang', 'h'.repeat(HALAMAN_MAKS + 1))).toMatch(new RegExp(`${HALAMAN_MAKS}`))
  })
  it('menerima batas tepat dan halaman kosong', () => {
    expect(validasiLaporan('lima!')).toBeNull()
    expect(validasiLaporan('x'.repeat(ISI_MAKS), null)).toBeNull()
  })
})

describe('mode demo (localStorage)', () => {
  it('kirim lalu baca: terbaru di atas, isi dipangkas, halaman kosong jadi null, status awal baru', async () => {
    await kirimLaporan({ jenis: 'bug', isi: '  tombol Kirim tidak bereaksi  ', halaman: '/asesmen' })
    await kirimLaporan({ jenis: 'saran', isi: 'tambah grafik nilai', halaman: '  ' })
    const daftar = await fetchLaporan({ semua: false })
    expect(daftar).toHaveLength(2)
    expect(daftar[0]).toMatchObject({ jenis: 'saran', isi: 'tambah grafik nilai', halaman: null, status: 'baru' })
    expect(daftar[1]).toMatchObject({ jenis: 'bug', isi: 'tombol Kirim tidak bereaksi', halaman: '/asesmen' })
  })

  it('isi tidak sah ditolak tanpa menyimpan; ubah status hanya mengubah satu baris', async () => {
    await expect(kirimLaporan({ jenis: 'saran', isi: 'ok' })).rejects.toThrow(/minimal/)
    expect(await fetchLaporan({ semua: false })).toHaveLength(0)
    await kirimLaporan({ jenis: 'saran', isi: 'satu saran lengkap' })
    await kirimLaporan({ jenis: 'bug', isi: 'satu bug lengkap' })
    const [b, a] = await fetchLaporan({ semua: true })
    await ubahStatusLaporan(a.id, 'selesai')
    const sesudah = await fetchLaporan({ semua: true })
    expect(sesudah.find((x) => x.id === a.id)?.status).toBe('selesai')
    expect(sesudah.find((x) => x.id === b.id)?.status).toBe('baru')
  })
})
