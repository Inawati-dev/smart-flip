import { supabase, isSupabaseConfigured } from './supabase'

// Sumber data halaman Asesmen: tabel `quiz_attempts` yang sudah ada — tidak
// ada tabel/migrasi baru. Cakupan barisnya dibatasi RLS (migration_v13:
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
  /** `passed` di DB adalah kolom generated (score >= 60), bukan hitungan klien. */
  passed: boolean
  attemptedAt: string
  /** Jawaban per butir bila tersimpan; dipakai tab Pilihan Ganda buat hitung benar/salah. */
  answers: unknown
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

/** Jumlah butir benar/salah dari kolom `answers`, null kalau formatnya tak dikenali. */
export function tallyAnswers(answers: unknown): { benar: number; total: number } | null {
  if (!Array.isArray(answers) || answers.length === 0) return null

  // Dua bentuk yang dipakai penulis kuis di repo ini: array boolean
  // (sudah dinilai) atau array objek dengan flag benar/correct.
  let benar = 0
  for (const a of answers) {
    if (typeof a === 'boolean') {
      if (a) benar++
    } else if (a && typeof a === 'object') {
      const o = a as Record<string, unknown>
      const flag = o.benar ?? o.correct ?? o.isCorrect
      if (flag === true) benar++
      else if (flag !== false) return null // bentuk tak dikenali — jangan tebak
    } else {
      return null
    }
  }
  return { benar, total: answers.length }
}

/** Rekap agregat per modul untuk tab Tes Formatif. */
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

export async function fetchAsesmenAttempts(): Promise<AsesmenAttempt[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [attemptsRes, studentsRes, modulesRes] = await Promise.all([
      supabase
        .from('quiz_attempts')
        .select('id, user_id, module_id, score, passed, answers, attempted_at')
        .order('attempted_at', { ascending: false }),
      // Embed eksplisit lewat nama FK — profiles<->classes punya DUA relasi,
      // embed tanpa kualifikasi ditolak PostgREST (PGRST201). Lihat catatan
      // yang sama di analitik.ts fetchStudentStats().
      supabase
        .from('profiles')
        .select('id, full_name, classes!profiles_class_id_fkey(name)')
        .eq('role', 'mahasiswa'),
      supabase.from('modules').select('id, title'),
    ])
    if (attemptsRes.error) throw attemptsRes.error

    const namaById = new Map<string, string>()
    const kelasById = new Map<string, string | null>()
    for (const s of studentsRes.data ?? []) {
      namaById.set(s.id as string, (s.full_name as string) || 'Tanpa nama')
      const rel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
      kelasById.set(s.id as string, Array.isArray(rel) ? rel[0]?.name ?? null : rel?.name ?? null)
    }
    const judulById = new Map<number, string>()
    for (const m of modulesRes.data ?? []) {
      judulById.set(m.id as number, (m.title as string) || `Modul ${m.id}`)
    }

    return (attemptsRes.data ?? []).map((r) => ({
      id: r.id as number,
      userId: r.user_id as string,
      nama: namaById.get(r.user_id as string) ?? 'Mahasiswa',
      kelas: kelasById.get(r.user_id as string) ?? null,
      moduleId: r.module_id as number,
      modulJudul: judulById.get(r.module_id as number) ?? `Modul ${r.module_id}`,
      score: r.score as number,
      passed: !!r.passed,
      attemptedAt: r.attempted_at as string,
      answers: r.answers,
    }))
  } catch (e) {
    console.warn('[asesmen] fetchAsesmenAttempts gagal:', e)
    return null
  }
}

export function buildAsesmenCsv(attempts: AsesmenAttempt[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  let csv = 'Nama,Kelas,Modul,Skor,Status,Tanggal\n'
  for (const a of attempts) {
    csv += [
      esc(a.nama),
      esc(a.kelas ?? '—'),
      esc(a.modulJudul),
      a.score,
      a.passed ? 'Lulus' : 'Belum Lulus',
      esc(new Date(a.attemptedAt).toLocaleDateString('id-ID')),
    ].join(',') + '\n'
  }
  return csv
}
