import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, Link } from 'react-router'
import * as pdfjsLib from 'pdfjs-dist'
// Vite-bundled worker asset (mirrors legacy/ebook.html's CDN <script> worker
// setup, but resolved from the installed pdfjs-dist package instead of a CDN).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { saveProgress, moduleIdToPath } from '../lib/progress'
import { useModules } from '../hooks/useModules'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { getReaderStyle, setReaderStyle, type ReaderStyle } from '../lib/readerStyle'
import { Layout } from '../components/Layout'
import { SampulTopik } from '../components/KartuTopik'
import { IconWarning, IconSkipBack, IconSkipForward, IconBook, IconChevronRight } from '../components/icons'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type Status = 'loading' | 'ready' | 'error'

const ZOOM_MIN = 0.8
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1
const SPREAD_MIN_WIDTH = 900 // di bawah ini buku tampil satu halaman, bukan dua
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

/** Watermark (antrean #157): teks diagonal berulang sebagai latar SVG di atas halaman. */
function capAir(teks: string): string {
  const aman = teks.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='220'><text x='170' y='110' text-anchor='middle' transform='rotate(-30 170 110)' font-family='sans-serif' font-size='15' font-weight='600' fill='#000' fill-opacity='0.14'>${aman}</text></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function Muka({ sisi, n, src, cap }: { sisi?: 'depan' | 'belakang'; n: number | null; src?: string; cap: string | null }) {
  return (
    <div className={sisi ? `pembaca-muka ${sisi}` : 'pembaca-muka'}>
      {n != null && (src ? <img src={src} alt={`Halaman ${n}`} draggable={false} /> : <span className="pembaca-tunggu">Memuat halaman {n}…</span>)}
      {n != null && cap && <div className="pembaca-cap" style={{ backgroundImage: cap }} aria-hidden="true" />}
    </div>
  )
}

// Pembaca PDF layar penuh (antrean #148, pilihan Johan 10 Okt 2026: arah
// "Imersif" dengan animasi dan kendali "Buku terbuka", balik pelan).
//
// ?book= membawa id topik, bukan alamat berkasnya; sumber PDF diambil dari
// useModules() supaya alamat penyimpanan tidak tampil di bilah alamat.
//
// Tiap halaman dirender sekali ke gambar (jendela +-JENDELA dari posisi baca)
// lalu dipasang di muka lembar. Mode Flip: lembar dua muka berputar di
// punggung buku (layar lebar: dua halaman, sampul sendirian di kanan; layar
// sempit: satu halaman). Mode Gulir: semua halaman bersusun ke bawah.
// Klik tepi kiri/kanan = balik halaman, klik tengah = sembunyikan/tampilkan
// kendali. Gaya ada di src/index.css (.pembaca-*).
export function Ebook() {
  const [searchParams, setSearchParams] = useSearchParams()
  const bookId = searchParams.get('book')
  // A non-numeric bookId (stale bookmark, typo) must collapse cleanly to
  // null — otherwise Number(bookId) === NaN is falsy in some checks below
  // (!moduleId) but "present" in others (moduleId != null, since NaN isn't
  // null/undefined), letting the catalog grid and the loading spinner both
  // render at once with no error shown.
  const parsedModuleId = bookId ? Number(bookId) : NaN
  const moduleId = Number.isFinite(parsedModuleId) ? parsedModuleId : null
  const { data: modules = [] } = useModules()
  const catalog = useMemo(() => modules.filter((m) => !!(m.path || m.pdf_path)), [modules])
  const currentModule = moduleId != null ? modules.find((m) => m.id === moduleId) : undefined
  const src = currentModule?.path || currentModule?.pdf_path || ''
  const { profile } = useAuth()
  const { course } = useCourse()
  const cap = useMemo(
    () => (course?.watermark_pdf ? capAir([profile?.full_name, profile?.nim_nidn].filter(Boolean).join(' · ') || 'SMART-FLIP 5.0') : null),
    [course?.watermark_pdf, profile?.full_name, profile?.nim_nidn],
  )

  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const panggungRef = useRef<HTMLDivElement>(null)
  const gambarRef = useRef<Record<number, string>>({})

  const [status, setStatus] = useState<Status>('loading')
  // Id topik pemilik PDF yang sedang termuat. Saat ?book= berganti, render
  // pertama masih membawa keadaan buku lama; tanpa ini progres buku lama
  // tertulis ke id buku baru.
  const [idTermuat, setIdTermuat] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1) // 1-based, matches PDF.js page numbering
  const [zoom, setZoom] = useState(1)
  const [mode, setMode] = useState<ReaderStyle>(() => getReaderStyle())
  const [kendali, setKendali] = useState(true)
  const [penuh, setPenuh] = useState(false)
  const [rasio, setRasio] = useState(0.707) // lebar / tinggi halaman pertama; A4 sampai PDF terbaca
  const [gambar, setGambar] = useState<Record<number, string>>({})
  const [ukuran, setUkuran] = useState({ w: 800, h: 600 })
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= SPREAD_MIN_WIDTH)

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
    if (status !== 'ready' || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r && r.width && r.height) setUkuran({ w: r.width, h: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [status])

  // ── Load the PDF whenever the resolved source changes ──
  // The PDFDocumentProxy loaded here must be .destroy()'d — otherwise it
  // leaks (worker resources, cached page data) on every module switch and on
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

    if (moduleId == null) return // no book selected — the catalog grid renders instead, see JSX below
    if (!src) {
      // Modules are still loading, or this module genuinely has no PDF yet —
      // useModules() resolves async, so don't flash an error before it settles.
      if (modules.length > 0) {
        setErrorMsg('PDF topik ini belum tersedia.\nFile akan ditambahkan segera.')
        setStatus('error')
      }
      return
    }

    pdfjsLib.getDocument(src).promise.then(
      (doc) => {
        if (cancelled) {
          doc.destroy().catch(() => {})
          return
        }
        pdfRef.current = doc
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setIdTermuat(moduleId)
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
  }, [moduleId, src, modules.length])

  // ── Posisi baca ──
  // Mode Flip di layar lebar: lembar ke-i memuat halaman 2i+1 (depan) dan
  // 2i+2 (belakang); `s` = jumlah lembar yang sudah dibalik, jadi yang
  // terlihat halaman 2s (kiri) dan 2s+1 (kanan). Layar sempit: satu halaman
  // per lembar, s = halaman - 1.
  const N = totalPages
  const dua = mode === 'flip' && isWide
  const s = dua ? Math.floor(currentPage / 2) : currentPage - 1
  const sMaks = dua ? Math.floor(N / 2) : Math.max(0, N - 1)
  const jumlahLembar = dua ? Math.ceil(N / 2) : N
  const kiri = dua && s >= 1 ? 2 * s : null
  const kanan = dua ? (2 * s + 1 <= N ? 2 * s + 1 : null) : currentPage
  // Halaman terjauh yang terlihat; dipakai untuk progres dan jendela render.
  const halamanBaca = Math.max(1, Math.min(N || 1, kanan ?? kiri ?? 1))
  const nextDisabled = mode === 'gulir' ? currentPage >= N : s >= sMaks
  const prevDisabled = mode === 'gulir' ? currentPage <= 1 : s <= 0
  const labelHalaman = kiri != null && kanan != null && dua ? `${kiri}-${kanan} / ${N}` : `${halamanBaca} / ${N}`
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

  // ── Save progress on every page change. Keyed by the synthetic
  // moduleIdToPath() string (not the actual PDF source URL) so progress
  // tracking is identical whether the file lives in books/ or was uploaded
  // to Supabase Storage. ──
  useEffect(() => {
    if (status !== 'ready' || totalPages <= 0 || moduleId == null || idTermuat !== moduleId) return
    const pct = Math.min(100, Math.round((halamanBaca / totalPages) * 100))
    saveProgress(moduleIdToPath(moduleId), { pct, currentPage: halamanBaca, totalPages, lastOpened: new Date().toISOString() }).catch(() => {})
  }, [status, halamanBaca, totalPages, moduleId, idTermuat])

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

  // Tombol panah membalik halaman; Escape memunculkan kendali lagi.
  const tombolRef = useRef({ goPrev, goNext })
  tombolRef.current = { goPrev, goNext }
  useEffect(() => {
    if (status !== 'ready') return
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') tombolRef.current.goNext()
      else if (e.key === 'ArrowLeft') tombolRef.current.goPrev()
      else if (e.key === 'Escape') setKendali(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status])

  // Mode Gulir: halaman yang melintasi tengah layar jadi posisi baca.
  useEffect(() => {
    const akar = panggungRef.current
    if (status !== 'ready' || mode !== 'gulir' || !akar || typeof IntersectionObserver === 'undefined') return
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
  }, [status, mode, N])

  // Ukuran halaman: pas di panggung (lebar dan tinggi), lalu dikali zoom.
  const kolom = dua ? 2 : 1
  const lebarHal =
    mode === 'gulir'
      ? Math.max(160, Math.min(ukuran.w - 24, 900)) * zoom
      : Math.max(120, Math.min((ukuran.w - 32) / kolom, (ukuran.h - 44) * rasio)) * zoom
  const tinggiHal = lebarHal / rasio
  const lembarTampil: number[] = []
  for (let i = Math.max(0, s - 2); i <= Math.min(jumlahLembar - 1, s + 1); i++) lembarTampil.push(i)
  const bisaPenuh = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
  const siap = moduleId != null && status === 'ready' && idTermuat === moduleId

  return (
    <Layout>
      <div className="flex flex-col items-center p-4 md:p-8 gap-4 min-h-[calc(100vh-58px)] lg:min-h-screen">
        {/* Lebar kop mengikuti konten di bawahnya: katalog w-full, pembaca max-w-4xl. */}
        {/* Satu baris (antrean #149): remah roti di kiri berakhir di judul topik,
            tombol kembali di kanan. Judul topik sekaligus h1 halaman. */}
        <div className={`w-full flex items-center justify-between gap-3 flex-wrap ${moduleId != null ? 'max-w-4xl' : ''} ${siap ? 'hidden' : ''}`}>
          <div className="flex items-center gap-1.5 text-xs text-brown-3 min-w-0">
            <Link to="/modul" className="hover:underline flex-shrink-0">Modul</Link>
            <IconChevronRight size={12} className="flex-shrink-0" />
            <div className="text-xs font-semibold text-brown truncate" role="heading" aria-level={1}>
              {moduleId != null && currentModule?.title ? (
                <Link to={`/modul/${moduleId}`} className="hover:underline">
                  {currentModule.title}
                </Link>
              ) : (
                'Ebook'
              )}
            </div>
          </div>
          <Link to={moduleId != null ? '/modul' : '/dashboard'} className="btn btn-secondary flex-shrink-0">
            ← {moduleId != null ? 'Modul' : 'Kembali ke Dashboard'}
          </Link>
        </div>

        {moduleId == null && (
          // Full width here on purpose, unlike the reader below -- browsing
          // a grid of cover cards benefits from more columns on a wide
          // screen; reading one document does not (that's why the reader
          // view further down keeps its own max-w-4xl).
          <div className="w-full">
            <div
              className="w-full max-w-[220px] bg-ivory rounded-2xl border p-4 mb-4 flex items-center gap-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-terra" style={{ background: 'var(--accent-soft)' }}>
                <IconBook size={19} />
              </div>
              <div>
                <div className="text-lg font-bold text-brown leading-tight">
                  {catalog.length}/{modules.length}
                </div>
                <div className="text-xs text-brown-3">Topik sudah diunggah</div>
              </div>
            </div>
            {catalog.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <IconBook size={36} className="text-brown-3" />
                <p className="text-sm text-brown-3">Belum ada PDF topik yang terpasang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {catalog.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSearchParams({ book: String(m.id) })}
                    aria-label={`Buka topik ${m.order_num}: ${m.title}`}
                    className="block w-full text-left rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5"
                  >
                    <SampulTopik nomor={m.order_num} judul={m.title} keterangan="PDF" adaPdf />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {moduleId != null && status === 'loading' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16" role="status">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: '4px solid var(--border)', borderTopColor: 'var(--terra)' }}
            />
            <p className="text-sm text-brown-3">Membuka PDF…</p>
          </div>
        )}

        {moduleId != null && status === 'error' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center max-w-sm">
            <IconWarning size={40} className="text-danger" />
            <p className="text-sm text-brown-2 whitespace-pre-line">{errorMsg}</p>
            <Link to="/modul" className="btn btn-primary mt-2">
              Kembali ke Modul
            </Link>
          </div>
        )}

        {siap && createPortal(
          <div className="pembaca" role="region" aria-label={`Pembaca: ${currentModule?.title || 'Ebook'}`}>
            {kendali && (
              <div className="pembaca-bilah border-b">
                <div className="flex items-center gap-1.5 text-xs min-w-0 flex-1">
                  <Link to="/modul" className="hover:underline flex-shrink-0 pembaca-redup">Modul</Link>
                  <IconChevronRight size={12} className="flex-shrink-0 pembaca-redup" />
                  <h1 className="text-xs font-semibold truncate">
                    <Link to={`/modul/${moduleId}`} className="hover:underline">
                      {currentModule?.title || 'Ebook'}
                    </Link>
                  </h1>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div role="group" aria-label="Gaya baca" className="flex items-center gap-1">
                    <button onClick={() => chooseMode('flip')} aria-pressed={mode === 'flip'} className={`pembaca-tb ${mode === 'flip' ? 'on' : ''}`}>
                      Flip
                    </button>
                    <button onClick={() => chooseMode('gulir')} aria-pressed={mode === 'gulir'} className={`pembaca-tb ${mode === 'gulir' ? 'on' : ''}`}>
                      Gulir
                    </button>
                  </div>
                  <Link to="/modul" className="pembaca-tb">
                    ← Modul
                  </Link>
                </div>
              </div>
            )}

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

            {kendali ? (
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
                  <span className="text-xs pembaca-redup whitespace-nowrap">Progres baca {persen}%</span>
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
                      {penuh ? 'Keluar layar penuh' : 'Layar penuh'}
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
            )}
          </div>,
          // Leluhur di Layout memakai transform, jadi position:fixed baru benar-benar selayar penuh dari body.
          document.body,
        )}
      </div>
    </Layout>
  )
}

export default Ebook
