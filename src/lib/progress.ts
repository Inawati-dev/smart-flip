import { supabase, isSupabaseConfigured } from './supabase'

export interface ProgressEntry {
  pct: number
  currentPage: number
  /** Jumlah halaman PDF (v26), null bila belum pernah dibuka. */
  totalPages?: number | null
  lastOpened: string | null
}

export type ProgressMap = Record<string, ProgressEntry>

export function moduleIdToPath(moduleId: number): string {
  return 'books/modul-' + String(moduleId).padStart(2, '0') + '.pdf'
}

export async function fetchAllProgress(): Promise<ProgressMap> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (uid) {
      type Baris = { module_id: number; pct: number | null; current_page: number | null; last_opened: string | null; total_pages?: number | null }
      let { data, error }: { data: Baris[] | null; error: { code?: string; message: string } | null } = await supabase
        .from('user_progress')
        .select('module_id, pct, current_page, last_opened, total_pages')
        .eq('user_id', uid)
      // Sebelum v26 kolom total_pages belum ada: ulang tanpa kolom itu.
      if (error && (error.code === '42703' || /total_pages/.test(error.message))) {
        const r2 = await supabase.from('user_progress').select('module_id, pct, current_page, last_opened').eq('user_id', uid)
        data = r2.data as Baris[] | null
        error = r2.error
      }
      if (!error && data) {
        const result: ProgressMap = {}
        for (const r of data) {
          result[moduleIdToPath(r.module_id)] = {
            pct: r.pct || 0,
            currentPage: r.current_page || 0,
            totalPages: (r as { total_pages?: number | null }).total_pages ?? null,
            lastOpened: r.last_opened,
          }
        }
        return result
      }
    }
  }

  const result: ProgressMap = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('sfp_books/')) {
      try {
        result[key.replace('sfp_', '')] = JSON.parse(localStorage.getItem(key)!)
      } catch {
        // skip malformed entries, matches legacy/data-layer.js behavior
      }
    }
  }
  return result
}

// SMART-FLIP ships a fixed 9-module curriculum (see legacy/modules-data.js and
// CLAUDE.md) — legacy/profil.html loops modules 1..9 directly when totaling
// learning time and quiz history, so this mirrors that fixed range verbatim.
export const TOTAL_MODULES = 9

// modulePath 'books/modul-01.pdf' -> module_id (order_num) 1.
// Mirrors legacy/data-layer.js's pathToModuleId().
function pathToModuleId(modulePath: string): number | null {
  const m = /modul-(\d+)\.pdf/.exec(modulePath || '')
  return m ? parseInt(m[1], 10) : null
}

export interface SaveProgressInput {
  pct: number
  currentPage: number
  lastOpened?: string
  /** Jumlah halaman PDF (v26). */
  totalPages?: number
}

// Ported from legacy/data-layer.js's DataLayer.saveProgress(): upsert into
// Supabase `user_progress` when configured (keyed by user_id+module_id,
// deriving module_id from the modulePath via pathToModuleId), else merge into
// the localStorage 'sfp_<modulePath>' key — matching fetchAllProgress's
// existing key format exactly (e.g. 'sfp_books/modul-01.pdf').
export async function saveProgress(modulePath: string, data: SaveProgressInput): Promise<void> {
  const lastOpened = data.lastOpened || new Date().toISOString()

  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      const moduleId = pathToModuleId(modulePath)
      if (uid && moduleId) {
        const row: Record<string, unknown> = {
          user_id: uid,
          module_id: moduleId,
          pct: data.pct,
          current_page: data.currentPage,
          last_opened: lastOpened,
          status: data.pct >= 100 ? 'completed' : data.pct > 0 ? 'in_progress' : 'not_started',
          started_at: new Date().toISOString(),
          completed_at: data.pct >= 100 ? new Date().toISOString() : null,
        }
        if (data.totalPages != null) row.total_pages = data.totalPages
        let { error } = await supabase.from('user_progress').upsert(row, { onConflict: 'user_id,module_id' })
        if (error && data.totalPages != null && (error.code === '42703' || /total_pages/.test(error.message))) {
          delete row.total_pages
          ;({ error } = await supabase.from('user_progress').upsert(row, { onConflict: 'user_id,module_id' }))
        }
        if (error) throw error
        return
      }
    } catch (e) {
      console.warn('[progress] saveProgress → Supabase gagal, fallback localStorage:', e)
    }
  }

  try {
    const existingRaw = localStorage.getItem('sfp_' + modulePath)
    let existing: Partial<ProgressEntry> = {}
    if (existingRaw) {
      try {
        existing = JSON.parse(existingRaw) as Partial<ProgressEntry>
      } catch {
        existing = {}
      }
    }
    const merged: ProgressEntry = {
      ...existing,
      pct: data.pct,
      currentPage: data.currentPage,
      lastOpened,
    }
    localStorage.setItem('sfp_' + modulePath, JSON.stringify(merged))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

// Mirrors legacy/data-layer.js getTimeSpent(moduleId).
export async function fetchTimeSpent(moduleId: number): Promise<number> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('user_progress')
          .select('time_spent')
          .eq('user_id', uid)
          .eq('module_id', moduleId)
          .maybeSingle()
        if (error) throw error
        return data?.time_spent || 0
      }
    } catch {
      // fall through to localStorage
    }
  }
  const raw = localStorage.getItem('sfp_time_' + moduleId)
  return raw ? parseInt(raw, 10) || 0 : 0
}

// Mirrors the totaling loop in legacy/profil.html's renderStats().
export async function fetchTotalTimeSpent(): Promise<number> {
  let total = 0
  for (let i = 1; i <= TOTAL_MODULES; i++) {
    total += await fetchTimeSpent(i)
  }
  return total
}
