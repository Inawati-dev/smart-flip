import { supabase, isSupabaseConfigured } from './supabase'

// Menu Kirim saran dan laporan bug (angket butir 11, antrean #373). Tabel `laporan` dibuat SQL v58;
// demo (tanpa Supabase) memakai localStorage `sfp_laporan_demo`. Sebelum SQL v58 dijalankan, kirim dan
// baca gagal dengan kode relasi tidak ada: halaman menampilkan "belum aktif" lewat `LaporanBelumAktif`.

export type JenisLaporan = 'saran' | 'bug'
export type StatusLaporan = 'baru' | 'dibaca' | 'selesai'

export interface Laporan {
  id: string
  userId: string
  nama?: string
  jenis: JenisLaporan
  isi: string
  halaman: string | null
  status: StatusLaporan
  createdAt: string
}

export const ISI_MIN = 5
export const ISI_MAKS = 2000
export const HALAMAN_MAKS = 200
const KUNCI_LOKAL = 'sfp_laporan_demo'

/** Pesan galat Indonesia bila isi tidak sah, selain itu null. Aturan sama dengan CHECK di SQL v58. */
export function validasiLaporan(isi: string, halaman?: string | null): string | null {
  const t = isi.trim()
  if (t.length < ISI_MIN) return `Isi laporan minimal ${ISI_MIN} karakter.`
  if (t.length > ISI_MAKS) return `Isi laporan paling banyak ${ISI_MAKS} karakter.`
  if ((halaman ?? '').length > HALAMAN_MAKS) return `Halaman terkait paling banyak ${HALAMAN_MAKS} karakter.`
  return null
}

export class LaporanBelumAktif extends Error {
  constructor() {
    super('Menu Kirim belum aktif. Hubungi pengelola.')
    this.name = 'LaporanBelumAktif'
  }
}

/** Galat Postgres "relation does not exist" (42P01) atau PostgREST "tabel tidak ada di cache" (PGRST205). */
function tabelBelumAda(e: unknown): boolean {
  const o = e as { code?: string; message?: string } | null
  return !!o && (o.code === '42P01' || o.code === 'PGRST205' || /relation .*laporan.* does not exist|Could not find the table/i.test(o.message ?? ''))
}

function bacaLokal(): Laporan[] {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_LOKAL) ?? '[]') as Laporan[]
  } catch {
    return []
  }
}
function tulisLokal(rows: Laporan[]): void {
  try {
    localStorage.setItem(KUNCI_LOKAL, JSON.stringify(rows))
  } catch {
    /* kuota penuh: laporan demo tidak tersimpan */
  }
}

export async function kirimLaporan(input: { jenis: JenisLaporan; isi: string; halaman?: string | null }): Promise<void> {
  const salah = validasiLaporan(input.isi, input.halaman)
  if (salah) throw new Error(salah)
  const baris = { jenis: input.jenis, isi: input.isi.trim(), halaman: input.halaman?.trim() || null }
  if (!isSupabaseConfigured) {
    tulisLokal([{ id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId: 'demo', jenis: baris.jenis, isi: baris.isi, halaman: baris.halaman, status: 'baru', createdAt: new Date().toISOString() }, ...bacaLokal()])
    return
  }
  const { error } = await supabase.from('laporan').insert(baris)
  if (error) {
    if (tabelBelumAda(error)) throw new LaporanBelumAktif()
    if (error.code === '42501') throw new Error('Batas kiriman tercapai (10 laporan per jam). Coba lagi nanti.')
    throw new Error(error.message)
  }
}

type BarisDb = { id: string; user_id: string; jenis: JenisLaporan; isi: string; halaman: string | null; status: StatusLaporan; created_at: string; profiles?: { full_name?: string } | null }
const dariDb = (r: BarisDb): Laporan => ({ id: r.id, userId: r.user_id, nama: r.profiles?.full_name, jenis: r.jenis, isi: r.isi, halaman: r.halaman, status: r.status, createdAt: r.created_at })

/** Laporan milik pengguna masuk; `semua` (dosen) memuat semua laporan beserta nama pengirim. */
export async function fetchLaporan(opsi: { semua: boolean; userId?: string }): Promise<Laporan[]> {
  if (!isSupabaseConfigured) return bacaLokal()
  let q = supabase.from('laporan').select('id, user_id, jenis, isi, halaman, status, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(200)
  if (!opsi.semua && opsi.userId) q = q.eq('user_id', opsi.userId)
  const { data, error } = await q
  if (error) {
    if (tabelBelumAda(error)) throw new LaporanBelumAktif()
    throw new Error(error.message)
  }
  return ((data ?? []) as unknown as BarisDb[]).map(dariDb)
}

export async function ubahStatusLaporan(id: string, status: StatusLaporan): Promise<void> {
  if (!isSupabaseConfigured) {
    tulisLokal(bacaLokal().map((l) => (l.id === id ? { ...l, status } : l)))
    return
  }
  const { error } = await supabase.from('laporan').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export const LABEL_JENIS: Record<JenisLaporan, string> = { saran: 'Saran', bug: 'Laporan bug' }
export const LABEL_STATUS: Record<StatusLaporan, string> = { baru: 'Baru', dibaca: 'Dibaca', selesai: 'Selesai' }
