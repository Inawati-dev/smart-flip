import { supabase, isSupabaseConfigured } from './supabase'

export interface ModuleRow {
  id: number
  course_id: number
  order_num: number
  title: string
  description: string | null
  video_url: string | null
  /** Durasi video dalam detik (v26), null bila belum diisi. */
  duration_sec: number | null
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
    course_id: (row.course_id as number) ?? 1,
    order_num: row.order_num as number,
    title: row.title as string,
    description: (row.description as string) ?? null,
    video_url: (row.video_url as string) ?? null,
    duration_sec: (row.duration_sec as number) ?? null,
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
  ...[
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
    normalizeModuleRow({ id: i + 1, course_id: 1, order_num: i + 1, title, description, video_url: i === 0 ? 'https://youtu.be/dQw4w9WgXcQ' : null, pdf_path: i === 0 ? '/books/modul-01.pdf' : null }),
  ),
  // Mata kuliah 2 (Perpustakaan Digital) untuk pratinjau dev; isi sama dengan seed v23.
  ...[
    ['Konsep Dasar Perpustakaan Digital', 'Definisi, perbedaan dengan perpustakaan konvensional, komponen dan arsitektur'],
    ['Internet dan Alasan Digitalisasi', 'Sejarah internet, akses terbuka, alasan dan manfaat digitalisasi'],
    ['Pengembangan Koleksi Digital', 'Seleksi, format dokumen, lisensi, anggaran, distribusi'],
    ['Metadata dan Dublin Core', '15 elemen Dublin Core, perbandingan dengan MARC'],
    ['Alih Media dan Digitalisasi Bahan Pustaka', 'Pemindaian, OCR, standar kualitas, alur kerja'],
    ['Perangkat Lunak Perpustakaan Digital', 'DSpace, Greenstone, SLiMS, Eprints'],
    ['Temu Kembali Informasi dan Portal Web', 'Pengindeksan, pencarian, portal, personalisasi'],
    ['Preservasi Digital dan Hak Cipta', 'Preservasi jangka panjang, migrasi format, akses terbuka'],
    ['Peran Pustakawan Digital dan Evaluasi Layanan', 'Kompetensi pustakawan digital, literasi informasi, evaluasi'],
  ].map(([title, description], i) =>
    normalizeModuleRow({ id: 101 + i, course_id: 2, order_num: i + 1, title, description, video_url: null, pdf_path: null }),
  ),
]

// courseId menyaring topik milik satu mata kuliah (v23). Sebelum kolom
// course_id ada di DB (42703), jatuh ke query lama tanpa saringan supaya
// halaman tetap hidup sampai Johan menjalankan migrasinya.
export async function fetchModules(courseId?: number): Promise<ModuleRow[]> {
  if (isSupabaseConfigured) {
    let query = supabase.from('modules').select('*').order('order_num')
    if (courseId != null) query = query.eq('course_id', courseId)
    const { data, error } = await query
    if (!error) return (data ?? []).map(normalizeModuleRow)
    if (courseId != null && (error.code === '42703' || /course_id/.test(error.message))) {
      const { data: all } = await supabase.from('modules').select('*').order('order_num')
      return (all ?? []).map(normalizeModuleRow)
    }
    return []
  }
  const demo = courseId == null ? DEMO_MODULES : DEMO_MODULES.filter((m) => m.course_id === courseId)
  return terapkanUrutanDemo(demo)
}

// Mode demo: saveModulOrder() menulis id ke localStorage `sfp_modul_order`;
// terapkan supaya urutan yang diubah dosen terlihat (antrean #104).
function terapkanUrutanDemo(rows: ModuleRow[]): ModuleRow[] {
  let ids: number[] | null = null
  try {
    ids = JSON.parse(localStorage.getItem('sfp_modul_order') ?? 'null') as number[] | null
  } catch {
    ids = null
  }
  if (!Array.isArray(ids)) return rows
  const pos = new Map(ids.map((id, i) => [id, i]))
  if (!rows.some((m) => pos.has(m.id))) return rows
  return [...rows]
    .sort((a, b) => (pos.get(a.id) ?? a.order_num + 1000) - (pos.get(b.id) ?? b.order_num + 1000))
    .map((m, i) => ({ ...m, order_num: i + 1 }))
}

export async function fetchModuleById(id: number): Promise<ModuleRow | null> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('modules').select('*').eq('id', id).single()
    if (!error && data) return normalizeModuleRow(data)
  }
  const all = await fetchModules()
  return all.find((m) => m.id === id) ?? null
}
