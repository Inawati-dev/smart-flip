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
