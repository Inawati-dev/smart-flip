import { supabase, isSupabaseConfigured } from './supabase'

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

/** Daftar mata kuliah aktif. Sebelum v23 jalan: satu mata kuliah bawaan supaya halaman tetap hidup. */
export async function fetchCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured) return DEMO_COURSES
  try {
    const { data, error } = await supabase.from('courses').select('*').eq('is_active', true).order('order_num')
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

export async function updateCourse(id: number, patch: Partial<Pick<Course, 'code' | 'name' | 'description' | 'is_active'>>): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Mengubah mata kuliah butuh koneksi Supabase.')
  const { error } = await supabase.from('courses').update(patch).eq('id', id)
  if (error) throw error
}

/** Hapus mata kuliah beserta topik dan asesmennya (ON DELETE CASCADE di DB). */
export async function deleteCourse(id: number): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Menghapus mata kuliah butuh koneksi Supabase.')
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}
