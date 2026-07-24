import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import * as pdfjsLib from 'pdfjs-dist'
// Vite-bundled worker asset (mirrors legacy/ebook.html's CDN <script> worker
// setup, but resolved from the installed pdfjs-dist package instead of a CDN).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { saveProgress, moduleIdToPath } from '../lib/progress'
import { useModules } from '../hooks/useModules'
import { Layout } from '../components/Layout'
import { IconWarning, IconSkipBack, IconSkipForward, IconBook } from '../components/icons'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type Status = 'loading' | 'ready' | 'error'

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
// Deferred vs. legacy/script.js (see PR description for rationale):
//   - Desktop two-page spread + 3D CSS flip animation (buildBook/navigate's
//     flipper rotateY) — this MVP renders one page at a time on all
//     viewports, like legacy's mobile mode.
//   - Full-book background pre-render + in-memory Map page cache
//     (preRenderAll/pageCache) — this renders only the page(s) actually
//     viewed, on demand.
//   - Thumbnail strip sidebar (buildThumbs/toggleThumbs), pinch-zoom/pan/
//     wheel-zoom, swipe navigation, keyboard shortcuts, and the "expand"
//     fullscreen toggle.
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
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1) // 1-based, matches PDF.js page numbering

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

  // ── Render the current page into the canvas ──
  const renderPage = useCallback(async (num: number) => {
    const doc = pdfRef.current
    const canvas = canvasRef.current
    if (!doc || !canvas || num < 1 || num > doc.numPages) return

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    const page = await doc.getPage(num)
    const viewport = page.getViewport({ scale: 1.5 })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const task = page.render({ canvasContext: ctx, viewport })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch {
      // Render cancelled by a newer page request — ignore, matches
      // legacy/script.js's doRenderPage() swallowing render errors.
    } finally {
      if (renderTaskRef.current === task) renderTaskRef.current = null
    }
  }, [])

  useEffect(() => {
    if (status === 'ready') void renderPage(currentPage)
  }, [status, currentPage, renderPage])

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

  function goFirst() {
    setCurrentPage(1)
  }
  function goPrev() {
    setCurrentPage((p) => Math.max(1, p - 1))
  }
  function goNext() {
    setCurrentPage((p) => Math.min(totalPages || 1, p + 1))
  }
  function goLast() {
    setCurrentPage(totalPages || 1)
  }

  return (
    <Layout>
      <div className="page-fadein flex flex-col items-center p-4 md:p-8 gap-4 min-h-[calc(100vh-58px)] lg:min-h-screen">
        <div className="w-full max-w-4xl flex items-center justify-between gap-3">
          <Link to={moduleId != null ? '/ebook' : '/dashboard'} className="text-xs md:text-sm text-brown-3 hover:text-brown">
            ← {moduleId != null ? 'Katalog' : 'Kembali ke Dashboard'}
          </Link>
          <span className="text-sm font-semibold text-brown truncate text-right">
            {currentModule?.title ?? (moduleId != null ? '' : 'Perpustakaan Digital')}
          </span>
        </div>

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
              className="w-full max-w-4xl flex-1 flex justify-center items-start bg-bg3 rounded-2xl border overflow-auto p-4 md:p-8"
              style={{ borderColor: 'var(--border)', minHeight: '60vh', maxHeight: 'calc(100vh - 200px)' }}
            >
              <canvas ref={canvasRef} className="max-w-full h-auto shadow-lg rounded-sm" />
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
                disabled={currentPage <= 1}
                title="Sebelumnya"
                className="min-h-11 px-4 rounded-full border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                ‹ Sebelumnya
              </button>
              <span className="text-sm font-semibold text-brown min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={goNext}
                disabled={currentPage >= totalPages}
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
