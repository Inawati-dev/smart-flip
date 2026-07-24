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

// Creates a brand-new module row (dosen-only, gated by the same RLS as
// saveModulCustom's UPDATE). Demo/localStorage mode has no modules dataset
// to append to (fetchModules() always returns [] when Supabase isn't
// configured — see src/lib/modules.ts) so there's nowhere for a new module
// to persist there; callers should check isSupabaseConfigured and show a
// "butuh koneksi Supabase" message instead of calling this in demo mode —
// and this function self-guards with the same throw in case a future caller
// forgets to, rather than trusting the caller (unlike uploadModulPdf, which
// *can* fall back to a local-only object URL, there's genuinely nowhere for a
// brand-new module to live in demo mode, so a clear throw is the honest match).
export async function createModul(data: {
  judul: string
  deskripsi: string
  orderNum: number
  status?: ModulStatus
  durasi?: string
  catatan?: string
}): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('createModul membutuhkan koneksi Supabase — tidak tersedia di mode demo.')
  }
  const { data: inserted, error } = await supabase
    .from('modules')
    .insert({
      title: data.judul,
      description: data.deskripsi,
      order_num: data.orderNum,
      // Mirrors saveModulCustom's is_active mapping below so a freshly created
      // module respects the Status the dosen picked, instead of always
      // landing is_active:true regardless of what the form said.
      is_active: data.status !== 'nonaktif',
    })
    .select('id')
    .single()
  if (error) throw error

  // durasi/catatan have no backing column on `modules` (see saveModulCustom's
  // comment above — they only ever round-trip through localStorage). Stash
  // them locally keyed to the new row's id using the exact same mechanism, so
  // create and edit are at least consistent in *what* gets captured, even
  // though (like the edit path) they won't be read back while Supabase reads
  // for this module keep succeeding — that's a pre-existing limitation of the
  // schema, not something a create/edit-path fix alone can close.
  if ((data.durasi || data.catatan) && inserted) {
    lsSet(customKey(inserted.id as number), { durasi: data.durasi, catatan: data.catatan })
  }
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
    if (updateError) {
      // Storage upload succeeded but the DB link failed — the file would
      // otherwise sit orphaned in Storage with nothing pointing at it. Best
      // effort cleanup: a failure here must not mask the real (updateError)
      // failure the caller needs to see.
      try {
        await supabase.storage.from('modul-pdf').remove([path])
      } catch (cleanupError) {
        console.warn('[manajemen] uploadModulPdf → gagal membersihkan file orphan setelah update DB gagal:', cleanupError)
      }
      throw updateError
    }
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

// Mirrors legacy/data-layer.js saveModulOrder(), with two deliberate
// deviations from a naive "fire N parallel UPDATEs" implementation:
//
// 1. `modules.order_num` has a hard UNIQUE constraint (database/schema.sql).
//    Firing all target order_num updates in parallel is a real, reliably
//    reproducible race: e.g. swapping modules A (3->1) and B (1->3), A's
//    UPDATE can try to commit order_num=1 while B's row still holds it (each
//    Supabase .update() call is its own independent transaction, so there's
//    no shared transaction to defer the UNIQUE check within) -> Postgres
//    rejects it with a unique-violation. This is the actual, confirmed cause
//    of the "Gagal menyimpan urutan" failures seen in production, not a
//    transient/flaky backend issue. Fixed with a two-phase move: first push
//    every affected row to a temporary NEGATIVE order_num (guaranteed to
//    never collide with the 1..N positive range or with each other, since
//    they're keyed by index), then set every row to its real final
//    order_num — by the time phase 2 runs, none of the target positive
//    values are still occupied by anything in this reorder set (the array
//    always contains every module, see Manajemen.tsx's `order` derivation).
// 2. Still uses Promise.allSettled (not Promise.all) within each phase and
//    reports back exactly which module ids failed, so the caller can roll
//    back its optimistic UI instead of displaying an order that doesn't
//    match what's actually saved.
export async function saveModulOrder(order: number[]): Promise<void> {
  if (isSupabaseConfigured) {
    const phase1 = await Promise.allSettled(
      order.map((moduleId, i) => supabase.from('modules').update({ order_num: -(i + 1) }).eq('id', moduleId)),
    )
    const phase1Failed = phase1.some((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error))
    if (phase1Failed) {
      throw new Error('saveModulOrder: gagal pada tahap penempatan sementara')
    }

    const phase2 = await Promise.allSettled(
      order.map((moduleId, i) => supabase.from('modules').update({ order_num: i + 1 }).eq('id', moduleId)),
    )
    const failedIds: number[] = []
    phase2.forEach((r, i) => {
      if (r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)) failedIds.push(order[i])
    })
    if (failedIds.length === 0) return
    throw new Error(`saveModulOrder: gagal menyimpan order_num untuk modul id ${failedIds.join(', ')}`)
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
