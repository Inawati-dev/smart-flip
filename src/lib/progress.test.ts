// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  moduleIdToPath,
  fetchTimeSpent,
  fetchTotalTimeSpent,
  fetchAllProgress,
  saveProgress,
  TOTAL_MODULES,
  halamanTerjauh,
  majuTerjauh,
  persenBaca,
  fetchCatatanTopik,
  terjauhLama,
  MIN_DETIK_PER_HALAMAN,
} from './progress'

vi.mock('./supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
  isSupabaseConfigured: false,
}))

describe('moduleIdToPath', () => {
  it('formats the module id into the legacy books/ path convention', () => {
    expect(moduleIdToPath(1)).toBe('books/modul-01.pdf')
    expect(moduleIdToPath(9)).toBe('books/modul-09.pdf')
  })
})

describe('fetchTimeSpent', () => {
  beforeEach(() => localStorage.clear())

  it('reads the legacy sfp_time_<id> localStorage key when Supabase is not configured', async () => {
    localStorage.setItem('sfp_time_3', '720')
    expect(await fetchTimeSpent(3)).toBe(720)
  })

  it('defaults to 0 when nothing is stored', async () => {
    expect(await fetchTimeSpent(7)).toBe(0)
  })
})

describe('fetchTotalTimeSpent', () => {
  beforeEach(() => localStorage.clear())

  it('sums time spent across all TOTAL_MODULES modules', async () => {
    localStorage.setItem('sfp_time_1', '100')
    localStorage.setItem('sfp_time_2', '50')
    expect(TOTAL_MODULES).toBe(9)
    expect(await fetchTotalTimeSpent()).toBe(150)
  })
})

describe('saveProgress (localStorage fallback)', () => {
  beforeEach(() => localStorage.clear())

  it('writes to the exact sfp_<modulePath> key fetchAllProgress reads back', async () => {
    await saveProgress('books/modul-03.pdf', {
      pct: 45,
      currentPage: 4,
      lastOpened: '2026-07-23T00:00:00.000Z',
    })
    const raw = localStorage.getItem('sfp_books/modul-03.pdf')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toEqual({
      pct: 45,
      currentPage: 4,
      totalPages: null,
      lastOpened: '2026-07-23T00:00:00.000Z',
    })

    const all = await fetchAllProgress()
    expect(all['books/modul-03.pdf']).toEqual({
      pct: 45,
      currentPage: 4,
      totalPages: null,
      lastOpened: '2026-07-23T00:00:00.000Z',
    })
  })

  it('defaults lastOpened to now when not provided', async () => {
    await saveProgress('books/modul-05.pdf', { pct: 10, currentPage: 1 })
    const raw = JSON.parse(localStorage.getItem('sfp_books/modul-05.pdf')!)
    expect(typeof raw.lastOpened).toBe('string')
    expect(raw.lastOpened.length).toBeGreaterThan(0)
  })

  it('merges into existing progress rather than dropping unrelated fields', async () => {
    await saveProgress('books/modul-02.pdf', { pct: 10, currentPage: 1, lastOpened: 'a' })
    await saveProgress('books/modul-02.pdf', { pct: 60, currentPage: 6, lastOpened: 'b' })
    const raw = JSON.parse(localStorage.getItem('sfp_books/modul-02.pdf')!)
    expect(raw).toEqual({ pct: 60, currentPage: 6, totalPages: null, lastOpened: 'b' })
  })

  it('menyimpan jumlah halaman dan waktu baca, dan jumlah halaman tidak hilang pada simpan berikutnya (antrean #191)', async () => {
    await saveProgress('books/modul-04.pdf', { pct: 10, currentPage: 2, totalPages: 18, timeSpent: 95, lastOpened: 'a' })
    await saveProgress('books/modul-04.pdf', { pct: 20, currentPage: 4, lastOpened: 'b' })
    expect(JSON.parse(localStorage.getItem('sfp_books/modul-04.pdf')!)).toEqual({ pct: 20, currentPage: 4, totalPages: 18, lastOpened: 'b' })
    expect(await fetchTimeSpent(4)).toBe(95)
  })
})

describe('aturan hitung baca (antrean #191)', () => {
  it('halaman yang tampil kurang dari batas detik tidak dihitung', () => {
    expect(majuTerjauh(3, 4, MIN_DETIK_PER_HALAMAN - 1)).toBe(3)
    expect(majuTerjauh(3, 4, MIN_DETIK_PER_HALAMAN)).toBe(4)
  })

  it('melompat jauh ke depan tidak dihitung walau halamannya tampil lama', () => {
    expect(majuTerjauh(3, 18, 600)).toBe(3)
    expect(majuTerjauh(0, 18, 600)).toBe(0)
  })

  it('hanya halaman tepat sesudah yang terjauh yang dihitung; melewati satu halaman tidak dihitung', () => {
    expect(majuTerjauh(3, 5, 10)).toBe(3)
    expect(majuTerjauh(9, 2, 10)).toBe(9)
    // membaca halaman genap saja tidak pernah maju melewati halaman 0
    let terjauh = 0
    for (let h = 2; h <= 18; h += 2) terjauh = majuTerjauh(terjauh, h, 10)
    expect(terjauh).toBe(0)
    // langkah 2 hanya untuk tampilan dua halaman
    expect(majuTerjauh(3, 5, 10, 2)).toBe(5)
    expect(majuTerjauh(3, 6, 10, 2)).toBe(3)
  })

  it('fetchCatatanTopik membaca persen, jumlah halaman, dan waktu satu topik dari penyimpanan lokal', async () => {
    localStorage.clear()
    expect(await fetchCatatanTopik(4)).toEqual({ pct: 0, totalPages: null, timeSpent: 0, furthestPage: null })
    await saveProgress('books/modul-04.pdf', { pct: 33, currentPage: 6, totalPages: 18, timeSpent: 240 })
    expect(await fetchCatatanTopik(4)).toEqual({ pct: 33, totalPages: 18, timeSpent: 240, furthestPage: null })
    await saveProgress('books/modul-04.pdf', { pct: 39, currentPage: 2, totalPages: 18, furthestPage: 7 })
    expect(await fetchCatatanTopik(4)).toEqual({ pct: 39, totalPages: 18, timeSpent: 240, furthestPage: 7 })
    // simpan berikutnya tanpa halaman terjauh tidak menghapusnya
    await saveProgress('books/modul-04.pdf', { pct: 39, currentPage: 3 })
    expect((await fetchCatatanTopik(4)).furthestPage).toBe(7)
  })

  // Antrean #225: PDF panjang tidak lagi dipulihkan dari persen bulat bila kolom halaman terjauh ada.
  it('terjauhLama memakai kolom halaman terjauh, dan kembali ke persen bila PDF diganti atau kolomnya kosong', () => {
    expect(terjauhLama({ pct: 34, totalPages: 300, furthestPage: 101 }, 300)).toBe(101)
    expect(halamanTerjauh(34, 300)).toBe(102) // dari persen saja meleset
    expect(terjauhLama({ pct: 0, totalPages: 300, furthestPage: 1 }, 300)).toBe(1)
    expect(terjauhLama({ pct: 40, totalPages: 5, furthestPage: 2 }, 3)).toBe(1) // PDF diganti: nomor halaman lama tidak berlaku
    expect(terjauhLama({ pct: 100, totalPages: 300, furthestPage: 250 }, 120)).toBe(120)
    // temuan pemeriksa: tab lama menaikkan persen ke 83 (15 dari 18) tanpa menaikkan kolom halaman terjauh (9)
    expect(terjauhLama({ pct: 83, totalPages: 18, furthestPage: 9 }, 18)).toBe(15)
    expect(terjauhLama({ pct: 83, totalPages: null, furthestPage: null }, 18)).toBe(15)
    // batas bawah dari persen tidak pernah melebihi halaman yang sebenarnya dibaca
    for (const total of [18, 150, 300, 500]) {
      for (let h = 0; h <= total; h++) expect(terjauhLama({ pct: persenBaca(h, total), totalPages: total, furthestPage: null }, total)).toBeLessThanOrEqual(h)
    }
    expect(terjauhLama({ pct: 50, totalPages: 18, furthestPage: null }, 18)).toBe(9)
    expect(terjauhLama({ pct: 50, totalPages: 18, furthestPage: 99 }, 18)).toBe(18)
  })

  it('persen dan halaman terjauh saling memulihkan untuk tiap halaman PDF sampai 100 halaman', () => {
    for (const total of [1, 3, 18, 27, 100]) {
      for (let h = 0; h <= total; h++) expect(halamanTerjauh(persenBaca(h, total), total)).toBe(h)
    }
    expect(persenBaca(5, 0)).toBe(0)
    expect(halamanTerjauh(50, 0)).toBe(0)
  })
})

// Antrean #225: isi baris yang dikirim ke Supabase.
describe('saveProgress (mode Supabase)', () => {
  async function denganSupabase(jawaban: Array<{ error: { code?: string; message: string } | null }>) {
    const baris: Array<Record<string, unknown>> = []
    vi.doMock('./supabase', () => ({
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({
          upsert: async (row: Record<string, unknown>) => {
            baris.push({ ...row })
            return jawaban[Math.min(baris.length, jawaban.length) - 1]
          },
        }),
      },
      isSupabaseConfigured: true,
    }))
    vi.resetModules()
    const mod = await import('./progress')
    return { baris, simpan: mod.saveProgress }
  }

  it('tidak mengirim started_at; completed_at tidak pernah dikirim kosong dan selalu ikut saat 100%; halaman terjauh ikut dikirim', async () => {
    const { baris, simpan } = await denganSupabase([{ error: null }])
    await simpan('books/modul-03.pdf', { pct: 50, currentPage: 9, totalPages: 18, furthestPage: 9, timeSpent: 60 })
    await simpan('books/modul-03.pdf', { pct: 100, currentPage: 18, totalPages: 18, furthestPage: 18 })
    await simpan('books/modul-03.pdf', { pct: 100, currentPage: 2, totalPages: 18, furthestPage: 18 })
    expect(baris[0]).toMatchObject({ user_id: 'u1', module_id: 3, pct: 50, status: 'in_progress', furthest_page: 9, total_pages: 18, time_spent: 60 })
    expect(baris.every((b) => !('started_at' in b))).toBe(true)
    expect('completed_at' in baris[0]).toBe(false)
    expect(typeof baris[1].completed_at).toBe('string')
    expect(typeof baris[2].completed_at).toBe('string')
    vi.doUnmock('./supabase')
  })

  it('bila kolom furthest_page belum ada (v38 belum dijalankan), simpan diulang tanpa kolom itu dan tetap berhasil', async () => {
    const { baris, simpan } = await denganSupabase([
      { error: { code: 'PGRST204', message: "Could not find the 'furthest_page' column of 'user_progress' in the schema cache" } },
      { error: null },
    ])
    await simpan('books/modul-03.pdf', { pct: 50, currentPage: 9, totalPages: 18, furthestPage: 9 })
    expect(baris).toHaveLength(2)
    expect('furthest_page' in baris[1]).toBe(false)
    expect(baris[1]).toMatchObject({ pct: 50, total_pages: 18 })
    // simpan berikutnya langsung tanpa kolom itu: satu permintaan, bukan dua
    await simpan('books/modul-03.pdf', { pct: 56, currentPage: 10, totalPages: 18, furthestPage: 10 })
    expect(baris).toHaveLength(3)
    expect('furthest_page' in baris[2]).toBe(false)
    expect(localStorage.getItem('sfp_books/modul-03.pdf')).toBeNull() // tidak jatuh ke penyimpanan lokal
    vi.doUnmock('./supabase')
  })

  it('galat yang menyebut kolom lain tidak membuat furthest_page dan total_pages dibuang', async () => {
    const { baris, simpan } = await denganSupabase([{ error: { code: 'PGRST204', message: "Could not find the 'kolom_lain' column of 'user_progress' in the schema cache" } }])
    await simpan('books/modul-03.pdf', { pct: 50, currentPage: 9, totalPages: 18, furthestPage: 9 })
    expect(baris).toHaveLength(1)
    vi.doUnmock('./supabase')
  })
})
