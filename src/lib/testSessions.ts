import { supabase, isSupabaseConfigured } from './supabase'

// Tes khusus berkode (spec §4.6, §9 WP6b) - satu-satunya tes yang memakai
// kode; pre-test dan formatif tidak. Baca/tulis `test_sessions` (dosen,
// lewat RLS langsung - lihat migration_v18) dan dua RPC SECURITY DEFINER
// yang jadi satu-satunya pintu mahasiswa: verify_test_code (tidak ada
// policy SELECT untuk mereka, sama pola dosen_invite_codes di
// src/lib/inviteCode.ts) dan session_results (dosen pemilik sesi saja).

export type SessionKind = 'post' | 'campuran'

export interface TestSession {
  id: string
  course_id?: number
  name: string
  kind: SessionKind
  module_ids: number[]
  class_ids: string[]
  code: string
  is_open: boolean
  open_from: string | null
  open_until: string | null
  shuffle: boolean
  single_attempt: boolean
  dosen_id: string
  created_at: string
}

export interface CreateSessionInput {
  name: string
  kind: SessionKind
  moduleIds: number[]
  classIds: string[]
  openFrom: string | null
  openUntil: string | null
  shuffle: boolean
  singleAttempt: boolean
  dosenId: string
  /** Mata kuliah (v23). */
  courseId?: number
}

export interface VerifiedSession {
  session_id: string
  kind: SessionKind
  module_ids: number[]
  name: string
  shuffle: boolean
  single_attempt: boolean
}

export interface SessionResult {
  user_id: string
  full_name: string
  score: number
  attempted_at: string
}

// Tanpa 0/O/1/I - karakter yang gampang tertukar saat kode dibacakan atau
// diketik ulang (pola sama src/lib/kelas.ts's generateClassCode, alfabetnya
// beda: spec WP6b eksplisit minta L ikut tersedia).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

// True saat tabel/fungsi migration_v18 belum ada (deploy lebih baru dari
// migrasinya) - 42P01 tabel hilang, 42883 fungsi hilang. Sama semangat
// isMissingKindColumn di kuisSoal.ts/quizAttempts.ts: jangan sampai halaman
// rusak total hanya karena migrasi belum sempat dijalankan Johan.
function isMissingSchema(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42P01' || err.code === '42883') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('could not find')
}

let warnedMissingSchema = false
function warnOnceMissingSchema(context: string, e: unknown): void {
  if (warnedMissingSchema) return
  warnedMissingSchema = true
  console.warn(`[testSessions] ${context} - migration_v18 belum jalan?`, e)
}

export async function fetchSessionsByDosen(courseId?: number): Promise<TestSession[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) return []
    let query = supabase.from('test_sessions').select('*').eq('dosen_id', uid).order('created_at', { ascending: false })
    if (courseId != null) query = query.eq('course_id', courseId)
    let { data, error } = await query
    if (error && courseId != null && (error.code === '42703' || /course_id/.test(error.message))) {
      ;({ data, error } = await supabase.from('test_sessions').select('*').eq('dosen_id', uid).order('created_at', { ascending: false }))
    }
    if (error) throw error
    return (data as TestSession[]) ?? []
  } catch (e) {
    if (isMissingSchema(e)) warnOnceMissingSchema('fetchSessionsByDosen', e)
    else console.warn('[testSessions] fetchSessionsByDosen gagal:', e)
    return []
  }
}

// Kode dibuat di klien lalu diinsert - UNIQUE (code) di DB adalah penjaga
// sebenarnya; tabrakan (23505) memicu satu kali coba ulang dengan kode baru
// sebelum menyerah, karena ruang kode (33^6 ≈ 1,3 miliar) membuat tabrakan
// kedua nyaris mustahil.
export async function createSession(data: CreateSessionInput): Promise<TestSession> {
  if (!isSupabaseConfigured) {
    throw new Error('Membuat sesi tes butuh koneksi Supabase - tidak tersedia di mode demo.')
  }
  const row = {
    name: data.name,
    kind: data.kind,
    module_ids: data.moduleIds,
    class_ids: data.classIds,
    is_open: true,
    open_from: data.openFrom,
    open_until: data.openUntil,
    shuffle: data.shuffle,
    single_attempt: data.singleAttempt,
    dosen_id: data.dosenId,
    ...(data.courseId != null ? { course_id: data.courseId } : {}),
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: inserted, error } = await supabase
      .from('test_sessions')
      .insert({ ...row, code: generateCode() })
      .select('*')
      .single()
    if (!error) return inserted as TestSession
    if (error.code !== '23505' || attempt === 1) throw error
  }
  throw new Error('Gagal membuat kode sesi yang unik, coba lagi.')
}

export async function setSessionOpen(id: string, isOpen: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Mengubah status sesi butuh koneksi Supabase - tidak tersedia di mode demo.')
  }
  const { error } = await supabase.from('test_sessions').update({ is_open: isOpen }).eq('id', id)
  if (error) throw error
}

// Verifikasi kode mahasiswa lewat RPC SECURITY DEFINER - kosong (0 baris)
// dan RPC belum ada keduanya dibalas `null`, supaya TesKhusus.tsx cukup
// menampilkan satu pesan "Kode tidak dikenal…" untuk keduanya.
export async function verifyTestCode(code: string): Promise<VerifiedSession | null> {
  if (!isSupabaseConfigured) return null
  const trimmed = code.trim()
  if (!trimmed) return null
  try {
    const { data, error } = await supabase.rpc('verify_test_code', { p_code: trimmed })
    if (error) throw error
    const rows = (data as VerifiedSession[]) ?? []
    return rows[0] ?? null
  } catch (e) {
    if (isMissingSchema(e)) warnOnceMissingSchema('verifyTestCode', e)
    else console.warn('[testSessions] verifyTestCode gagal:', e)
    return null
  }
}

export async function fetchSessionResults(sessionId: string): Promise<SessionResult[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase.rpc('session_results', { p_session: sessionId })
    if (error) throw error
    return (data as SessionResult[]) ?? []
  } catch (e) {
    if (isMissingSchema(e)) warnOnceMissingSchema('fetchSessionResults', e)
    else console.warn('[testSessions] fetchSessionResults gagal:', e)
    return []
  }
}

// Pengecekan "sudah pernah mengerjakan sesi ini" untuk single_attempt (spec
// §4.6) - baca langsung tabel quiz_attempts (bukan RPC): policy
// "user manage own attempts" (schema.sql) sudah mengizinkan mahasiswa
// membaca baris miliknya sendiri, dan fetchAttemptsByKind (quizAttempts.ts)
// tidak menyeleksi session_id sehingga tidak bisa dipakai untuk ini.
export async function fetchMyAttemptForSession(sessionId: string): Promise<{ score: number } | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) return null
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('session_id', sessionId)
      .eq('user_id', uid)
      .maybeSingle()
    if (error) throw error
    return data as { score: number } | null
  } catch (e) {
    if (isMissingSchema(e)) warnOnceMissingSchema('fetchMyAttemptForSession', e)
    else console.warn('[testSessions] fetchMyAttemptForSession gagal:', e)
    return null
  }
}
