import type { ProgressMap } from './progress'
import { moduleIdToPath } from './progress'
import type { QuizAttemptWithModule } from './quizAttempts'
import { PASS_SCORE } from './quizAttempts'

// Status "langkah berikutnya" mahasiswa di Dashboard (§4.0 spec WP8).
// WP8 hanya tahu baca-modul dan formatif — 'video ditonton' belum tercatat
// di DB (video_progress datang di WP9). Begitu ada, sisipkan cek video di
// sini sebelum jatuh ke 'formatif'.
export type Langkah = 'baca' | 'video' | 'formatif' | 'selesai-semua'

export interface LangkahResult {
  topikAktif: { id: number; orderNum: number; title: string }
  langkah: Langkah
  halaman?: { dibaca: number; total: number }
  topikSelesai: number
  skorTerakhir?: { moduleId: number; score: number; lulus: boolean }
}

// Cukup tiga field modul, bukan ModuleRow penuh — ModuleRow tetap cocok
// dipakai langsung (structural typing) tanpa perlu diubah.
interface ModuleLite {
  id: number
  order_num: number
  title: string
}

interface HitungLangkahInput {
  modules: ModuleLite[]
  progress: ProgressMap
  attempts: QuizAttemptWithModule[]
  passScore?: number
}

function bestScore(attempts: QuizAttemptWithModule[], moduleId: number): number | null {
  const scores = attempts.filter((a) => a.moduleId === moduleId).map((a) => a.score)
  return scores.length ? Math.max(...scores) : null
}

export function hitungLangkah({
  modules,
  progress,
  attempts,
  passScore = PASS_SCORE,
}: HitungLangkahInput): LangkahResult {
  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)
  if (sorted.length === 0) {
    // Modul belum termuat — keadaan transisi, Dashboard menampilkan "Memuat…".
    return { topikAktif: { id: 0, orderNum: 0, title: '' }, langkah: 'baca', topikSelesai: 0 }
  }

  const topikSelesai = sorted.filter((m) => (bestScore(attempts, m.id) ?? 0) >= passScore).length
  const semuaLulus = topikSelesai === sorted.length

  // Topik aktif = modul pertama yang belum lulus; kalau semua lulus, topik
  // aktif jadi modul terakhir supaya "Topik 9 dari 9" tetap masuk akal.
  const active = sorted.find((m) => (bestScore(attempts, m.id) ?? 0) < passScore) ?? sorted[sorted.length - 1]

  const p = progress[moduleIdToPath(active.id)]
  const pct = p?.pct ?? 0

  const langkah: Langkah = semuaLulus ? 'selesai-semua' : pct >= 100 ? 'formatif' : 'baca'

  const halaman =
    p && p.currentPage > 0 && pct > 0
      ? { dibaca: p.currentPage, total: Math.round(p.currentPage / (pct / 100)) }
      : undefined

  const latest = attempts.length
    ? attempts.reduce((a, b) => ((a.completedAt || '') > (b.completedAt || '') ? a : b))
    : null
  const skorTerakhir = latest
    ? { moduleId: latest.moduleId, score: latest.score, lulus: latest.score >= passScore }
    : undefined

  return {
    topikAktif: { id: active.id, orderNum: active.order_num, title: active.title },
    langkah,
    halaman,
    topikSelesai,
    skorTerakhir,
  }
}
