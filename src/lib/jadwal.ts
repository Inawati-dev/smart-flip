import { supabase, isSupabaseConfigured } from './supabase'

// Jadwal mata kuliah (antrean #153). Dosen mengisi tanggal pertemuan pertama
// (courses.mulai_kuliah) dan, bila perlu, minggu ke berapa tiap topik dibuka
// (modules.minggu_mulai); skema: database/migration_v29_jadwal_kuliah.sql.
// Materi topik terbuka di awal minggu itu, tes formatifnya satu minggu
// sesudahnya (pertemuan kedua topik) dan tetap terbuka sesudah itu.
// Tanpa tanggal mulai tidak ada kunci tanggal sama sekali.
// Kunci ini di sisi aplikasi; basis data tidak ikut menolak.

/** Minggu bawaan topik ke-`indeks` (0 = topik pertama): dua minggu per topik, minggu 7 (cadangan) dan 8 (UTS) dilewati. */
export function mingguBawaan(indeks: number): number {
  return indeks < 3 ? 1 + 2 * indeks : 9 + 2 * (indeks - 3)
}

/** 'YYYY-MM-DD' dibaca sebagai tengah malam waktu setempat, bukan UTC. */
export function tanggalLokal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Hari pertama minggu ke-`minggu` (minggu 1 = tanggal mulai). */
export function awalMinggu(mulai: string, minggu: number): Date {
  const t = tanggalLokal(mulai)
  t.setDate(t.getDate() + 7 * (minggu - 1))
  return t
}

export interface JadwalTopik {
  minggu: number
  materi: Date
  formatif: Date
}

/** Jadwal tiap topik (urut `order_num`); `null` bila mata kuliah belum punya tanggal mulai. */
export function jadwalTopik(
  mulai: string | null | undefined,
  modulesUrut: Array<{ id: number; minggu_mulai?: number | null }>,
): Map<number, JadwalTopik> | null {
  if (!mulai) return null
  const peta = new Map<number, JadwalTopik>()
  modulesUrut.forEach((m, i) => {
    const minggu = m.minggu_mulai ?? mingguBawaan(i)
    peta.set(m.id, { minggu, materi: awalMinggu(mulai, minggu), formatif: awalMinggu(mulai, minggu + 1) })
  })
  return peta
}

export function formatTanggal(t: Date): string {
  return t.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Simpan tanggal mulai dan minggu tiap topik. `minggu[id] = null` mengembalikan topik itu ke bawaan. */
export async function simpanJadwal(courseId: number, mulai: string | null, minggu: Record<number, number | null>): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Menyimpan jadwal butuh koneksi Supabase.')
  const { error } = await supabase.from('courses').update({ mulai_kuliah: mulai }).eq('id', courseId)
  if (error) throw error
  const hasil = await Promise.all(
    Object.entries(minggu).map(([id, m]) => supabase.from('modules').update({ minggu_mulai: m }).eq('id', Number(id))),
  )
  const gagal = hasil.find((r) => r.error)
  if (gagal?.error) throw gagal.error
}
