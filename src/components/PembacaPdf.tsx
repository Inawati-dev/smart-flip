import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as pdfjsLib from 'pdfjs-dist'
// Vite-bundled worker asset (mirrors legacy/ebook.html's CDN <script> worker
// setup, but resolved from the installed pdfjs-dist package instead of a CDN).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import type { Course } from '../lib/courses'
import { getReaderStyle, setReaderStyle, type ReaderStyle } from '../lib/readerStyle'
import { IconWarning, IconSkipBack, IconSkipForward } from './icons'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

export type StatusPdf = 'loading' | 'ready' | 'error'

const ZOOM_MIN = 0.8
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1
const SPREAD_MIN_WIDTH = 900 // di bawah ini buku tampil satu halaman, bukan dua
// Antrean #165 (Johan, 10 Okt 2026): "munculkan 1 page 1 page saja". Tampilan dua
// halaman dimatikan; jalurnya dibiarkan supaya bisa dinyalakan lagi dari sini.
const DUA_HALAMAN = false
const LEBAR_BACA = 760 // lebar minimal satu halaman di layar lebar supaya teks terbaca; halaman boleh lebih tinggi dari layar
// ponytail: tiap halaman dirender sekali pada lebar tetap lalu diskalakan CSS;
// kalau zoom 200% di layar besar terlihat buram, render ulang per tingkat zoom.
const LEBAR_RENDER = 1200
const JENDELA = 4 // halaman di kiri dan kanan posisi baca yang disiapkan gambarnya

async function renderHalaman(doc: pdfjsLib.PDFDocumentProxy, num: number): Promise<string | null> {
  try {
    const page = await doc.getPage(num)
    const dasar = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: LEBAR_RENDER / dasar.width })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas.toDataURL('image/jpeg', 0.9)
  } catch {
    return null
  }
}

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
export function capAir(teks: string, ukuran?: UkuranCap | null, kerapatan?: KerapatanCap | null): string {
  // Karakter kontrol (ikut tertempel dari PDF/Word) tidak sah di XML: satu saja
  // membuat SVG gagal dibaca dan halaman tampil tanpa watermark (antrean #177).
  // eslint-disable-next-line no-control-regex
  const aman = teks.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const { skala, lebar, tinggi } = ukuranUbin(ukuran, kerapatan, aman)
  const x = lebar / 2
  const y = tinggi / 2
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${lebar}' height='${tinggi}'><text x='${x}' y='${y}' text-anchor='middle' transform='rotate(-30 ${x} ${y})' font-family='sans-serif' font-size='${15 * skala}' font-weight='600' fill='#000' fill-opacity='0.14'>${aman}</text></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// Gambar watermark datang dari basis data dan masuk ke CSS `url("...")`, jadi
// hanya diterima bila bentuknya persis data URL PNG base64 (antrean #177).
export const POLA_GAMBAR_CAP = /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/

type SetelanCap = Pick<Course, 'watermark_pdf' | 'watermark_jenis' | 'watermark_teks' | 'watermark_gambar' | 'watermark_ukuran' | 'watermark_kerapatan'>

/**
 * Latar watermark sesuai setelan mata kuliah (antrean #157, #177); null bila
 * dimatikan dosen. Jenis teks atau gambar yang isinya kosong atau tidak sah
 * jatuh ke nama dan NIM pembaca, supaya halaman tidak tampil tanpa watermark.
 */
export function pilihCapAir(course: SetelanCap | null | undefined, namaNim: string): string | null {
  if (!course?.watermark_pdf) return null
  if (course.watermark_jenis === 'gambar' && POLA_GAMBAR_CAP.test(course.watermark_gambar ?? '')) return capGambar(course.watermark_gambar as string, course.watermark_ukuran, course.watermark_kerapatan)
  if (course.watermark_jenis === 'teks' && course.watermark_teks?.trim()) return capAir(course.watermark_teks.trim(), course.watermark_ukuran, course.watermark_kerapatan)
  return capAir(namaNim || 'SMART-FLIP 5.0', course.watermark_ukuran, course.watermark_kerapatan)
}

/** Watermark sesuai setelan mata kuliah dan akun yang masuk; null bila dimatikan dosen. */
export function useCapAir(): string | null {
  const { profile } = useAuth()
  const { course } = useCourse()
  const namaNim = [profile?.full_name, profile?.nim_nidn].filter(Boolean).join(' · ')
  return useMemo(
    () => pilihCapAir(course, namaNim),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [course?.watermark_pdf, course?.watermark_jenis, course?.watermark_teks, course?.watermark_gambar, course?.watermark_ukuran, course?.watermark_kerapatan, namaNim],
  )
}

function Muka({ sisi, n, src, cap }: { sisi?: 'depan' | 'belakang'; n: number | null; src?: string; cap: string | null }) {
  return (
    <div className={sisi ? `pembaca-muka ${sisi}` : 'pembaca-muka'}>
      {n != null && (src ? <img src={src} alt={`Halaman ${n}`} draggable={false} /> : <span className="pembaca-tunggu">Memuat halaman {n}…</span>)}
      {n != null && cap && <div className="pembaca-cap" style={{ backgroundImage: cap }} aria-hidden="true" />}
    </div>
  )
}

export interface PembacaPdfProps {
  /** Alamat PDF (URL, path, atau blob) yang dibuka pdf.js. Kosong = tidak memuat apa pun. */
  src: string
  /** Nama pembaca untuk pembaca layar (aria-label wilayah). */
  judul: string
  /** Isi kiri bilah atas (remah roti atau nama berkas). */
  kiri: ReactNode
  /** Tombol kanan bilah atas (kembali atau tutup); beri kelas `pembaca-tb`. */
  aksi: ReactNode
  /** Latar watermark dari `useCapAir()`; null = tanpa watermark. */
  cap?: string | null
  /** Dipanggil tiap halaman terbaca berubah, hanya untuk `src` yang benar-benar termuat. */
  onHalaman?: (halaman: number, total: number) => void
  /** Persen yang benar-benar tercatat dibaca (antrean #191). Bila diisi, tampil menggantikan persen posisi. */
  persenTercatat?: number | null
  /** Melapor keadaan muat. Pemanggil yang menampilkan sendiri keadaan itu memakai `tampilStatus={false}`. */
  onStatus?: (status: StatusPdf, pesan: string) => void
  /** Bila true (bawaan), "Membuka PDF…" dan pesan galat tampil di lapisan pembaca; bilah atas tetap ada supaya bisa ditutup. */
  tampilStatus?: boolean
  /** Pembaca muncul di atas modal yang membukanya (pratinjau dosen). */
  diAtasModal?: boolean
  /** Dipanggil saat tombol Escape ditekan (pratinjau: menutup lapisan). */
  onEscape?: () => void
}

// Pembaca PDF layar penuh (antrean #148, pilihan Johan 10 Okt 2026: arah
// "Imersif" dengan animasi dan kendali "Buku terbuka", balik pelan). Dipakai
// halaman Ebook mahasiswa dan pratinjau PDF dosen (antrean #166).
//
// Tiap halaman dirender sekali ke gambar (jendela +-JENDELA dari posisi baca)
// lalu dipasang di muka lembar. Mode Flip: lembar dua muka berputar di
// punggung buku (layar lebar: dua halaman, sampul sendirian di kanan; layar
// sempit: satu halaman). Mode Gulir: semua halaman bersusun ke bawah.
// Klik tepi kiri/kanan = balik halaman, klik tengah = sembunyikan/tampilkan
// kendali. Gaya ada di src/index.css (.pembaca-*).
export function PembacaPdf({ src, judul, kiri, aksi, cap = null, onHalaman, persenTercatat = null, onStatus, tampilStatus = true, diAtasModal = false, onEscape }: PembacaPdfProps) {
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const panggungRef = useRef<HTMLDivElement>(null)
  const gambarRef = useRef<Record<number, string>>({})
  const cbRef = useRef({ onHalaman, onStatus, onEscape })
  cbRef.current = { onHalaman, onStatus, onEscape }

  const [status, setStatus] = useState<StatusPdf>('loading')
  // Alamat PDF yang sedang termuat. Saat `src` berganti, render pertama masih
  // membawa keadaan buku lama; tanpa ini progres buku lama dilaporkan untuk buku baru.
  const [srcTermuat, setSrcTermuat] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1) // 1-based, matches PDF.js page numbering
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<ReaderStyle>(() => getReaderStyle())
  const [kendali, setKendali] = useState(true)
  const [penuh, setPenuh] = useState(false)
  const [rasio, setRasio] = useState(0.707) // lebar / tinggi halaman pertama; A4 sampai PDF terbaca
  const [gambar, setGambar] = useState<Record<number, string>>({})
  // Tebakan awal dari jendela (dikurangi kira-kira tinggi dua bilah) sampai ResizeObserver melapor.
  const [ukuran, setUkuran] = useState(() =>
    typeof window === 'undefined' ? { w: 800, h: 600 } : { w: window.innerWidth - 32, h: Math.max(240, window.innerHeight - 180) },
  )
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= SPREAD_MIN_WIDTH)
  const siap = status === 'ready' && srcTermuat === src

  useEffect(() => {
    function onResize() {
      setIsWide(window.innerWidth >= SPREAD_MIN_WIDTH)
    }
    function onPenuh() {
      setPenuh(!!document.fullscreenElement)
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('fullscreenchange', onPenuh)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('fullscreenchange', onPenuh)
    }
  }, [])

  // Ukuran panggung diikuti terus supaya buku selalu pas di layar, termasuk
  // saat kendali disembunyikan atau layar penuh.
  useEffect(() => {
    const el = panggungRef.current
    if (!siap || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r && r.width && r.height) setUkuran({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [siap])

  // ── Load the PDF whenever the source changes ──
  // The PDFDocumentProxy loaded here must be .destroy()'d — otherwise it
  // leaks (worker resources, cached page data) on every source switch and on
  // unmount. The cleanup below owns that lifecycle.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMsg('')
    setTotalPages(0)
    setCurrentPage(1)
    setZoom(1)
    setKendali(true)
    gambarRef.current = {}
    setGambar({})

    if (!src) return

    pdfjsLib.getDocument(src).promise.then(
      (doc) => {
        if (cancelled) {
          doc.destroy().catch(() => {})
          return
        }
        pdfRef.current = doc
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setSrcTermuat(src)
        setStatus('ready')
        doc
          .getPage(1)
          .then((hal) => {
            const v = hal.getViewport({ scale: 1 })
            if (!cancelled && v.width > 0 && v.height > 0) setRasio(v.width / v.height)
          })
          .catch(() => {})
      },
      (err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        // Same 404/fetch-failure heuristic as legacy/script.js's openBook() catch.
        setErrorMsg(
          /404|fetch|Missing/i.test(message)
            ? 'PDF topik ini belum tersedia.\nFile akan ditambahkan segera.'
            : 'Gagal memuat buku: ' + message,
        )
        setStatus('error')
      },
    )

    return () => {
      cancelled = true
      if (pdfRef.current) {
        pdfRef.current.destroy().catch(() => {})
        pdfRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    cbRef.current.onStatus?.(status, errorMsg)
  }, [status, errorMsg])

  // ── Posisi baca ──
  // Mode Flip di layar lebar: lembar ke-i memuat halaman 2i+1 (depan) dan
  // 2i+2 (belakang); `s` = jumlah lembar yang sudah dibalik, jadi yang
  // terlihat halaman 2s (kiri) dan 2s+1 (kanan). Layar sempit: satu halaman
  // per lembar, s = halaman - 1.
  const N = totalPages
  const dua = DUA_HALAMAN && mode === 'flip' && isWide
  const s = dua ? Math.floor(currentPage / 2) : currentPage - 1
  const sMaks = dua ? Math.floor(N / 2) : Math.max(0, N - 1)
  const jumlahLembar = dua ? Math.ceil(N / 2) : N
  const kiriHal = dua && s >= 1 ? 2 * s : null
  const kanan = dua ? (2 * s + 1 <= N ? 2 * s + 1 : null) : currentPage
  // Halaman terjauh yang terlihat; dipakai untuk progres dan jendela render.
  const halamanBaca = Math.max(1, Math.min(N || 1, kanan ?? kiriHal ?? 1))
  const nextDisabled = mode === 'gulir' ? currentPage >= N : s >= sMaks
  const prevDisabled = mode === 'gulir' ? currentPage <= 1 : s <= 0
  const labelHalaman = kiriHal != null && kanan != null && dua ? `${kiriHal}-${kanan} / ${N}` : `${halamanBaca} / ${N}`
  const persen = N > 0 ? Math.min(100, Math.round((halamanBaca / N) * 100)) : 0

  // ── Siapkan gambar halaman di sekitar posisi baca ──
  useEffect(() => {
    const doc = pdfRef.current
    if (status !== 'ready' || !doc || N <= 0) return
    let batal = false
    const perlu: number[] = []
    for (let d = 0; d <= JENDELA; d++) {
      for (const n of d === 0 ? [halamanBaca] : [halamanBaca + d, halamanBaca - d]) {
        if (n >= 1 && n <= N) perlu.push(n)
      }
    }
    void (async () => {
      for (const n of perlu) {
        if (batal) return
        if (gambarRef.current[n]) continue
        const url = await renderHalaman(doc, n)
        if (!url || pdfRef.current !== doc) continue
        const baru: Record<number, string> = { [n]: url }
        for (const [k, v] of Object.entries(gambarRef.current)) {
          // Posisi baca sudah pindah (batal): simpan saja, jangan pangkas memakai posisi lama.
          if (batal || Math.abs(Number(k) - halamanBaca) <= JENDELA + 2) baru[Number(k)] = v
        }
        gambarRef.current = baru
        setGambar(baru)
      }
    })()
    return () => {
      batal = true
    }
  }, [status, halamanBaca, N])

  // ── Lapor posisi baca tiap halaman berubah (hanya untuk src yang termuat). ──
  useEffect(() => {
    if (!siap || totalPages <= 0) return
    cbRef.current.onHalaman?.(halamanBaca, totalPages)
  }, [siap, halamanBaca, totalPages])

  const gulirKe = useCallback((n: number) => {
    panggungRef.current?.querySelector(`[data-hal="${n}"]`)?.scrollIntoView?.({ block: 'start' })
  }, [])

  function lompat(n: number) {
    const tujuan = Math.max(1, Math.min(N || 1, n))
    setCurrentPage(tujuan)
    if (mode === 'gulir') gulirKe(tujuan)
  }
  function goPrev() {
    if (prevDisabled) return
    lompat(dua ? (s - 1 <= 0 ? 1 : 2 * (s - 1)) : currentPage - 1)
  }
  function goNext() {
    if (nextDisabled) return
    lompat(dua ? 2 * (s + 1) : currentPage + 1)
  }
  function chooseMode(m: ReaderStyle) {
    setMode(m)
    setReaderStyle(m)
  }
  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  }
  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  }
  function gantiPenuh() {
    if (document.fullscreenElement) void document.exitFullscreen?.()
    else void document.documentElement.requestFullscreen?.().catch(() => {})
  }
  // Klik panggung: tepi kiri/kanan membalik halaman, tengah menyembunyikan
  // atau menampilkan kendali (ciri arah "Imersif").
  function klikPanggung(e: MouseEvent<HTMLDivElement>) {
    if (mode === 'gulir') return setKendali((k) => !k)
    const kotak = e.currentTarget.getBoundingClientRect()
    const x = kotak.width > 0 ? (e.clientX - kotak.left) / kotak.width : 0.5
    if (x < 0.28) goPrev()
    else if (x > 0.72) goNext()
    else setKendali((k) => !k)
  }

  // Tombol panah membalik halaman; Escape memunculkan kendali lagi (dan
  // memanggil onEscape bila pemanggil memberinya, mis. pratinjau).
  const tombolRef = useRef({ goPrev, goNext, siap })
  tombolRef.current = { goPrev, goNext, siap }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setKendali(true)
        cbRef.current.onEscape?.()
        return
      }
      // Panah di dalam isian (penggeser halaman) milik isian itu, bukan pembalik halaman.
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (!tombolRef.current.siap) return
      if (e.key === 'ArrowRight') tombolRef.current.goNext()
      else if (e.key === 'ArrowLeft') tombolRef.current.goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Mode Gulir: halaman yang melintasi tengah layar jadi posisi baca.
  useEffect(() => {
    const akar = panggungRef.current
    if (!siap || mode !== 'gulir' || !akar || typeof IntersectionObserver === 'undefined') return
    akar.querySelector(`[data-hal="${currentPage}"]`)?.scrollIntoView?.({ block: 'start' })
    const io = new IntersectionObserver(
      (entries) => {
        const kena = entries.find((en) => en.isIntersecting)
        const n = Number((kena?.target as HTMLElement | undefined)?.dataset.hal)
        if (n) setCurrentPage(n)
      },
      { root: akar, rootMargin: '-49% 0px -49% 0px' },
    )
    akar.querySelectorAll('[data-hal]').forEach((el) => io.observe(el))
    return () => io.disconnect()
    // currentPage sengaja tidak jadi dependensi: hanya dipakai saat masuk mode Gulir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siap, mode, N])

  // Ukuran halaman: pas di panggung (lebar dan tinggi), lalu dikali zoom.
  const kolom = dua ? 2 : 1
  const lebarHal =
    mode === 'gulir'
      ? Math.max(160, Math.min(ukuran.w - 24, 900)) * zoom
      : dua
        ? Math.max(120, Math.min((ukuran.w - 32) / kolom, (ukuran.h - 44) * rasio)) * zoom
        : Math.max(120, Math.min(ukuran.w - 32, Math.max((ukuran.h - 44) * rasio, LEBAR_BACA))) * zoom
  const tinggiHal = lebarHal / rasio
  const lembarTampil: number[] = []
  for (let i = Math.max(0, s - 2); i <= Math.min(jumlahLembar - 1, s + 1); i++) lembarTampil.push(i)
  const bisaPenuh = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

  // Pemanggil yang menampilkan sendiri keadaan muat tidak butuh lapisan sebelum siap.
  if (!siap && !tampilStatus) return null

  return createPortal(
    <div
      className={`pembaca${diAtasModal ? ' di-atas-modal' : ''}`}
      role="region"
      aria-label={`Pembaca: ${judul}`}
      // Klik di lapisan ini tidak boleh naik ke kartu atau modal pembuka lewat pohon React.
      onClick={diAtasModal ? (e) => e.stopPropagation() : undefined}
    >
      {(kendali || !siap) && (
        <div className="pembaca-bilah border-b">
          <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1">{kiri}</div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {siap && (
              <div role="group" aria-label="Gaya baca" className="flex items-center gap-1">
                <button onClick={() => chooseMode('flip')} aria-pressed={mode === 'flip'} className={`pembaca-tb ${mode === 'flip' ? 'on' : ''}`}>
                  Flip
                </button>
                <button onClick={() => chooseMode('gulir')} aria-pressed={mode === 'gulir'} className={`pembaca-tb ${mode === 'gulir' ? 'on' : ''}`}>
                  Gulir
                </button>
              </div>
            )}
            {aksi}
          </div>
        </div>
      )}

      {!siap && status === 'error' && (
        <div className="pembaca-panggung" style={{ cursor: 'default' }}>
          <div className="m-auto flex flex-col items-center gap-3 text-center max-w-sm">
            <IconWarning size={40} className="text-danger" />
            <p className="text-sm whitespace-pre-line pembaca-redup">{errorMsg}</p>
          </div>
        </div>
      )}
      {!siap && status !== 'error' && (
        <div className="pembaca-panggung" style={{ cursor: 'default' }}>
          <div className="m-auto flex flex-col items-center gap-4" role="status">
            <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '4px solid var(--pb-garis)', borderTopColor: 'var(--terra)' }} />
            <p className="text-sm pembaca-redup">Membuka PDF…</p>
          </div>
        </div>
      )}

      {siap && (
        <div ref={panggungRef} className="pembaca-panggung" onClick={klikPanggung}>
          {mode === 'gulir' ? (
            <div className="flex flex-col items-center gap-4 py-5 mx-auto">
              {Array.from({ length: N }, (_, i) => i + 1).map((n) => (
                <div key={n} data-hal={n} className="pembaca-kertas" style={{ width: lebarHal, height: tinggiHal }}>
                  <Muka n={n} src={gambar[n]} cap={cap} />
                </div>
              ))}
            </div>
          ) : (
            <div className="pembaca-buku" style={{ width: lebarHal * kolom, height: tinggiHal }}>
              <div className={`pembaca-alas ${dua && s === 0 ? 'awal' : ''} ${dua && kanan == null ? 'akhir' : ''}`} />
              {lembarTampil.map((i) => {
                const balik = i < s
                const depan = dua ? 2 * i + 1 : i + 1
                const belakang = dua && 2 * i + 2 <= N ? 2 * i + 2 : null
                return (
                  <div
                    key={i}
                    className={`pembaca-lembar ${dua ? '' : 'tunggal'} ${balik ? 'balik' : ''}`}
                    style={{ zIndex: dua && balik ? i + 1 : jumlahLembar - i }}
                  >
                    <Muka sisi="depan" n={depan} src={gambar[depan]} cap={cap} />
                    <Muka sisi="belakang" n={belakang} src={belakang != null ? gambar[belakang] : undefined} cap={cap} />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {siap &&
        (kendali ? (
          <div className="pembaca-bilah border-t justify-center">
            <div className="flex items-center gap-2 w-full md:w-auto md:flex-1 md:order-2 min-w-0">
              <input
                type="range"
                min={1}
                max={N || 1}
                value={halamanBaca}
                onChange={(e) => lompat(Number(e.target.value))}
                aria-label="Lompat ke halaman"
                className="pembaca-geser flex-1 min-w-0"
              />
              <span className="text-xs pembaca-redup whitespace-nowrap">{persenTercatat != null ? `Tercatat dibaca ${persenTercatat}%` : `Progres baca ${persen}%`}</span>
            </div>
            <div className="flex items-center gap-1.5 md:order-1">
              <button onClick={() => lompat(1)} disabled={prevDisabled} title="Halaman pertama" aria-label="Halaman pertama" className="pembaca-tb kotak !hidden md:!inline-flex">
                <IconSkipBack size={16} />
              </button>
              <button onClick={goPrev} disabled={prevDisabled} title="Sebelumnya" aria-label="Sebelumnya" className="pembaca-tb kotak">
                ‹
              </button>
              <span className="text-sm font-semibold min-w-[84px] text-center whitespace-nowrap">{labelHalaman}</span>
            </div>
            <div className="flex items-center gap-1.5 md:order-3">
              <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Perkecil" aria-label="Perkecil" className="pembaca-tb kotak">
                −
              </button>
              <span className="text-xs font-semibold min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Perbesar" aria-label="Perbesar" className="pembaca-tb kotak">
                +
              </button>
              {bisaPenuh && (
                <button onClick={gantiPenuh} aria-pressed={penuh} className={`pembaca-tb ${penuh ? 'on' : ''} !hidden md:!inline-flex`}>
                  {penuh ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                </button>
              )}
              <button onClick={goNext} disabled={nextDisabled} title="Berikutnya" aria-label="Berikutnya" className="pembaca-tb kotak on">
                ›
              </button>
              <button onClick={() => lompat(N)} disabled={nextDisabled} title="Halaman terakhir" aria-label="Halaman terakhir" className="pembaca-tb kotak !hidden md:!inline-flex">
                <IconSkipForward size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setKendali(true)} className="pembaca-pil">
            {labelHalaman} · ketuk tengah untuk kendali
          </button>
        ))}
    </div>,
    // Leluhur di Layout memakai transform, jadi position:fixed baru benar-benar selayar penuh dari body.
    document.body,
  )
}

export default PembacaPdf
