import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Saklar notifikasi lonceng (antrean #360, 8 Nov 2026): tiap pengguna boleh mematikan notifikasi
// bila tidak diperlukan. Disimpan per akun di perangkat (localStorage), bawaan menyala. Mati =
// lencana angka hilang dan panel hanya memuat saklarnya. Penanda jaringan dan antrean hasil tes
// (PengirimUlang) tidak ikut mati, karena menyangkut data yang belum terkirim.
const PERISTIWA = 'sfp-notif-pref'

export const kunciNotif = (userId?: string) => `sfp_notif_aktif:${userId ?? 'anon'}`

export function bacaNotifAktif(userId?: string): boolean {
  try {
    return localStorage.getItem(kunciNotif(userId)) !== '0'
  } catch {
    return true
  }
}

export function tulisNotifAktif(userId: string | undefined, aktif: boolean): void {
  try {
    localStorage.setItem(kunciNotif(userId), aktif ? '1' : '0')
  } catch {
    /* penyimpanan dimatikan: pilihan berlaku sampai halaman dimuat ulang */
  }
  window.dispatchEvent(new Event(PERISTIWA))
}

function langgan(ubah: () => void) {
  window.addEventListener(PERISTIWA, ubah)
  window.addEventListener('storage', ubah)
  return () => {
    window.removeEventListener(PERISTIWA, ubah)
    window.removeEventListener('storage', ubah)
  }
}

/** Dibagi semua lonceng (rel laptop dan kepala telepon) lewat peristiwa, jadi keduanya selalu sama. */
export function useNotifAktif() {
  const { user } = useAuth()
  const uid = user?.id
  const aktif = useSyncExternalStore(langgan, () => bacaNotifAktif(uid), () => true)
  const setAktif = useCallback((v: boolean) => tulisNotifAktif(uid, v), [uid])
  return { aktif, setAktif }
}
