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
  /** Ada gambar terlampir (SQL v59); gambarnya sendiri diambil lewat fetchLampiran. */
  adaLampiran?: boolean
}

export const ISI_MIN = 5
export const ISI_MAKS = 2000
export const HALAMAN_MAKS = 200
/** Lampiran gambar paling besar 1 MB (permintaan Johan, 8 Nov 2026); pagar basis data v59: 1.500.000 karakter data URL. */
export const LAMPIRAN_MAKS_BYTE = 1024 * 1024
export const JENIS_LAMPIRAN = ['image/png', 'image/jpeg', 'image/webp'] as const

/** Pesan galat Indonesia bila berkas tidak boleh dilampirkan, selain itu null. */
export function validasiLampiran(berkas: { type: string; size: number }): string | null {
  if (!(JENIS_LAMPIRAN as readonly string[]).includes(berkas.type)) return 'Lampiran harus gambar PNG, JPG, atau WebP.'
  if (berkas.size > LAMPIRAN_MAKS_BYTE) return `Lampiran terlalu besar (${(berkas.size / 1024 / 1024).toFixed(1).replace('.', ',')} MB). Paling besar 1 MB.`
  return null
}

function dataUrlGambarSah(s: string): boolean {
  return JENIS_LAMPIRAN.some((j) => s.startsWith(`data:${j};base64,`))
}

export function bacaSebagaiDataUrl(berkas: Blob): Promise<string> {
  return new Promise((selesai, gagal) => {
    const r = new FileReader()
    r.onload = () => selesai(String(r.result))
    r.onerror = () => gagal(new Error('Gagal membaca gambar.'))
    r.readAsDataURL(berkas)
  })
}
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

export async function kirimLaporan(input: { jenis: JenisLaporan; isi: string; halaman?: string | null; lampiran?: string | null }): Promise<void> {
  const salah = validasiLaporan(input.isi, input.halaman)
  if (salah) throw new Error(salah)
  if (input.lampiran && !dataUrlGambarSah(input.lampiran)) throw new Error('Lampiran harus gambar PNG, JPG, atau WebP.')
  const baris: { jenis: JenisLaporan; isi: string; halaman: string | null; lampiran?: string } = { jenis: input.jenis, isi: input.isi.trim(), halaman: input.halaman?.trim() || null }
  // Kunci lampiran hanya dikirim bila ada, supaya kirim tanpa lampiran tetap jalan sebelum SQL v59 dijalankan.
  if (input.lampiran) baris.lampiran = input.lampiran
  if (!isSupabaseConfigured) {
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (input.lampiran) tulisLampiranLokal(id, input.lampiran)
    tulisLokal([{ id, userId: 'demo', jenis: baris.jenis, isi: baris.isi, halaman: baris.halaman, status: 'baru', createdAt: new Date().toISOString(), adaLampiran: !!input.lampiran }, ...bacaLokal()])
    return
  }
  const { error } = await supabase.from('laporan').insert(baris)
  if (error) {
    if (baris.lampiran && (error.code === '42703' || (/lampiran/.test(error.message) && /column|schema cache/i.test(error.message)))) {
      throw new Error('Lampiran gambar belum aktif di server. Kirim tanpa lampiran atau hubungi pengelola.')
    }
    if (error.code === '23514') throw new Error('Lampiran ditolak: harus gambar PNG, JPG, atau WebP paling besar 1 MB.')
    if (tabelBelumAda(error)) throw new LaporanBelumAktif()
    if (error.code === '42501') throw new Error('Batas kiriman tercapai (10 laporan per jam). Coba lagi nanti.')
    throw new Error(error.message)
  }
}

type BarisDb = { id: string; user_id: string; jenis: JenisLaporan; isi: string; halaman: string | null; status: StatusLaporan; created_at: string; ada_lampiran?: boolean; profiles?: { full_name?: string } | null }
const dariDb = (r: BarisDb): Laporan => ({ id: r.id, userId: r.user_id, nama: r.profiles?.full_name, jenis: r.jenis, isi: r.isi, halaman: r.halaman, status: r.status, createdAt: r.created_at, adaLampiran: !!r.ada_lampiran })

const KUNCI_LAMPIRAN_LOKAL = 'sfp_laporan_lampiran_demo'
function tulisLampiranLokal(id: string, dataUrl: string): void {
  try {
    const peta = JSON.parse(localStorage.getItem(KUNCI_LAMPIRAN_LOKAL) ?? '{}') as Record<string, string>
    peta[id] = dataUrl
    localStorage.setItem(KUNCI_LAMPIRAN_LOKAL, JSON.stringify(peta))
  } catch {
    /* kuota penuh: lampiran demo tidak tersimpan */
  }
}

/** Gambar lampiran satu laporan (diambil saat dibuka, bukan bersama daftar). Null bila tidak ada. */
export async function fetchLampiran(id: string): Promise<string | null> {
  if (!isSupabaseConfigured) {
    try {
      return (JSON.parse(localStorage.getItem(KUNCI_LAMPIRAN_LOKAL) ?? '{}') as Record<string, string>)[id] ?? null
    } catch {
      return null
    }
  }
  const { data, error } = await supabase.from('laporan').select('lampiran').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  const l = (data as { lampiran?: string | null } | null)?.lampiran
  return l && dataUrlGambarSah(l) ? l : null
}

/** Laporan milik pengguna masuk; `semua` (dosen) memuat semua laporan beserta nama pengirim. */
export async function fetchLaporan(opsi: { semua: boolean; userId?: string }): Promise<Laporan[]> {
  if (!isSupabaseConfigured) return bacaLokal()
  const baca = (kolom: string) => {
    let q = supabase.from('laporan').select(kolom).order('created_at', { ascending: false }).limit(200)
    if (!opsi.semua && opsi.userId) q = q.eq('user_id', opsi.userId)
    return q
  }
  const dasar = 'id, user_id, jenis, isi, halaman, status, created_at, profiles(full_name)'
  let { data, error } = await baca(`${dasar}, ada_lampiran`)
  // Sebelum SQL v59 dijalankan kolom ada_lampiran belum ada: baca tanpa kolom itu.
  if (error && (error.code === '42703' || /ada_lampiran/.test(error.message))) ({ data, error } = await baca(dasar))
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
