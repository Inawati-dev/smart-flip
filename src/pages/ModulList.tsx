import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { createCourse, updateCourse, deleteCourse, type Course } from '../lib/courses'
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
import { FileInput } from '../components/FileInput'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { IconEdit, IconTrash, IconDocument, IconGear, IconEye } from '../components/icons'
import { PdfPreviewLink } from '../components/PdfPreviewLink'
import { KartuTopik, ChipRak, Rak } from '../components/KartuTopik'

const BORDER = { borderColor: 'var(--border)' } as const

// Tabel kelola modul dosen — dipakai di /modul (daftar) dan /modul/:id (spec
// §5.2, §9 WP5). Pola upload/ubah metadata ditiru dari Manajemen.tsx,
// disederhanakan (tanpa reorder/bulk/hapus/tambah — itu tetap di sana).
export function DosenModulRak() {
  const queryClient = useQueryClient()
  const { courseId } = useCourse()
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
      showToast('Tambah topik butuh koneksi Supabase, belum tersedia di mode demo.')
      return
    }
    setSaving(true)
    try {
      if (creatingNew) {
        // modules sudah tersaring per mata kuliah terpilih (useModules), jadi
        // nomor urut topik baru = jumlah topik mata kuliah ini + 1.
        const nextOrderNum = modules.length + 1
        const newId = await createModulReturningId({ judul, deskripsi: formDeskripsi.trim(), orderNum: nextOrderNum, courseId })
        await queryClient.invalidateQueries({ queryKey: ['modules'] })
        if (createPdfFile) {
          setSavingStatus('Mengunggah PDF…')
          try {
            await uploadModulPdf(newId, createPdfFile)
            await queryClient.invalidateQueries({ queryKey: ['modules'] })
            await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
            showToast('Topik baru ditambahkan')
          } catch (pdfErr) {
            const msg = pdfErr instanceof Error ? pdfErr.message : 'kesalahan tidak diketahui'
            showToast(`Topik tersimpan, PDF gagal diunggah: ${msg}`)
          }
        } else {
          showToast('Topik baru ditambahkan')
        }
      } else if (editId != null) {
        const data: ModulCustom = { ...customs[editId], judul, deskripsi: formDeskripsi.trim() }
        await saveModulCustom(editId, data)
        await queryClient.invalidateQueries({ queryKey: ['manajemen', 'customs'] })
        showToast('Topik disimpan')
      }
      closeFormModal()
    } catch {
      showToast(creatingNew ? 'Gagal menambahkan topik' : 'Gagal menyimpan topik')
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
      showToast('Topik dihapus')
      setDeleteId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus topik')
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
      showToast('PDF topik berhasil diunggah')
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
      showToast('PDF topik dipasang dari file yang sudah ada')
    } catch {
      setPdfError('Gagal memasang PDF. Coba lagi.')
    } finally {
      setAssigningPdf(false)
    }
  }

  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)
  const jumlahPdf = sorted.filter((m) => m.pdf_path).length

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-sm text-brown-3">
          {sorted.length} topik · {jumlahPdf} punya PDF
        </p>
        <button onClick={openCreate} className="btn btn-primary btn-sm">
          + Tambah topik
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-brown-3">Belum ada topik. Tambah topik pertama.</p>
      ) : (
        <Rak>
          {sorted.map((m) => {
            const custom = customs[m.id]
            const judul = custom?.judul || m.title
            const fileName = m.pdf_path ? m.pdf_path.split('/').pop()?.split('?')[0] : null
            const hasPdf = !!m.pdf_path
            return (
              <KartuTopik
                key={m.id}
                nomor={m.order_num}
                judul={judul}
                keterangan={fileName ? 'PDF' : 'Belum ada PDF'}
                aksi={
                  <>
                    <button
                      onClick={() => openPdfModal(m.id)}
                      aria-label="Ganti PDF"
                      title="Ganti PDF"
                      className="btn btn-secondary btn-sm w-full whitespace-nowrap"
                    >
                      <IconDocument size={13} /> <span className="hidden sm:inline">{hasPdf ? 'Ganti PDF' : 'Unggah PDF'}</span>
                    </button>
                    <button
                      onClick={() => openEdit(m.id)}
                      aria-label="Ubah topik"
                      title="Ubah topik"
                      className="btn btn-secondary btn-sm w-full whitespace-nowrap"
                    >
                      <IconEdit size={13} /> <span className="hidden sm:inline">Ubah topik</span>
                    </button>
                    {m.pdf_path ? (
                      <PdfPreviewLink url={m.pdf_path} label="Pratinjau" compact />
                    ) : (
                      <button type="button" disabled aria-label="Pratinjau" title="Belum ada PDF" className="btn btn-secondary btn-sm w-full whitespace-nowrap">
                        <IconEye size={13} /> <span className="hidden sm:inline">Pratinjau</span>
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(m.id)}
                      aria-label={`Hapus topik ${judul}`}
                      title="Hapus topik"
                      className="btn btn-danger btn-sm w-full whitespace-nowrap"
                    >
                      <IconTrash size={13} /> <span className="hidden sm:inline">Hapus</span>
                    </button>
                  </>
                }
              />
            )
          })}
        </Rak>
      )}

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
            <h3 className="font-display text-lg font-semibold text-brown mb-4">{creatingNew ? 'Tambah Topik' : 'Ubah Topik'}</h3>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Judul
              <input
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value.slice(0, 100))}
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
              Deskripsi
              <textarea
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value.slice(0, 200))}
                rows={3}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y"
                style={BORDER}
              />
            </label>
            {creatingNew && (
              <div className="mb-4">
                <span className="block text-xs font-semibold text-brown-2 mb-1">PDF topik (opsional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                  <FileInput
                    accept="application/pdf,.pdf"
                    label="Pilih PDF"
                    hint="PDF, maks 20 MB"
                    maxSizeMb={20}
                    file={createPdfFile}
                    onChange={setCreatePdfFile}
                  />
                </div>
              </div>
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
              Hapus topik "{customs[deleteId]?.judul || modules.find((m) => m.id === deleteId)?.title || ''}"?
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
            <h3 className="font-display text-lg font-semibold text-brown mb-4">Ganti PDF topik</h3>

            <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2">Unggah berkas baru</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
              <FileInput
                accept="application/pdf,.pdf"
                label="Pilih PDF"
                hint="PDF, maks 20 MB"
                maxSizeMb={20}
                file={pdfFile}
                onChange={(f) => {
                  setPdfFile(f)
                  setPdfError('')
                }}
              />
              <button
                type="button"
                onClick={handleUploadPdf}
                disabled={!pdfFile || uploadingPdf}
                className="btn btn-primary btn-sm min-w-[8rem]"
              >
                {uploadingPdf ? 'Mengunggah…' : 'Unggah PDF'}
              </button>
            </div>

            {isSupabaseConfigured && pdfFiles.length > 0 && (
              <div className="pt-4 mt-4 border-t" style={BORDER}>
                <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2">
                  Atau pakai berkas yang sudah ada
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                  <div className="flex items-center gap-2 min-w-0">
                    <Select
                      value={pickedPdfUrl}
                      onChange={setPickedPdfUrl}
                      placeholder="Pilih file…"
                      className="h-11 px-2.5 rounded-lg border text-sm text-brown flex-1 min-w-0"
                      style={BORDER}
                      options={pdfFiles.map((f) => ({
                        value: f.url,
                        label: f.usedBy ? `${f.name}, dipakai: ${f.usedBy}` : `${f.name}: belum dipakai`,
                      }))}
                    />
                    {pickedPdfUrl && <PdfPreviewLink url={pickedPdfUrl} label="Pratinjau berkas yang dipilih" />}
                  </div>
                  <button
                    type="button"
                    onClick={handleAssignPdf}
                    disabled={!pickedPdfUrl || assigningPdf}
                    className="btn btn-secondary btn-sm min-w-[8rem]"
                  >
                    {assigningPdf ? 'Memasang…' : 'Gunakan'}
                  </button>
                </div>
              </div>
            )}
            {pdfError && <p className="text-[11px] text-danger mt-2">{pdfError}</p>}
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

// Modal "Kelola mata kuliah" (antrean #68) — dosen daftar, ubah, hapus, dan
// menambah mata kuliah. Dibuka dari tombol di samping MataKuliahSelect di
// ModulList().
function KelolaMataKuliahModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { courses } = useCourse()

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const [editId, setEditId] = useState<number | null>(null)
  const [formKode, setFormKode] = useState('')
  const [formNama, setFormNama] = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditId(null)
    setFormKode('')
    setFormNama('')
    setFormDeskripsi('')
  }

  function openEdit(c: Course) {
    setEditId(c.id)
    setFormKode(c.code)
    setFormNama(c.name)
    setFormDeskripsi(c.description)
  }

  async function saveForm() {
    const kode = formKode.trim()
    const nama = formNama.trim()
    if (!kode || !nama) return
    setSaving(true)
    try {
      if (editId != null) {
        await updateCourse(editId, { code: kode, name: nama, description: formDeskripsi.trim() })
        showToast('Mata kuliah disimpan')
      } else {
        await createCourse({ code: kode, name: nama, description: formDeskripsi.trim(), dosenId: user?.id ?? null })
        showToast('Mata kuliah ditambahkan')
      }
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      resetForm()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan mata kuliah')
    } finally {
      setSaving(false)
    }
  }

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await deleteCourse(deleteId)
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      showToast('Mata kuliah dihapus')
      setDeleteId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus mata kuliah')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
        style={{ background: 'rgba(44,36,32,.55)', animation: 'fadeInBg 0.18s ease' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div
          className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[480px] my-8 max-h-[90vh] overflow-y-auto"
          style={{ boxShadow: '0 16px 48px rgba(44,36,32,.25)', animation: 'slideUpModal 0.22s ease' }}
        >
          <h3 className="font-display text-lg font-semibold text-brown mb-4">Kelola mata kuliah</h3>

          <div className="flex flex-col gap-2 mb-4">
            {courses.length === 0 ? (
              <p className="text-sm text-brown-3">Belum ada mata kuliah.</p>
            ) : (
              courses.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 row-divider py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-brown truncate">
                      {c.code} · {c.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="btn btn-secondary btn-sm">
                      Ubah
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      aria-label={`Hapus mata kuliah ${c.name}`}
                      title="Hapus mata kuliah"
                      className="btn btn-danger btn-icon flex-shrink-0"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t" style={BORDER}>
            <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2">
              {editId != null ? 'Ubah mata kuliah' : 'Tambah mata kuliah'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 mb-2">
              <input
                value={formKode}
                onChange={(e) => setFormKode(e.target.value.slice(0, 20))}
                placeholder="Kode, mis. MPP"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
              <input
                value={formNama}
                onChange={(e) => setFormNama(e.target.value.slice(0, 100))}
                placeholder="Nama mata kuliah"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </div>
            <textarea
              value={formDeskripsi}
              onChange={(e) => setFormDeskripsi(e.target.value.slice(0, 200))}
              placeholder="Deskripsi (opsional)"
              rows={2}
              className="w-full rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y mb-3"
              style={BORDER}
            />
            <div className="flex gap-2.5 justify-end">
              {editId != null && (
                <button onClick={resetForm} className="btn btn-secondary btn-sm">
                  Batal ubah
                </button>
              )}
              <button
                onClick={() => void saveForm()}
                disabled={saving || !formKode.trim() || !formNama.trim()}
                className="btn btn-primary btn-sm min-w-[7.5rem]"
              >
                {saving ? 'Menyimpan…' : editId != null ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-2 border-t" style={BORDER}>
            <button onClick={onClose} className="btn btn-secondary">
              Tutup
            </button>
          </div>
        </div>
      </div>

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
              Hapus mata kuliah "{courses.find((c) => c.id === deleteId)?.name || ''}"?
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Semua topik, soal, dan hasil tes mata kuliah ini ikut terhapus.
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

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-brown text-white text-sm px-4 py-2.5 rounded-lg z-[800]">
          {toast}
        </div>
      )}
    </>
  )
}

// /modul (spec §8.0, §9 WP5, rak sampul antrean #85 opsi B). Mahasiswa: rak
// semua topik, kartu terkunci pudar (§4.2 lib/topik). Dosen: rak kelola PDF
// (§5.2), sama seperti di /modul/:id (lihat Modul.tsx).
export function ModulList() {
  const { role } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { statusOf } = useTopikStatus()
  const [kelolaOpen, setKelolaOpen] = useState(false)

  const sorted = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const lanjut = useMemo(
    () => sorted.find((m) => statusOf(m.id) !== 'locked' && (progress[moduleIdToPath(m.id)]?.pct ?? 0) < 100) ?? sorted[0],
    [sorted, statusOf, progress],
  )

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-brown">Modul</h1>
            {role === 'dosen' && (
              <button onClick={() => setKelolaOpen(true)} className="btn btn-secondary btn-sm" title="Tambah, ubah, atau hapus mata kuliah">
                <IconGear size={14} /> Kelola mata kuliah
              </button>
            )}
          </div>
          <MataKuliahSelect />
        </div>
        {role === 'dosen' ? (
          <DosenModulRak />
        ) : (
          <>
            <p className="text-sm text-brown-3 mb-4">{sorted.length} topik · dibaca sebagai flipbook</p>
            {lanjut && statusOf(lanjut.id) !== 'locked' && (
              <Link to={`/modul/${lanjut.id}`} className="btn btn-primary btn-sm inline-block mb-4">
                Lanjutkan membaca
              </Link>
            )}
            {sorted.length === 0 ? (
              <p className="text-brown-3">Belum ada topik di mata kuliah ini.</p>
            ) : (
              <Rak>
                {sorted.map((m) => {
                  const status = statusOf(m.id)
                  const entry = progress[moduleIdToPath(m.id)]
                  const pct = entry?.pct ?? 0
                  const total = entry?.totalPages ?? null
                  const kaki =
                    pct >= 100
                      ? total ? `${total}/${total} hal` : 'Selesai dibaca'
                      : pct > 0 && entry?.currentPage > 0
                        ? total ? `${entry.currentPage}/${total} hal` : `Halaman ${entry.currentPage}`
                        : total ? `0/${total} hal` : 'Belum dibaca'
                  const chip =
                    status === 'done' ? (
                      <ChipRak jenis="ok" label="Selesai" />
                    ) : status === 'locked' ? (
                      <ChipRak jenis="todo" label="Terkunci" />
                    ) : (
                      <ChipRak jenis="now" label={pct > 0 ? 'Sedang dibaca' : 'Siap dibaca'} />
                    )
                  return (
                    <KartuTopik
                      key={m.id}
                      nomor={m.order_num}
                      judul={m.title}
                      keterangan={m.pdf_path ? (total ? `${total} hal` : 'PDF') : 'Belum ada PDF'}
                      persen={pct}
                      kaki={kaki}
                      chip={chip}
                      terkunci={status === 'locked'}
                      judulKunci="Selesaikan tes formatif topik sebelumnya (skor 80) dulu"
                      to={`/modul/${m.id}`}
                    />
                  )
                })}
              </Rak>
            )}
          </>
        )}
        {kelolaOpen && <KelolaMataKuliahModal onClose={() => setKelolaOpen(false)} />}
      </div>
    </Layout>
  )
}

export default ModulList
