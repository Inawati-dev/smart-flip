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

// Mode demo (Supabase tidak dikonfigurasi): 9 modul yang sama dengan seed
// database/schema.sql, supaya halaman Modul/Video/Asesmen tetap punya isi
// untuk dicoba dan dipotret tanpa database. Produksi tidak memakai daftar ini.
const DEMO_MODULES: ModuleRow[] = [
  ['Dasar & Konsep R&D', 'Urgenci R&D vokasi, paradigma penelitian pengembangan'],
  ['Model R&D (ADDIE, 4D, Borg & Gall)', 'Perbandingan model, pemilihan model sesuai konteks'],
  ['Needs Assessment & Gap Analysis', 'Teknik analisis kebutuhan dan identifikasi kesenjangan'],
  ['Penyusunan Bab 1 Proposal', 'Latar belakang, rumusan masalah, tujuan, manfaat'],
  ['Blueprint & Storyboard Produk', 'Perencanaan desain produk, wireframe, storyboard'],
  ['Instrumen Validasi Ahli', 'Penyusunan angket validasi media dan materi'],
  ['Analisis Data Validasi', 'Teknik analisis kelayakan, persentase, kategori'],
  ['Uji Coba & Implementasi', 'Uji kelompok kecil, uji lapangan, revisi produk'],
  ['Evaluasi & Diseminasi', 'Kuasi-eksperimen, peningkatan skor, pelaporan, publikasi'],
].map(([title, description], i) =>
  normalizeModuleRow({ id: i + 1, order_num: i + 1, title, description, video_url: i === 0 ? 'https://youtu.be/dQw4w9WgXcQ' : null, pdf_path: null }),
)

export async function fetchModules(): Promise<ModuleRow[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').order('order_num')
    if (!error && data && data.length) return data.map(normalizeModuleRow)
    return []
  }
  return DEMO_MODULES
}

export async function fetchModuleById(id: number): Promise<ModuleRow | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').eq('id', id).single()
    if (!error && data) return normalizeModuleRow(data)
  }
  const all = await fetchModules()
  return all.find((m) => m.id === id) ?? null
}
