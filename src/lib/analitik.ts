import { supabase, isSupabaseConfigured } from './supabase'

// ── Types ──────────────────────────────────────────────────────────

export type StudentStatus = 'aktif' | 'tidak'

export interface StudentStat {
  id: string | number
  nama: string
  modul: number
  kuis: number
  jam: number
  kepraktisan: number | null
  status: StudentStatus
  jalur?: 'cepat' | 'mendalam' | null
  kelas?: string | null
}

export interface ModulDistItem {
  label: string
  pct: number
}

export interface KepraktisanAspekItem {
  label: string
  nilai: number
}

export interface KuisDistBucket {
  label: string
  sublabel: string
  min: number
  max: number
  count: number
  color: string
}

export interface StatSummary {
  totalAktif: number
  totalStudents: number
  avgModulPct: number
  avgKuis: number
  avgKepraktisan: number
}

export type SortKey = 'no' | 'nama' | 'modul' | 'kuis' | 'jam' | 'kepraktisan' | 'status'

// ── Demo/dummy data — ported verbatim from legacy/analitik.html ──────
// Follows the same precedent as src/pages/Profil.tsx's dosen view (dummy
// "28 mahasiswa terdaftar" stats): shown whenever Supabase isn't configured
// or the real aggregate query comes back empty.

export const DUMMY_STUDENTS: StudentStat[] = [
  { id: 1, nama: 'Ahmad Rizki', modul: 3, kuis: 78, jam: 4.2, kepraktisan: 4.2, status: 'aktif' },
  { id: 2, nama: 'Budi Santoso', modul: 2, kuis: 85, jam: 3.1, kepraktisan: 4.5, status: 'aktif' },
  { id: 3, nama: 'Citra Dewi', modul: 3, kuis: 72, jam: 5.0, kepraktisan: 3.8, status: 'aktif' },
  { id: 4, nama: 'Dian Pratama', modul: 1, kuis: 60, jam: 1.5, kepraktisan: 3.5, status: 'tidak' },
  { id: 5, nama: 'Eka Putri', modul: 3, kuis: 90, jam: 4.8, kepraktisan: 4.7, status: 'aktif' },
  { id: 6, nama: 'Fajar Hidayat', modul: 2, kuis: 68, jam: 2.3, kepraktisan: 4.0, status: 'aktif' },
  { id: 7, nama: 'Gita Rahayu', modul: 0, kuis: 0, jam: 0.5, kepraktisan: null, status: 'tidak' },
  { id: 8, nama: 'Hendra Wijaya', modul: 3, kuis: 82, jam: 3.9, kepraktisan: 4.3, status: 'aktif' },
  { id: 9, nama: 'Indah Sari', modul: 2, kuis: 75, jam: 2.7, kepraktisan: 4.1, status: 'aktif' },
  { id: 10, nama: 'Joko Susanto', modul: 1, kuis: 55, jam: 1.2, kepraktisan: 3.2, status: 'tidak' },
]

export const DUMMY_MODUL_DIST: ModulDistItem[] = [
  { label: 'Modul 1', pct: 100 },
  { label: 'Modul 2', pct: 90 },
  { label: 'Modul 3', pct: 80 },
  { label: 'Modul 4', pct: 70 },
  { label: 'Modul 5', pct: 50 },
  { label: 'Modul 6', pct: 40 },
  { label: 'Modul 7', pct: 20 },
  { label: 'Modul 8', pct: 10 },
  { label: 'Modul 9', pct: 0 },
]

export const DUMMY_KEPRAKTISAN_ASPEK: KepraktisanAspekItem[] = [
  { label: 'Kualitas Konten', nilai: 4.3 },
  { label: 'Kemudahan Penggunaan', nilai: 4.1 },
  { label: 'Keterbacaan', nilai: 4.4 },
  { label: 'Kebermanfaatan', nilai: 4.5 },
]

// ── Pure aggregation helpers — ported verbatim from legacy/data-layer.js
// (computeModulDistribution / computeFeedbackAspectAvg) and
// legacy/analitik.html (bucketKuisDist, stat-card math, CSV builder, sort). ──

export function computeModulDistribution(
  modules: { id: number; order_num: number }[],
  totalStudents: number,
  completedRows: { module_id: number }[],
): ModulDistItem[] {
  return modules.map((m) => {
    const done = completedRows.filter((r) => r.module_id === m.id).length
    return { label: 'Modul ' + m.order_num, pct: Math.round((done / totalStudents) * 100) }
  })
}

export function computeFeedbackAspectAvg(
  rows: { konten?: number; kemudahan?: number; keterbacaan?: number; kebermanfaatan?: number }[],
): KepraktisanAspekItem[] {
  const avg = (key: 'konten' | 'kemudahan' | 'keterbacaan' | 'kebermanfaatan') =>
    rows.length ? +(rows.reduce((a, r) => a + (r[key] || 0), 0) / rows.length).toFixed(1) : 0
  return [
    { label: 'Kualitas Konten', nilai: avg('konten') },
    { label: 'Kemudahan Penggunaan', nilai: avg('kemudahan') },
    { label: 'Keterbacaan', nilai: avg('keterbacaan') },
    { label: 'Kebermanfaatan', nilai: avg('kebermanfaatan') },
  ]
}

// Mirrors legacy/data-layer.js getStudentStats: jam (waktu belajar dalam jam)
// > 0 → dianggap aktif. Diekstrak jadi fungsi murni supaya bisa diuji terpisah.
export function computeStudentStatus(jam: number): StudentStatus {
  return jam > 0 ? 'aktif' : 'tidak'
}

export function computeInactiveStudents(students: StudentStat[]): StudentStat[] {
  return students.filter((s) => s.status === 'tidak')
}

// Bucket skor kuis mahasiswa jadi 5 kategori (0-59/60-69/70-79/80-89/90-100),
// ported verbatim from legacy/analitik.html bucketKuisDist().
export function bucketKuisDist(students: StudentStat[]): KuisDistBucket[] {
  const buckets: KuisDistBucket[] = [
    { label: '0–59', sublabel: 'Kurang', min: 0, max: 59, count: 0, color: '#C0392B' },
    { label: '60–69', sublabel: 'Cukup', min: 60, max: 69, count: 0, color: '#E8A44A' },
    { label: '70–79', sublabel: 'Baik', min: 70, max: 79, count: 0, color: '#8FA287' },
    { label: '80–89', sublabel: 'Sangat Baik', min: 80, max: 89, count: 0, color: '#6B7E64' },
    { label: '90–100', sublabel: 'Sempurna', min: 90, max: 100, count: 0, color: '#4A6040' },
  ]
  students
    .filter((s) => s.kuis > 0)
    .forEach((s) => {
      const b = buckets.find((bucket) => s.kuis >= bucket.min && s.kuis <= bucket.max)
      if (b) b.count++
    })
  return buckets
}

// Ported verbatim from legacy/analitik.html computeStatCards().
export function computeStatSummary(students: StudentStat[], totalModules: number): StatSummary {
  const aktif = students.filter((s) => s.status === 'aktif')
  const withKuis = students.filter((s) => s.kuis > 0)
  const withKprak = students.filter((s) => s.kepraktisan != null)

  const avgModul = students.length ? students.reduce((a, s) => a + s.modul, 0) / students.length : 0
  const avgKuis = withKuis.length ? withKuis.reduce((a, s) => a + s.kuis, 0) / withKuis.length : 0
  const avgKprak = withKprak.length
    ? withKprak.reduce((a, s) => a + (s.kepraktisan ?? 0), 0) / withKprak.length
    : 0

  return {
    totalAktif: aktif.length,
    totalStudents: students.length,
    avgModulPct: totalModules ? Math.round((avgModul / totalModules) * 100) : 0,
    avgKuis: +avgKuis.toFixed(1),
    avgKepraktisan: +avgKprak.toFixed(1),
  }
}

function sortableValue(s: StudentStat, key: Exclude<SortKey, 'no'>): number | string | null {
  if (key === 'nama') return s.nama
  if (key === 'status') return s.status
  return s[key]
}

// Ported verbatim from legacy/analitik.html sortAndRender()/sortTable():
// null values (kepraktisan) always sort to the end regardless of direction.
export function sortStudents(students: StudentStat[], key: SortKey, asc: boolean): StudentStat[] {
  if (key === 'no') return asc ? [...students] : [...students].reverse()
  return [...students].sort((a, b) => {
    let va: number | string = sortableValue(a, key) ?? (asc ? Infinity : -Infinity)
    let vb: number | string = sortableValue(b, key) ?? (asc ? Infinity : -Infinity)
    if (typeof va === 'string' && typeof vb === 'string') {
      return asc ? va.localeCompare(vb) : vb.localeCompare(va)
    }
    va = va as number
    vb = vb as number
    return asc ? va - vb : vb - va
  })
}

// Ported verbatim from legacy/analitik.html exportCSV() — plain string
// builder, no CSV library. Names are quoted and internal quotes escaped.
export function buildAnalitikCsv(students: StudentStat[]): string {
  let csv = 'No,Nama,Modul Selesai,Avg Kuis,Waktu (jam),Kepraktisan,Status\n'
  students.forEach((s, i) => {
    const nama = (s.nama || '').replace(/"/g, '""')
    const kprak = s.kepraktisan != null ? s.kepraktisan : ''
    const statusLbl = s.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'
    csv += `${i + 1},"${nama}",${s.modul},${s.kuis},${s.jam},${kprak},${statusLbl}\n`
  })

  csv += '\nRingkasan\n'
  csv += `Mahasiswa Aktif,${students.filter((s) => s.status === 'aktif').length}\n`
  csv += `Rata-rata Modul Selesai,${
    students.length ? (students.reduce((a, s) => a + s.modul, 0) / students.length).toFixed(2) : '0.00'
  }\n`
  const withKuis = students.filter((s) => s.kuis > 0)
  csv += `Rata-rata Skor Kuis,${
    withKuis.length ? (withKuis.reduce((a, s) => a + s.kuis, 0) / withKuis.length).toFixed(2) : '—'
  }\n`
  const withKprak = students.filter((s) => s.kepraktisan != null)
  csv += `Rata-rata Kepraktisan,${
    withKprak.length
      ? (withKprak.reduce((a, s) => a + (s.kepraktisan ?? 0), 0) / withKprak.length).toFixed(2)
      : '—'
  }\n`
  return csv
}

// Client-side download trigger, ported verbatim from legacy/analitik.html
// exportCSV()'s Blob + anchor-click pattern. No library needed.
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Data access — Supabase aggregate queries across ALL students ─────
// Mirrors legacy/data-layer.js getStudentStats / getModulDistribution /
// getFeedbackAspectAvg exactly: no localStorage fallback here on purpose
// (single-user demo mode has no concept of "other students"). The caller
// (Analitik page) decides to render DUMMY_* when these resolve to null/empty,
// matching legacy analitik.html's init().

export async function fetchStudentStats(): Promise<StudentStat[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [studentsRes, progressRes, quizRes, feedbackRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, jalur, classes(name)').eq('role', 'mahasiswa'),
      supabase.from('user_progress').select('user_id, module_id, status, time_spent'),
      supabase.from('quiz_attempts').select('user_id, score'),
      supabase.from('feedback').select('user_id, rata_rata'),
    ])
    if (studentsRes.error) throw studentsRes.error
    const students = studentsRes.data || []
    if (!students.length) return null
    const progress = progressRes.data || []
    const quiz = quizRes.data || []
    const feedback = feedbackRes.data || []

    return students.map((s) => {
      const prog = progress.filter((p) => p.user_id === s.id)
      const modul = prog.filter((p) => p.status === 'completed').length
      const scores = quiz.filter((q) => q.user_id === s.id).map((q) => q.score as number)
      const kuis = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const jam = +(prog.reduce((sum, p) => sum + ((p.time_spent as number) || 0), 0) / 3600).toFixed(1)
      const fb = feedback
        .filter((f) => f.user_id === s.id)
        .map((f) => +f.rata_rata)
        .filter((n) => !isNaN(n))
      const kepraktisan = fb.length ? +(fb.reduce((a, b) => a + b, 0) / fb.length).toFixed(1) : null
      const classRel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
      const kelas = Array.isArray(classRel) ? classRel[0]?.name ?? null : classRel?.name ?? null
      return {
        id: s.id as string,
        nama: s.full_name as string,
        modul,
        kuis,
        jam,
        kepraktisan,
        status: computeStudentStatus(jam),
        jalur: (s as { jalur?: 'cepat' | 'mendalam' | null }).jalur ?? null,
        kelas,
      }
    })
  } catch (e) {
    console.warn('[analitik] fetchStudentStats gagal, pakai dummy:', e)
    return null
  }
}

export async function fetchModulDistribution(): Promise<ModulDistItem[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [modulesRes, studentsRes, progressRes] = await Promise.all([
      supabase.from('modules').select('id, order_num').order('order_num'),
      supabase.from('profiles').select('id').eq('role', 'mahasiswa'),
      supabase.from('user_progress').select('module_id').eq('status', 'completed'),
    ])
    if (modulesRes.error) throw modulesRes.error
    const modules = modulesRes.data || []
    if (!modules.length) return null
    const totalStudents = (studentsRes.data || []).length || 1
    return computeModulDistribution(modules, totalStudents, progressRes.data || [])
  } catch (e) {
    console.warn('[analitik] fetchModulDistribution gagal, pakai dummy:', e)
    return null
  }
}

export interface RecentActivityItem {
  who: string
  label: string
  kind: 'draf' | 'kuis' | 'forum' | 'modul'
  iso: string
}

// Real "aktivitas kelas terkini" feed for Profil.tsx's dosen view — merges the
// 4 event sources a mahasiswa can generate (module completion, quiz attempt,
// forum post, draft submission), each already timestamped by its own table,
// and returns the most recent `limit` across all of them combined.
export async function fetchRecentActivity(limit = 5): Promise<RecentActivityItem[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [progressRes, quizRes, forumRes, draftsRes, studentsRes] = await Promise.all([
      supabase.from('user_progress').select('user_id, module_id, completed_at').eq('status', 'completed').order('completed_at', { ascending: false }).limit(limit),
      supabase.from('quiz_attempts').select('user_id, module_id, score, attempted_at').order('attempted_at', { ascending: false }).limit(limit),
      supabase.from('forum_posts').select('user_id, module_id, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('drafts').select('user_id, module_id, submitted_at').order('submitted_at', { ascending: false }).limit(limit),
      supabase.from('profiles').select('id, full_name'),
    ])
    const students = (studentsRes.data || []) as Array<{ id: string; full_name: string }>
    if (!students.length) return null
    const nameOf = (id: string) => students.find((s) => s.id === id)?.full_name ?? 'Mahasiswa'

    const items: Array<RecentActivityItem & { ts: number }> = []
    for (const p of (progressRes.data || []) as Array<{ user_id: string; module_id: number; completed_at: string | null }>) {
      if (!p.completed_at) continue
      items.push({ who: nameOf(p.user_id), label: `Menyelesaikan Modul ${p.module_id}`, kind: 'modul', iso: p.completed_at, ts: new Date(p.completed_at).getTime() })
    }
    for (const q of (quizRes.data || []) as Array<{ user_id: string; module_id: number; score: number; attempted_at: string }>) {
      items.push({ who: nameOf(q.user_id), label: `Selesai Kuis Modul ${q.module_id} — Skor ${q.score}`, kind: 'kuis', iso: q.attempted_at, ts: new Date(q.attempted_at).getTime() })
    }
    for (const f of (forumRes.data || []) as Array<{ user_id: string; module_id: number; created_at: string }>) {
      items.push({ who: nameOf(f.user_id), label: `Posting baru di Forum Modul ${f.module_id}`, kind: 'forum', iso: f.created_at, ts: new Date(f.created_at).getTime() })
    }
    for (const d of (draftsRes.data || []) as Array<{ user_id: string; module_id: number; submitted_at: string }>) {
      items.push({ who: nameOf(d.user_id), label: `Submit Draf Modul ${d.module_id}`, kind: 'draf', iso: d.submitted_at, ts: new Date(d.submitted_at).getTime() })
    }
    if (!items.length) return []
    items.sort((a, b) => b.ts - a.ts)
    return items.slice(0, limit).map((it) => ({ who: it.who, label: it.label, kind: it.kind, iso: it.iso }))
  } catch (e) {
    console.warn('[analitik] fetchRecentActivity gagal:', e)
    return null
  }
}

export async function fetchFeedbackAspectAvg(): Promise<KepraktisanAspekItem[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('konten, kemudahan, keterbacaan, kebermanfaatan')
    if (error) throw error
    if (!data || !data.length) return null
    return computeFeedbackAspectAvg(data)
  } catch (e) {
    console.warn('[analitik] fetchFeedbackAspectAvg gagal, pakai dummy:', e)
    return null
  }
}
