import { supabase, isSupabaseConfigured } from './supabase'

// Progres tonton video per modul. Pasangan tabel: database/migration_v19_video_progress.sql.
// Spec: docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §9 WP9.

export interface VideoProgressEntry {
  seconds: number
  done: boolean
}

export type VideoProgressMap = Record<number, VideoProgressEntry>

// Throttle event `timeupdate` pemutar <video> — dipakai Video.tsx supaya
// tidak menulis ke Supabase tiap frame. Fungsi murni, diuji terpisah.
export const TIMEUPDATE_THROTTLE_MS = 30_000

export function shouldSendTimeUpdate(lastSentAt: number | null, now: number): boolean {
  return lastSentAt === null || now - lastSentAt >= TIMEUPDATE_THROTTLE_MS
}

// True kalau errornya berarti tabel video_progress belum ada (migrasi v19
// belum dijalankan) — 42P01 = undefined_table. Sama pola dengan
// isMissingKindColumn di quizAttempts.ts/kuisSoal.ts.
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('relation') && msg.includes('video_progress')
}

let warnedMissingTable = false

export async function upsertVideoProgress(moduleId: number, seconds: number, done: boolean): Promise<void> {
  if (!isSupabaseConfigured) return
  try {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) return
    const { error } = await supabase
      .from('video_progress')
      .upsert(
        { user_id: uid, module_id: moduleId, seconds, done, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,module_id' },
      )
    if (error) throw error
  } catch (e) {
    if (isMissingTable(e)) {
      if (!warnedMissingTable) {
        console.warn('[videoProgress] tabel video_progress belum ada — jalankan migration_v19.')
        warnedMissingTable = true
      }
      return
    }
    console.warn('[videoProgress] upsertVideoProgress gagal:', e)
  }
}

export async function fetchVideoProgressMap(): Promise<VideoProgressMap> {
  if (!isSupabaseConfigured) return {}
  try {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) return {}
    const { data, error } = await supabase
      .from('video_progress')
      .select('module_id, seconds, done')
      .eq('user_id', uid)
    if (error) throw error
    const map: VideoProgressMap = {}
    for (const r of data ?? []) {
      map[r.module_id as number] = { seconds: r.seconds as number, done: r.done as boolean }
    }
    return map
  } catch (e) {
    if (!isMissingTable(e)) console.warn('[videoProgress] fetchVideoProgressMap gagal:', e)
    return {}
  }
}
