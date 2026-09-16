import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listModulPdfFiles,
  deleteModulPdfFile,
  listModulVideoFiles,
  deleteModulVideoFile,
  type ModulPdfFile,
  type ModulVideoFile,
} from '../lib/manajemen'
import { isSupabaseConfigured } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { PillGroup } from '../components/PillGroup'
import { IconTrash, IconChevronRight } from '../components/icons'
import { PreviewLink } from '../components/PdfPreviewLink'

const BORDER = { borderColor: 'var(--border)' } as const

// Ukuran: KB di bawah 1 MB, MB satu desimal di atasnya (spec #73).
function formatUkuran(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatTanggalUnggah(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Berkas hapus target — satu bentuk untuk kedua tab (PDF dan Video), supaya
// modal konfirmasi hapus tetap satu komponen (spec #56).
interface DeleteTarget {
  kind: 'pdf' | 'video'
  name: string
  usedBy: string | null
}

// Bentuk baris bersama — ModulPdfFile dan ModulVideoFile sama-sama punya
// field ini (src/lib/manajemen.ts), jadi satu tabel cukup untuk kedua tab
// (spec #73: kolomnya wajib identik).
type BerkasRow = ModulPdfFile | ModulVideoFile

// Tabel berkas bersama kedua tab — No · Nama berkas · Ukuran · Tanggal
// unggah · Dipakai topik · Aksi.
function BerkasTable({
  files,
  loading,
  emptyText,
  onDelete,
}: {
  files: BerkasRow[]
  loading: boolean
  emptyText: string
  onDelete: (f: BerkasRow) => void
}) {
  return (
    <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-bg3">
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3 w-10">No</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Nama berkas</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Ukuran</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Tanggal unggah</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Dipakai topik</th>
              <th className="text-center px-4 py-2 text-xs font-semibold text-brown-3 w-36">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-brown-3 py-6 text-sm">Memuat…</td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-brown-3 py-6 text-sm">{emptyText}</td>
              </tr>
            ) : (
              files.map((f, i) => (
                <tr key={f.name} className="row-divider">
                  <td className="px-4 py-2.5 text-brown-3">{i + 1}</td>
                  <td className="px-4 py-2.5 text-brown-2 break-all">{f.name}</td>
                  <td className="px-4 py-2.5 text-brown-2 whitespace-nowrap">{formatUkuran(f.sizeBytes)}</td>
                  <td className="px-4 py-2.5 text-brown-2 whitespace-nowrap">
                    {formatTanggalUnggah(f.createdAt ?? f.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-brown-2">
                    {f.usedBy ? (
                      <span>{f.usedBy}</span>
                    ) : (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: 'var(--bg3)', color: 'var(--brown2)' }}
                      >
                        Belum terpakai
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="inline-flex items-center justify-center gap-1.5">
                      <PreviewLink url={f.url} label="Pratinjau" />
                      <button
                        onClick={() => onDelete(f)}
                        aria-label={`Hapus berkas ${f.name}`}
                        title="Hapus berkas"
                        className="btn btn-danger btn-icon flex-shrink-0"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// /akun/pdf (WP-C, dosen saja) — kelola berkas di bucket `modul-pdf` DAN
// `modul-video` lewat dua tab (antrean #56, sebelumnya cuma PDF). Berbagi
// query key dengan ModulList.tsx/Video.tsx supaya daftar berkas di semua
// halaman tetap sinkron sesudah hapus.
export function KelolaPdf() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'video' ? 'video' : 'pdf'

  const { data: pdfFiles = [], isLoading: pdfLoading } = useQuery({
    queryKey: ['manajemen', 'modul-pdf-files'],
    queryFn: listModulPdfFiles,
    enabled: isSupabaseConfigured,
  })
  const { data: videoFiles = [], isLoading: videoLoading } = useQuery({
    queryKey: ['berkas-video'],
    queryFn: listModulVideoFiles,
    enabled: isSupabaseConfigured,
  })

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.kind === 'pdf') {
        await deleteModulPdfFile(deleteTarget.name)
        await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
      } else {
        await deleteModulVideoFile(deleteTarget.name)
        await queryClient.invalidateQueries({ queryKey: ['berkas-video'] })
      }
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      showToast(`Berkas ${deleteTarget.name} dihapus`)
      setDeleteTarget(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus berkas')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="flex items-center gap-1.5 text-xs text-brown-3 mb-2">
          <Link to="/modul" className="hover:underline">Modul</Link>
          <IconChevronRight size={12} />
          <span>Berkas</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-brown mb-1">Berkas</h1>
        <p className="text-sm text-brown-3 mb-5">
          Semua PDF dan video yang tersimpan, termasuk yang belum terpakai di topik mana pun.
        </p>

        {!isSupabaseConfigured ? (
          <div className="bg-ivory rounded-2xl border p-5 text-sm text-brown-3" style={BORDER}>
            Butuh Supabase untuk mengelola berkas.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <PillGroup
                ariaLabel="Tab berkas"
                size="sm"
                value={tab}
                onChange={(v) => setSearchParams(v === 'video' ? { tab: 'video' } : {})}
                options={[
                  { value: 'pdf', label: 'PDF topik', badge: pdfFiles.length },
                  { value: 'video', label: 'Video topik', badge: videoFiles.length },
                ]}
              />
            </div>

            {tab === 'pdf' ? (
              <BerkasTable
                files={pdfFiles}
                loading={pdfLoading}
                emptyText="Belum ada berkas PDF"
                onDelete={(f) => setDeleteTarget({ kind: 'pdf', name: f.name, usedBy: f.usedBy })}
              />
            ) : (
              <BerkasTable
                files={videoFiles}
                loading={videoLoading}
                emptyText="Belum ada berkas video"
                onDelete={(f) => setDeleteTarget({ kind: 'video', name: f.name, usedBy: f.usedBy })}
              />
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus berkas {deleteTarget.name}?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {deleteTarget.usedBy
                ? `Topik ${deleteTarget.usedBy} akan kehilangan ${deleteTarget.kind === 'pdf' ? 'PDF-nya' : 'videonya'}.`
                : 'Berkas ini belum terpakai di topik mana pun.'}
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} disabled={deleting} className="btn btn-danger flex-1 min-w-[7.5rem]">
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 6px 24px color-mix(in srgb, var(--shadow-color) 25%, transparent)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default KelolaPdf
