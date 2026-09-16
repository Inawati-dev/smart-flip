import { supabase, isSupabaseConfigured } from './supabase'
import { computeNGain, categorizeNGain, type NGainCategory } from './ngain'

// Sumber data halaman Asesmen dosen (WP7,
// docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §5.3):
// tabel `quiz_attempts` yang sudah ada, disaring per `kind`, tidak ada
// tabel/migrasi baru. Cakupan barisnya dibatasi RLS (migration_v13:
// is_dosen_of), jadi select polos di sini otomatis hanya mengembalikan
// mahasiswa dari kelas yang dosen ini pegang; tidak perlu filter manual.

export interface AsesmenAttempt {
  id: number
  userId: string
  nama: string
  kelas: string | null
  moduleId: number
  modulJudul: string
  score: number
  /** Kolom generated di DB: `score >= 80`, pasangan PASS_SCORE di src/lib/quizAttempts.ts. */
  passed: boolean
  attemptedAt: string
}

export interface ModulRekap {
  moduleId: number
  judul: string
  jumlahPengerjaan: number
  jumlahMahasiswa: number
  rataRata: number
  tertinggi: number
  terendah: number
  lulus: number
  persenLulus: number
}

// True kalau errornya "kolom kind belum ada", dijalankan sebelum migrasi
// v17 (database/migration_v17_bank_soal.sql). Pola yang sama dengan
// src/lib/kuisSoal.ts dan src/lib/quizAttempts.ts (isMissingKindColumn).
function isMissingKindColumn(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42703') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('column') && msg.includes('kind')
}

/** Rekap agregat per modul untuk tabel "Tes Formatif per Modul". Ambang lulus = PASS_SCORE (80), dari kolom `passed` generated di DB. */
export function rekapPerModul(attempts: AsesmenAttempt[]): ModulRekap[] {
  const byModul = new Map<number, AsesmenAttempt[]>()
  for (const a of attempts) {
    const list = byModul.get(a.moduleId)
    if (list) list.push(a)
    else byModul.set(a.moduleId, [a])
  }

  return [...byModul.entries()]
    .map(([moduleId, list]) => {
      const scores = list.map((a) => a.score)
      const lulus = list.filter((a) => a.passed).length
      return {
        moduleId,
        judul: list[0].modulJudul,
        jumlahPengerjaan: list.length,
        jumlahMahasiswa: new Set(list.map((a) => a.userId)).size,
        rataRata: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        tertinggi: Math.max(...scores),
        terendah: Math.min(...scores),
        lulus,
        persenLulus: Math.round((lulus / list.length) * 100),
      }
    })
    .sort((a, b) => a.moduleId - b.moduleId)
}

// Ambil baris quiz_attempts kind='formatif' saja (bukan pre/post, module_id
// keduanya bisa NULL sejak v17 dan tidak relevan untuk rekap per modul).
// Toleran terhadap deploy sebelum migrasi v17: kalau kolom kind belum ada,
// jatuh ke query lama tanpa filter (baris lama memang semuanya formatif).
async function queryFormatifAttempts() {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, module_id, score, passed, attempted_at')
      .eq('kind', 'formatif')
      .order('attempted_at', { ascending: false })
    if (error) throw error
    return data ?? []
  } catch (e) {
    if (!isMissingKindColumn(e)) throw e
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('id, user_id, module_id, score, passed, attempted_at')
      .order('attempted_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
}

// courseId (v23): hanya pengerjaan topik milik mata kuliah itu. Kolom
// modules.course_id belum ada -> semua topik dianggap mata kuliah 1.
export async function fetchAsesmenAttempts(courseId?: number): Promise<AsesmenAttempt[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [attemptsRows, studentsRes, modulesRes] = await Promise.all([
      queryFormatifAttempts(),
      // Embed eksplisit lewat nama FK: profiles<->classes punya DUA relasi,
      // embed tanpa kualifikasi ditolak PostgREST (PGRST201). Lihat catatan
      // yang sama di analitik.ts fetchStudentStats().
      supabase
        .from('profiles')
        .select('id, full_name, classes!profiles_class_id_fkey(name)')
        .eq('role', 'mahasiswa'),
      supabase.from('modules').select('id, title, course_id'),
    ])

    const modulCourse = new Map<number, number>()
    for (const m of modulesRes.data ?? []) modulCourse.set(m.id as number, ((m as { course_id?: number }).course_id as number) ?? 1)

    const namaById = new Map<string, string>()
    const kelasById = new Map<string, string | null>()
    for (const s of studentsRes.data ?? []) {
      namaById.set(s.id as string, (s.full_name as string) || 'Tanpa nama')
      const rel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
      kelasById.set(s.id as string, Array.isArray(rel) ? rel[0]?.name ?? null : rel?.name ?? null)
    }
    const judulById = new Map<number, string>()
    for (const m of modulesRes.data ?? []) {
      judulById.set(m.id as number, (m.title as string) || `Topik ${m.id}`)
    }

    return attemptsRows
      .filter((r) => r.module_id != null)
      .filter((r) => courseId == null || (modulCourse.get(r.module_id as number) ?? 1) === courseId)
      .map((r) => ({
        id: r.id as number,
        userId: r.user_id as string,
        nama: namaById.get(r.user_id as string) ?? 'Mahasiswa',
        kelas: kelasById.get(r.user_id as string) ?? null,
        moduleId: r.module_id as number,
        modulJudul: judulById.get(r.module_id as number) ?? `Topik ${r.module_id}`,
        score: r.score as number,
        passed: !!r.passed,
        attemptedAt: r.attempted_at as string,
      }))
  } catch (e) {
    console.warn('[asesmen] fetchAsesmenAttempts gagal:', e)
    return null
  }
}

// ── Peningkatan skor kelas (pre-test → post-test) ──────────────────────
// Istilah UI: "peningkatan skor" (bukan "N-Gain", lihat spec §1.1). Rumus dan
// kategori tetap dari src/lib/ngain.ts (Hake 1998), hanya dibungkus di sini
// supaya pre-test = 100 DILEWATI dari rata-rata kelas (bukan dihitung 0
// seperti computeNGain, karena pembaginya nol/mustahil naik lagi).

export interface AttemptPrePostRow {
  userId: string
  nama: string
  kelasId: string | null
  pre?: number
  post?: number
}

export interface PeningkatanMahasiswa {
  userId: string
  nama: string
  kelasId: string | null
  pre: number | null
  post: number | null
  /** null → tampil "—" (belum pre, belum post, atau pre=100/dilewati). */
  peningkatan: number | null
  kategori: NGainCategory | null
}

export interface PeningkatanKelas {
  perMahasiswa: PeningkatanMahasiswa[]
  rataPre: number | null
  rataPost: number | null
  rataPeningkatan: number | null
  kategoriKelas: NGainCategory | null
  sebaran: { tinggi: number; sedang: number; rendah: number }
}

/** Fungsi murni: dari baris pre/post per mahasiswa, hitung gain+kategori per orang, rata-rata kelas, dan sebaran kategori. */
export function hitungPeningkatanKelas(rows: AttemptPrePostRow[]): PeningkatanKelas {
  const perMahasiswa: PeningkatanMahasiswa[] = rows.map((r) => {
    const pre = r.pre ?? null
    const post = r.post ?? null
    let peningkatan: number | null = null
    let kategori: NGainCategory | null = null
    // pre=100 dilewati: ruang naik yang tersisa nol, rumus (post-pre)/(100-pre)
    // tidak terdefinisi, bukan digenapkan ke 0 seperti computeNGain.
    if (pre != null && post != null && pre < 100) {
      const hasil = computeNGain(pre, post, 100)
      peningkatan = hasil.gain
      kategori = hasil.category
    }
    return { userId: r.userId, nama: r.nama, kelasId: r.kelasId, pre, post, peningkatan, kategori }
  })

  const preValues = perMahasiswa.map((m) => m.pre).filter((v): v is number => v != null)
  const postValues = perMahasiswa.map((m) => m.post).filter((v): v is number => v != null)
  const gains = perMahasiswa.map((m) => m.peningkatan).filter((v): v is number => v != null)

  const rataPre = preValues.length ? preValues.reduce((a, b) => a + b, 0) / preValues.length : null
  const rataPost = postValues.length ? postValues.reduce((a, b) => a + b, 0) / postValues.length : null
  const rataPeningkatan = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null

  const sebaran = { tinggi: 0, sedang: 0, rendah: 0 }
  for (const m of perMahasiswa) {
    if (m.kategori) sebaran[m.kategori]++
  }

  return {
    perMahasiswa,
    rataPre,
    rataPost,
    rataPeningkatan,
    kategoriKelas: rataPeningkatan != null ? categorizeNGain(rataPeningkatan) : null,
    sebaran,
  }
}

// Ambil skor pre-test dan post-test tiap mahasiswa, digabung satu baris per
// orang. Sama seperti fetchAttemptsByKind di quizAttempts.ts: kalau kolom
// kind belum ada (belum migrasi v17), tidak ada cara membedakan pre/post
// dari data lama, kembalikan array kosong, bukan menebak.
// courseId (v23): pre/post per mata kuliah (quiz_attempts.course_id).
export async function fetchAttemptsPrePost(courseId?: number): Promise<AttemptPrePostRow[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    let attemptsQuery = supabase.from('quiz_attempts').select('user_id, score, kind, course_id').in('kind', ['pre', 'post'])
    if (courseId != null) attemptsQuery = attemptsQuery.eq('course_id', courseId)
    let [attemptsRes, studentsRes] = await Promise.all([
      attemptsQuery,
      supabase
        .from('profiles')
        .select('id, full_name, classes!profiles_class_id_fkey(name)')
        .eq('role', 'mahasiswa'),
    ])
    if (attemptsRes.error && (attemptsRes.error.code === '42703' || /course_id/.test(attemptsRes.error.message))) {
      attemptsRes = await supabase.from('quiz_attempts').select('user_id, score, kind, course_id').in('kind', ['pre', 'post'])
    }
    if (attemptsRes.error) {
      if (isMissingKindColumn(attemptsRes.error)) return []
      throw attemptsRes.error
    }

    const namaById = new Map<string, string>()
    const kelasById = new Map<string, string | null>()
    for (const s of studentsRes.data ?? []) {
      namaById.set(s.id as string, (s.full_name as string) || 'Tanpa nama')
      const rel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
      kelasById.set(s.id as string, Array.isArray(rel) ? rel[0]?.name ?? null : rel?.name ?? null)
    }

    const byUser = new Map<string, AttemptPrePostRow>()
    for (const r of attemptsRes.data ?? []) {
      const uid = r.user_id as string
      let row = byUser.get(uid)
      if (!row) {
        row = { userId: uid, nama: namaById.get(uid) ?? 'Mahasiswa', kelasId: kelasById.get(uid) ?? null }
        byUser.set(uid, row)
      }
      if (r.kind === 'pre') row.pre = r.score as number
      else if (r.kind === 'post') row.post = r.score as number
    }
    return [...byUser.values()]
  } catch (e) {
    console.warn('[asesmen] fetchAttemptsPrePost gagal:', e)
    return null
  }
}
