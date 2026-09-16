import { supabase, isSupabaseConfigured } from './supabase'
import { PASS_SCORE } from './quizAttempts'

// Dashboard dosen = aktivitas kelas (spec §5.0, §9 WP9). Fungsi murni di
// bawah (gabungKejadian, ringkasKelas, perluPerhatian, matriksProgres) hanya
// tahu bentuk data "lite" flat — pemetaan dari baris Supabase (join classes,
// dsb.) terjadi sekali di fetchSumberAktivitas, supaya fungsi murninya mudah
// diuji dengan data buatan tanpa mock Supabase.

export type JenisKejadian =
  | 'pre'
  | 'formatif-lulus'
  | 'formatif-remedial'
  | 'post'
  | 'tes-khusus'
  | 'modul'
  | 'video'
  | 'vark'
  | 'gabung'

export interface Kejadian {
  waktu: string // ISO
  userId: string
  nama: string
  kelasId: string | null
  kelasNama: string | null
  jenis: JenisKejadian
  keterangan: string
  skor?: number
}

export interface ProfileLite {
  id: string
  fullName: string
  classId: string | null
  kelasNama: string | null
  createdAt: string
  varkCompletedAt: string | null
}

export interface AttemptLite {
  userId: string
  moduleId: number | null
  score: number
  kind: 'pre' | 'formatif' | 'post'
  attemptedAt: string
  sessionId: string | null
}

export interface ProgressLite {
  userId: string
  moduleId: number
  currentPage: number
  lastOpened: string | null
}

export interface VideoProgressLite {
  userId: string
  moduleId: number
  seconds: number
  done: boolean
  updatedAt: string
}

export interface ModuleLite {
  id: number
  orderNum: number
  title: string
}

export interface SumberAktivitas {
  attempts: AttemptLite[]
  progress: ProgressLite[]
  video: VideoProgressLite[]
  profiles: ProfileLite[]
  modules: ModuleLite[]
  passScore?: number
}

function moduleOf(modules: ModuleLite[], id: number | null): ModuleLite | undefined {
  return id == null ? undefined : modules.find((m) => m.id === id)
}

function profileOf(profiles: ProfileLite[], id: string): ProfileLite | undefined {
  return profiles.find((p) => p.id === id)
}

// Umpan aktivitas (spec §5.0 poin 3): satu baris per kejadian, gabungan dari
// quiz_attempts (pre/formatif/post/tes-khusus), user_progress (modul dibaca),
// video_progress (video ditonton), dan profiles (VARK selesai, gabung kelas).
export function gabungKejadian(sumber: SumberAktivitas): Kejadian[] {
  const passScore = sumber.passScore ?? PASS_SCORE
  const items: Kejadian[] = []

  for (const a of sumber.attempts) {
    const p = profileOf(sumber.profiles, a.userId)
    const base = {
      waktu: a.attemptedAt,
      userId: a.userId,
      nama: p?.fullName ?? 'Mahasiswa',
      kelasId: p?.classId ?? null,
      kelasNama: p?.kelasNama ?? null,
      skor: a.score,
    }
    if (a.sessionId) {
      items.push({ ...base, jenis: 'tes-khusus', keterangan: `Tes khusus selesai · skor ${a.score}` })
    } else if (a.kind === 'pre') {
      items.push({ ...base, jenis: 'pre', keterangan: `Pre-test selesai · skor ${a.score}` })
    } else if (a.kind === 'post') {
      items.push({ ...base, jenis: 'post', keterangan: `Post-test selesai · skor ${a.score}` })
    } else {
      const m = moduleOf(sumber.modules, a.moduleId)
      const lulus = a.score >= passScore
      items.push({
        ...base,
        jenis: lulus ? 'formatif-lulus' : 'formatif-remedial',
        keterangan: `Formatif topik ${m?.orderNum ?? a.moduleId} · skor ${a.score} · ${lulus ? 'Lulus' : 'Remedial'}`,
      })
    }
  }

  for (const pr of sumber.progress) {
    if (!pr.lastOpened || pr.currentPage <= 0) continue
    const p = profileOf(sumber.profiles, pr.userId)
    const m = moduleOf(sumber.modules, pr.moduleId)
    items.push({
      waktu: pr.lastOpened,
      userId: pr.userId,
      nama: p?.fullName ?? 'Mahasiswa',
      kelasId: p?.classId ?? null,
      kelasNama: p?.kelasNama ?? null,
      jenis: 'modul',
      keterangan: `Topik ${m?.orderNum ?? pr.moduleId} dibaca sampai halaman ${pr.currentPage}`,
    })
  }

  for (const v of sumber.video) {
    const p = profileOf(sumber.profiles, v.userId)
    const m = moduleOf(sumber.modules, v.moduleId)
    items.push({
      waktu: v.updatedAt,
      userId: v.userId,
      nama: p?.fullName ?? 'Mahasiswa',
      kelasId: p?.classId ?? null,
      kelasNama: p?.kelasNama ?? null,
      jenis: 'video',
      keterangan: v.done ? `Video ${m?.orderNum ?? v.moduleId} selesai ditonton` : `Video ${m?.orderNum ?? v.moduleId} ditonton`,
    })
  }

  for (const p of sumber.profiles) {
    if (p.varkCompletedAt) {
      items.push({
        waktu: p.varkCompletedAt,
        userId: p.id,
        nama: p.fullName,
        kelasId: p.classId,
        kelasNama: p.kelasNama,
        jenis: 'vark',
        keterangan: 'VARK selesai',
      })
    }
    if (p.classId) {
      items.push({
        waktu: p.createdAt,
        userId: p.id,
        nama: p.fullName,
        kelasId: p.classId,
        kelasNama: p.kelasNama,
        jenis: 'gabung',
        keterangan: `Bergabung ke kelas ${p.kelasNama ?? ''}`.trim(),
      })
    }
  }

  return items.sort((a, b) => (a.waktu < b.waktu ? 1 : a.waktu > b.waktu ? -1 : 0))
}

export interface RingkasKelas {
  aktif7Hari: number
  totalMhs: number
  preSelesai: number
  topikRataRata: string
  rataFormatif: number
  remedial7Hari: number
  sesiAktif: number
}

function lastActivityMap(sumber: SumberAktivitas): Map<string, number> {
  const map = new Map<string, number>()
  const touch = (userId: string, iso: string | null) => {
    if (!iso) return
    const t = new Date(iso).getTime()
    if (t > (map.get(userId) ?? -Infinity)) map.set(userId, t)
  }
  for (const a of sumber.attempts) touch(a.userId, a.attemptedAt)
  for (const pr of sumber.progress) touch(pr.userId, pr.lastOpened)
  for (const v of sumber.video) touch(v.userId, v.updatedAt)
  return map
}

// 6 angka ringkas (spec §5.0 poin 2). "aktif 7 hari" dan "remedial 7 hari"
// selalu jendela 7 hari tetap, terlepas dari filter rentang waktu di atasnya
// (filter itu sudah membatasi data yang masuk lewat fetchSumberAktivitas).
export function ringkasKelas(sumber: SumberAktivitas, opts: { hariAktif?: number; now?: Date } = {}): RingkasKelas {
  const passScore = sumber.passScore ?? PASS_SCORE
  const hariAktif = opts.hariAktif ?? 7
  const now = opts.now ?? new Date()
  const cutoffAktif = now.getTime() - hariAktif * 86_400_000
  const cutoffRemedial = now.getTime() - 7 * 86_400_000

  const totalMhs = sumber.profiles.length
  const lastActivity = lastActivityMap(sumber)
  const aktif7Hari = sumber.profiles.filter((p) => (lastActivity.get(p.id) ?? -Infinity) >= cutoffAktif).length

  const preSelesai = new Set(sumber.attempts.filter((a) => a.kind === 'pre').map((a) => a.userId)).size

  const formatifAttempts = sumber.attempts.filter((a) => a.kind === 'formatif')
  const rataFormatif = formatifAttempts.length
    ? Math.round(formatifAttempts.reduce((sum, a) => sum + a.score, 0) / formatifAttempts.length)
    : 0

  // Topik tertinggi yang lulus per mahasiswa (order_num modul; 0 = belum ada
  // yang lulus), lalu diambil mediannya.
  const topikTertinggi = new Map<string, number>()
  for (const a of formatifAttempts) {
    if (a.score < passScore) continue
    const orderNum = moduleOf(sumber.modules, a.moduleId)?.orderNum ?? 0
    if (orderNum > (topikTertinggi.get(a.userId) ?? 0)) topikTertinggi.set(a.userId, orderNum)
  }
  const nilaiTopik = sumber.profiles.map((p) => topikTertinggi.get(p.id) ?? 0).sort((a, b) => a - b)
  const n = nilaiTopik.length
  const median = n === 0 ? 0 : n % 2 === 1 ? nilaiTopik[(n - 1) / 2] : Math.round((nilaiTopik[n / 2 - 1] + nilaiTopik[n / 2]) / 2)

  const remedial7Hari = sumber.attempts.filter(
    (a) => a.kind === 'formatif' && a.score < passScore && new Date(a.attemptedAt).getTime() >= cutoffRemedial,
  ).length

  return { aktif7Hari, totalMhs, preSelesai, topikRataRata: `P${median}`, rataFormatif, remedial7Hari, sesiAktif: 0 }
}

export interface PerluPerhatianItem {
  judul: string
  keterangan: string
  tautan: string
}

// Belum ada halaman profil per-mahasiswa untuk dosen (di luar lingkup WP9),
// jadi tautannya mengarah ke Analitik Kelas yang sudah memuat daftar
// mahasiswa — bukan tautan langsung ke satu baris.
const TAUTAN_MAHASISWA = '/analitik'

// Daftar "perlu perhatian" (spec §5.0 poin 4). Kartu ke-4 (sesi tes khusus
// hampir tutup) belum bisa dihitung di sini — test_sessions datang di WP6b,
// di luar lingkup WP9.
export function perluPerhatian(sumber: SumberAktivitas, opts: { now?: Date } = {}): PerluPerhatianItem[] {
  const passScore = sumber.passScore ?? PASS_SCORE
  const now = opts.now ?? new Date()
  const cutoff7 = now.getTime() - 7 * 86_400_000
  const items: PerluPerhatianItem[] = []

  const sudahPre = new Set(sumber.attempts.filter((a) => a.kind === 'pre').map((a) => a.userId))
  for (const p of sumber.profiles) {
    if (!sudahPre.has(p.id)) {
      items.push({ judul: p.fullName, keterangan: 'Belum mengerjakan pre-test', tautan: TAUTAN_MAHASISWA })
    }
  }

  const lastActivity = lastActivityMap(sumber)
  for (const p of sumber.profiles) {
    const last = lastActivity.get(p.id)
    if (last === undefined || last < cutoff7) {
      items.push({ judul: p.fullName, keterangan: 'Tidak aktif lebih dari 7 hari', tautan: TAUTAN_MAHASISWA })
    }
  }

  const remedialCount = new Map<string, number>()
  for (const a of sumber.attempts) {
    if (a.kind !== 'formatif' || a.score >= passScore || a.moduleId == null) continue
    const key = `${a.userId}:${a.moduleId}`
    remedialCount.set(key, (remedialCount.get(key) ?? 0) + 1)
  }
  for (const [key, count] of remedialCount) {
    if (count <= 2) continue
    const [userId, moduleIdStr] = key.split(':')
    const nama = profileOf(sumber.profiles, userId)?.fullName ?? 'Mahasiswa'
    const orderNum = moduleOf(sumber.modules, Number(moduleIdStr))?.orderNum ?? moduleIdStr
    items.push({ judul: nama, keterangan: `Remedial ${count} kali di topik ${orderNum}`, tautan: TAUTAN_MAHASISWA })
  }

  return items
}

export interface MatriksSel {
  moduleId: number
  orderNum: number
  status: 'L' | 'R' | '-'
}

export interface MatriksBaris {
  userId: string
  nama: string
  sel: MatriksSel[]
}

// Tabel mahasiswa × modul (spec §5.0 poin 5). 'L' = lulus (skor terbaik ≥
// ambang), 'R' = sudah dicoba tapi belum lulus (remedial), '-' = belum dicoba.
export function matriksProgres(sumber: SumberAktivitas): MatriksBaris[] {
  const passScore = sumber.passScore ?? PASS_SCORE
  const modules = [...sumber.modules].sort((a, b) => a.orderNum - b.orderNum)
  return sumber.profiles.map((p) => ({
    userId: p.id,
    nama: p.fullName,
    sel: modules.map((m) => {
      const scores = sumber.attempts
        .filter((a) => a.userId === p.id && a.kind === 'formatif' && a.moduleId === m.id)
        .map((a) => a.score)
      const status: MatriksSel['status'] = scores.length === 0 ? '-' : Math.max(...scores) >= passScore ? 'L' : 'R'
      return { moduleId: m.id, orderNum: m.orderNum, status }
    }),
  }))
}

// CSV tabel mahasiswa × modul — dipakai tombol "Unduh CSV" di Dashboard
// dosen. downloadCsv (pemicu Blob + anchor) dipakai apa adanya dari analitik.ts.
export function buildMatriksCsv(baris: MatriksBaris[]): string {
  if (baris.length === 0) return 'Nama\n'
  const orderNums = baris[0].sel.map((s) => s.orderNum)
  let csv = 'Nama,' + orderNums.map((n) => `Topik ${n}`).join(',') + '\n'
  for (const b of baris) {
    const nama = (b.nama || '').replace(/"/g, '""')
    csv += `"${nama}",` + b.sel.map((s) => s.status).join(',') + '\n'
  }
  return csv
}

// ── Data access — 5 query Supabase digabung jadi satu SumberAktivitas ──

export interface FilterAktivitas {
  kelasId?: string | 'semua'
  hari: 7 | 30 | 'semester'
  /** Mata kuliah (v23). Tanpa ini = semua topik. */
  courseId?: number
}

const SEMESTER_HARI = 180

function sinceIso(hari: FilterAktivitas['hari']): string {
  const days = hari === 'semester' ? SEMESTER_HARI : hari
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

const SUMBER_KOSONG: SumberAktivitas = { attempts: [], progress: [], video: [], profiles: [], modules: [], passScore: PASS_SCORE }

export async function fetchSumberAktivitas(filter: FilterAktivitas): Promise<SumberAktivitas> {
  if (!isSupabaseConfigured) return SUMBER_KOSONG
  const since = sinceIso(filter.hari)
  try {
    let profilesQuery = supabase
      .from('profiles')
      // FK eksplisit sama seperti analitik.ts fetchStudentStats: profiles<->classes
      // punya dua relasi, embed tanpa nama FK ambigu (PGRST201).
      .select('id, full_name, class_id, created_at, vark_completed_at, classes!profiles_class_id_fkey(name)')
      .eq('role', 'mahasiswa')
    if (filter.kelasId && filter.kelasId !== 'semua') profilesQuery = profilesQuery.eq('class_id', filter.kelasId)

    const [profilesRes, attemptsRes, progressRes, videoRes, modulesRes] = await Promise.all([
      profilesQuery,
      supabase.from('quiz_attempts').select('user_id, module_id, score, kind, attempted_at, session_id').gte('attempted_at', since),
      supabase.from('user_progress').select('user_id, module_id, current_page, last_opened').gte('last_opened', since),
      supabase.from('video_progress').select('user_id, module_id, seconds, done, updated_at').gte('updated_at', since),
      supabase.from('modules').select('id, order_num, title, course_id').order('order_num'),
    ])
    if (profilesRes.error) throw profilesRes.error

    type ProfileRow = {
      id: string
      full_name: string
      class_id: string | null
      created_at: string
      vark_completed_at: string | null
      classes: { name: string } | { name: string }[] | null
    }
    const profiles: ProfileLite[] = ((profilesRes.data ?? []) as ProfileRow[]).map((p) => {
      const rel = p.classes
      const kelasNama = Array.isArray(rel) ? (rel[0]?.name ?? null) : (rel?.name ?? null)
      return {
        id: p.id,
        fullName: p.full_name,
        classId: p.class_id,
        kelasNama,
        createdAt: p.created_at,
        varkCompletedAt: p.vark_completed_at,
      }
    })

    const attempts: AttemptLite[] = ((attemptsRes.data ?? []) as Array<{
      user_id: string
      module_id: number | null
      score: number
      kind: 'pre' | 'formatif' | 'post'
      attempted_at: string
      session_id: string | null
    }>).map((a) => ({
      userId: a.user_id,
      moduleId: a.module_id,
      score: a.score,
      kind: a.kind,
      attemptedAt: a.attempted_at,
      sessionId: a.session_id,
    }))

    const progress: ProgressLite[] = ((progressRes.data ?? []) as Array<{
      user_id: string
      module_id: number
      current_page: number | null
      last_opened: string | null
    }>).map((p) => ({ userId: p.user_id, moduleId: p.module_id, currentPage: p.current_page ?? 0, lastOpened: p.last_opened }))

    const video: VideoProgressLite[] = ((videoRes.data ?? []) as Array<{
      user_id: string
      module_id: number
      seconds: number
      done: boolean
      updated_at: string
    }>).map((v) => ({ userId: v.user_id, moduleId: v.module_id, seconds: v.seconds, done: v.done, updatedAt: v.updated_at }))

    const modules: ModuleLite[] = ((modulesRes.data ?? []) as Array<{ id: number; order_num: number; title: string; course_id?: number }>)
      .filter((m) => filter.courseId == null || (m.course_id ?? 1) === filter.courseId)
      .map((m) => ({
        id: m.id,
        orderNum: m.order_num,
        title: m.title,
      }))
    // Kejadian di topik mata kuliah lain dibuang; pre/post tanpa module_id
    // dipertahankan (jumlahnya kecil, course_id-nya tidak dibaca di sini).
    const idTopik = new Set(modules.map((m) => m.id))
    const attemptsMk = filter.courseId == null ? attempts : attempts.filter((a) => a.moduleId == null || idTopik.has(a.moduleId))
    const progressMk = filter.courseId == null ? progress : progress.filter((p) => idTopik.has(p.moduleId))
    const videoMk = filter.courseId == null ? video : video.filter((v) => idTopik.has(v.moduleId))

    return { attempts: attemptsMk, progress: progressMk, video: videoMk, profiles, modules, passScore: PASS_SCORE }
  } catch (e) {
    console.warn('[aktivitas] fetchSumberAktivitas gagal:', e)
    return SUMBER_KOSONG
  }
}
