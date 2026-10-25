// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { dalamJeda, isiPengingat, judulPengingat, kirimPengingat, fetchPengingatTerakhir, fetchPengingatSaya, tandaiPengingatDibaca } from './pengingat'

// isSupabaseConfigured false di lingkungan tes, jadi jalur localStorage yang diuji.

beforeEach(() => {
  localStorage.clear()
})

describe('dalamJeda', () => {
  const now = new Date('2026-10-25T12:00:00Z')
  it('false bila belum pernah diingatkan atau waktunya rusak', () => {
    expect(dalamJeda(undefined, now)).toBe(false)
    expect(dalamJeda('bukan-tanggal', now)).toBe(false)
  })
  it('false untuk waktu di masa depan (tidak mengunci tombol selamanya)', () => {
    expect(dalamJeda('2099-01-01T00:00:00Z', now)).toBe(false)
  })
  it('true di bawah 24 jam, false tepat 24 jam', () => {
    expect(dalamJeda('2026-10-24T12:00:01Z', now)).toBe(true)
    expect(dalamJeda('2026-10-24T12:00:00Z', now)).toBe(false)
  })
})

describe('isiPengingat dan judulPengingat', () => {
  it('memuat nama, kalimat dosen, dan alasan; judul memuat mata kuliah bila ada', () => {
    const isi = isiPengingat('Budi', '  ayo lanjut.  ', 'Belum tes diagnostik awal')
    expect(isi).toBe('Halo Budi, ayo lanjut.\nCatatan: Belum tes diagnostik awal')
    expect(judulPengingat('Metode Penelitian')).toBe('Pengingat dari dosen · Metode Penelitian')
    expect(judulPengingat()).toBe('Pengingat dari dosen')
  })
})

describe('kirim, baca, tandai dibaca (jalur lokal)', () => {
  it('kiriman kedua dalam 24 jam ditolak per mahasiswa, yang lain tetap terkirim', async () => {
    expect(await kirimPengingat([{ userId: 'a', body: 'I' }, { userId: 'b', body: 'I' }], 'J')).toEqual({ terkirim: ['a', 'b'], gagal: [] })
    expect(await kirimPengingat([{ userId: 'a', body: 'I' }, { userId: 'c', body: 'I' }], 'J')).toEqual({ terkirim: ['c'], gagal: ['a'] })
    const terakhir = await fetchPengingatTerakhir(['a', 'b', 'c', 'd'])
    expect(Object.keys(terakhir).sort()).toEqual(['a', 'b', 'c'])
  })

  it('mahasiswa hanya melihat miliknya yang belum dibaca; tandai dibaca menghilangkannya', async () => {
    await kirimPengingat([{ userId: 'a', body: 'Isi' }, { userId: 'b', body: 'Isi' }], 'Judul')
    const milikA = await fetchPengingatSaya('a')
    expect(milikA).toHaveLength(1)
    expect(milikA[0].body).toBe('Isi')
    await tandaiPengingatDibaca(milikA[0].id)
    expect(await fetchPengingatSaya('a')).toHaveLength(0)
    expect(await fetchPengingatSaya('b')).toHaveLength(1)
    expect(await fetchPengingatSaya(undefined)).toHaveLength(0)
  })
})
