import { supabase, isSupabaseConfigured } from './supabase'

// Bank soal terpadu — reads/writes the REAL `quiz_questions` table
// (schema.sql), which was sitting completely unused in production: Kuis.tsx
// used to read from `modules.kuis`, a JSON field that doesn't exist as a
// column anywhere in schema.sql, so every module's quiz silently rendered
// "Soal kuis untuk modul ini belum tersedia" regardless of account. This file
// is the fix — same dual-mode (Supabase when configured, else per-module
// localStorage) pattern as lib/diagnostic.ts's diagnostic_questions CRUD.
//
// v17 (docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §7)
// widens the same table into one bank for pre-test, formatif, post-test and
// VARK via the `kind` column — see fetchBankSoal below.

export type SoalKind = 'pre' | 'formatif' | 'post' | 'vark' | 'kelompok'

export interface KuisSoal {
  id: number
  kind: SoalKind
  module_id: number | null
  /** Mata kuliah (v23) untuk pre/post/kelompok/vark; formatif ikut module_id, boleh null. */
  course_id?: number | null
  question: string
  options: string[]
  answer_idx: number | null
  explanation: string | null
  order_num: number
}

// True when a Supabase error means "the `kind` column doesn't exist yet" —
// i.e. this deploy shipped before migration_v17_bank_soal.sql ran. Lets
// fetchBankSoal/fetchAttemptsByKind degrade gracefully during that gap
// instead of throwing at every mahasiswa.
function isMissingKindColumn(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null | undefined
  if (!err) return false
  if (err.code === '42703') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('column') && msg.includes('kind')
}

function demoKey(kind: SoalKind, moduleId: number | null): string {
  return `sfp_bank_soal_demo_${kind}_${moduleId ?? 'all'}`
}

function legacyFormatifKey(moduleId: number): string {
  return `sfp_kuis_soal_demo_${moduleId}`
}

function demoReadAll(kind: SoalKind, moduleId: number | null): KuisSoal[] {
  try {
    const raw = localStorage.getItem(demoKey(kind, moduleId))
    if (raw) return JSON.parse(raw) as KuisSoal[]
  } catch {
    // ignore, fall through
  }
  // Pre-v17 demo data for formatif soal lived under the old per-module key —
  // keep reading it so nothing already in a dosen's browser disappears.
  if (kind === 'formatif' && moduleId != null) {
    try {
      const raw = localStorage.getItem(legacyFormatifKey(moduleId))
      if (raw) {
        const legacy = JSON.parse(raw) as Array<Omit<KuisSoal, 'kind'>>
        return legacy.map((q) => ({ ...q, kind: 'formatif' as const }))
      }
    } catch {
      // ignore, fall through to empty bank
    }
  }
  return []
}

function demoWriteAll(kind: SoalKind, moduleId: number | null, soal: KuisSoal[]): void {
  try {
    localStorage.setItem(demoKey(kind, moduleId), JSON.stringify(soal))
  } catch {
    // ignore quota/serialization errors, matches lib/diagnostic.ts demoWriteAll
  }
}

// Bank soal untuk satu jenis (pre/formatif/post/vark), opsional disaring per
// modul (hanya relevan untuk formatif). Toleran terhadap deploy yang lebih
// baru dari migrasi v17: kalau kolom `kind` belum ada di DB, jatuh ke query
// lama tanpa `kind` (soal lama semuanya formatif) untuk kind='formatif';
// jenis lain (belum bisa ada sebelum v17) mengembalikan array kosong.
// courseId (v23) menyaring soal pre/post/kelompok milik satu mata kuliah;
// formatif cukup moduleId. Kolom belum ada di DB -> ulang tanpa saringan.
export async function fetchBankSoal(kind: SoalKind, moduleId?: number, courseId?: number): Promise<KuisSoal[]> {
  if (isSupabaseConfigured) {
    try {
      const base = () =>
        supabase
          .from('quiz_questions')
          .select('id, kind, module_id, course_id, question, options, answer_idx, explanation, order_num')
          .eq('kind', kind)
      let query = base()
      if (moduleId != null) query = query.eq('module_id', moduleId)
      if (courseId != null && moduleId == null) query = query.eq('course_id', courseId)
      let { data, error }: { data: KuisSoal[] | null; error: { code?: string; message: string } | null } = await query.order('order_num')
      if (error && (error.code === '42703' || /course_id/.test(error.message))) {
        let q2 = supabase
          .from('quiz_questions')
          .select('id, kind, module_id, question, options, answer_idx, explanation, order_num')
          .eq('kind', kind)
        if (moduleId != null) q2 = q2.eq('module_id', moduleId)
        const r2 = await q2.order('order_num')
        data = r2.data as KuisSoal[] | null
        error = r2.error
      }
      if (error) throw error
      if (data) return data as KuisSoal[]
    } catch (e) {
      if (isMissingKindColumn(e)) {
        if (kind !== 'formatif') return []
        try {
          let legacy = supabase
            .from('quiz_questions')
            .select('id, module_id, question, options, answer_idx, explanation, order_num')
          if (moduleId != null) legacy = legacy.eq('module_id', moduleId)
          const { data, error } = await legacy.order('order_num')
          if (error) throw error
          if (data) {
            return (data as Array<Omit<KuisSoal, 'kind'>>).map((q) => ({ ...q, kind: 'formatif' as const }))
          }
        } catch (e2) {
          console.warn('[kuisSoal] fetchBankSoal fallback tanpa kolom kind gagal:', e2)
        }
        return moduleId != null ? demoReadAll('formatif', moduleId) : []
      }
      console.warn('[kuisSoal] fetchBankSoal → Supabase gagal, fallback demo bank:', e)
    }
  }
  return demoReadAll(kind, moduleId ?? null)
}

// Soal formatif satu modul — dipakai Kuis.tsx/Manajemen.tsx yang ada.
export async function fetchKuisSoal(moduleId: number): Promise<KuisSoal[]> {
  return fetchBankSoal('formatif', moduleId)
}

// Dosen-only CRUD for /manajemen dan BankSoal.tsx. Same rethrow-on-write
// behavior as lib/diagnostic.ts's diagnostic question CRUD: a fallback write
// would only ever land in the dosen's own browser, silently hiding a real
// Supabase failure behind a false "success" toast.
//
// `kind` is optional and defaults to 'formatif' so existing callers (e.g.
// Manajemen.tsx's Kuis soal form) that don't pass it keep working unchanged.
export async function createKuisSoal(
  data: Omit<KuisSoal, 'id' | 'kind'> & { kind?: SoalKind },
): Promise<void> {
  const kind = data.kind ?? 'formatif'
  const row = { ...data, kind }
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('quiz_questions').insert(row)
    if (error) throw error
    return
  }
  const all = demoReadAll(kind, data.module_id)
  const nextId = all.reduce((max, q) => Math.max(max, q.id), 0) + 1
  demoWriteAll(kind, data.module_id, [...all, { ...row, id: nextId }])
}

export async function updateKuisSoal(id: number, data: Partial<Omit<KuisSoal, 'id'>>): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('quiz_questions').update(data).eq('id', id)
    if (error) throw error
    return
  }
  if (data.module_id === undefined) return
  const kind = data.kind ?? 'formatif'
  const all = demoReadAll(kind, data.module_id)
  demoWriteAll(kind, data.module_id, all.map((q) => (q.id === id ? { ...q, ...data } : q)))
}

export async function deleteKuisSoal(
  id: number,
  moduleId: number | null,
  kind: SoalKind = 'formatif',
): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id)
    if (error) throw error
    return
  }
  const all = demoReadAll(kind, moduleId)
  demoWriteAll(kind, moduleId, all.filter((q) => q.id !== id))
}
