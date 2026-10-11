import { supabase, isSupabaseConfigured } from './supabase'

// Sampul buku dari halaman pertama PDF (antrean #192, Johan 11 Okt 2026:
// "cover ini sesuai dengan cover pdf"). Gambarnya dibuat sekali oleh peramban
// dosen dan disimpan di bucket `modul-pdf` di samping PDF-nya, bernama
// <nama pdf>.sampul.jpg. Rak cukup memuat gambar kecil itu; PDF tidak diunduh
// hanya untuk sampul. Tanpa kolom baru: alamat sampul diturunkan dari alamat PDF.
export const AKHIRAN_SAMPUL = '.sampul.jpg'
const PENANDA = '/storage/v1/object/public/modul-pdf/'
const LEBAR_SAMPUL = 480 // px; kartu rak paling lebar sekitar 280 px, jadi cukup untuk layar rapat

/** Alamat gambar sampul untuk PDF di bucket `modul-pdf`; null untuk PDF di tempat lain (mis. /books/...). */
export function urlSampul(pdfUrl: string | null | undefined): string | null {
  if (!pdfUrl || !pdfUrl.includes(PENANDA)) return null
  return pdfUrl.split('?')[0] + AKHIRAN_SAMPUL
}

function namaObjek(pdfUrl: string): string {
  return decodeURIComponent(pdfUrl.slice(pdfUrl.indexOf(PENANDA) + PENANDA.length).split('?')[0])
}

const berjalan = new Map<string, Promise<boolean>>()

/**
 * Gambar halaman pertama PDF lalu unggah sebagai sampulnya. Hanya dosen yang
 * lolos kebijakan unggah bucket. Mengembalikan false bila gagal (bukan dosen,
 * PDF rusak, jaringan); pemanggil tetap memakai sampul rancangan.
 */
export function buatSampul(pdfUrl: string): Promise<boolean> {
  if (!isSupabaseConfigured || !urlSampul(pdfUrl)) return Promise.resolve(false)
  const ada = berjalan.get(pdfUrl)
  if (ada) return ada
  const tugas = (async () => {
    try {
      const [pdfjs, pekerja] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.js?url')])
      pdfjs.GlobalWorkerOptions.workerSrc = pekerja.default
      const doc = await pdfjs.getDocument(pdfUrl).promise
      try {
        const hal = await doc.getPage(1)
        const dasar = hal.getViewport({ scale: 1 })
        const viewport = hal.getViewport({ scale: LEBAR_SAMPUL / dasar.width })
        const kanvas = document.createElement('canvas')
        kanvas.width = viewport.width
        kanvas.height = viewport.height
        const ctx = kanvas.getContext('2d')
        if (!ctx) return false
        await hal.render({ canvasContext: ctx, viewport }).promise
        const blob = await new Promise<Blob | null>((selesai) => kanvas.toBlob(selesai, 'image/jpeg', 0.82))
        if (!blob) return false
        const { error } = await supabase.storage
          .from('modul-pdf')
          .upload(namaObjek(pdfUrl) + AKHIRAN_SAMPUL, blob, { upsert: true, contentType: 'image/jpeg' })
        return !error
      } finally {
        doc.destroy().catch(() => {})
      }
    } catch (e) {
      console.warn('[sampulPdf] gagal membuat sampul untuk', pdfUrl, e)
      return false
    } finally {
      berjalan.delete(pdfUrl)
    }
  })()
  berjalan.set(pdfUrl, tugas)
  return tugas
}
