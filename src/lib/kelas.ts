import { supabase, isSupabaseConfigured } from './supabase'
import { golonganDariSkor, type Golongan } from './golongan'

// Backs src/pages/Kelas.tsx (dosen). Sejak antrean #228 (migration_v40)
// kelas tidak dibuat dosen dan tidak punya kode daftar: basis data
// membentuknya sendiri dari tes diagnostik awal (Jalur Cepat A, B, ... dan
// Belajar Mendalam A, B, ..., 25 mahasiswa per kelas). Kelas lama buatan
// dosen (golongan kosong) tetap ada karena tugas dan tes kelompok
// menyimpan class_ids-nya. Mode demo (tanpa Supabase) tidak punya kelas.

export interface Kelas {
  id: string
  name: string
  angkatan: number
  code: string
  dosen_id: string
  max_students: number
  created_at: string
  /** v40: mata kuliah kelas otomatis; kosong untuk kelas lama. */
  course_id?: number | null
  /** v40: 'mahir' = Jalur Cepat, 'remedial' = Belajar Mendalam; kosong = kelas lama buatan dosen. */
  golongan?: 'mahir' | 'remedial' | null
  /** v40: 1 = A, 2 = B, ... */
  urutan?: number | null
}

export interface KelasWithCount extends Kelas {
  studentCount: number
}

// Fetches every kelas owned by this dosen, each annotated with a live
// mahasiswa count. Supabase has no cheap "group by" through supabase-js
// without a view/RPC, so this does it in two round trips: classes owned by
// this dosen, then a single `class_id IN (...)` query over profiles to tally
// counts client-side — still just 2 queries regardless of class count.
export async function getKelasByDosen(dosenId: string): Promise<KelasWithCount[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('dosen_id', dosenId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const list = (classes ?? []) as Kelas[]

      const counts: Record<string, number> = {}
      const ids = list.map((c) => c.id)
      if (ids.length) {
        const { data: profs, error: profErr } = await supabase.from('profiles').select('class_id').in('class_id', ids)
        if (profErr) throw profErr
        for (const p of (profs ?? []) as Array<{ class_id: string | null }>) {
          if (p.class_id) counts[p.class_id] = (counts[p.class_id] ?? 0) + 1
        }
      }

      return list.map((c) => ({ ...c, studentCount: counts[c.id] ?? 0 }))
    } catch (e) {
      console.warn('[kelas] getKelasByDosen → Supabase gagal:', e)
    }
  }
  // Mode demo: tidak ada akun mahasiswa, jadi tidak ada kelas otomatis.
  return []
}

/** Hapus kelas lama buatan dosen (kelas otomatis tidak diberi tombol hapus). */
export async function deleteKelas(id: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
}

/**
 * Kelas yang tampil di halaman Kelas untuk satu mata kuliah: kelas otomatis
 * mata kuliah itu, lalu kelas lama (tanpa mata kuliah). Urut angkatan terbaru,
 * Belajar Mendalam sebelum Jalur Cepat (sama dengan urutan kartu), lalu A, B, ...
 */
export function kelasUntukMataKuliah<T extends Kelas>(classes: T[], courseId: number): T[] {
  const nilai = (k: Kelas) => (k.golongan === 'remedial' ? 0 : k.golongan === 'mahir' ? 1 : 2)
  return classes
    .filter((k) => !k.golongan || k.course_id === courseId)
    .sort((a, b) => b.angkatan - a.angkatan || nilai(a) - nilai(b) || (a.urutan ?? 0) - (b.urutan ?? 0) || a.name.localeCompare(b.name))
}

/** Mahasiswa mata kuliah ini yang belum punya kelas karena belum tes diagnostik (v40). */
export async function fetchBelumTes(courseId: number): Promise<Array<{ id: string; nama: string; nim?: string | null; angkatan?: string | null }>> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, nim_nidn, angkatan')
    .eq('role', 'mahasiswa')
    .eq('course_id', courseId)
    .is('class_id', null)
    .order('full_name')
  if (error) {
    // Kolom course_id belum ada = migration_v40 belum jalan; daftar ini kosong saja.
    if (error.code === '42703') return []
    throw error
  }
  return (data ?? []).map((p) => ({
    id: p.id as string,
    nama: (p.full_name as string | null) || 'Tanpa nama',
    nim: (p.nim_nidn as string | null) ?? null,
    angkatan: p.angkatan == null ? null : String(p.angkatan), // kolom TEXT (v1)
  }))
}

/**
 * Pindahkan mahasiswa ke kelas lain milik dosen ini (fungsi SQL
 * pindah_mahasiswa, migration_v40). Basis data menolak kelas yang sudah penuh.
 */
export async function pindahMahasiswa(userId: string, classId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Memindahkan mahasiswa butuh koneksi Supabase.')
  const { error } = await supabase.rpc('pindah_mahasiswa', { p_user: userId, p_class: classId })
  if (error) {
    const belumAda = error.code === 'PGRST202' || error.code === '42883'
    throw new Error(belumAda ? 'Fungsi pindah kelas belum ada di basis data. Jalankan migration_v40_kelas_otomatis.sql di Supabase dulu.' : error.message)
  }
}

/** Kelas mahasiswa yang sedang masuk (profiles.class_id), null bila belum bergabung atau tanpa Supabase. */
export async function fetchMyKelas(): Promise<{ name: string; angkatan: number } | null> {
  if (!isSupabaseConfigured) return null
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('class_id, classes!profiles_class_id_fkey(name, angkatan)')
    .eq('id', uid)
    .maybeSingle()
  if (error || !data) return null
  const rel = (data as { classes?: { name: string; angkatan: number } | { name: string; angkatan: number }[] | null }).classes
  const k = Array.isArray(rel) ? rel[0] : rel
  return k?.name ? { name: k.name, angkatan: k.angkatan } : null
}

export interface KelasSummary {
  totalStudents: number
  byAngkatan: Array<{ angkatan: number; total: number }>
}

// Pure aggregation helper over already-fetched classes — no extra query.
// Sorted newest-angkatan-first so the most recent intake surfaces first in
// the summary cards.
export function summarizeKelas(classes: KelasWithCount[]): KelasSummary {
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0)
  const byAngkatanMap = new Map<number, number>()
  for (const c of classes) {
    byAngkatanMap.set(c.angkatan, (byAngkatanMap.get(c.angkatan) ?? 0) + c.studentCount)
  }
  // Angkatan with 0 students (a kelas created but nobody's joined yet, or a
  // leftover test kelas) is noise on the dashboard, not signal -- omit it
  // rather than showing a permanent "Angkatan 2024: 0" card.
  const byAngkatan = Array.from(byAngkatanMap.entries())
    .map(([angkatan, total]) => ({ angkatan, total }))
    .filter((a) => a.total > 0)
    .sort((a, b) => b.angkatan - a.angkatan)
  return { totalStudents, byAngkatan }
}

// Label kelas untuk dropdown/daftar. Nama saja ("Kelas A") tidak
// membedakan angkatan, jadi setiap pemakai dropdown kelas (Dashboard dosen,
// Asesmen, TesKhusus) memakai fungsi ini, bukan k.name langsung. Kode kelas
// hanya ditambahkan kalau nama dan angkatan sama-sama duplikat di
// `allKelas`, supaya kode (yang lebih sulit dibaca sekilas) hanya muncul
// saat benar-benar perlu membedakan.
export function labelKelas(k: { name: string; angkatan: number; code?: string }, allKelas: Array<{ name: string; angkatan: number }> = []): string {
  const base = `${k.name} · ${k.angkatan}`
  const duplikat = allKelas.filter((o) => o.name === k.name && o.angkatan === k.angkatan).length > 1
  return duplikat && k.code ? `${base} · ${k.code}` : base
}

// ── Filter Tahun + Kelas terpisah ───────────────────────────────────────
// Ganti satu dropdown gabungan "Kelas A · 2026" (susah dibaca begitu
// kombinasi kelas x angkatan banyak, screenshot Johan 16 Sep 2026) dengan
// dua filter: tahun (angkatan) dan kelas. Dipakai src/components/
// KelasTahunFilter.tsx, dan langsung oleh Asesmen.tsx/Dashboard.tsx untuk
// menghitung kelas mana saja yang lolos filter.

export interface FilterTahunKelas {
  tahun: number | null
  kelas: string | null
}

/** Angkatan unik dari daftar kelas, urut menurun (terbaru dulu). */
export function tahunUnik(kelasList: Array<{ angkatan: number }>): number[] {
  return [...new Set(kelasList.map((k) => k.angkatan))].sort((a, b) => b - a)
}

/** Nama kelas unik pada tahun terpilih (semua tahun kalau null), urut A-Z. */
export function namaKelasUnik(kelasList: Array<{ name: string; angkatan: number }>, tahun: number | null): string[] {
  const relevan = tahun == null ? kelasList : kelasList.filter((k) => k.angkatan === tahun)
  return [...new Set(relevan.map((k) => k.name))].sort((a, b) => a.localeCompare(b))
}

/** True kalau kelas k cocok filter (tahun/kelas null = tidak membatasi). */
export function cocokFilter(k: { name: string; angkatan: number }, filter: FilterTahunKelas): boolean {
  if (filter.tahun != null && k.angkatan !== filter.tahun) return false
  if (filter.kelas != null && k.name !== filter.kelas) return false
  return true
}

// ── Dua kelompok hasil tes diagnostik per kelas (antrean #140) ──
export interface AnggotaGolongan {
  id: string
  nama: string
  skor: number | null
  golongan: Golongan
  nim?: string | null
  angkatan?: string | null
}

// Murni: mahasiswa per kelas dengan skor tes diagnostik TERAKHIR. `attempts`
// harus urut waktu naik, supaya pengerjaan yang belakangan menimpa yang awal.
export function kelompokkanGolongan(
  profil: Array<{ id: string; full_name: string | null; class_id: string | null; nim_nidn?: string | null; angkatan?: string | number | null }>,
  attempts: Array<{ user_id: string; score: number }>,
  ambang?: number,
): Record<string, AnggotaGolongan[]> {
  const skor = new Map<string, number>()
  for (const a of attempts) skor.set(a.user_id, a.score)
  const hasil: Record<string, AnggotaGolongan[]> = {}
  for (const p of profil) {
    if (!p.class_id) continue
    const s = skor.get(p.id) ?? null
    ;(hasil[p.class_id] ??= []).push({ id: p.id, nama: p.full_name || 'Tanpa nama', skor: s, golongan: golonganDariSkor(s, ambang), nim: p.nim_nidn ?? null, angkatan: p.angkatan == null ? null : String(p.angkatan) })
  }
  for (const daftar of Object.values(hasil)) daftar.sort((a, b) => a.nama.localeCompare(b.nama))
  return hasil
}

// Tes diagnostik berlaku per mata kuliah, jadi kelompoknya ikut `courseId`.
// Mode demo tidak punya akun mahasiswa di kelas (lihat getKelasByDosen): kosong.
export async function fetchGolonganKelas(classIds: string[], courseId: number, ambang?: number): Promise<Record<string, AnggotaGolongan[]>> {
  if (!isSupabaseConfigured || classIds.length === 0) return {}
  const [profil, attempts] = await Promise.all([
    supabase.from('profiles').select('id, full_name, class_id, nim_nidn, angkatan').in('class_id', classIds),
    supabase
      .from('quiz_attempts')
      .select('user_id, score, attempted_at')
      .eq('kind', 'pre')
      .eq('course_id', courseId)
      .order('attempted_at', { ascending: true }),
  ])
  if (profil.error) throw profil.error
  if (attempts.error) throw attempts.error
  return kelompokkanGolongan(
    (profil.data ?? []) as Array<{ id: string; full_name: string | null; class_id: string | null; nim_nidn?: string | null; angkatan?: string | null }>,
    (attempts.data ?? []) as Array<{ user_id: string; score: number }>,
    ambang,
  )
}

// Reset tes diagnostik (antrean #155): hapus pengerjaan kind 'pre' mata kuliah
// ini untuk mahasiswa terpilih, supaya mereka mengerjakan ulang. Mengembalikan
// jumlah baris yang benar-benar terhapus: tanpa policy DELETE di
// database/migration_v28_reset_diagnostik.sql basis data menolak diam-diam
// (0 baris, tanpa galat), dan pemanggil harus bisa membedakannya.
// Sejak v47 (antrean #255) lewat reset_diagnostik_mahasiswa: mahasiswa juga dikeluarkan dari kelas
// otomatis mata kuliah itu, supaya kembali "belum tes" dan ditempatkan ulang sesudah tes.
// Fungsi belum ada (v47 belum dijalankan): jalur lama, hanya menghapus pengerjaan.
export async function resetDiagnostik(userIds: string[], courseId: number): Promise<{ dihapus: number; dikeluarkan: number; jalurLama?: boolean }> {
  if (!isSupabaseConfigured) throw new Error('Reset tes diagnostik butuh koneksi Supabase.')
  if (userIds.length === 0) return { dihapus: 0, dikeluarkan: 0 }
  const rpc = await supabase.rpc('reset_diagnostik_mahasiswa', { p_ids: userIds, p_course: courseId })
  if (!rpc.error) {
    const baris = (Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) as { dihapus?: number; dikeluarkan?: number } | null
    return { dihapus: baris?.dihapus ?? 0, dikeluarkan: baris?.dikeluarkan ?? 0 }
  }
  // hanya "fungsi tidak ditemukan"; galat lain (mis. izin) dilempar supaya tidak diam-diam jatuh ke jalur lama
  if (rpc.error.code !== 'PGRST202' && rpc.error.code !== '42883') throw rpc.error
  const { data, error } = await supabase
    .from('quiz_attempts')
    .delete()
    .eq('kind', 'pre')
    .eq('course_id', courseId)
    .in('user_id', userIds)
    .select('id')
  if (error) throw error
  return { dihapus: data?.length ?? 0, dikeluarkan: 0, jalurLama: true }
}

/**
 * Hapus akun mahasiswa beserta seluruh pengerjaannya (antrean #174). Lewat
 * fungsi SQL hapus_mahasiswa (migration_v34): hanya dosen, hanya akun
 * mahasiswa di kelas miliknya (sejak v40 juga mahasiswa mata kuliahnya yang
 * belum berkelas). Mengembalikan jumlah akun yang benar-benar
 * terhapus. Tidak bisa dibatalkan.
 */
export async function hapusMahasiswa(userIds: string[]): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Menghapus akun butuh koneksi Supabase.')
  if (userIds.length === 0) return 0
  const { data, error } = await supabase.rpc('hapus_mahasiswa', { p_ids: userIds })
  if (error) {
    const belumAda = error.code === 'PGRST202' || error.code === '42883' || /hapus_mahasiswa/.test(error.message || '')
    throw new Error(belumAda ? 'Fungsi hapus belum ada di basis data. Jalankan migration_v34_hapus_mahasiswa.sql di Supabase dulu.' : error.message)
  }
  return typeof data === 'number' ? data : 0
}

// ── Aksi dosen untuk akun mahasiswa (antrean #246, migration_v45) ──
// Untuk mahasiswa yang mendaftar dengan email rekaan dan tidak bisa
// mengonfirmasi akunnya. Pengamannya di fungsi SQL: hanya dosen pengampu
// (is_dosen_of) dan hanya akun mahasiswa.
function galatV45(error: { code?: string; message?: string }): Error {
  const belumAda = error.code === 'PGRST202' || error.code === '42883'
  return new Error(belumAda ? 'Fungsi akun belum ada di basis data. Jalankan migration_v45_aksi_dosen_akun.sql di Supabase dulu.' : error.message || 'Gagal')
}

/** Id mahasiswa (dari `userIds`) yang emailnya belum dikonfirmasi. Kosong bila fungsi belum ada atau mode demo. */
export async function fetchBelumKonfirmasi(userIds: string[]): Promise<Set<string>> {
  if (!isSupabaseConfigured || userIds.length === 0) return new Set()
  const { data, error } = await supabase.rpc('status_konfirmasi_mahasiswa', { p_ids: userIds })
  if (error) return new Set()
  return new Set(((data ?? []) as Array<{ id: string; terkonfirmasi: boolean }>).filter((r) => !r.terkonfirmasi).map((r) => r.id))
}

/** Konfirmasi akun mahasiswa terpilih. Mengembalikan jumlah akun yang benar-benar berubah. */
export async function konfirmasiAkun(userIds: string[]): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Mengonfirmasi akun butuh koneksi Supabase.')
  if (userIds.length === 0) return 0
  const { data, error } = await supabase.rpc('konfirmasi_akun_mahasiswa', { p_ids: userIds })
  if (error) throw galatV45(error)
  return typeof data === 'number' ? data : 0
}

export const MIN_SANDI_SEMENTARA = 8
export const MAKS_SANDI_SEMENTARA = 72 // bcrypt hanya memakai 72 byte pertama

/** Ganti kata sandi satu mahasiswa dengan sandi sementara ketikan dosen. Sandi tidak disimpan di aplikasi. */
export async function aturSandiMahasiswa(userId: string, sandi: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Mengatur ulang kata sandi butuh koneksi Supabase.')
  if (sandi.length < MIN_SANDI_SEMENTARA || !sandi.trim() || new TextEncoder().encode(sandi).length > MAKS_SANDI_SEMENTARA) {
    throw new Error(`Kata sandi sementara minimal ${MIN_SANDI_SEMENTARA} karakter, paling banyak ${MAKS_SANDI_SEMENTARA} byte, dan tidak boleh hanya spasi.`)
  }
  const { error } = await supabase.rpc('atur_sandi_mahasiswa', { p_id: userId, p_sandi: sandi })
  if (error) throw galatV45(error)
}
