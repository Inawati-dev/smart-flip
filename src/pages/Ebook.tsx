import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import * as pdfjsLib from 'pdfjs-dist'
// Vite-bundled worker asset (mirrors legacy/ebook.html's CDN <script> worker
// setup, but resolved from the installed pdfjs-dist package instead of a CDN).
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { saveProgress } from '../lib/progress'
import { Layout } from '../components/Layout'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc

type Status = 'loading' | 'ready' | 'error'

// Ported (MVP core only) from legacy/ebook.html + legacy/script.js: load the
// PDF named by ?book=<path>, render the current page to a canvas, prev/next
// navigation, page-number display, and progress saving.
//
// Deferred vs. legacy/script.js (see PR description for rationale):
//   - Desktop two-page spread + 3D CSS flip animation (buildBook/navigate's
//     flipper rotateY) — this MVP renders one page at a time on all
//     viewports, like legacy's mobile mode.
//   - Full-book background pre-render + in-memory Map page cache
//     (preRenderAll/pageCache) — this renders only the page(s) actually
//     viewed, on demand.
//   - Thumbnail strip sidebar (buildThumbs/toggleThumbs), catalog drawer
//     overlay, pinch-zoom/pan/wheel-zoom, swipe navigation, keyboard
//     shortcuts, and the "expand" fullscreen toggle.
export function Ebook() {
  const [searchParams] = useSearchParams()
  const book = searchParams.get('book') ?? ''

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1) // 1-based, matches PDF.js page numbering

  // ── Load the PDF whenever ?book= changes ──
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMsg('')
    setTotalPages(0)
    setCurrentPage(1)
    pdfRef.current = null

    if (!book) {
      setStatus('error')
      setErrorMsg('Tidak ada buku yang dipilih.')
      return
    }

    pdfjsLib.getDocument(book).promise.then(
      (doc) => {
        if (cancelled) return
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
    }
  }, [book])

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
  // renderView() -> saveProgress() firing on every navigate()) ──
  useEffect(() => {
    if (status !== 'ready' || totalPages <= 0 || !book) return
    const pct = Math.min(100, Math.round((currentPage / totalPages) * 100))
    saveProgress(book, { pct, currentPage, lastOpened: new Date().toISOString() }).catch(() => {})
  }, [status, currentPage, totalPages, book])

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
      <div className="flex flex-col items-center p-4 md:p-6 gap-4">
        <div className="w-full max-w-3xl flex items-center justify-between gap-3">
          <Link to="/dashboard" className="text-xs md:text-sm text-brown-3">
            ← Kembali ke Dashboard
          </Link>
          <span className="text-sm font-semibold text-brown truncate text-right">
            {book ? book.split('/').pop()?.replace(/\.pdf$/i, '') : 'Perpustakaan Digital'}
          </span>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-16" role="status">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: '4px solid var(--border)', borderTopColor: 'var(--terra)' }}
            />
            <p className="text-sm text-brown-3">Membuka PDF…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-16 text-center max-w-sm">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm text-brown-2 whitespace-pre-line">{errorMsg}</p>
            <Link
              to="/dashboard"
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-terra text-white text-sm font-semibold no-underline"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div
              className="w-full max-w-3xl flex justify-center bg-bg3 rounded-xl border overflow-auto p-2 md:p-4"
              style={{ borderColor: 'var(--border)', maxHeight: 'calc(100vh - 220px)' }}
            >
              <canvas ref={canvasRef} className="max-w-full h-auto shadow-md rounded-sm" />
            </div>

            <div className="flex items-center gap-1.5 md:gap-2.5 flex-wrap justify-center">
              <button
                onClick={goFirst}
                disabled={currentPage <= 1}
                title="Halaman pertama"
                className="min-h-11 min-w-11 px-3 rounded-full border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                ⏮
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
                className="min-h-11 min-w-11 px-3 rounded-full border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                ⏭
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default Ebook
