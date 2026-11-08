// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { validasiLaporan, validasiLampiran, kirimLaporan, fetchLaporan, fetchLampiran, ubahStatusLaporan, LAMPIRAN_MAKS_BYTE, ISI_MIN, ISI_MAKS, HALAMAN_MAKS } from './laporan'

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

describe('lampiran gambar (antrean #377)', () => {
  it('menerima png, jpeg, webp sampai tepat 1 MB; menolak jenis lain dan yang melewati 1 MB dengan ukuran dalam pesan', () => {
    expect(validasiLampiran({ type: 'image/png', size: 1000 })).toBeNull()
    expect(validasiLampiran({ type: 'image/webp', size: LAMPIRAN_MAKS_BYTE })).toBeNull()
    expect(validasiLampiran({ type: 'image/gif', size: 10 })).toMatch(/PNG, JPG, atau WebP/)
    expect(validasiLampiran({ type: 'application/pdf', size: 10 })).toMatch(/PNG, JPG, atau WebP/)
    expect(validasiLampiran({ type: 'image/jpeg', size: LAMPIRAN_MAKS_BYTE + 1 })).toMatch(/1,0 MB|Paling besar 1 MB/)
    expect(validasiLampiran({ type: 'image/jpeg', size: 2.5 * 1024 * 1024 })).toMatch(/2,5 MB/)
  })

  it('demo: laporan dengan lampiran memuat penanda, gambarnya diambil terpisah; tanpa lampiran tidak ada penanda', async () => {
    const gambar = 'data:image/png;base64,iVBORw0KGgo='
    await kirimLaporan({ jenis: 'bug', isi: 'ada lampiran gambar', lampiran: gambar })
    await kirimLaporan({ jenis: 'saran', isi: 'tanpa lampiran sama sekali' })
    const [tanpa, dengan] = await fetchLaporan({ semua: false })
    expect(tanpa.adaLampiran).toBe(false)
    expect(dengan.adaLampiran).toBe(true)
    expect(await fetchLampiran(dengan.id)).toBe(gambar)
    expect(await fetchLampiran(tanpa.id)).toBeNull()
  })

  it('data URL bukan gambar png, jpeg, atau webp ditolak sebelum dikirim', async () => {
    await expect(kirimLaporan({ jenis: 'bug', isi: 'lampiran berbahaya', lampiran: 'data:text/html;base64,PGI+' })).rejects.toThrow(/PNG, JPG, atau WebP/)
    expect(await fetchLaporan({ semua: false })).toHaveLength(0)
  })
})
