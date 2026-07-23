import { supabase, isSupabaseConfigured } from './supabase'

export interface QuizAttempt {
  score: number
  answers: unknown
  completedAt: string
  date: string
}

export function formatAttemptDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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
