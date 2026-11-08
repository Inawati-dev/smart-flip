// Alamat berkas pdf.worker hasil build (Vite `?url`), dipisahkan supaya siapkanPembaca.ts bisa mengambilnya tanpa
// memuat PembacaPdf. Alamat yang sama dipakai PembacaPdf, jadi berkas yang dipanaskan adalah berkas yang dipakai.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'

export default pdfWorkerSrc
