import { supabase, isSupabaseConfigured } from './supabase'

// Mirrors legacy/data-layer.js's "MANAJEMEN MODUL" section (saveModulCustom /
// getModulCustom / saveModulOrder / getModulOrder) — dosen edits module
// metadata & order directly against the `modules` table, same dual-mode
// (Supabase when configured, else localStorage) fallback as forum.ts/profil.ts.

export type ModulStatus = 'aktif' | 'draf' | 'terkunci' | 'nonaktif'

export interface ModulCustom {
  judul?: string
  deskripsi?: string
  status?: ModulStatus
  durasi?: string
  catatan?: string
  updatedAt?: string
  pdfPath?: string
}

const CUSTOM_KEY_PREFIX = 'sfp_modul_custom_'
const ORDER_KEY = 'sfp_modul_order'

function customKey(moduleId: number): string {
  return CUSTOM_KEY_PREFIX + moduleId
}

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota/serialization errors, matches legacy/data-layer.js lsSet behavior
  }
}

// Mirrors legacy/data-layer.js saveModulCustom(). Note a legacy quirk preserved
// here on purpose: the Supabase write only distinguishes is_active by
// `status !== 'nonaktif'`, so 'draf' and 'terkunci' both persist as
// is_active: true — the aktif/draf/terkunci distinction only round-trips
// through localStorage, never through Supabase's is_active boolean.
export async function saveModulCustom(moduleId: number, data: ModulCustom): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const update: Record<string, unknown> = {
        title: data.judul,
        description: data.deskripsi,
        is_active: data.status !== 'nonaktif',
      }
      if (data.pdfPath) update.pdf_path = data.pdfPath
      const { error } = await supabase.from('modules').update(update).eq('id', moduleId)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[manajemen] saveModulCustom → Supabase gagal, fallback localStorage:', e)
    }
  }
  lsSet(customKey(moduleId), data)
}

// Upload a dosen-provided PDF to the public `modul-pdf` Storage bucket (see
// database/migration_v3_modul_pdf_storage.sql) and point the module's
// pdf_path at the resulting public URL. Demo/localStorage mode has no
// Storage backend, so it just stores the override locally instead — the
// file itself never leaves the browser in that mode.
export async function uploadModulPdf(moduleId: number, file: File): Promise<string> {
  if (isSupabaseConfigured) {
    const path = `modul-${moduleId}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('modul-pdf')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('modul-pdf').getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('modules')
      .update({ pdf_path: data.publicUrl })
      .eq('id', moduleId)
    if (updateError) throw updateError
    return data.publicUrl
  }
  // Demo mode: no Storage backend — keep the override local only.
  const objectUrl = URL.createObjectURL(file)
  const existing = lsGet<ModulCustom>(customKey(moduleId)) ?? {}
  lsSet(customKey(moduleId), { ...existing, pdfPath: objectUrl })
  return objectUrl
}

// Mirrors legacy/data-layer.js getModulCustom(). In Supabase mode only
// judul/deskripsi/status (aktif|nonaktif) come back — durasi/catatan have no
// backing columns and are only ever available via the localStorage fallback.
export async function getModulCustom(moduleId: number): Promise<ModulCustom | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('title, description, is_active')
        .eq('id', moduleId)
        .single()
      if (error) throw error
      if (data) {
        const row = data as { title?: string; description?: string; is_active?: boolean }
        return { judul: row.title, deskripsi: row.description, status: row.is_active ? 'aktif' : 'nonaktif' }
      }
    } catch (e) {
      console.warn('[manajemen] getModulCustom → Supabase gagal, fallback localStorage:', e)
    }
  }
  return lsGet<ModulCustom>(customKey(moduleId))
}

// Batched convenience wrapper (not a legacy DataLayer method) mirroring
// legacy/manajemen.html renderTable()'s `customMap` prefetch: Promise.all
// over every module id so the table can render synchronously from one fetch.
export async function getModulCustomMap(moduleIds: number[]): Promise<Record<number, ModulCustom | null>> {
  const entries = await Promise.all(moduleIds.map(async (id) => [id, await getModulCustom(id)] as const))
  return Object.fromEntries(entries)
}

// Mirrors legacy/data-layer.js saveModulOrder().
export async function saveModulOrder(order: number[]): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await Promise.all(order.map((moduleId, i) => supabase.from('modules').update({ order_num: i + 1 }).eq('id', moduleId)))
      return
    } catch (e) {
      console.warn('[manajemen] saveModulOrder → Supabase gagal, fallback localStorage:', e)
    }
  }
  lsSet(ORDER_KEY, order)
}

// Mirrors legacy/data-layer.js getModulOrder().
export async function getModulOrder(): Promise<number[] | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('modules').select('id').order('order_num')
      if (error) throw error
      if (data && data.length) return data.map((m) => m.id as number)
    } catch (e) {
      console.warn('[manajemen] getModulOrder → Supabase gagal, fallback localStorage:', e)
    }
  }
  return lsGet<number[]>(ORDER_KEY)
}
