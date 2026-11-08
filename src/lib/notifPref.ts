import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from './supabase'

// Saklar notifikasi lonceng (antrean #360, #364, 8 Nov 2026): tiap pengguna boleh mematikan notifikasi
// bila tidak diperlukan. Bawaan menyala. Mati = lencana angka hilang dan panel hanya memuat saklarnya.
// Penanda jaringan dan antrean hasil tes (PengirimUlang) tidak ikut mati, karena menyangkut data yang
// belum terkirim.
//
// Tempat simpan: localStorage per akun (cepat, jalan luring) DAN kolom profiles.notif_aktif (migration_v57)
// supaya pilihan ikut akun ke perangkat lain. Aturan sinkron:
//   - ubah di sini: tulis lokal dulu, lalu kirim ke akun; gagal (luring atau kolom belum ada) = tandai
//     tertunda dan dicoba lagi pada sinkron berikutnya;
//   - buka aplikasi: bila ada yang tertunda, kirim nilai lokal; bila tidak, akun menang dan menimpa lokal.
// Sebelum SQL v57 dijalankan kolomnya belum ada: semua panggilan akun gagal diam-diam dan perilaku sama
// dengan versi lokal saja.
const PERISTIWA = 'sfp-notif-pref'

export const kunciNotif = (userId?: string) => `sfp_notif_aktif:${userId ?? 'anon'}`
export const kunciNotifTunda = (userId: string) => `sfp_notif_tunda:${userId}`

export function bacaNotifAktif(userId?: string): boolean {
  try {
    return localStorage.getItem(kunciNotif(userId)) !== '0'
  } catch {
    return true
  }
}

function tulisLokal(userId: string | undefined, aktif: boolean): void {
  try {
    localStorage.setItem(kunciNotif(userId), aktif ? '1' : '0')
  } catch {
    /* penyimpanan dimatikan: pilihan berlaku sampai halaman dimuat ulang */
  }
  window.dispatchEvent(new Event(PERISTIWA))
}

function setTunda(userId: string, tunda: boolean): void {
  try {
    if (tunda) localStorage.setItem(kunciNotifTunda(userId), '1')
    else localStorage.removeItem(kunciNotifTunda(userId))
  } catch {
    /* tanpa penanda: sinkron berikutnya mengikuti akun */
  }
}

async function kirimKeAkun(userId: string, aktif: boolean): Promise<boolean> {
  if (!isSupabaseConfigured) return true
  try {
    const { error } = await supabase.from('profiles').update({ notif_aktif: aktif }).eq('id', userId)
    if (error) throw error
    return true
  } catch (e) {
    console.warn('[notifPref] simpan ke akun gagal, dicoba lagi nanti:', e)
    return false
  }
}

/** Ubah pilihan: lokal seketika, akun menyusul. Tanpa userId (belum masuk) hanya lokal. */
export async function tulisNotifAktif(userId: string | undefined, aktif: boolean): Promise<void> {
  tulisLokal(userId, aktif)
  if (!userId) return
  setTunda(userId, true)
  if (await kirimKeAkun(userId, aktif)) setTunda(userId, false)
}

/** Satu kali per akun saat aplikasi dibuka. Mengembalikan 'akun' bila lokal diganti nilai akun. */
export async function sinkronNotifAktif(userId: string): Promise<'akun' | 'lokal' | 'tetap'> {
  if (!isSupabaseConfigured) return 'tetap'
  let tunda = false
  try {
    tunda = localStorage.getItem(kunciNotifTunda(userId)) === '1'
  } catch {
    /* anggap tidak ada yang tertunda */
  }
  if (tunda) {
    if (await kirimKeAkun(userId, bacaNotifAktif(userId))) {
      setTunda(userId, false)
      return 'lokal'
    }
    return 'tetap'
  }
  try {
    const { data, error } = await supabase.from('profiles').select('notif_aktif').eq('id', userId).maybeSingle()
    if (error || !data || typeof data.notif_aktif !== 'boolean') return 'tetap'
    if (data.notif_aktif !== bacaNotifAktif(userId)) {
      tulisLokal(userId, data.notif_aktif)
      return 'akun'
    }
  } catch {
    /* kolom belum ada atau luring: pakai lokal */
  }
  return 'tetap'
}

// ── Saklar per jenis (angket butir 14, antrean #370): mahasiswa memilih jenis notifikasi mana yang tampil.
// Disimpan di perangkat per akun (tanpa kolom baru); bawaan semua menyala. Saklar utama di atas tetap
// mematikan semuanya.
export const JENIS_NOTIF = [
  { kunci: 'pengingat', label: 'Pengingat dari dosen' },
  { kunci: 'belajar', label: 'Modul dan video belum selesai' },
  { kunci: 'jadwal', label: 'Jadwal terdekat' },
  { kunci: 'mini', label: 'Kabar Mini Projek' },
] as const
export type JenisNotif = (typeof JENIS_NOTIF)[number]['kunci']
export type PilihanJenis = Record<JenisNotif, boolean>

export const kunciJenisNotif = (userId?: string) => `sfp_notif_jenis:${userId ?? 'anon'}`

function bacaJenisMentah(userId?: string): string {
  try {
    return localStorage.getItem(kunciJenisNotif(userId)) ?? ''
  } catch {
    return ''
  }
}

/** Uraikan isi simpanan: hanya nilai false yang mematikan; isi rusak atau kunci hilang = menyala. */
export function uraiJenisNotif(mentah: string): PilihanJenis {
  const hasil = Object.fromEntries(JENIS_NOTIF.map((j) => [j.kunci, true])) as PilihanJenis
  try {
    const o = JSON.parse(mentah) as Record<string, unknown>
    for (const j of JENIS_NOTIF) if (o?.[j.kunci] === false) hasil[j.kunci] = false
  } catch {
    /* isi rusak: semua menyala */
  }
  return hasil
}

export function tulisJenisNotif(userId: string | undefined, kunci: JenisNotif, aktif: boolean): void {
  const sekarang = uraiJenisNotif(bacaJenisMentah(userId))
  sekarang[kunci] = aktif
  try {
    localStorage.setItem(kunciJenisNotif(userId), JSON.stringify(sekarang))
  } catch {
    /* penyimpanan dimatikan: pilihan berlaku sampai halaman dimuat ulang */
  }
  window.dispatchEvent(new Event(PERISTIWA))
}

export function useJenisNotif() {
  const { user } = useAuth()
  const uid = user?.id
  const mentah = useSyncExternalStore(langgan, () => bacaJenisMentah(uid), () => '')
  const jenis = useMemo(() => uraiJenisNotif(mentah), [mentah])
  const setJenis = useCallback((kunci: JenisNotif, aktif: boolean) => tulisJenisNotif(uid, kunci, aktif), [uid])
  return { jenis, setJenis }
}

function langgan(ubah: () => void) {
  window.addEventListener(PERISTIWA, ubah)
  window.addEventListener('storage', ubah)
  return () => {
    window.removeEventListener(PERISTIWA, ubah)
    window.removeEventListener('storage', ubah)
  }
}

const sudahSinkron = new Set<string>()

/** Dibagi semua lonceng (rel laptop dan kepala telepon) lewat peristiwa, jadi keduanya selalu sama. */
export function useNotifAktif() {
  const { user } = useAuth()
  const uid = user?.id
  const aktif = useSyncExternalStore(langgan, () => bacaNotifAktif(uid), () => true)
  const setAktif = useCallback((v: boolean) => void tulisNotifAktif(uid, v), [uid])
  useEffect(() => {
    if (!uid || sudahSinkron.has(uid)) return
    sudahSinkron.add(uid)
    void sinkronNotifAktif(uid)
  }, [uid])
  return { aktif, setAktif }
}
