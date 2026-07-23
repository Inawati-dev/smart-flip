import { supabase, isSupabaseConfigured } from './supabase'

export interface ModuleRow {
  id: number
  order_num: number
  title: string
  description: string | null
  video_url: string | null
  pdf_path: string | null
  is_active: boolean
  path: string
  videoId: string | null
  color: string
  sub: string
  capaian: string[]
  materi: Array<{ sesi: number; topik: string }>
  kuis: unknown[]
  jurnal: unknown[]
  studiKasus: unknown[]
}

export function normalizeModuleRow(row: Record<string, unknown>): ModuleRow {
  return {
    id: row.id as number,
    order_num: row.order_num as number,
    title: row.title as string,
    description: (row.description as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    pdf_path: (row.pdf_path as string) ?? null,
    is_active: (row.is_active as boolean) ?? true,
    path: (row.path as string) || (row.pdf_path as string) || '',
    videoId: (row.videoId as string) ?? null,
    color: (row.color as string) || 'var(--sage)',
    sub: (row.sub as string) || '',
    capaian: (row.capaian as string[]) || [],
    materi: (row.materi as Array<{ sesi: number; topik: string }>) || [],
    kuis: (row.kuis as unknown[]) || [],
    jurnal: (row.jurnal as unknown[]) || [],
    studiKasus: (row.studiKasus as unknown[]) || [],
  }
}

export async function fetchModules(): Promise<ModuleRow[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').order('order_num')
    if (!error && data && data.length) return data.map(normalizeModuleRow)
  }
  return []
}

export async function fetchModuleById(id: number): Promise<ModuleRow | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').eq('id', id).single()
    if (!error && data) return normalizeModuleRow(data)
  }
  const all = await fetchModules()
  return all.find((m) => m.id === id) ?? null
}
