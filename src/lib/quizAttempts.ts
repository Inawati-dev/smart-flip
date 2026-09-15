import { supabase, isSupabaseConfigured } from './supabase'

// Ambang lulus formatif/pre/post — pasangan: kolom generated
// quiz_attempts.passed di database/migration_v17_bank_soal.sql
// (GENERATED ALWAYS AS (score >= 80) STORED). Ganti salah satu, ganti
// keduanya.
export const PASS_SCORE = 80

export interface QuizAttempt {
  score: number
  answers: unknown
  completedAt: string
  date: string
  kind?: 'pre' | 'formatif' | 'post'
  questionOrder?: unknown
}

export function formatAttemptDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// True when a Supabase error means "the `kind`/`question_order` columns
// don't exist yet" — this deploy shipped before migration_v17_bank_soal.sql
// ran. Same check as src/lib/kuisSoal.ts's isMissingKindColumn.
function isMissingKindColumn(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42703') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('column') && msg.includes('kind')
}

export async function fetchQuizAttempts(moduleId: number): Promise<QuizAttempt[]> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (uid) {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('score, answers, attempted_at')
        .eq('user_id', uid)
        .eq('module_id', moduleId)
        .order('attempted_at', { ascending: true })
      if (!error && data) {
        return data.map((r) => ({
          score: r.score,
          answers: r.answers,
          completedAt: r.attempted_at,
          date: formatAttemptDate(r.attempted_at),
        }))
      }
    }
  }

  const raw =
    localStorage.getItem('sfp_quiz_' + moduleId) ?? localStorage.getItem('sfp_kuis_' + moduleId)
  if (!raw) return []
  try {
    return JSON.parse(raw) as QuizAttempt[]
  } catch {
    return []
  }
}

// Pre-test dan post-test pengguna sekarang — dipakai gerbang pre-test (§4.1)
// dan halaman post-test (§4.5). Toleran terhadap deploy yang lebih baru dari
// migrasi v17: kalau kolom `kind` belum ada di DB, tidak ada cara membedakan
// pre/post dari data lama, jadi kembalikan array kosong.
export async function fetchAttemptsByKind(kind: 'pre' | 'post'): Promise<QuizAttempt[]> {
  if (!isSupabaseConfigured) return []
  try {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) return []
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('score, answers, attempted_at, kind, question_order')
      .eq('user_id', uid)
      .eq('kind', kind)
      .order('attempted_at', { ascending: true })
    if (error) throw error
    if (data) {
      return data.map((r) => ({
        score: r.score,
        answers: r.answers,
        completedAt: r.attempted_at,
        date: formatAttemptDate(r.attempted_at),
        kind: r.kind,
        questionOrder: r.question_order,
      }))
    }
  } catch (e) {
    if (!isMissingKindColumn(e)) {
      console.warn('[quizAttempts] fetchAttemptsByKind → Supabase gagal:', e)
    }
  }
  return []
}

export interface QuizAttemptWithModule extends QuizAttempt {
  moduleId: number
}

// Mirrors the aggregation loop in legacy/profil.html's renderStats() /
// renderQuizHistory() (both loop modules 1..9 and flatten every attempt).
export async function fetchAllQuizAttempts(
  totalModules: number,
): Promise<QuizAttemptWithModule[]> {
  const rows: QuizAttemptWithModule[] = []
  for (let i = 1; i <= totalModules; i++) {
    const attempts = await fetchQuizAttempts(i)
    attempts.forEach((a) => rows.push({ ...a, moduleId: i }))
  }
  return rows
}

// Ported from legacy/data-layer.js's DataLayer.saveQuizAttempt(): insert into
// Supabase `quiz_attempts` when configured, else append to localStorage.
// The write side always targets 'sfp_quiz_' + moduleId (the canonical key —
// legacy never writes 'sfp_kuis_'; fetchQuizAttempts only reads it for
// backward compat), capped at the last 10 attempts, same as legacy.
//
// v17: moduleId is nullable (pre-test/post-test aren't tied to one modul),
// and attempt gains kind/questionOrder/sessionId. `kind` is only sent to
// Supabase when it's not 'formatif' — the DB defaults new rows to
// 'formatif', so omitting it keeps existing formatif inserts byte-identical
// even before migration_v17 has run.
export async function saveQuizAttempt(
  moduleId: number | null,
  attempt: {
    score: number
    answers: unknown
    completedAt?: string
    date?: string
    kind?: 'pre' | 'formatif' | 'post'
    questionOrder?: unknown
    sessionId?: string
  },
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const row: Record<string, unknown> = {
          user_id: uid,
          module_id: moduleId,
          score: attempt.score,
          answers: attempt.answers,
          attempted_at: attempt.completedAt || new Date().toISOString(),
        }
        if (attempt.kind && attempt.kind !== 'formatif') row.kind = attempt.kind
        if (attempt.questionOrder !== undefined) row.question_order = attempt.questionOrder
        if (attempt.sessionId !== undefined) row.session_id = attempt.sessionId
        const { error } = await supabase.from('quiz_attempts').insert(row)
        if (error) throw error
        return
      }
    } catch (e) {
      console.warn('[quizAttempts] saveQuizAttempt → Supabase gagal, fallback localStorage:', e)
    }
  }

  if (typeof moduleId === 'number') {
    // Unchanged from pre-v17 behavior: reuses fetchQuizAttempts so a legacy
    // 'sfp_kuis_' key still gets picked up and carried forward.
    const existing = await fetchQuizAttempts(moduleId)
    existing.push({
      score: attempt.score,
      answers: attempt.answers,
      completedAt: attempt.completedAt || new Date().toISOString(),
      date: attempt.date || formatAttemptDate(new Date().toISOString()),
      kind: attempt.kind,
      questionOrder: attempt.questionOrder,
    })
    try {
      localStorage.setItem('sfp_quiz_' + moduleId, JSON.stringify(existing.slice(-10)))
    } catch {
      // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
    }
    return
  }

  // Pre-test/post-test attempts aren't tied to a module — key by kind.
  const key = 'sfp_quiz_' + (attempt.kind ?? 'lain')
  let existing: QuizAttempt[] = []
  try {
    const raw = localStorage.getItem(key)
    if (raw) existing = JSON.parse(raw) as QuizAttempt[]
  } catch {
    existing = []
  }
  existing.push({
    score: attempt.score,
    answers: attempt.answers,
    completedAt: attempt.completedAt || new Date().toISOString(),
    date: attempt.date || formatAttemptDate(new Date().toISOString()),
    kind: attempt.kind,
    questionOrder: attempt.questionOrder,
  })
  try {
    localStorage.setItem(key, JSON.stringify(existing.slice(-10)))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}
