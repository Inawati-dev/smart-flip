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

const AMBANG_GELAP = 16 // terang rata-rata 0..255; di bawah ini dianggap bingkai hitam (antrean #293)
const UJI_LEBAR = 32
const UJI_TINGGI = 18

/** Terang rata-rata (luminance 0..255) dari data piksel RGBA. */
export function terangRata(data: ArrayLike<number>): number {
  const n = Math.floor(data.length / 4)
  if (n === 0) return 0
  let jumlah = 0
  for (let i = 0; i < n; i++) jumlah += 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]
  return jumlah / n
}

export function terlaluGelap(terang: number): boolean {
  return terang < AMBANG_GELAP
}

/** Urutan detik yang dicoba: detik biasa, lalu 10%, 25%, 50% durasi; tanpa kembar. */
export function urutanDetik(durasi: number): number[] {
  if (!Number.isFinite(durasi) || durasi <= 0) return [0]
  const hasil = [detikBingkai(durasi), durasi * 0.1, durasi * 0.25, durasi * 0.5]
  return hasil.filter((d, i) => hasil.findIndex((x) => Math.abs(x - d) < 0.01) === i)
}

/** Terang rata-rata sumber gambar/video, digambar ke kanvas kecil. */
export function terangSumber(sumber: CanvasImageSource): number {
  const k = document.createElement('canvas')
  k.width = UJI_LEBAR
  k.height = UJI_TINGGI
  const ctx = k.getContext('2d')
  if (!ctx) throw new Error('kanvas tidak tersedia')
  ctx.drawImage(sumber, 0, 0, UJI_LEBAR, UJI_TINGGI)
  return terangRata(ctx.getImageData(0, 0, UJI_LEBAR, UJI_TINGGI).data)
}

/** Tunggu bingkai hasil seek benar-benar tergambar (seeked saja belum menjamin). */
function tungguBingkai(v: HTMLVideoElement): Promise<void> {
  return new Promise((selesai) => {
    const rvfc = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback
    // paling lama 500 ms agar tidak menggantung bila bingkai tidak pernah dilaporkan
    if (rvfc) {
      const t = setTimeout(selesai, 500)
      rvfc.call(v, () => {
        clearTimeout(t)
        selesai()
      })
    } else setTimeout(selesai, 150)
  })
}

/** true bila gambar sampul ada dan gelap (perlu dibuat ulang). Gagal memuat/mengukur = false. */
export function sampulGelap(url: string): Promise<boolean> {
  return new Promise((selesai) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        selesai(terlaluGelap(terangSumber(img)))
      } catch {
        selesai(false)
      }
    }
    img.onerror = () => selesai(false)
    img.src = `${url}${url.includes('?') ? '&' : '?'}c=${Date.now()}`
  })
}

function bingkaiVideo(src: string): Promise<Blob | null> {
  return new Promise((selesai) => {
    const v = document.createElement('video')
    let beres = false
    let antrean: number[] = []
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
    const lanjut = () => {
      const d = antrean.shift()
      if (d === undefined) return akhiri(null) // semua bingkai gelap: jangan simpan sampul hitam
      v.currentTime = d
    }
    v.onloadedmetadata = () => {
      antrean = urutanDetik(v.duration)
      lanjut()
    }
    v.onseeked = async () => {
      try {
        await tungguBingkai(v)
        if (beres) return
        if (terlaluGelap(terangSumber(v))) return lanjut()
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
export function buatSampulVideo(videoUrl: string, timpa = false): Promise<boolean> {
  const sampul = urlSampulVideo(videoUrl)
  if (!isSupabaseConfigured || !sampul) return Promise.resolve(false)
  const ada = berjalan.get(videoUrl)
  if (ada) return ada
  const tugas = (async () => {
    try {
      if (!timpa && (await fetch(sampul, { method: 'HEAD' })).ok) return true // timpa = buat ulang sampul gelap
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
