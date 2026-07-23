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
      const { error } = await supabase
        .from('modules')
        .update({ title: data.judul, description: data.deskripsi, is_active: data.status !== 'nonaktif' })
        .eq('id', moduleId)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[manajemen] saveModulCustom → Supabase gagal, fallback localStorage:', e)
    }
  }
  lsSet(customKey(moduleId), data)
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
