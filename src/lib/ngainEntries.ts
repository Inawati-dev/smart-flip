import { supabase, isSupabaseConfigured } from './supabase'

// Persistence for /ngain's worksheet -- previously pure client-side state
// (see lib/ngain.ts's header comment), reset back to the same dummy roster
// on every refresh. Same dual-mode (Supabase when configured, else per-
// dosen localStorage) pattern as lib/kuisSoal.ts. Full-replace on save
// (delete all + reinsert) instead of per-row upserts -- this worksheet is
// small (tens of rows at most) and rows have no stable identity worth
// diffing against (the UI's row ids are local-only, regenerated each load).

export interface NgainEntryRow {
  id: string
  nama: string
  pre: string
  post: string
}

export interface NgainConfig {
  skorMax: string
  jmlMhs: string
}

function entriesKey(dosenId: string): string {
  return `sfp_ngain_entries_${dosenId}`
}

function configKey(dosenId: string): string {
  return `sfp_ngain_config_${dosenId}`
}

export async function fetchNgainEntries(dosenId: string): Promise<NgainEntryRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('ngain_entries')
        .select('id, nama, pre, post')
        .eq('dosen_id', dosenId)
        .order('order_num')
      if (error) throw error
      if (data) {
        return data.map((d) => ({
          id: String(d.id),
          nama: d.nama ?? '',
          pre: d.pre != null ? String(d.pre) : '',
          post: d.post != null ? String(d.post) : '',
        }))
      }
    } catch (e) {
      console.warn('[ngainEntries] fetchNgainEntries → Supabase gagal, fallback demo:', e)
    }
  }
  try {
    const raw = localStorage.getItem(entriesKey(dosenId))
    if (raw) return JSON.parse(raw) as NgainEntryRow[]
  } catch {
    // ignore, fall through to empty worksheet
  }
  return []
}

export async function saveNgainEntries(dosenId: string, rows: NgainEntryRow[]): Promise<void> {
  if (isSupabaseConfigured) {
    const { error: delError } = await supabase.from('ngain_entries').delete().eq('dosen_id', dosenId)
    if (delError) throw delError
    if (rows.length) {
      const { error: insError } = await supabase.from('ngain_entries').insert(
        rows.map((r, i) => ({
          dosen_id: dosenId,
          nama: r.nama,
          pre: r.pre.trim() === '' ? null : parseFloat(r.pre),
          post: r.post.trim() === '' ? null : parseFloat(r.post),
          order_num: i,
        })),
      )
      if (insError) throw insError
    }
    return
  }
  try {
    localStorage.setItem(entriesKey(dosenId), JSON.stringify(rows))
  } catch {
    // ignore quota/serialization errors
  }
}

export async function fetchNgainConfig(dosenId: string): Promise<NgainConfig | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('ngain_config')
        .select('skor_max, jml_mhs')
        .eq('dosen_id', dosenId)
        .maybeSingle()
      if (error) throw error
      if (data) return { skorMax: String(data.skor_max), jmlMhs: String(data.jml_mhs) }
      return null
    } catch (e) {
      console.warn('[ngainEntries] fetchNgainConfig → Supabase gagal, fallback demo:', e)
    }
  }
  try {
    const raw = localStorage.getItem(configKey(dosenId))
    if (raw) return JSON.parse(raw) as NgainConfig
  } catch {
    // ignore
  }
  return null
}

export async function saveNgainConfig(dosenId: string, config: NgainConfig): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.from('ngain_config').upsert({
      dosen_id: dosenId,
      skor_max: parseFloat(config.skorMax) || 100,
      jml_mhs: parseInt(config.jmlMhs, 10) || 30,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return
  }
  try {
    localStorage.setItem(configKey(dosenId), JSON.stringify(config))
  } catch {
    // ignore
  }
}
