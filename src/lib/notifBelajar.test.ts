import { describe, it, expect } from 'vitest'
import { notifikasiBelajar, hariLagi, MAKS_MODUL, MAKS_VIDEO, MAKS_JADWAL, type ModulBelajar } from './notifBelajar'
import type { TopikStatus } from './topik'

const kini = new Date(2026, 10, 6, 13, 0) // 6 Nov 2026 13.00
const hariKe = (n: number) => new Date(2026, 10, 6 + n) // tengah malam n hari dari tanggal kini

const bab = (id: number, o: Partial<ModulBelajar> = {}): ModulBelajar => ({ id, title: `Judul ${id}`, jenis: 'bab', pdf_path: `books/modul-${id}.pdf`, video_url: `https://v/${id}`, ...o })
const path = (id: number) => `books/modul-${String(id).padStart(2, '0')}.pdf`
const kosong = { progress: {}, video: {}, bukaPada: () => null, formatifPada: () => null, kini }
const terbuka = (ids: number[]) => (id: number): TopikStatus => (ids.includes(id) ? 'open' : 'locked')

describe('hariLagi', () => {
  it('selisih hari kalender, bukan 24 jam', () => {
    expect(hariLagi(hariKe(1), kini)).toBe(1)
    expect(hariLagi(hariKe(7), kini)).toBe(7)
    expect(hariLagi(new Date(2026, 10, 6, 0, 0), kini)).toBe(0)
  })
})

describe('notifikasiBelajar: modul', () => {
  it('modul dibaca sebagian = belum selesai dengan persen; belum pernah dibuka = belum dilihat', () => {
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: [bab(1, { video_url: null }), bab(2, { video_url: null })],
      statusOf: terbuka([1, 2]),
      progress: { [path(1)]: { pct: 40, currentPage: 4, lastOpened: null } },
    })
    expect(r.map((b) => [b.jenis, b.judul])).toEqual([
      ['belum-selesai', 'Modul Topik 1 belum selesai dibaca'],
      ['belum-dilihat', 'Modul Topik 2 belum dibuka'],
    ])
    expect(r[0].ket).toBe('Judul 1 · sudah 40%')
    expect(r[0].tautan).toBe('/modul/1')
  })

  it('modul selesai (100%), topik terkunci, atau tanpa PDF tidak diberi notifikasi', () => {
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: [bab(1, { video_url: null }), bab(2, { video_url: null }), bab(3, { video_url: null, pdf_path: null })],
      statusOf: terbuka([1, 3]),
      progress: { [path(1)]: { pct: 100, currentPage: 10, lastOpened: null } },
    })
    expect(r).toEqual([])
  })

  it('banyak topik terbuka sekaligus: dibatasi MAKS_MODUL, yang dibaca sebagian didahulukan', () => {
    const ids = [1, 2, 3, 4, 5, 6]
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: ids.map((i) => bab(i, { video_url: null })),
      statusOf: terbuka(ids),
      progress: { [path(5)]: { pct: 20, currentPage: 2, lastOpened: null } },
    })
    expect(r).toHaveLength(MAKS_MODUL)
    expect(r[0].kunci).toBe('selesai-5')
  })
})

describe('notifikasiBelajar: video', () => {
  it('video belum ditonton di topik terbuka; Bagian tidak punya video; yang sudah done tidak muncul', () => {
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: [bab(1, { jenis: 'bagian' }), bab(2), bab(3)],
      statusOf: terbuka([1, 2, 3]),
      progress: { [path(1)]: { pct: 100, currentPage: 1, lastOpened: null }, [path(2)]: { pct: 100, currentPage: 1, lastOpened: null }, [path(3)]: { pct: 100, currentPage: 1, lastOpened: null } },
      video: { 2: { seconds: 90, done: true } },
    })
    expect(r.filter((b) => b.jenis === 'belum-dilihat').map((b) => b.kunci)).toEqual(['video-3'])
  })

  it('dibatasi MAKS_VIDEO', () => {
    const ids = [1, 2, 3, 4]
    const sudahBaca = Object.fromEntries(ids.map((i) => [path(i), { pct: 100, currentPage: 1, lastOpened: null }]))
    const r = notifikasiBelajar({ ...kosong, modulesUrut: ids.map((i) => bab(i)), statusOf: terbuka(ids), progress: sudahBaca })
    expect(r).toHaveLength(MAKS_VIDEO)
  })
})

describe('notifikasiBelajar: jadwal terdekat', () => {
  it('materi dan tes formatif yang dibuka dalam 7 hari: "besok" dan "n hari lagi", terdekat dulu', () => {
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: [bab(1), bab(2)],
      statusOf: terbuka([]),
      bukaPada: (id) => (id === 2 ? hariKe(3) : null),
      formatifPada: (id) => (id === 1 ? hariKe(1) : null),
    })
    expect(r.map((b) => b.judul)).toEqual(['Tes formatif Topik 1 dibuka besok', 'Materi Topik 2 dibuka 3 hari lagi'])
    expect(r[0].ket).toContain('Judul 1')
  })

  it('lebih dari 7 hari atau sudah lewat tidak muncul; Bagian tidak punya tes formatif; dibatasi MAKS_JADWAL', () => {
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: [bab(1, { jenis: 'bagian' }), bab(2), bab(3), bab(4)],
      statusOf: terbuka([]),
      bukaPada: (id) => (id === 2 ? hariKe(8) : id === 3 ? hariKe(2) : id === 4 ? hariKe(4) : null),
      formatifPada: (id) => (id === 1 ? hariKe(1) : id === 2 ? hariKe(-1) : null),
    })
    expect(r).toHaveLength(MAKS_JADWAL)
    expect(r.map((b) => b.kunci)).toEqual(['jadwal-materi-3', 'jadwal-materi-4'])
  })
})

describe('notifikasiBelajar: urutan kelompok', () => {
  it('modul, lalu video, lalu jadwal', () => {
    const r = notifikasiBelajar({
      ...kosong,
      modulesUrut: [bab(1), bab(2)],
      statusOf: terbuka([1]),
      bukaPada: (id) => (id === 2 ? hariKe(2) : null),
    })
    expect(r.map((b) => b.jenis)).toEqual(['belum-dilihat', 'belum-dilihat', 'jadwal'])
    expect(r.map((b) => b.kunci)).toEqual(['buka-1', 'video-1', 'jadwal-materi-2'])
  })
})
