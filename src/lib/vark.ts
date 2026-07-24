import { supabase, isSupabaseConfigured } from './supabase'

export interface VarkResult {
  V: number
  A: number
  R: number
  K: number
  dominant: string
  completedAt: string | null
}

const LS_KEY = 'sfp_vark'

function readLocalVark(): VarkResult | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as VarkResult) : null
  } catch {
    return null
  }
}

// Mirrors legacy/data-layer.js getVarkResult(). Note: vark_scores/vark_dominant/
// vark_completed_at are legacy-only columns on `profiles` — they are not present
// in database/schema.sql, so in the current schema this query always errors and
// falls through to the localStorage fallback, same as it does in production today.
export async function fetchVarkResult(): Promise<VarkResult | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('profiles')
          .select('vark_scores, vark_dominant, vark_completed_at')
          .eq('id', uid)
          .single()
        if (error) throw error
        const row = data as unknown as {
          vark_scores: { V: number; A: number; R: number; K: number } | null
          vark_dominant: string | null
          vark_completed_at: string | null
        } | null
        if (row?.vark_scores) {
          return {
            ...row.vark_scores,
            dominant: row.vark_dominant ?? 'V',
            completedAt: row.vark_completed_at,
          }
        }
        return null
      }
    } catch {
      // fall through to localStorage, matches legacy behavior
    }
  }
  return readLocalVark()
}

// ══════════════════════════════════════════════════════════════════════════
// WRITE SIDE — ported from legacy/vark.html's finishQuiz()/checkExisting()
// and legacy/data-layer.js's saveVarkResult()/clearVarkResult().
// ══════════════════════════════════════════════════════════════════════════

export const VARK_KEYS = ['V', 'A', 'R', 'K'] as const
export type VarkKey = (typeof VARK_KEYS)[number]

export interface VarkScores {
  V: number
  A: number
  R: number
  K: number
}

export interface VarkComputation {
  scores: VarkScores
  dominant: VarkKey
}

// Pure scoring function — mirrors legacy/vark.html's finishQuiz() exactly:
// each answer is an option index 0..3 for a question, and option index maps
// 1:1 to a VARK dimension via VARK_KEYS (index 0 → V, 1 → A, 2 → R, 3 → K),
// identically across all 12 questions. Tally per-dimension, then walk
// V,A,R,K in order keeping the first strictly-highest score as dominant
// (so ties resolve to whichever of V/A/R/K comes first, same as legacy's
// `if (scores[k] > maxScore)` loop starting from maxScore = -1).
export function computeVarkDominant(answers: Array<number | null>): VarkComputation {
  const scores: VarkScores = { V: 0, A: 0, R: 0, K: 0 }
  answers.forEach((ans) => {
    if (ans !== null && ans >= 0 && ans <= 3) {
      scores[VARK_KEYS[ans]]++
    }
  })

  let dominant: VarkKey = 'V'
  let maxScore = -1
  VARK_KEYS.forEach((k) => {
    if (scores[k] > maxScore) {
      maxScore = scores[k]
      dominant = k
    }
  })

  return { scores, dominant }
}

function writeLocalVark(result: VarkResult): void {
  localStorage.setItem(LS_KEY, JSON.stringify(result))
}

// Mirrors legacy/data-layer.js saveVarkResult(): tries to upsert the legacy
// vark_scores/vark_dominant/vark_completed_at columns onto `profiles` and,
// on success, returns without touching localStorage. Those columns aren't in
// database/schema.sql (see fetchVarkResult's note above), so in the current
// schema the upsert always throws and this always falls through to the
// localStorage write — same behavior as legacy has in production today.
export async function saveVarkResult(result: VarkResult): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('profiles').upsert({
          id: uid,
          vark_scores: { V: result.V, A: result.A, R: result.R, K: result.K },
          vark_dominant: result.dominant,
          vark_completed_at: result.completedAt || new Date().toISOString(),
        })
        if (error) throw error
        return
      }
    } catch {
      // fall through to localStorage, matches legacy behavior
    }
  }
  writeLocalVark({ ...result, completedAt: result.completedAt || new Date().toISOString() })
}

// Mirrors legacy/data-layer.js clearVarkResult(): clears the legacy Supabase
// columns (a no-op in the current schema, same reasoning as saveVarkResult
// above) and always removes the localStorage fallback key.
export async function clearVarkResult(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('profiles').upsert({
          id: uid,
          vark_scores: null,
          vark_dominant: null,
          vark_completed_at: null,
        })
        if (error) throw error
        return
      }
    } catch {
      // fall through to localStorage, matches legacy behavior
    }
  }
  localStorage.removeItem(LS_KEY)
}
