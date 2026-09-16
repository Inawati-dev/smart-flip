import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useAuth } from '../contexts/AuthContext'
import { useTopikStatus } from '../lib/topik'
import { moduleIdToPath } from '../lib/progress'
import { useModulCustoms } from '../hooks/useManajemen'
import {
  saveModulCustom,
  createModulReturningId,
  deleteModul,
  uploadModulPdf,
  listModulPdfFiles,
  assignModulPdf,
  type ModulCustom,
} from '../lib/manajemen'
import { isSupabaseConfigured } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { IconEdit, IconTrash } from '../components/icons'
import { PdfPreviewLink } from '../components/PdfPreviewLink'

const BORDER = { borderColor: 'var(--border)' } as const

// Tabel kelola modul dosen — dipakai di /modul (daftar) dan /modul/:id (spec
// §5.2, §9 WP5). Pola upload/ubah metadata ditiru dari Manajemen.tsx,
// disederhanakan (tanpa reorder/bulk/hapus/tambah — itu tetap di sana).
export function DosenModulTable() {
  const queryClient = useQueryClient()
  const { data: modules = [] } = useModules()
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules])
  const { data: customs = {} } = useModulCustoms(moduleIds)
  const { data: pdfFiles = [] } = useQuery({
    queryKey: ['manajemen', 'modul-pdf-files'],
    queryFn: listModulPdfFiles,
    enabled: isSupabaseConfigured,
  })

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const [editId, setEditId] = useState<number | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [formJudul, setFormJudul] = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState('')
  const [createPdfFile, setCreatePdfFile] = useState<File | null>(null)

  function openEdit(id: number) {
    const m = modules.find((x) => x.id === id)
    const custom = customs[id]
    setCreatingNew(false)
    setEditId(id)
    setFormJudul(custom?.judul || m?.title || '')
    setFormDeskripsi(custom?.deskripsi || m?.description || '')
  }

  function openCreate() {
    setEditId(null)
    setCreatingNew(true)
    setFormJudul('')
    setFormDeskripsi('')
    setCreatePdfFile(null)
  }

  function closeFormModal() {
    setEditId(null)
    setCreatingNew(false)
    setCreatePdfFile(null)
  }

  // Tambah Modul + PDF (antrean #43): modul dibuat dulu (butuh id baru untuk
  // upload), lalu kalau dosen memilih berkas, PDF diunggah ke modul itu. PDF
  // gagal diunggah tidak membatalkan modul yang sudah tersimpan — dosen bisa
  // unggah ulang lewat "Ganti PDF" nanti.
  async function saveEdit() {
    const judul = formJudul.trim()
    if (!judul) return
    if (creatingNew && !isSupabaseConfigured) {
      showToast('Tambah modul butuh koneksi Supabase, belum tersedia di mode demo.')
      return
    }
    setSaving(true)
    try {
      if (creatingNew) {
        const nextOrderNum = Math.max(0, ...modules.map((m) => m.order_num)) + 1
        const newId = await createModulReturningId({ judul, deskripsi: formDeskripsi.trim(), orderNum: nextOrderNum })
        await queryClient.invalidateQueries({ queryKey: ['modules'] })
        if (createPdfFile) {
          setSavingStatus('Mengunggah PDF…')
          try {
            await uploadModulPdf(newId, createPdfFile)
            await queryClient.invalidateQueries({ queryKey: ['modules'] })
            await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
            showToast('Modul baru ditambahkan')
          } catch (pdfErr) {
            const msg = pdfErr instanceof Error ? pdfErr.message : 'kesalahan tidak diketahui'
            showToast(`Modul tersimpan, PDF gagal diunggah: ${msg}`)
          }
        } else {
          showToast('Modul baru ditambahkan')
        }
      } else if (editId != null) {
        const data: ModulCustom = { ...customs[editId], judul, deskripsi: formDeskripsi.trim() }
        await saveModulCustom(editId, data)
        await queryClient.invalidateQueries({ queryKey: ['manajemen', 'customs'] })
        showToast('Modul disimpan')
      }
      closeFormModal()
    } catch {
      showToast(creatingNew ? 'Gagal menambahkan modul' : 'Gagal menyimpan modul')
    } finally {
      setSaving(false)
      setSavingStatus('')
    }
  }

  // Hapus modul (destruktif — progres, soal formatif via cascade, dan file
  // PDF di Storage ikut terhapus lewat deleteModul, lihat lib/manajemen.ts).
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await deleteModul(deleteId)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      showToast('Modul dihapus')
      setDeleteId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus modul')
    } finally {
      setDeleting(false)
    }
  }

  const [pdfModalId, setPdfModalId] = useState<number | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfError, setPdfError] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pickedPdfUrl, setPickedPdfUrl] = useState('')
  const [assigningPdf, setAssigningPdf] = useState(false)

  function openPdfModal(id: number) {
    setPdfModalId(id)
    setPdfFile(null)
    setPdfError('')
    setPickedPdfUrl('')
  }

  async function handleUploadPdf() {
    if (pdfModalId == null || !pdfFile) return
    if (pdfFile.type !== 'application/pdf') {
      setPdfError('File harus berformat PDF.')
      return
    }
    setPdfError('')
    setUploadingPdf(true)
    try {
      await uploadModulPdf(pdfModalId, pdfFile)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
      setPdfFile(null)
      showToast('PDF modul berhasil diunggah')
    } catch {
      setPdfError('Gagal mengunggah PDF. Coba lagi.')
    } finally {
      setUploadingPdf(false)
    }
  }

  async function handleAssignPdf() {
    if (pdfModalId == null || !pickedPdfUrl) return
    setPdfError('')
    setAssigningPdf(true)
    try {
      await assignModulPdf(pdfModalId, pickedPdfUrl)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setPickedPdfUrl('')
      showToast('PDF modul dipasang dari file yang sudah ada')
    } catch {
      setPdfError('Gagal memasang PDF. Coba lagi.')
    } finally {
      setAssigningPdf(false)
    }
  }

  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)

  return (
    <>
      <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
        <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={BORDER}>
          <span className="text-sm font-semibold text-brown">Daftar modul</span>
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            + Tambah modul
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-bg3">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-10">No</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Judul</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Berkas PDF</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-28">Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-52">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-brown-3 text-sm">
                    Belum ada modul.
                  </td>
                </tr>
              ) : (
                sorted.map((m, idx) => {
                  const custom = customs[m.id]
                  const judul = custom?.judul || m.title
                  const fileName = m.pdf_path ? m.pdf_path.split('/').pop()?.split('?')[0] : null
                  const hasPdf = !!m.pdf_path
                  return (
                    <tr key={m.id} className="border-t" style={BORDER}>
                      <td className="px-3 py-2.5 font-semibold text-brown">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-brown min-w-[160px]">{judul}</td>
                      <td className="px-3 py-2.5 text-xs text-brown-3 max-w-[260px]">
                        {m.pdf_path ? (
                          <span className="inline-flex items-center gap-2 max-w-full">
                            <span className="truncate">{fileName}</span>
                            <PdfPreviewLink url={m.pdf_path} />
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={
                            hasPdf ? { background: 'var(--success-soft)', color: 'var(--success)' } : { background: 'var(--bg3)', color: 'var(--brown2)' }
                          }
                        >
                          {hasPdf ? 'Ada PDF' : 'Belum ada'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col sm:flex-row gap-1.5">
                          <button onClick={() => openPdfModal(m.id)} className="btn btn-secondary btn-sm whitespace-nowrap">
                            Ganti PDF
                          </button>
                          <button onClick={() => openEdit(m.id)} className="btn btn-secondary btn-sm whitespace-nowrap">
                            <IconEdit size={13} /> Ubah
                          </button>
                          <button
                            onClick={() => setDeleteId(m.id)}
                            aria-label={`Hapus modul ${judul}`}
                            title="Hapus modul"
                            className="btn btn-danger btn-icon flex-shrink-0"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(editId != null || creatingNew) && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(44,36,32,.55)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeFormModal()
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[480px] my-8 max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 16px 48px rgba(44,36,32,.25)' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">{creatingNew ? 'Tambah Modul' : 'Ubah Modul'}</h3>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Judul
              <input
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value.slice(0, 100))}
                className="h-11 rounded-lg border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
              Deskripsi
              <textarea
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value.slice(0, 200))}
                rows={3}
                className="rounded-lg border px-3 py-2 text-base text-brown resize-y"
                style={BORDER}
              />
            </label>
            {creatingNew && (
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
                PDF modul (opsional)
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setCreatePdfFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-brown-2"
                />
              </label>
            )}
            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={closeFormModal} className="btn btn-secondary">
                Batal
              </button>
              <button onClick={saveEdit} disabled={saving || !formJudul.trim()} className="btn btn-primary min-w-[7.5rem]">
                {saving ? savingStatus || 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteId(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">
              Hapus modul “{customs[deleteId]?.judul || modules.find((m) => m.id === deleteId)?.title || ''}”?
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Progres, soal formatif, dan PDF yang terpasang ikut terhapus.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="btn btn-secondary btn-sm flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} disabled={deleting} className="btn btn-danger btn-sm flex-1 min-w-[7.5rem]">
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfModalId != null && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(44,36,32,.55)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPdfModalId(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[480px] my-8 max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 16px 48px rgba(44,36,32,.25)' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">Ganti PDF Modul</h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  setPdfFile(e.target.files?.[0] ?? null)
                  setPdfError('')
                }}
                className="text-sm text-brown-2 flex-1 min-w-[160px]"
              />
              <button
                type="button"
                onClick={handleUploadPdf}
                disabled={!pdfFile || uploadingPdf}
                className="btn btn-primary btn-sm flex-shrink-0 min-w-[7.5rem]"
              >
                {uploadingPdf ? 'Mengunggah…' : 'Unggah PDF'}
              </button>
            </div>
            {isSupabaseConfigured && pdfFiles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-3 mt-1 border-t" style={BORDER}>
                <span className="text-[11px] text-brown-3 whitespace-nowrap">atau pakai file yang sudah ada:</span>
                <Select
                  value={pickedPdfUrl}
                  onChange={setPickedPdfUrl}
                  placeholder="Pilih file…"
                  className="h-11 px-2.5 rounded-lg border text-sm text-brown flex-1 min-w-[160px]"
                  style={BORDER}
                  options={pdfFiles.map((f) => ({
                    value: f.url,
                    label: f.usedBy ? `${f.name}, dipakai: ${f.usedBy}` : `${f.name}: belum dipakai`,
                  }))}
                />
                {pickedPdfUrl && <PdfPreviewLink url={pickedPdfUrl} label="Pratinjau berkas yang dipilih" />}
                <button
                  type="button"
                  onClick={handleAssignPdf}
                  disabled={!pickedPdfUrl || assigningPdf}
                  className="btn btn-secondary btn-sm flex-shrink-0 min-w-[7.5rem]"
                >
                  {assigningPdf ? 'Memasang…' : 'Gunakan'}
                </button>
              </div>
            )}
            {pdfError && <p className="text-[11px] text-red mt-2">{pdfError}</p>}
            <div className="flex justify-end pt-4">
              <button onClick={() => setPdfModalId(null)} className="btn btn-secondary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-brown text-white text-sm px-4 py-2.5 rounded-lg z-[700]">
          {toast}
        </div>
      )}
    </>
  )
}

// /modul (spec §8.0, §9 WP5). Mahasiswa: dialihkan otomatis ke modul aktifnya
// (progres <100% & tidak locked, urut order_num; fallback modul pertama).
// Dosen: tabel kelola PDF (§5.2), sama seperti di /modul/:id (lihat Modul.tsx).
export function ModulList() {
  const { role, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { statusOf } = useTopikStatus()

  useEffect(() => {
    if (authLoading || role === 'dosen' || modules.length === 0) return
    const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)
    const target =
      sorted.find((m) => statusOf(m.id) !== 'locked' && (progress[moduleIdToPath(m.id)]?.pct ?? 0) < 100) ?? sorted[0]
    if (target) navigate(`/modul/${target.id}`, { replace: true })
  }, [authLoading, role, modules, progress, statusOf, navigate])

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-brown mb-4">Modul</h1>
        {role === 'dosen' ? <DosenModulTable /> : <p className="text-brown-3">Memuat modul…</p>}
      </div>
    </Layout>
  )
}

export default ModulList
