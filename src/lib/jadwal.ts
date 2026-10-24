import { supabase, isSupabaseConfigured } from './supabase'
import { indeksJadwal } from './jenisTopik'

// Jadwal mata kuliah (antrean #153). Dosen mengisi tanggal pertemuan pertama
// (courses.mulai_kuliah) dan, bila perlu, minggu ke berapa tiap topik dibuka
// (modules.minggu_mulai); skema: database/migration_v29_jadwal_kuliah.sql.
// Materi topik terbuka di awal minggu itu, tes formatifnya satu minggu
// sesudahnya (pertemuan kedua topik) dan tetap terbuka sesudah itu.
// Tanpa tanggal mulai tidak ada kunci tanggal sama sekali, kecuali topik yang
// tanggal bukanya diisi sendiri (modules.tanggal_buka, v53, antrean #309):
// tanggal itu menang atas hitungan minggu, tes formatifnya +7 hari, dan ia
// tetap berlaku walau tanggal mulai kosong.
// Kunci ini di sisi aplikasi; basis data tidak ikut menolak.

/** Minggu bawaan topik ke-`indeks` (0 = topik pertama): dua minggu per topik, minggu 7 (cadangan) dan 8 (UTS) dilewati. */
export function mingguBawaan(indeks: number): number {
  return indeks < 3 ? 1 + 2 * indeks : 9 + 2 * (indeks - 3)
}

/**
 * Label pertemuan topik ke-`indeks` menurut jadwal (antrean #273): minggu materi dan minggu sesudahnya,
 * mis. topik keempat bawaan = "Pertemuan 9-10". Berlaku walau mata kuliah belum punya tanggal mulai.
 */
export function labelPertemuan(indeks: number, mingguMulai?: number | null): string {
  const m = mingguMulai ?? mingguBawaan(indeks)
  return `Pertemuan ${m}-${m + 1}`
}

/** Nomor pertemuan ke-`ke` (1 atau 2) topik ke-`indeks` menurut jadwal (antrean #279), mis. topik keempat pertemuan kedua = 10. */
export function nomorPertemuan(indeks: number, mingguMulai: number | null | undefined, ke: 1 | 2): number {
  return (mingguMulai ?? mingguBawaan(indeks)) + ke - 1
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

/** Selisih hari kalender (b - a), kebal pergeseran jam musim panas. */
function selisihHari(a: Date, b: Date): number {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000)
}

/** Minggu ke berapa `tanggal` jatuh relatif terhadap `mulai` (minggu 1 = tanggal mulai), minimal 1. */
export function mingguDariTanggal(mulai: string, tanggal: string): number {
  // Dibatasi 1-52 seperti CHECK minggu_mulai (v29); JadwalModal menolak tanggal yang lebih jauh lewat mingguMentah.
  return Math.min(52, mingguMentah(mulai, tanggal))
}

/** Minggu ke berapa `tanggal` jatuh tanpa batas atas (paling kecil 1); dipakai untuk menolak tanggal terlalu jauh. */
export function mingguMentah(mulai: string, tanggal: string): number {
  return Math.max(1, Math.floor(selisihHari(tanggalLokal(mulai), tanggalLokal(tanggal)) / 7) + 1)
}

/**
 * Jadwal tiap topik (urut `order_num`). `null` bila tidak ada kunci sama sekali:
 * mata kuliah tanpa tanggal mulai dan tanpa topik ber-`tanggal_buka`. Tanpa
 * tanggal mulai peta hanya memuat topik ber-`tanggal_buka` (yang lain tidak dikunci).
 */
export function jadwalTopik(
  mulai: string | null | undefined,
  modulesUrut: Array<{ id: number; minggu_mulai?: number | null; tanggal_buka?: string | null; jenis?: string | null }>,
): Map<number, JadwalTopik> | null {
  const peta = new Map<number, JadwalTopik>()
  modulesUrut.forEach((m, i) => {
    if (m.tanggal_buka) {
      const materi = tanggalLokal(m.tanggal_buka)
      const formatif = new Date(materi)
      formatif.setDate(formatif.getDate() + 7)
      peta.set(m.id, { minggu: mulai ? mingguDariTanggal(mulai, m.tanggal_buka) : mingguBawaan(indeksJadwal(modulesUrut, i)), materi, formatif })
    } else if (mulai) {
      const minggu = m.minggu_mulai ?? mingguBawaan(indeksJadwal(modulesUrut, i))
      peta.set(m.id, { minggu, materi: awalMinggu(mulai, minggu), formatif: awalMinggu(mulai, minggu + 1) })
    }
  })
  return peta.size ? peta : null
}

export function formatTanggal(t: Date): string {
  return t.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Simpan tanggal mulai, minggu tiap topik, dan (opsional) tanggal buka sendiri.
 * `minggu[id] = null` mengembalikan topik itu ke bawaan. Topik ber-tanggal sendiri
 * disimpan dengan minggu turunannya supaya label "Pertemuan a-b" di halaman lain
 * ikut. `tanggalBuka[id] = null` menghapus tanggal sendiri; hanya id yang
 * disebut yang ditulis. Mulai dan minggu disimpan lebih dulu: bila kolom v53
 * belum ada, keduanya tetap tersimpan lalu muncul pesan jalankan v53.
 */
export async function simpanJadwal(
  courseId: number,
  mulai: string | null,
  minggu: Record<number, number | null>,
  tanggalBuka: Record<number, string | null> = {},
): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Menyimpan jadwal butuh koneksi Supabase.')
  const { data: ubah, error } = await supabase.from('courses').update({ mulai_kuliah: mulai }).eq('id', courseId).select('id')
  if (error) throw error
  if (!ubah?.length) throw new Error('Hanya dosen pengampu mata kuliah ini yang boleh mengubah jadwalnya.') // RLS v48, antrean #250
  const hasil = await Promise.all(
    Object.entries(minggu).map(([id, m]) => supabase.from('modules').update({ minggu_mulai: m }).eq('id', Number(id))),
  )
  const gagal = hasil.find((r) => r.error)
  if (gagal?.error) throw gagal.error
  const hasilTanggal = await Promise.all(
    Object.entries(tanggalBuka).map(([id, t]) => supabase.from('modules').update({ tanggal_buka: t }).eq('id', Number(id))),
  )
  const gagalTanggal = hasilTanggal.find((r) => r.error)?.error
  if (gagalTanggal) {
    const e = gagalTanggal as { code?: string; message?: string }
    if (e.code === 'PGRST204' || e.code === '42703' || /tanggal_buka|schema cache/i.test(e.message || ''))
      throw new Error('Kolom tanggal buka belum ada di basis data. Jalankan migration_v53_tanggal_buka.sql di Supabase dulu. Tanggal mulai dan minggu sudah tersimpan.')
    throw gagalTanggal
  }
}
