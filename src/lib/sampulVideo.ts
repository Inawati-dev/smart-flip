import { supabase, isSupabaseConfigured } from './supabase'
import { AKHIRAN_SAMPUL } from './sampulPdf'

// Gambar kecil untuk video unggahan (antrean #275, pilihan A). Pola sama dengan
// sampul PDF (sampulPdf.ts): peramban dosen mengambil satu bingkai sekali, lalu
// menyimpannya di bucket `modul-video` di samping videonya sebagai
// <nama video>.sampul.jpg. Rak cukup memuat gambar kecil itu. Butuh
// migration_v51 (bucket menerima image/jpeg); sebelum itu unggah gagal dan
// kartu tetap memakai gradasi warna.
const PENANDA = '/storage/v1/object/public/modul-video/'
const LEBAR = 480 // px, sama dengan sampul PDF
const DETIK = 5 // bingkai detik ke-5: lewat dari layar hitam pembuka
const BATAS_MS = 20_000

/** Alamat gambar kecil untuk video di bucket `modul-video`; null untuk YouTube atau alamat lain. */
export function urlSampulVideo(videoUrl: string | null | undefined): string | null {
  if (!videoUrl || !videoUrl.includes(PENANDA)) return null
  return videoUrl.split(/[?#]/)[0] + AKHIRAN_SAMPUL
}

function namaObjek(videoUrl: string): string {
  return decodeURIComponent(videoUrl.slice(videoUrl.indexOf(PENANDA) + PENANDA.length).split(/[?#]/)[0])
}

/** Detik bingkai yang diambil: detik ke-5, atau sepersepuluh durasi untuk video yang lebih pendek dari 50 detik. */
export function detikBingkai(durasi: number): number {
  if (!Number.isFinite(durasi) || durasi <= 0) return 0
  return Math.min(DETIK, durasi / 10)
}

function bingkaiVideo(src: string): Promise<Blob | null> {
  return new Promise((selesai) => {
    const v = document.createElement('video')
    let beres = false
    const akhiri = (hasil: Blob | null) => {
      if (beres) return
      beres = true
      clearTimeout(waktu)
      v.removeAttribute('src')
      v.load()
      selesai(hasil)
    }
    const waktu = setTimeout(() => akhiri(null), BATAS_MS)
    v.crossOrigin = 'anonymous' // tanpa ini kanvas "tercemar" dan toBlob ditolak
    v.muted = true
    v.preload = 'auto'
    v.onerror = () => akhiri(null)
    v.onloadedmetadata = () => {
      v.currentTime = detikBingkai(v.duration)
    }
    v.onseeked = () => {
      try {
        const kanvas = document.createElement('canvas')
        kanvas.width = LEBAR
        kanvas.height = Math.round((LEBAR * (v.videoHeight || 9)) / (v.videoWidth || 16))
        const ctx = kanvas.getContext('2d')
        if (!ctx) return akhiri(null)
        ctx.drawImage(v, 0, 0, kanvas.width, kanvas.height)
        kanvas.toBlob((b) => akhiri(b), 'image/jpeg', 0.82)
      } catch {
        akhiri(null)
      }
    }
    v.src = src
  })
}

const berjalan = new Map<string, Promise<boolean>>()

/**
 * Ambil satu bingkai video lalu unggah sebagai gambar kecilnya. Hanya dosen yang
 * lolos kebijakan unggah bucket. false = gagal (bukan dosen, SQL v51 belum jalan,
 * video rusak); pemanggil tetap memakai gradasi warna.
 */
export function buatSampulVideo(videoUrl: string): Promise<boolean> {
  const sampul = urlSampulVideo(videoUrl)
  if (!isSupabaseConfigured || !sampul) return Promise.resolve(false)
  const ada = berjalan.get(videoUrl)
  if (ada) return ada
  const tugas = (async () => {
    try {
      if ((await fetch(sampul, { method: 'HEAD' })).ok) return true
      const blob = await bingkaiVideo(videoUrl)
      if (!blob) return false
      const { error } = await supabase.storage
        .from('modul-video')
        .upload(namaObjek(videoUrl) + AKHIRAN_SAMPUL, blob, { upsert: true, contentType: 'image/jpeg' })
      return !error
    } catch (e) {
      console.warn('[sampulVideo] gagal membuat gambar kecil untuk', videoUrl, e)
      return false
    } finally {
      berjalan.delete(videoUrl)
    }
  })()
  berjalan.set(videoUrl, tugas)
  return tugas
}
