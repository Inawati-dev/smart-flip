import { supabase, isSupabaseConfigured } from './supabase'

// ── Indicator labels — ported verbatim from legacy/validasi.html's 16 .ind-label spans ──
// (8 aspek media + 8 aspek materi, in form order — not paraphrased)

export const LABEL_MEDIA = [
  'Tampilan antarmuka (desain, warna, tipografi)',
  'Kemudahan navigasi',
  'Kualitas tampilan video',
  'Keterbacaan teks dan font',
  'Konsistensi tata letak',
  'Responsivitas di berbagai perangkat',
  'Ketepatan penggunaan ikon/simbol',
  'Keseluruhan kualitas media',
] as const

export const LABEL_MATERI = [
  'Kesesuaian materi dengan RPS',
  'Kedalaman dan keluasan materi',
  'Keakuratan konsep R&D',
  'Kemutakhiran referensi',
  'Kualitas soal kuis',
  'Kualitas studi kasus',
  'Ketepatan umpan balik',
  'Keseluruhan kualitas materi',
] as const

export const SCALE_LABELS = ['Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik'] as const

// ── Types ──

export interface ValidatorInfo {
  nama: string
  institusi: string
  keahlian: string
}

export interface AspekResult {
  scores: number[] // length 8, each 1..5
  avg: number
  komentar: string
}

export interface ValidasiData {
  aspekMedia: AspekResult
  aspekMateri: AspekResult
  totalAvg: number
  validator: ValidatorInfo
  timestamp: number
}

export type KelayakanKey = 'sangat-layak' | 'layak' | 'cukup-layak' | 'kurang-layak'

export interface KelayakanInfo {
  key: KelayakanKey
  label: string
  icon: string
}

// ── Pure scoring/threshold functions — ported verbatim from legacy/validasi.html ──
// (kelayakanInfo() thresholds and handleSubmit()'s avg math, lines ~1186-1237)

export function kelayakanInfo(avg: number): KelayakanInfo {
  if (avg >= 4.2) return { key: 'sangat-layak', label: 'Sangat Layak', icon: '🏆' }
  if (avg >= 3.4) return { key: 'layak', label: 'Layak', icon: '✅' }
  if (avg >= 2.6) return { key: 'cukup-layak', label: 'Cukup Layak', icon: '🔶' }
  return { key: 'kurang-layak', label: 'Kurang Layak', icon: '⚠️' }
}

// barColor() — ported verbatim from legacy/validasi.html, used for the aspect summary bars
export function barColor(avg: number): string {
  if (avg >= 4.2) return '#8FA287'
  if (avg >= 3.4) return '#D4A373'
  if (avg >= 2.6) return '#E8C070'
  return '#C05060'
}

export interface ValidasiComputation {
  avgMedia: number
  avgMateri: number
  totalAvg: number
  kategori: KelayakanInfo
}

/**
 * Pure feasibility-category computation. Mirrors legacy/validasi.html's
 * handleSubmit() exactly: each aspect average is the mean of its 8 scores
 * rounded to 2 decimals, the total average is the mean of the two aspect
 * averages (also rounded to 2 decimals — matching the double-rounding in
 * legacy, not a single average of all 16 raw scores), and the category is
 * read off totalAvg via kelayakanInfo()'s fixed thresholds.
 */
export function computeValidasiResult(media: number[], materi: number[]): ValidasiComputation {
  const avgMedia = +(media.reduce((s, v) => s + v, 0) / 8).toFixed(2)
  const avgMateri = +(materi.reduce((s, v) => s + v, 0) / 8).toFixed(2)
  const totalAvg = +((avgMedia + avgMateri) / 2).toFixed(2)
  return { avgMedia, avgMateri, totalAvg, kategori: kelayakanInfo(totalAvg) }
}

// skorClass() — ported verbatim from legacy/validasi.html's renderHasil() per-row class
export function skorClass(v: number): 'good' | 'avg' | 'low' {
  if (v >= 4) return 'good'
  if (v >= 3) return 'avg'
  return 'low'
}

// ── Data access — dual mode: Supabase when configured, else localStorage ──
// (same key ('sfp_validasi') and payload shape as legacy/data-layer.js)
//
// Note: `validasi_ahli` is not present in database/schema.sql (same situation
// as `feedback` in feedback.ts and the legacy vark_* columns in vark.ts) — the
// Supabase branch below mirrors legacy/data-layer.js's saveValidasi/getValidasi
// for parity, but in the current schema it always throws and falls through to
// the localStorage fallback, same as it does in production today.

const LS_KEY = 'sfp_validasi'

function readLocalValidasi(): ValidasiData | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as ValidasiData) : null
  } catch {
    return null
  }
}

function writeLocalValidasi(data: ValidasiData): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

export async function saveValidasi(data: ValidasiData): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('validasi_ahli').upsert(
          {
            user_id: uid,
            aspek_media: data.aspekMedia,
            aspek_materi: data.aspekMateri,
            total_avg: data.totalAvg,
            validator: data.validator,
            submitted_at: new Date(data.timestamp || Date.now()).toISOString(),
          },
          { onConflict: 'user_id' },
        )
        if (error) throw error
        return
      }
    } catch (e) {
      console.warn('[validasi] saveValidasi → Supabase gagal, fallback localStorage:', e)
    }
  }
  writeLocalValidasi(data)
}

export async function fetchValidasi(): Promise<ValidasiData | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('validasi_ahli')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()
        if (error) throw error
        if (!data) return null
        const row = data as {
          aspek_media: AspekResult
          aspek_materi: AspekResult
          total_avg: number
          validator: ValidatorInfo
          submitted_at: string
        }
        return {
          aspekMedia: row.aspek_media,
          aspekMateri: row.aspek_materi,
          totalAvg: row.total_avg,
          validator: row.validator,
          timestamp: new Date(row.submitted_at).getTime(),
        }
      }
    } catch (e) {
      console.warn('[validasi] fetchValidasi → Supabase gagal, fallback localStorage:', e)
    }
  }
  return readLocalValidasi()
}
