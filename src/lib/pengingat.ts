import { supabase, isSupabaseConfigured } from './supabase'

// Pengingat dosen ke mahasiswa dari tab Perlu Perhatian (antrean #338).
// Disimpan di tabel notifications dengan type 'pengingat' (SQL v55); demo
// memakai localStorage sfp_pengingat.

export interface Pengingat {
  id: string
  userId: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

/** Satu pengingat per mahasiswa per 24 jam; batas yang sama dijaga SQL v55. */
export const JEDA_PENGINGAT_JAM = 24

const LOCAL_KEY = 'sfp_pengingat'

function bacaLokal(): Pengingat[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Pengingat[]) : []
  } catch {
    return []
  }
}

function tulisLokal(rows: Pengingat[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    // abaikan kuota penuh, sama dengan lib lain
  }
}

/** Kalimat bawaan di modal; dosen boleh menyuntingnya. */
export const PESAN_BAWAAN = 'ada langkah belajar yang tertinggal. Yuk lanjutkan hari ini.'

export function judulPengingat(mataKuliah?: string): string {
  return mataKuliah ? `Pengingat dari dosen · ${mataKuliah}` : 'Pengingat dari dosen'
}

/** Isi per mahasiswa: sapaan nama + kalimat dosen + alasan dari baris Perlu Perhatian. */
export function isiPengingat(nama: string, pesan: string, keterangan: string): string {
  return `Halo ${nama}, ${pesan.trim()}\nCatatan: ${keterangan}`
}

/** true bila pengingat terakhir masih di dalam jeda 24 jam. */
export function dalamJeda(terakhir: string | undefined, now: Date = new Date()): boolean {
  if (!terakhir) return false
  const t = new Date(terakhir).getTime()
  // Waktu di masa depan (jam perangkat meleset atau data rusak) tidak mengunci tombol.
  const selisih = now.getTime() - t
  return Number.isFinite(t) && selisih >= 0 && selisih < JEDA_PENGINGAT_JAM * 3600000
}

/** Kirim ke tiap mahasiswa. Per baris, supaya satu yang ditolak (jeda, bukan mahasiswanya) tidak menggagalkan semua. */
export async function kirimPengingat(items: Array<{ userId: string; body: string }>, title: string): Promise<{ terkirim: string[]; gagal: string[] }> {
  const terkirim: string[] = []
  const gagal: string[] = []
  if (!isSupabaseConfigured) {
    const rows = bacaLokal()
    const now = new Date()
    for (const { userId, body } of items) {
      const lama = rows.filter((r) => r.userId === userId).map((r) => r.createdAt).sort().pop()
      if (dalamJeda(lama, now)) { gagal.push(userId); continue }
      rows.push({ id: `${now.getTime()}-${userId}`, userId, title, body, read: false, createdAt: now.toISOString() })
      terkirim.push(userId)
    }
    tulisLokal(rows)
    return { terkirim, gagal }
  }
  const hasil = await Promise.all(
    items.map(({ userId, body }) => supabase.from('notifications').insert({ user_id: userId, type: 'pengingat', title, body })),
  )
  hasil.forEach((h, i) => (h.error ? gagal : terkirim).push(items[i].userId))
  return { terkirim, gagal }
}

/** Waktu pengingat terakhir per mahasiswa dalam 24 jam terakhir (RLS: hanya kiriman dosen ini). */
export async function fetchPengingatTerakhir(userIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (userIds.length === 0) return out
  const batas = new Date(Date.now() - JEDA_PENGINGAT_JAM * 3600000).toISOString()
  let rows: Array<{ userId: string; createdAt: string }>
  if (!isSupabaseConfigured) {
    rows = bacaLokal().filter((r) => userIds.includes(r.userId) && r.createdAt > batas)
  } else {
    const { data, error } = await supabase
      .from('notifications')
      .select('user_id, created_at')
      .eq('type', 'pengingat')
      .in('user_id', userIds)
      .gt('created_at', batas)
    // Galat (mis. URL terlalu panjang): tanpa data tombol tetap aktif; server yang menolak kiriman dalam jeda.
    if (error) return out
    rows = (data ?? []).map((r) => ({ userId: r.user_id as string, createdAt: r.created_at as string }))
  }
  for (const r of rows) if (!out[r.userId] || r.createdAt > out[r.userId]) out[r.userId] = r.createdAt
  return out
}

/** Pengingat yang belum dibaca milik mahasiswa yang sedang masuk, terbaru dulu. */
export async function fetchPengingatSaya(userId: string | undefined): Promise<Pengingat[]> {
  if (!userId) return []
  if (!isSupabaseConfigured) {
    return bacaLokal().filter((r) => r.userId === userId && !r.read).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, read, created_at')
    .eq('user_id', userId)
    .eq('type', 'pengingat')
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return []
  return (data ?? []).map((r) => ({
    id: String(r.id),
    userId: r.user_id as string,
    title: r.title as string,
    body: (r.body as string) ?? '',
    read: !!r.read,
    createdAt: r.created_at as string,
  }))
}

export async function tandaiPengingatDibaca(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    tulisLokal(bacaLokal().map((r) => (r.id === id ? { ...r, read: true } : r)))
    return
  }
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', Number(id))
  if (error) throw error
}
