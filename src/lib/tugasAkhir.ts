import { supabase, isSupabaseConfigured } from './supabase'

// Tugas akhir (antrean #57 opsi A, keputusan Johan 16 Sep 2026). Menggantikan
// VARK di menu Asesmen mahasiswa. Dosen menulis satu brief proyek (judul,
// deskripsi, tenggat, rubrik), mahasiswa mengunggah berkas laporan plus
// tautan opsional, dosen menilai per kriteria rubrik. Skema: migration_v22.
// Berkas ada di bucket PRIVAT `tugas-akhir` (path <user_id>/...), dibaca
// lewat signed URL, bukan URL publik.

export interface RubrikKriteria {
  nama: string
  /** Bobot relatif, angka positif. Total rubrik tidak harus 100. */
  bobot: number
}

export interface FinalProject {
  id: string
  course_id?: number
  dosen_id: string
  title: string
  description: string
  deadline: string | null
  rubric: RubrikKriteria[]
  class_ids: string[]
  is_open: boolean
  created_at: string
}

export interface FinalSubmission {
  id: string
  project_id: string
  user_id: string
  file_path: string | null
  file_name: string | null
  link: string | null
  note: string | null
  submitted_at: string
  /** Nilai per kriteria 0..100, urutan sama dengan rubric. */
  scores: number[] | null
  total: number | null
  feedback: string | null
  graded_at: string | null
}

/** Baris kiriman untuk tabel dosen: kiriman plus nama dan kelas mahasiswa. */
export interface SubmissionDosenRow extends FinalSubmission {
  full_name: string
  class_id: string | null
}

export interface ProjectInput {
  title: string
  description: string
  deadline: string | null
  rubric: RubrikKriteria[]
  classIds: string[]
  /** Mata kuliah (v23). */
  courseId?: number
}

export const RUBRIK_BAWAAN: RubrikKriteria[] = [
  { nama: 'Kelengkapan laporan', bobot: 30 },
  { nama: 'Ketepatan metode', bobot: 30 },
  { nama: 'Analisis dan pembahasan', bobot: 25 },
  { nama: 'Tata tulis', bobot: 15 },
]

export const BERKAS_MAKS_MB = 20
export const BERKAS_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Rata-rata berbobot nilai per kriteria, dibulatkan 0..100. Null bila rubrik kosong atau ada nilai kosong. */
export function hitungTotal(rubric: RubrikKriteria[], scores: Array<number | null | undefined>): number | null {
  if (rubric.length === 0 || scores.length < rubric.length) return null
  let bobot = 0
  let jumlah = 0
  for (let i = 0; i < rubric.length; i++) {
    const s = scores[i]
    if (s == null || Number.isNaN(s)) return null
    const b = Math.max(0, rubric[i].bobot)
    bobot += b
    jumlah += Math.min(100, Math.max(0, s)) * b
  }
  if (bobot === 0) return null
  return Math.round(jumlah / bobot)
}

export function lewatTenggat(deadline: string | null, now: Date = new Date()): boolean {
  if (!deadline) return false
  return now.getTime() > new Date(deadline).getTime()
}

function isMissingSchema(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42P01' || err.code === '42883') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('could not find')
}

let warned = false
function warnOnce(context: string, e: unknown): void {
  if (warned) return
  warned = true
  console.warn(`[tugasAkhir] ${context}: migration_v22 belum jalan?`, e)
}

function parseProject(row: Record<string, unknown>): FinalProject {
  const rubric = Array.isArray(row.rubric) ? (row.rubric as RubrikKriteria[]) : []
  return { ...(row as unknown as FinalProject), rubric }
}

function parseSubmission(row: Record<string, unknown>): FinalSubmission {
  const scores = Array.isArray(row.scores) ? (row.scores as number[]) : null
  return { ...(row as unknown as FinalSubmission), scores }
}

// ── Dosen ──

export async function fetchProjectsDosen(courseId?: number): Promise<FinalProject[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) return []
    // Difilter dosen_id: policy baca "brief terbuka" juga berlaku untuk dosen,
    // jadi tanpa filter ini brief dosen lain yang terbuka ikut muncul.
    let query = supabase.from('tugas_akhir_briefs').select('*').eq('dosen_id', uid).order('created_at', { ascending: false })
    if (courseId != null) query = query.eq('course_id', courseId)
    let { data, error } = await query
    if (error && courseId != null && (error.code === '42703' || /course_id/.test(error.message))) {
      ;({ data, error } = await supabase.from('tugas_akhir_briefs').select('*').eq('dosen_id', uid).order('created_at', { ascending: false }))
    }
    if (error) throw error
    return (data ?? []).map((r) => parseProject(r as Record<string, unknown>))
  } catch (e) {
    if (isMissingSchema(e)) warnOnce('fetchProjectsDosen', e)
    else console.warn('[tugasAkhir] fetchProjectsDosen gagal:', e)
    return []
  }
}

export async function createProject(input: ProjectInput, dosenId: string): Promise<FinalProject> {
  if (!isSupabaseConfigured) throw new Error('Membuat tugas akhir butuh koneksi Supabase, tidak tersedia di mode demo.')
  const { data, error } = await supabase
    .from('tugas_akhir_briefs')
    .insert({
      dosen_id: dosenId,
      title: input.title,
      description: input.description,
      deadline: input.deadline,
      rubric: input.rubric,
      class_ids: input.classIds,
      is_open: true,
      ...(input.courseId != null ? { course_id: input.courseId } : {}),
    })
    .select('*')
    .single()
  if (error) throw error
  return parseProject(data as Record<string, unknown>)
}

export async function updateProject(id: string, patch: Partial<ProjectInput> & { isOpen?: boolean }): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Mengubah tugas akhir butuh koneksi Supabase.')
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.deadline !== undefined) row.deadline = patch.deadline
  if (patch.rubric !== undefined) row.rubric = patch.rubric
  if (patch.classIds !== undefined) row.class_ids = patch.classIds
  if (patch.isOpen !== undefined) row.is_open = patch.isOpen
  const { error } = await supabase.from('tugas_akhir_briefs').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteProject(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Menghapus tugas akhir butuh koneksi Supabase.')
  const { error } = await supabase.from('tugas_akhir_briefs').delete().eq('id', id)
  if (error) throw error
}

export async function fetchSubmissionsDosen(projectId: string): Promise<SubmissionDosenRow[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('tugas_akhir_submissions')
      .select('*, profiles!tugas_akhir_submissions_user_id_fkey(full_name, class_id)')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>
      const p = (row.profiles as { full_name?: string; class_id?: string | null } | null) ?? null
      return { ...parseSubmission(row), full_name: p?.full_name ?? 'Tanpa nama', class_id: p?.class_id ?? null }
    })
  } catch (e) {
    if (isMissingSchema(e)) warnOnce('fetchSubmissionsDosen', e)
    else console.warn('[tugasAkhir] fetchSubmissionsDosen gagal:', e)
    return []
  }
}

/** Dosen menilai: nilai per kriteria (0..100, urut rubrik), total dihitung di sini lewat hitungTotal. */
export async function gradeSubmission(
  submissionId: string,
  rubric: RubrikKriteria[],
  scores: number[],
  feedback: string,
): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Menilai butuh koneksi Supabase.')
  const total = hitungTotal(rubric, scores)
  if (total == null) throw new Error('Semua kriteria harus diberi nilai 0 sampai 100.')
  const { error } = await supabase.rpc('grade_submission', {
    p_submission: submissionId,
    p_scores: scores,
    p_total: total,
    p_feedback: feedback,
  })
  if (error) throw error
  return total
}

// ── Mahasiswa ──

/** Brief yang terbuka untuk mahasiswa ini (RLS menyaring kelas). Yang terbaru bila lebih dari satu. */
export async function fetchProjectMhs(courseId?: number): Promise<FinalProject | null> {
  if (!isSupabaseConfigured) return null
  try {
    let query = supabase.from('tugas_akhir_briefs').select('*').eq('is_open', true).order('created_at', { ascending: false }).limit(1)
    if (courseId != null) query = query.eq('course_id', courseId)
    let { data, error } = await query.maybeSingle()
    if (error && courseId != null && (error.code === '42703' || /course_id/.test(error.message))) {
      ;({ data, error } = await supabase.from('tugas_akhir_briefs').select('*').eq('is_open', true).order('created_at', { ascending: false }).limit(1).maybeSingle())
    }
    if (error) throw error
    return data ? parseProject(data as Record<string, unknown>) : null
  } catch (e) {
    if (isMissingSchema(e)) warnOnce('fetchProjectMhs', e)
    else console.warn('[tugasAkhir] fetchProjectMhs gagal:', e)
    return null
  }
}

export async function fetchMySubmission(projectId: string): Promise<FinalSubmission | null> {
  if (!isSupabaseConfigured) return null
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return null
  const { data, error } = await supabase
    .from('tugas_akhir_submissions')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', uid)
    .maybeSingle()
  if (error) {
    if (isMissingSchema(error)) warnOnce('fetchMySubmission', error)
    return null
  }
  return data ? parseSubmission(data as Record<string, unknown>) : null
}

function ekstensi(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name)
  return m ? m[1].toLowerCase() : 'pdf'
}

/**
 * Kirim atau perbarui kiriman. Berkas baru menggantikan berkas lama di
 * Storage; tanpa berkas baru, berkas lama dipertahankan. Kiriman yang sudah
 * dinilai tidak bisa dikirim ulang (RLS menolak UPDATE bila graded_at terisi).
 */
export async function submitTugasAkhir(input: {
  projectId: string
  file: File | null
  link: string
  note: string
}): Promise<FinalSubmission> {
  if (!isSupabaseConfigured) throw new Error('Mengirim tugas akhir butuh koneksi Supabase, tidak tersedia di mode demo.')
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Belum masuk.')
  const existing = await fetchMySubmission(input.projectId)
  if (existing?.graded_at) throw new Error('Kiriman sudah dinilai, tidak bisa dikirim ulang.')

  let filePath = existing?.file_path ?? null
  let fileName = existing?.file_name ?? null
  if (input.file) {
    if (input.file.size > BERKAS_MAKS_MB * 1024 * 1024) {
      throw new Error(`Berkas melebihi ${BERKAS_MAKS_MB} MB.`)
    }
    const path = `${uid}/${input.projectId}-${Date.now()}.${ekstensi(input.file.name)}`
    const { error: upErr } = await supabase.storage.from('tugas-akhir').upload(path, input.file, { upsert: true })
    if (upErr) throw upErr
    if (filePath && filePath !== path) {
      try {
        await supabase.storage.from('tugas-akhir').remove([filePath])
      } catch (e) {
        console.warn('[tugasAkhir] gagal menghapus berkas lama:', e)
      }
    }
    filePath = path
    fileName = input.file.name
  }

  const row = {
    project_id: input.projectId,
    user_id: uid,
    file_path: filePath,
    file_name: fileName,
    link: input.link.trim() || null,
    note: input.note.trim() || null,
    submitted_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('tugas_akhir_submissions')
    .upsert(row, { onConflict: 'project_id,user_id' })
    .select('*')
    .single()
  if (error) throw error
  return parseSubmission(data as Record<string, unknown>)
}

/** URL sementara (1 jam) untuk membuka berkas di bucket privat. */
export async function signedFileUrl(path: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Butuh koneksi Supabase.')
  const { data, error } = await supabase.storage.from('tugas-akhir').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}
