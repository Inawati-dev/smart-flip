import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { saveProgress, moduleIdToPath } from '../lib/progress'
import { useModules } from '../hooks/useModules'
import { Layout } from '../components/Layout'
import { SampulTopik } from '../components/KartuTopik'
import { PembacaPdf, useCapAir, type StatusPdf } from '../components/PembacaPdf'
import { IconWarning, IconBook, IconChevronRight } from '../components/icons'

// Halaman Ebook mahasiswa (antrean #148, #166). Pembaca PDF selayar penuhnya
// ada di components/PembacaPdf.tsx dan dipakai juga oleh pratinjau dosen;
// di sini tinggal katalog, kop, keadaan memuat/galat, dan penyimpanan progres.
//
// ?book= membawa id topik, bukan alamat berkasnya; sumber PDF diambil dari
// useModules() supaya alamat penyimpanan tidak tampil di bilah alamat.
const TIDAK_ADA = 'PDF topik ini belum tersedia.\nFile akan ditambahkan segera.'

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
  const cap = useCapAir()

  // Keadaan muat dilaporkan PembacaPdf bersama id topiknya. Saat ?book= berganti,
  // render pertama masih membawa laporan buku lama; id yang tidak cocok dianggap "memuat".
  const [laporan, setLaporan] = useState<{ id: number | null; status: StatusPdf; pesan: string }>({ id: null, status: 'loading', pesan: '' })
  const laporanIni = laporan.id === moduleId ? laporan : null
  // Modul belum termuat dari useModules() = masih memuat; modul termuat tanpa PDF = galat.
  const tanpaPdf = moduleId != null && !src && modules.length > 0
  const memuat = moduleId != null && !tanpaPdf && (!src || !laporanIni || laporanIni.status === 'loading')
  const galat = tanpaPdf ? TIDAK_ADA : moduleId != null && src && laporanIni?.status === 'error' ? laporanIni.pesan : null
  const siap = moduleId != null && !!src && laporanIni?.status === 'ready'

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
                <div className="text-xs text-brown-3">Topik Sudah Diunggah</div>
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
                    <SampulTopik nomor={m.order_num} judul={m.title} keterangan="PDF" adaPdf pdf={m.pdf_path} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {memuat && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16" role="status">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: '4px solid var(--border)', borderTopColor: 'var(--terra)' }}
            />
            <p className="text-sm text-brown-3">Membuka PDF…</p>
          </div>
        )}

        {galat && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center max-w-sm">
            <IconWarning size={40} className="text-danger" />
            <p className="text-sm text-brown-2 whitespace-pre-line">{galat}</p>
            <Link to="/modul" className="btn btn-primary mt-2">
              Kembali ke Modul
            </Link>
          </div>
        )}

        {moduleId != null && src && (
          <PembacaPdf
            key={moduleId}
            src={src}
            judul={currentModule?.title || 'Ebook'}
            cap={cap}
            tampilStatus={false}
            onStatus={(status, pesan) => setLaporan((l) => (l.id === moduleId && l.status === status && l.pesan === pesan ? l : { id: moduleId, status, pesan }))}
            // Progres per halaman, dikunci ke moduleIdToPath() (bukan alamat PDF) supaya
            // sama saja untuk berkas di books/ maupun yang diunggah ke Supabase Storage.
            onHalaman={(halaman, total) => {
              saveProgress(moduleIdToPath(moduleId), {
                pct: Math.min(100, Math.round((halaman / total) * 100)),
                currentPage: halaman,
                totalPages: total,
                lastOpened: new Date().toISOString(),
              }).catch(() => {})
            }}
            kiri={
              <>
                <Link to="/modul" className="hover:underline flex-shrink-0 pembaca-redup">Modul</Link>
                <IconChevronRight size={12} className="flex-shrink-0 pembaca-redup" />
                <h1 className="text-xs font-semibold truncate">
                  <Link to={`/modul/${moduleId}`} className="hover:underline">
                    {currentModule?.title || 'Ebook'}
                  </Link>
                </h1>
              </>
            }
            aksi={
              <Link to="/modul" className="pembaca-tb">
                ← Modul
              </Link>
            }
          />
        )}
      </div>
    </Layout>
  )
}

export default Ebook
