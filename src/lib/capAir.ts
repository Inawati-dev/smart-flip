// Pola watermark SVG (antrean #157, #177, #308), dipindah dari components/PembacaPdf.tsx supaya halaman tes (CapTes, antrean #351)
// bisa memakainya tanpa ikut memuat pdfjs. PembacaPdf mengekspor ulang semuanya, jadi impor lama tetap jalan.

export type UkuranCap = 'kecil' | 'sedang' | 'besar'
export type KerapatanCap = 'renggang' | 'sedang' | 'rapat'
const SKALA_UKURAN: Record<UkuranCap, number> = { kecil: 0.75, sedang: 1, besar: 1.5 }
// Gambar: ubin dibanding gambarnya (PNG 340x220 dengan tepi kosong, jadi rapat boleh sedikit memotong tepinya).
const SKALA_KERAPATAN_GAMBAR: Record<KerapatanCap, number> = { renggang: 1.5, sedang: 1, rapat: 0.72 }

/** Taksiran lebar teks dalam satuan ukuran huruf; dibuat longgar supaya kapital lebar dan emoji tidak terpotong. */
function lebarTeks(teks: string): number {
  let n = 0
  for (const c of teks) n += /\p{Extended_Pictographic}/u.test(c) ? 1.3 : /[MWmw]/.test(c) ? 1 : /[A-Z0-9@#%&]/.test(c) ? 0.78 : /[ilj.,·:;'|!]/.test(c) ? 0.35 : 0.62
  return n
}

/**
 * Antrean #308: ukuran memperbesar/memperkecil isi watermark, kerapatan melebarkan/merapatkan
 * jarak antar ubin. Ubin Sedang = ubin lama 340x220 (dikali ukuran), dibesarkan bila teks
 * miringnya tidak muat; Renggang lebih lebar dari Sedang, Rapat hampir seukuran teks miringnya.
 * Untuk teks yang sama urutannya selalu rapat < sedang < renggang, dan teks tidak terpotong.
 * Nilai kosong atau tak dikenal = sedang; sedang/sedang dengan teks pendek = 340x220 persis.
 */
export function ukuranUbin(ukuran?: UkuranCap | null, kerapatan?: KerapatanCap | null, teks?: string) {
  const skala = SKALA_UKURAN[ukuran ?? 'sedang'] ?? 1
  const kr: KerapatanCap = kerapatan === 'renggang' || kerapatan === 'rapat' ? kerapatan : 'sedang'
  if (teks == null) {
    const k = SKALA_KERAPATAN_GAMBAR[kr]
    return { skala, lebar: Math.round(340 * skala * k), tinggi: Math.round(220 * skala * k) }
  }
  const huruf = 15 * skala
  const panjang = lebarTeks(teks) * huruf
  const kotakW = panjang * Math.cos(Math.PI / 6) + huruf * Math.sin(Math.PI / 6)
  const kotakH = panjang * Math.sin(Math.PI / 6) + huruf * Math.cos(Math.PI / 6)
  const sedangW = Math.max(340 * skala, kotakW * 1.5 + huruf)
  const sedangH = Math.max(220 * skala, kotakH * 1.5 + huruf)
  if (kr === 'sedang') return { skala, lebar: Math.round(sedangW), tinggi: Math.round(sedangH) }
  if (kr === 'renggang') return { skala, lebar: Math.round(sedangW * 1.45), tinggi: Math.round(sedangH * 1.45) }
  return { skala, lebar: Math.round(kotakW * 1.06 + huruf), tinggi: Math.round(kotakH * 1.06 + huruf) }
}

/** Ubin gambar (PNG 340x220 dari modal) dibungkus SVG supaya ukuran dan jarak bisa diatur; sedang/sedang = gambar apa adanya. */
export function capGambar(dataUrl: string, ukuran?: UkuranCap | null, kerapatan?: KerapatanCap | null): string {
  const { skala, lebar, tinggi } = ukuranUbin(ukuran, kerapatan)
  if (lebar === 340 && tinggi === 220 && skala === 1) return `url("${dataUrl}")`
  const w = 340 * skala
  const h = 220 * skala
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${lebar}' height='${tinggi}'><image href='${dataUrl}' x='${(lebar - w) / 2}' y='${(tinggi - h) / 2}' width='${w}' height='${h}'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** Watermark (antrean #157): teks diagonal berulang sebagai latar SVG di atas halaman. */
export function capAir(teks: string, ukuran?: UkuranCap | null, kerapatan?: KerapatanCap | null, gaya?: { opasitas?: number; warna?: string }): string {
  // Karakter kontrol (ikut tertempel dari PDF/Word) tidak sah di XML: satu saja
  // membuat SVG gagal dibaca dan halaman tampil tanpa watermark (antrean #177).
  // eslint-disable-next-line no-control-regex
  const aman = teks.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const { skala, lebar, tinggi } = ukuranUbin(ukuran, kerapatan, aman)
  const x = lebar / 2
  const y = tinggi / 2
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${lebar}' height='${tinggi}'><text x='${x}' y='${y}' text-anchor='middle' transform='rotate(-30 ${x} ${y})' font-family='sans-serif' font-size='${15 * skala}' font-weight='600' fill='${gaya?.warna ?? '#000'}' fill-opacity='${gaya?.opasitas ?? 0.14}'>${aman}</text></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
