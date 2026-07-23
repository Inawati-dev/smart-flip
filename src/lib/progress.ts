import { supabase, isSupabaseConfigured } from './supabase'

export interface ProgressEntry {
  pct: number
  currentPage: number
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
      const { data, error } = await supabase
        .from('user_progress')
        .select('module_id, pct, current_page, last_opened')
        .eq('user_id', uid)
      if (!error && data) {
        const result: ProgressMap = {}
        for (const r of data) {
          result[moduleIdToPath(r.module_id)] = {
            pct: r.pct || 0,
            currentPage: r.current_page || 0,
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
