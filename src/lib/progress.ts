import { supabase, isSupabaseConfigured } from './supabase'

export interface ProgressEntry {
  pct: number
  currentPage: number
  /** Jumlah halaman PDF (v26), null bila belum pernah dibuka. */
  totalPages?: number | null
  /** Halaman terjauh yang sudah dihitung dibaca (v38); hanya ada di catatan yang ditulis sejak antrean #225. */
  furthestPage?: number | null
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
  /** Jumlah detik baca topik ini sampai sekarang (antrean #191); kosong = tidak diubah. */
  timeSpent?: number
  /** Halaman terjauh yang sudah dihitung dibaca (v38). */
  furthestPage?: number
}

// Kolom yang belum ada di basis data (migrasi v26 atau v38 belum dijalankan). Pesan galat PostgREST menyebut nama
// kolomnya, baik 42703 dari SELECT maupun PGRST204 dari upsert; kolom lain tidak ikut dibuang.
function kolomHilang(error: { message: string }, kolom: string): boolean {
  return error.message.includes(kolom)
}
// Diingat sesudah galat pertama, supaya tiap simpan tidak mengirim dua permintaan selama v38 belum dijalankan.
let kolomTerjauhAda = true

// Aturan hitung baca (antrean #191, pilihan B). Posisi baca (currentPage) disimpan seketika, tetapi persen
// hanya naik lewat halaman yang benar-benar tampil: minimal MIN_DETIK_PER_HALAMAN detik dan merupakan
// lanjutan dari halaman terjauh yang sudah dihitung. Membalik cepat atau melompat ke halaman akhir tidak menaikkannya.
export const MIN_DETIK_PER_HALAMAN = 5
/** Batas detik yang dicatat untuk satu kali tampil sebuah halaman, supaya tab yang ditinggal terbuka tidak menggelembungkan waktu baca. */
export const MAKS_DETIK_PER_HALAMAN = 180
/** Lanjutan yang sah hanya halaman tepat sesudah yang terjauh. Pembaca menampilkan satu halaman per balikan
 *  (DUA_HALAMAN = false di PembacaPdf.tsx); bila tampilan dua halaman dihidupkan lagi, angka ini menjadi 2. */
export const LANGKAH_HALAMAN = 1

export function persenBaca(terjauh: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((terjauh / total) * 100)) : 0
}

/** Halaman terjauh yang sudah dihitung dibaca, diturunkan dari persen tersimpan. */
// shortcut: persen bulat hanya memulihkan nomor halaman dengan tepat sampai 100 halaman; PDF yang lebih panjang perlu kolom halaman terjauh sendiri.
export function halamanTerjauh(pct: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(total, Math.round((pct / 100) * total))) : 0
}

/** Halaman terjauh menurut catatan tersimpan: kolom furthest_page bila ada dan PDF-nya masih berjumlah halaman sama;
 *  selain itu diturunkan dari persen (catatan lama, atau PDF yang sudah diganti dosen). */
export function terjauhLama(lama: { pct: number; totalPages: number | null; furthestPage: number | null }, total: number): number {
  if (total <= 0) return 0
  // PDF diganti dosen dengan jumlah halaman lain: nomor halaman lama tidak berlaku, taksir ke bawah dari persen.
  if (lama.totalPages != null && lama.totalPages !== total) return Math.max(0, Math.min(total, Math.floor((lama.pct / 100) * total)))
  // Halaman terkecil yang masih menghasilkan persen itu. Dipakai sebagai batas bawah, karena tab lama (sebelum v38)
  // bisa menaikkan persen tanpa ikut menaikkan kolom halaman terjauh.
  const dariPersen = Math.max(0, Math.ceil(((lama.pct - 0.5) / 100) * total))
  return Math.min(total, Math.max(lama.furthestPage ?? 0, dariPersen))
}

export function majuTerjauh(terjauh: number, halaman: number, detikTampil: number, langkah: number = LANGKAH_HALAMAN): number {
  if (detikTampil < MIN_DETIK_PER_HALAMAN) return terjauh
  return halaman > terjauh && halaman <= terjauh + langkah ? halaman : terjauh
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
        }
        // started_at tidak dikirim, dan completed_at tidak pernah dikirim kosong (antrean #225). Penjaga di basis data
        // (migration_v38) mengisi keduanya sekali dan menolak angka yang turun; selama penjaga belum dijalankan,
        // completed_at tetap dikirim di tiap simpan 100% seperti sebelumnya supaya tidak pernah kosong.
        if (data.pct >= 100) row.completed_at = new Date().toISOString()
        if (data.totalPages != null) row.total_pages = data.totalPages
        if (data.timeSpent != null) row.time_spent = data.timeSpent
        if (data.furthestPage != null && kolomTerjauhAda) row.furthest_page = data.furthestPage
        const kirim = () => supabase.from('user_progress').upsert(row, { onConflict: 'user_id,module_id' })
        let { error } = await kirim()
        // Kolom yang belum ada dibuang satu per satu, yang termuda dulu, lalu dicoba lagi.
        for (const kolom of ['furthest_page', 'total_pages']) {
          if (error && kolom in row && kolomHilang(error, kolom)) {
            if (kolom === 'furthest_page') kolomTerjauhAda = false
            delete row[kolom]
            ;({ error } = await kirim())
          }
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
      totalPages: data.totalPages ?? existing.totalPages ?? null,
      ...(data.furthestPage != null ? { furthestPage: data.furthestPage } : {}),
      lastOpened,
    }
    localStorage.setItem('sfp_' + modulePath, JSON.stringify(merged))
    const moduleId = pathToModuleId(modulePath)
    if (data.timeSpent != null && moduleId) localStorage.setItem('sfp_time_' + moduleId, String(data.timeSpent))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

export interface CatatanTopik {
  pct: number
  totalPages: number | null
  timeSpent: number
  /** null bila kolomnya belum ada atau barisnya ditulis sebelum v38. */
  furthestPage: number | null
}

// Catatan baca satu topik, dibaca langsung dan bukan dari cache (antrean #191). Berbeda dari fetchAllProgress
// dan fetchTimeSpent, fungsi ini MELEMPAR bila Supabase gagal: pemanggil yang menulis ulang persen dan waktu
// tidak boleh mengira catatan kosong lalu menimpa angka lama dengan angka yang lebih kecil.
export async function fetchCatatanTopik(moduleId: number): Promise<CatatanTopik> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (uid) {
      type Baris = { pct: number | null; time_spent: number | null; total_pages?: number | null; furthest_page?: number | null }
      const baca = (kolom: string) => supabase.from('user_progress').select(kolom).eq('user_id', uid).eq('module_id', moduleId).maybeSingle()
      let { data, error } = await baca(kolomTerjauhAda ? 'pct, time_spent, total_pages, furthest_page' : 'pct, time_spent, total_pages')
      // Sebelum v38 kolom furthest_page belum ada, sebelum v26 kolom total_pages belum ada: ulang tanpa kolom itu.
      if (error && kolomHilang(error, 'furthest_page')) {
        kolomTerjauhAda = false
        ;({ data, error } = await baca('pct, time_spent, total_pages'))
      }
      if (error && kolomHilang(error, 'total_pages')) ({ data, error } = await baca('pct, time_spent'))
      if (error) throw error
      const r = data as Baris | null
      return { pct: r?.pct || 0, totalPages: r?.total_pages ?? null, timeSpent: r?.time_spent || 0, furthestPage: r?.furthest_page ?? null }
    }
  }
  const timeSpent = parseInt(localStorage.getItem('sfp_time_' + moduleId) || '0', 10) || 0
  try {
    const lokal = JSON.parse(localStorage.getItem('sfp_' + moduleIdToPath(moduleId)) || '{}') as Partial<ProgressEntry>
    return { pct: lokal.pct || 0, totalPages: lokal.totalPages ?? null, timeSpent, furthestPage: lokal.furthestPage ?? null }
  } catch {
    return { pct: 0, totalPages: null, timeSpent, furthestPage: null }
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
