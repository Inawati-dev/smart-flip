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
