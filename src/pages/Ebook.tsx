import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useSearchParams, Link } from 'react-router'
import * as pdfjsLib from 'pdfjs-dist'
// Vite-bundled worker asset (mirrors legacy/ebook.html's CDN <script> worker
// setup, but resolved from the installed pdfjs-dist package instead of a CDN).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { saveProgress, moduleIdToPath } from '../lib/progress'
import { useModules } from '../hooks/useModules'
import { getReaderStyle, setReaderStyle, type ReaderStyle } from '../lib/readerStyle'
import { Layout } from '../components/Layout'
import { IconWarning, IconSkipBack, IconSkipForward, IconBook } from '../components/icons'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type Status = 'loading' | 'ready' | 'error'

const BASE_SCALE = 1.5
const ZOOM_MIN = 0.8
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1
const SPREAD_MIN_WIDTH = 900 // below this, "Buka Buku" silently falls back to single-page

// A small first-page-only render used as the catalog card's cover — mirrors
// legacy/script.js's per-card async cover render, just against pdf.js
// directly instead of the legacy IndexedDB cache.
function CoverThumb({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Each catalog card loads its own PDFDocumentProxy just to render page 1
    // as a thumbnail — without destroying it, every catalog render (e.g.
    // navigating back and forth) piles up undestroyed documents. docRef
    // tracks this effect run's own doc so the cleanup below can destroy
    // exactly one, whether cancellation happens before or after it loads.
    let doc: pdfjsLib.PDFDocumentProxy | null = null
    setFailed(false)
    pdfjsLib.getDocument(src).promise.then(
      async (loadedDoc) => {
        if (cancelled) {
          loadedDoc.destroy().catch(() => {})
          return
        }
        doc = loadedDoc
        const page = await doc.getPage(1)
        const canvas = canvasRef.current
        if (!canvas || cancelled) return
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = 220 / baseViewport.width
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        try {
          await page.render({ canvasContext: ctx, viewport }).promise
        } catch {
          // cancelled by unmount — ignore, matches Ebook's main renderPage
        }
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
      if (doc) {
        doc.destroy().catch(() => {})
        doc = null
      }
    }
  }, [src])

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <IconBook size={28} className="text-terra-d" />
      </div>
    )
  }
  return <canvas ref={canvasRef} className="w-full h-full object-contain" />
}

// Ported (MVP core only) from legacy/ebook.html + legacy/script.js: load the
// PDF belonging to ?book=<moduleId>, render the current page to a canvas,
// prev/next navigation, page-number display, and progress saving.
//
// ?book= carries the module's numeric id, not its Supabase Storage URL —
// resolving the actual file source from useModules() keeps the raw storage
// path out of the address bar (it's still visible in the Network tab once
// the PDF is fetched, same as any client-rendered file, but it's no longer
// a bookmarkable/shareable link that exposes the storage bucket layout).
//
// Reader style ("Flip 3D" / "Buka Buku" / "Geser", src/lib/readerStyle.ts):
// the live canvas always repaints to the DESTINATION page immediately on
// navigate (unchanged from before) — a snapshot of the OUTGOING page
// animates away on top of it via .reader-flip-overlay (src/index.css),
// revealing the already-updated canvas underneath. "Buka Buku" additionally
// renders two pages side by side and only overlays the page that visually
// turns. This is intentionally simple (no pre-rendered page cache, no
// pinch-zoom/pan, no thumbnail strip) — see legacy/script.js for the fuller
// feature set this doesn't attempt to match.
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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef2 = useRef<HTMLCanvasElement>(null) // right-hand page, "Buka Buku" only
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)
  const renderTaskRef2 = useRef<pdfjsLib.RenderTask | null>(null)
  const pageAreaRef = useRef<HTMLDivElement>(null)

  // Fit-to-width: the page renders at whatever pixel width the reading pane
  // actually has (tracked live via ResizeObserver), not a fixed scale — so
  // 100% zoom always means "fills this page's available width", matching
  // every other element on the page instead of floating as an undersized
  // card in a much wider container. Zoom (80%-200%) multiplies on top of
  // this fit-width baseline.
  const [fitWidth, setFitWidth] = useState(600)
  useEffect(() => {
    const el = pageAreaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setFitWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1) // 1-based, matches PDF.js page numbering
  const [zoom, setZoom] = useState(1)
  const [readerStyleState, setReaderStyleState] = useState<ReaderStyle>(() => getReaderStyle())
  const [isWide, setIsWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= SPREAD_MIN_WIDTH)
  const [flipOverlay, setFlipOverlay] = useState<{
    direction: 'next' | 'prev'
    snapshot: string
    side: 'single' | 'left' | 'right'
  } | null>(null)

  const effectiveStyle: ReaderStyle = readerStyleState === 'spread' && !isWide ? 'flip3d' : readerStyleState

  useEffect(() => {
    function onResize() {
      setIsWide(window.innerWidth >= SPREAD_MIN_WIDTH)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Spread mode pairs pages (1,2) (3,4) ... — currentPage is always the LEFT
  // page of the pair, so it must stay odd. Only matters right after switching
  // INTO spread mode from a style that was sitting on an even page.
  useEffect(() => {
    if (effectiveStyle === 'spread' && currentPage % 2 === 0) {
      setCurrentPage((p) => Math.max(1, p - 1))
    }
  }, [effectiveStyle, currentPage])

  function chooseStyle(style: ReaderStyle) {
    setReaderStyleState(style)
    setReaderStyle(style)
    setFlipOverlay(null)
  }

  // ── Load the PDF whenever the resolved source changes ──
  // The PDFDocumentProxy loaded here must be .destroy()'d — otherwise it
  // leaks (worker resources, cached page data) on every module switch and on
  // unmount. The cleanup below (which fires both when this effect re-runs
  // for a new moduleId/src and on unmount) is the single place that owns
  // that lifecycle: it destroys whatever this run stored in pdfRef.current,
  // and — if the getDocument() promise settles after cancellation — the
  // .then handler destroys the doc directly since it never made it into the
  // ref.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMsg('')
    setTotalPages(0)
    setCurrentPage(1)
    setZoom(1)
    setFlipOverlay(null)

    if (moduleId == null) return // no book selected — the catalog grid renders instead, see JSX below
    if (!src) {
      // Modules are still loading, or this module genuinely has no PDF yet —
      // useModules() resolves async, so don't flash an error before it settles.
      if (modules.length > 0) {
        setErrorMsg('PDF modul ini belum tersedia.\nFile akan ditambahkan segera.')
        setStatus('error')
      }
      return
    }

    pdfjsLib.getDocument(src).promise.then(
      (doc) => {
        if (cancelled) {
          // Switched away (or unmounted) while this doc was in flight —
          // it never got assigned to pdfRef.current, so destroy it here.
          doc.destroy().catch(() => {})
          return
        }
        pdfRef.current = doc
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        setStatus('ready')
      },
      (err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        // Same 404/fetch-failure heuristic as legacy/script.js's openBook() catch.
        setErrorMsg(
          /404|fetch|Missing/i.test(message)
            ? 'PDF modul ini belum tersedia.\nFile akan ditambahkan segera.'
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

  // ── Render a page into a given canvas — shared by the single-canvas and
  // two-canvas ("Buka Buku") layouts, each tracking its own cancel-in-flight
  // render task so switching pages rapidly can't paint a stale page. ──
  const renderPageTo = useCallback(
    async (
      num: number,
      canvas: HTMLCanvasElement | null,
      taskRef: MutableRefObject<pdfjsLib.RenderTask | null>,
      scaleMult: number,
      availWidth: number,
    ) => {
      const doc = pdfRef.current
      if (!doc || !canvas || num < 1 || num > doc.numPages) return

      if (taskRef.current) {
        taskRef.current.cancel()
        taskRef.current = null
      }

      const page = await doc.getPage(num)
      const baseViewport = page.getViewport({ scale: 1 })
      const fitScale = availWidth > 0 ? availWidth / baseViewport.width : BASE_SCALE
      const viewport = page.getViewport({ scale: fitScale * scaleMult })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const task = page.render({ canvasContext: ctx, viewport })
      taskRef.current = task
      try {
        await task.promise
      } catch {
        // Render cancelled by a newer page request — ignore, matches
        // legacy/script.js's doRenderPage() swallowing render errors.
      } finally {
        if (taskRef.current === task) taskRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (status !== 'ready') return
    // Spread mode splits the pane between two pages side by side (minus the
    // 1px divider border) — each canvas fits half the width, not the whole.
    const availWidth = effectiveStyle === 'spread' ? fitWidth / 2 - 1 : fitWidth
    void renderPageTo(currentPage, canvasRef.current, renderTaskRef, zoom, availWidth)
    if (effectiveStyle === 'spread') {
      void renderPageTo(currentPage + 1, canvasRef2.current, renderTaskRef2, zoom, availWidth)
    }
  }, [status, currentPage, effectiveStyle, zoom, fitWidth, renderPageTo])

  // ── Save progress on every page change (mirrors legacy/script.js's
  // renderView() -> saveProgress() firing on every navigate()). Keyed by the
  // synthetic moduleIdToPath() string (not the actual PDF source URL) so
  // progress tracking is identical whether the file lives in books/ or was
  // uploaded to Supabase Storage. ──
  useEffect(() => {
    if (status !== 'ready' || totalPages <= 0 || moduleId == null) return
    const pct = Math.min(100, Math.round((currentPage / totalPages) * 100))
    saveProgress(moduleIdToPath(moduleId), { pct, currentPage, lastOpened: new Date().toISOString() }).catch(() => {})
  }, [status, currentPage, totalPages, moduleId])

  const stepSize = effectiveStyle === 'spread' ? 2 : 1
  const nextTarget = Math.min(totalPages || 1, currentPage + stepSize)
  const prevTarget = Math.max(1, currentPage - stepSize)
  const nextDisabled = nextTarget === currentPage
  const prevDisabled = prevTarget === currentPage

  // Captures the page(s) about to be replaced as a snapshot, then lets the
  // real navigation proceed (the live canvas repaints underneath); the
  // snapshot animates away on top via .reader-flip-overlay. toDataURL() can
  // throw in some test/embedding contexts — a failure there just means no
  // overlay for that one turn, not a broken navigation.
  function beginFlip(direction: 'next' | 'prev') {
    if (effectiveStyle === 'spread') {
      const canvas = direction === 'next' ? canvasRef2.current : canvasRef.current
      try {
        const snapshot = canvas?.toDataURL()
        if (snapshot) setFlipOverlay({ direction, snapshot, side: direction === 'next' ? 'right' : 'left' })
      } catch {
        // ignore — page still turns, just without the overlay animation
      }
    } else {
      try {
        const snapshot = canvasRef.current?.toDataURL()
        if (snapshot) setFlipOverlay({ direction, snapshot, side: 'single' })
      } catch {
        // ignore
      }
    }
  }

  function goFirst() {
    setFlipOverlay(null)
    setCurrentPage(1)
  }
  function goPrev() {
    if (prevDisabled) return
    beginFlip('prev')
    setCurrentPage(prevTarget)
  }
  function goNext() {
    if (nextDisabled) return
    beginFlip('next')
    setCurrentPage(nextTarget)
  }
  function goLast() {
    setFlipOverlay(null)
    if (effectiveStyle === 'spread') {
      setCurrentPage(totalPages % 2 === 0 ? Math.max(1, totalPages - 1) : totalPages || 1)
    } else {
      setCurrentPage(totalPages || 1)
    }
  }
  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
  }
  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
  }

  return (
    <Layout>
      <div className="flex flex-col items-center p-4 md:p-8 gap-4 min-h-[calc(100vh-58px)] lg:min-h-screen">
        <div className="w-full max-w-4xl flex items-center justify-between gap-3 flex-wrap">
          <Link to={moduleId != null ? '/ebook' : '/dashboard'} className="text-xs md:text-sm text-brown-3 hover:text-brown">
            ← {moduleId != null ? 'Katalog' : 'Kembali ke Dashboard'}
          </Link>
          <span className="text-sm font-semibold text-brown truncate text-right">
            {currentModule?.title ?? (moduleId != null ? '' : 'Perpustakaan Digital')}
          </span>
        </div>

        {moduleId != null && status === 'ready' && (
          <div className="w-full max-w-4xl flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 p-1 rounded-full" style={{ background: 'var(--bg3)' }}>
              {(
                [
                  { key: 'flip3d', label: 'Flip 3D' },
                  { key: 'spread', label: 'Buka Buku' },
                  { key: 'slide', label: 'Geser' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => chooseStyle(opt.key)}
                  className="min-h-9 px-3 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={
                    readerStyleState === opt.key
                      ? { background: 'var(--brown)', color: 'var(--terra)' }
                      : { color: 'var(--brown-3)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--bg3)' }}>
              <button
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                title="Perkecil"
                className="w-8 h-8 rounded-full text-brown-2 font-bold disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center justify-center"
              >
                −
              </button>
              <span className="text-xs font-semibold text-brown-2 min-w-[42px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                title="Perbesar"
                className="w-8 h-8 rounded-full text-brown-2 font-bold disabled:opacity-35 disabled:cursor-not-allowed inline-flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        )}

        {moduleId == null && (
          <div className="w-full max-w-4xl">
            {catalog.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <IconBook size={36} className="text-brown-3" />
                <p className="text-sm text-brown-3">Belum ada PDF modul yang terpasang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {catalog.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSearchParams({ book: String(m.id) })}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-ivory text-center transition-shadow hover:shadow-md"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div
                      className="w-full aspect-[3/4] rounded-lg overflow-hidden flex items-center justify-center shadow-sm"
                      style={{ background: 'var(--bg3)' }}
                    >
                      <CoverThumb src={m.path || m.pdf_path || ''} />
                    </div>
                    <span className="text-xs font-semibold text-brown line-clamp-2">{m.title}</span>
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
            <IconWarning size={40} className="text-red" />
            <p className="text-sm text-brown-2 whitespace-pre-line">{errorMsg}</p>
            <Link
              to="/ebook"
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-terra text-white text-sm font-semibold no-underline"
            >
              Kembali ke Katalog
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div
              ref={pageAreaRef}
              className="w-full max-w-4xl flex-1 flex justify-center items-start bg-bg3 rounded-2xl border overflow-auto p-4 md:p-8"
              style={{ borderColor: 'var(--border)', minHeight: '60vh', maxHeight: 'calc(100vh - 200px)' }}
            >
              {effectiveStyle === 'spread' ? (
                <div className="relative flex" style={{ boxShadow: '0 4px 24px rgba(62,54,46,.16)' }}>
                  <canvas ref={canvasRef} className="max-w-full h-auto rounded-l-sm" style={{ borderRight: '1px solid var(--border)' }} />
                  <canvas ref={canvasRef2} className="max-w-full h-auto rounded-r-sm" />
                  {flipOverlay && (
                    <img
                      src={flipOverlay.snapshot}
                      alt=""
                      className={`reader-flip-overlay style-spread side-${flipOverlay.side} dir-${flipOverlay.direction}`}
                      style={flipOverlay.side === 'right' ? { left: '50%', right: 0 } : { left: 0, right: '50%' }}
                      onAnimationEnd={() => setFlipOverlay(null)}
                    />
                  )}
                </div>
              ) : (
                <div className="relative">
                  <canvas ref={canvasRef} className="max-w-full h-auto shadow-lg rounded-sm" />
                  {flipOverlay && (
                    <img
                      src={flipOverlay.snapshot}
                      alt=""
                      className={`reader-flip-overlay style-${effectiveStyle} side-single dir-${flipOverlay.direction}`}
                      onAnimationEnd={() => setFlipOverlay(null)}
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 md:gap-2.5 flex-wrap justify-center">
              <button
                onClick={goFirst}
                disabled={currentPage <= 1}
                title="Halaman pertama"
                className="min-h-11 min-w-11 px-3 rounded-full border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center"
                style={{ borderColor: 'var(--border)' }}
              >
                <IconSkipBack size={16} />
              </button>
              <button
                onClick={goPrev}
                disabled={prevDisabled}
                title="Sebelumnya"
                className="min-h-11 px-4 rounded-full border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                ‹ Sebelumnya
              </button>
              <span className="text-sm font-semibold text-brown min-w-[80px] text-center">
                {effectiveStyle === 'spread' && currentPage + 1 <= totalPages
                  ? `${currentPage}–${currentPage + 1} / ${totalPages}`
                  : `${currentPage} / ${totalPages}`}
              </span>
              <button
                onClick={goNext}
                disabled={nextDisabled}
                title="Berikutnya"
                className="min-h-11 px-4 rounded-full border-none bg-terra text-white text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                Berikutnya ›
              </button>
              <button
                onClick={goLast}
                disabled={currentPage >= totalPages}
                title="Halaman terakhir"
                className="min-h-11 min-w-11 px-3 rounded-full border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center"
                style={{ borderColor: 'var(--border)' }}
              >
                <IconSkipForward size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default Ebook
