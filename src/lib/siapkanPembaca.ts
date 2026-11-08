// Pemanasan pembaca PDF (antrean #372, usulan dari ukuran muat #372): saat mahasiswa membuka daftar modul, paket pembaca
// (pdf.js + pembaca flipbook) dan `pdf.worker` (284 KB gzip, bagian terberat) diunduh di latar, supaya modul pertama yang
// dibuka tidak menunggu sekitar 7 detik di 3G (TAKSIRAN, docs/ukuran-muat-halaman.md). Dilewati bila pengguna menyalakan
// penghemat data atau jaringannya 2G, dan hanya sekali per sesi.
let sudah = false

interface InfoJaringan {
  saveData?: boolean
  effectiveType?: string
}

export function bolehPanaskan(info?: InfoJaringan): boolean {
  if (!info) return true
  return !info.saveData && info.effectiveType !== 'slow-2g' && info.effectiveType !== '2g'
}

/** Menyiapkan pembaca di latar. Mengembalikan true bila pemanasan dijadwalkan, false bila dilewati. */
export function siapkanPembaca(): boolean {
  if (sudah || typeof window === 'undefined') return false
  const info = (navigator as Navigator & { connection?: InfoJaringan }).connection
  if (!bolehPanaskan(info)) return false
  sudah = true
  const jalan = () => {
    // Paket pembaca dan worker; kegagalan jaringan diabaikan: pembaca tetap memuatnya sendiri saat dibuka.
    void import('./pdfWorkerUrl').then((m) => {
      if (document.querySelector('link[data-pdf-worker]')) return
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'script'
      link.href = m.default
      link.setAttribute('data-pdf-worker', '1')
      document.head.appendChild(link)
    }, () => {})
    void import('../components/PembacaPdf').catch(() => {})
  }
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(jalan, { timeout: 3000 })
  else setTimeout(jalan, 1500)
  return true
}

/** Hanya untuk tes: mengembalikan keadaan "belum pernah dipanaskan". */
export function setelUlangPemanasan(): void {
  sudah = false
}
