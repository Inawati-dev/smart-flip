import { supabase, isSupabaseConfigured } from './supabase'
import { buangBerkasYatim } from './manajemen'

// Mata kuliah (antrean #68, Johan 16 Sep 2026). Induk dari topik: tiap
// mata kuliah punya topik 1..n sendiri (modules.course_id), soal pre/post/
// kelompok, tes khusus, tes kelompok, dan tugas akhir sendiri. Skema:
// migration_v23. Pilihan mata kuliah aktif disimpan di localStorage dan
// dibagikan lewat CourseContext.

export interface Course {
  id: number
  code: string
  name: string
  description: string
  dosen_id: string | null
  order_num: number
  is_active: boolean
  /** Batas skor (v27, antrean #136); kosong sebelum migrasi jalan, lihat lib/ambang.ts. */
  ambang_diagnostik?: number | null
  ambang_formatif?: number | null
  /** Tanggal pertemuan pertama 'YYYY-MM-DD' (v29, antrean #153); kosong = tanpa kunci tanggal. */
  mulai_kuliah?: string | null
  /** Watermark nama dan NIM pembaca di pembaca PDF (v30, antrean #157). */
  watermark_pdf?: boolean | null
  /** Isi watermark (v35, antrean #177): nama dan NIM pembaca (bawaan), teks dosen, atau gambar unggahan. */
  watermark_jenis?: 'nama' | 'teks' | 'gambar' | null
  watermark_teks?: string | null
  /** Data URL PNG, sudah dikecilkan dan ditipiskan di peramban (components/WatermarkModal.tsx). */
  watermark_gambar?: string | null
}

export const DEMO_COURSES: Course[] = [
  {
    id: 1,
    code: 'MPP',
    name: 'Metode Penelitian dan Pengembangan',
    description: 'Penelitian dan pengembangan (R&D) untuk pendidikan vokasi.',
    dosen_id: null,
    order_num: 1,
    is_active: true,
  },
  {
    id: 2,
    code: 'PD',
    name: 'Perpustakaan Digital',
    description: 'Konsep, koleksi, metadata, perangkat lunak, dan layanan perpustakaan digital.',
    dosen_id: null,
    order_num: 2,
    is_active: true,
  },
]

const COURSE_KEY = 'sfp_course'

export function getSavedCourseId(): number | null {
  try {
    const v = localStorage.getItem(COURSE_KEY)
    const n = v ? parseInt(v, 10) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function saveCourseId(id: number): void {
  try {
    localStorage.setItem(COURSE_KEY, String(id))
  } catch {
    /* localStorage tidak tersedia */
  }
}

/** True bila galat Supabase berarti tabel/kolom v23 belum ada. */
export function isMissingCourseSchema(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42P01' || err.code === '42703') return true
  const msg = (err.message || '').toLowerCase()
  return (msg.includes('course') && (msg.includes('does not exist') || msg.includes('could not find'))) || msg.includes('schema cache')
}

let warned = false
function warnOnce(e: unknown): void {
  if (warned) return
  warned = true
  console.warn('[courses] migration_v23 belum jalan? Memakai satu mata kuliah bawaan.', e)
}

/**
 * Daftar mata kuliah. Mahasiswa hanya mendapat yang dibuka (`is_active`);
 * dosen memanggil dengan `termasukDitutup` supaya yang ditutup tetap
 * terlihat dan bisa dibuka lagi (antrean #141). Saringan ini di sisi
 * aplikasi: policy "all read courses" di v23 masih mengizinkan baca semua.
 * Sebelum v23 jalan: satu mata kuliah bawaan supaya halaman tetap hidup.
 */
export async function fetchCourses(termasukDitutup = false): Promise<Course[]> {
  if (!isSupabaseConfigured) return DEMO_COURSES
  try {
    let q = supabase.from('courses').select('*')
    if (!termasukDitutup) q = q.eq('is_active', true)
    const { data, error } = await q.order('order_num')
    if (error) throw error
    return (data as Course[]) ?? []
  } catch (e) {
    if (isMissingCourseSchema(e)) warnOnce(e)
    else console.warn('[courses] fetchCourses gagal:', e)
    return [DEMO_COURSES[0]]
  }
}

export async function createCourse(input: { code: string; name: string; description: string; dosenId: string | null }): Promise<Course> {
  if (!isSupabaseConfigured) throw new Error('Menambah mata kuliah butuh koneksi Supabase, tidak tersedia di mode demo.')
  const { data: last } = await supabase.from('courses').select('order_num').order('order_num', { ascending: false }).limit(1).maybeSingle()
  const orderNum = ((last?.order_num as number | undefined) ?? 0) + 1
  const { data, error } = await supabase
    .from('courses')
    .insert({ code: input.code.trim().toUpperCase(), name: input.name.trim(), description: input.description.trim(), dosen_id: input.dosenId, order_num: orderNum })
    .select('*')
    .single()
  if (error) throw error
  return data as Course
}

export async function updateCourse(id: number, patch: Partial<Pick<Course, 'code' | 'name' | 'description' | 'is_active' | 'ambang_diagnostik' | 'ambang_formatif' | 'watermark_pdf' | 'watermark_jenis' | 'watermark_teks' | 'watermark_gambar'>>): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Mengubah mata kuliah butuh koneksi Supabase.')
  const { data, error } = await supabase.from('courses').update(patch).eq('id', id).select('id')
  if (error) throw error
  // RLS v48 (antrean #250) menolak diam-diam (0 baris) bila pemanggil bukan pengampu
  if (!data?.length) throw new Error(BUKAN_PENGAMPU)
}

/** Pesan bila basis data menolak perubahan mata kuliah karena pemanggil bukan pengampunya (v48). */
export const BUKAN_PENGAMPU = 'Hanya dosen pengampu mata kuliah ini yang boleh mengubah atau menghapusnya.'

/** Hapus mata kuliah beserta topik dan asesmennya (ON DELETE CASCADE di DB). */
export async function deleteCourse(id: number): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Menghapus mata kuliah butuh koneksi Supabase.')
  // Topiknya ikut terhapus di DB (cascade), jadi alamat PDF dan videonya
  // dicatat dulu supaya berkasnya bisa dibuang sesudahnya (antrean #168).
  let berkas: Array<string | null> = []
  try {
    // `*` supaya isian pertemuan kedua (v50, antrean #271) ikut dibersihkan bila kolomnya sudah ada.
    const { data } = await supabase.from('modules').select('*').eq('course_id', id)
    berkas = (data ?? []).flatMap((m) => [m.pdf_path, m.video_url, m.pdf_path_2, m.video_url_2] as Array<string | null>)
  } catch {
    // tidak bisa membaca daftar topik = tidak ada yang dibersihkan
  }
  const { data: terhapus, error } = await supabase.from('courses').delete().eq('id', id).select('id')
  if (error) throw error
  if (!terhapus?.length) throw new Error(BUKAN_PENGAMPU)
  await buangBerkasYatim(berkas)
}

// ── Kode mata kuliah untuk mendaftar (antrean #228, migration_v40) ──
// Satu kode per mata kuliah, dibagikan dosen ke semua mahasiswa. Disimpan di
// tabel course_join_codes yang tertutup bagi klien; tiga fungsi SQL di bawah
// ini satu-satunya pintunya (pola sama dengan kode undangan dosen, lib/inviteCode.ts).

/** Sama dengan pemeriksaan di set_course_code (v40): 6-20 huruf, angka, atau tanda hubung. */
export function rapikanKodeMataKuliah(kode: string): string {
  return kode.trim().toUpperCase()
}
export function kodeMataKuliahSah(kode: string): boolean {
  return /^[A-Z0-9-]{6,20}$/.test(rapikanKodeMataKuliah(kode))
}

// Tanpa huruf yang mirip (0/O, 1/I/L) supaya kode yang dibacakan tidak salah ketik.
const ALFABET_KODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function buatKodeAcak(panjang = 8): string {
  let kode = ''
  for (let i = 0; i < panjang; i++) kode += ALFABET_KODE[Math.floor(Math.random() * ALFABET_KODE.length)]
  return kode
}

/**
 * Cek kode sebelum mendaftar. 'belum_bisa_dicek' = fungsi belum ada atau
 * jaringan gagal: pendaftaran tidak diblokir di sini, pemicu
 * handle_new_user() di basis data tetap menolak kode yang salah.
 */
export async function cekKodeMataKuliah(kode: string): Promise<'ok' | 'tidak_ada' | 'belum_bisa_dicek'> {
  if (!isSupabaseConfigured) return 'belum_bisa_dicek'
  try {
    const { data, error } = await supabase.rpc('verify_course_code', { submitted: rapikanKodeMataKuliah(kode) })
    if (error) return 'belum_bisa_dicek'
    return data === true ? 'ok' : 'tidak_ada'
  } catch {
    return 'belum_bisa_dicek'
  }
}

/** Kode mata kuliah yang berlaku (dosen saja); null = belum diatur atau mode demo. */
export async function getKodeMataKuliah(courseId: number): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.rpc('get_course_code', { p_course_id: courseId })
  if (error) throw error
  return (data as string | null) ?? null
}

/** Ganti kode mata kuliah (dosen saja). Kode lama langsung tidak berlaku. */
export async function setKodeMataKuliah(courseId: number, kode: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Mengatur kode mata kuliah butuh koneksi Supabase, tidak tersedia di mode demo.')
  const { data, error } = await supabase.rpc('set_course_code', { p_course_id: courseId, p_code: rapikanKodeMataKuliah(kode) })
  if (error) {
    const belumAda = error.code === 'PGRST202' || error.code === '42883'
    throw new Error(belumAda ? 'Fungsi kode mata kuliah belum ada di basis data. Jalankan migration_v40_kelas_otomatis.sql di Supabase dulu.' : error.message)
  }
  return (data as string | null) ?? rapikanKodeMataKuliah(kode)
}
