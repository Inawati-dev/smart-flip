import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listModulPdfFiles, deleteModulPdfFile, type ModulPdfFile } from '../lib/manajemen'
import { isSupabaseConfigured } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { IconTrash, IconChevronRight } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

// /akun/pdf (WP-C, dosen saja) — kelola berkas di bucket `modul-pdf`: lihat
// semua berkas yang tersimpan (termasuk yang yatim, tidak dipakai modul mana
// pun) dan hapus. Berbagi query key dengan Manajemen.tsx supaya daftar berkas
// di kedua halaman tetap sinkron sesudah hapus.
export function KelolaPdf() {
  const queryClient = useQueryClient()
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['manajemen', 'modul-pdf-files'],
    queryFn: listModulPdfFiles,
    enabled: isSupabaseConfigured,
  })

  const [deleteTarget, setDeleteTarget] = useState<ModulPdfFile | null>(null)
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
      await deleteModulPdfFile(deleteTarget.name)
      await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
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
          <Link to="/akun" className="hover:underline">Akun</Link>
          <IconChevronRight size={12} />
          <span>Kelola PDF</span>
        </div>
        <h1 className="font-display text-2xl font-bold text-brown mb-1">Kelola PDF</h1>
        <p className="text-sm text-brown-3 mb-5">
          Semua berkas di penyimpanan modul-pdf, termasuk yang tidak lagi dipakai modul mana pun.
        </p>

        {!isSupabaseConfigured ? (
          <div className="bg-ivory rounded-2xl border p-5 text-sm text-brown-3" style={BORDER}>
            Butuh Supabase untuk mengelola berkas PDF.
          </div>
        ) : (
          <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-bg3">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Nama Berkas</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Tanggal</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Dipakai Modul</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center text-brown-3 py-6 text-sm">Memuat…</td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-brown-3 py-6 text-sm">Belum ada berkas PDF</td>
                    </tr>
                  ) : (
                    files.map((f) => (
                      <tr key={f.name} className="border-t" style={BORDER}>
                        <td className="px-4 py-2.5 text-brown-2 break-all">{f.name}</td>
                        <td className="px-4 py-2.5 text-brown-2 whitespace-nowrap">
                          {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString('id-ID') : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-brown-2">
                          {f.usedBy ? (
                            <span>Dipakai modul: {f.usedBy}</span>
                          ) : (
                            <span className="text-brown-3">Tidak dipakai</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => setDeleteTarget(f)}
                            className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-lg border text-xs font-semibold text-red"
                            style={{ borderColor: 'rgba(176,48,32,.35)' }}
                          >
                            <IconTrash size={14} /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus berkas {deleteTarget.name}?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {deleteTarget.usedBy
                ? `Modul ${deleteTarget.usedBy} akan kehilangan PDF-nya.`
                : 'Berkas ini tidak dipakai modul mana pun.'}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 min-h-11 rounded-lg bg-red text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default KelolaPdf
