import { supabase, isSupabaseConfigured } from './supabase'

export interface FeedbackRatings {
  konten: number
  kemudahan: number
  keterbacaan: number
  kebermanfaatan: number
}

export interface Feedback extends FeedbackRatings {
  id: string
  moduleId: number
  rataRata: string
  komentar: string
  date: string
}

const FEEDBACK_KEY = 'sfp_feedback'

function readLocalFeedback(): Feedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY)
    return raw ? (JSON.parse(raw) as Feedback[]) : []
  } catch {
    return []
  }
}

function writeLocalFeedback(all: Feedback[]): void {
  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

// ── Pure helper — ported verbatim from legacy/data-layer.js saveFeedback ──

export function computeRataRata(ratings: FeedbackRatings): string {
  return ((ratings.konten + ratings.kemudahan + ratings.keterbacaan + ratings.kebermanfaatan) / 4).toFixed(1)
}

// ── Data access — dual mode: Supabase when configured, else localStorage ──
// (same key ('sfp_feedback') and shape as legacy/data-layer.js)

export async function saveFeedback(
  moduleId: number,
  data: FeedbackRatings & { komentar?: string },
): Promise<void> {
  const rataRata = computeRataRata(data)
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('feedback').insert({
          user_id: uid,
          module_id: moduleId,
          konten: data.konten,
          kemudahan: data.kemudahan,
          keterbacaan: data.keterbacaan,
          kebermanfaatan: data.kebermanfaatan,
          rata_rata: rataRata,
          komentar: data.komentar || '',
        })
        if (error) throw error
        return
      }
    } catch (e) {
      console.warn('[feedback] saveFeedback → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalFeedback()
  all.push({
    id: 'fb_' + Date.now(),
    moduleId,
    konten: data.konten,
    kemudahan: data.kemudahan,
    keterbacaan: data.keterbacaan,
    kebermanfaatan: data.kebermanfaatan,
    rataRata,
    komentar: data.komentar || '',
    date: new Date().toISOString(),
  })
  writeLocalFeedback(all)
}

/**
 * viewerRole mirrors legacy/data-layer.js getFeedback: a dosen sees every
 * submission, a mahasiswa only sees their own. The localStorage fallback
 * (single-user demo mode) never filters by user, matching legacy exactly.
 */
export async function fetchFeedback(
  moduleId: number | null = null,
  viewerRole: 'mahasiswa' | 'dosen' | null = null,
): Promise<Feedback[]> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      let query = supabase.from('feedback').select('*').order('submitted_at', { ascending: false })
      if (viewerRole !== 'dosen' && uid) query = query.eq('user_id', uid)
      if (moduleId) query = query.eq('module_id', moduleId)
      const { data, error } = await query
      if (error) throw error
      return (data || []).map((f) => ({
        id: String(f.id),
        moduleId: f.module_id as number,
        konten: f.konten as number,
        kemudahan: f.kemudahan as number,
        keterbacaan: f.keterbacaan as number,
        kebermanfaatan: f.kebermanfaatan as number,
        rataRata: String(f.rata_rata),
        komentar: (f.komentar as string) || '',
        date: f.submitted_at as string,
      }))
    } catch (e) {
      console.warn('[feedback] fetchFeedback → Supabase gagal, fallback localStorage:', e)
    }
  }

  const all = readLocalFeedback()
  return moduleId ? all.filter((f) => f.moduleId === moduleId) : all
}
