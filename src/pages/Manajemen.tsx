import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { useModulOrder, useModulCustoms } from '../hooks/useManajemen'
import { saveModulCustom, saveModulOrder, uploadModulPdf, createModul, type ModulCustom, type ModulStatus } from '../lib/manajemen'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  fetchDiagnosticQuestions,
  createDiagnosticQuestion,
  updateDiagnosticQuestion,
  deleteDiagnosticQuestion,
  type DiagnosticQuestion,
} from '../lib/diagnostic'
import { Layout } from '../components/Layout'
import { IconDocument, IconEdit, IconTrash } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

const STATUS_LABEL: Record<string, string> = { aktif: 'Aktif', draf: 'Draf', terkunci: 'Terkunci', nonaktif: 'Nonaktif' }
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  aktif: { bg: '#C0DD97', color: '#27500A' },
  draf: { bg: '#E5E0D8', color: '#6B5D4F' },
  terkunci: { bg: '#FAD7A0', color: '#7D4E00' },
  nonaktif: { bg: '#E5E0D8', color: '#6B5D4F' },
}

// Ported from legacy/manajemen.html — dosen-only module management panel:
// inline metadata editing (via modal, matching legacy's #editModal), status
// toggle (aktif/draf/terkunci), reorder (↑/↓ buttons — legacy has no
// drag-and-drop), and bulk status actions. Bulk actions are gated behind a
// confirmation modal per CLAUDE.md's Mobile Support Rules (legacy has none —
// this is a deliberate improvement, not a regression).
export function Manajemen() {
  const queryClient = useQueryClient()
  const { data: modules = [] } = useModules()
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules])
  const { data: savedOrder } = useModulOrder()
  const { data: fetchedCustoms = {} } = useModulCustoms(moduleIds)

  // Local overrides so reorder/edit/bulk actions reflect immediately without
  // waiting on a query refetch — mirrors Profil.tsx's namaOverride pattern.
  const [orderOverride, setOrderOverride] = useState<number[] | null>(null)
  const [customsOverride, setCustomsOverride] = useState<Record<number, ModulCustom>>({})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [formJudul, setFormJudul] = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [formStatus, setFormStatus] = useState<ModulStatus>('aktif')
  const [formDurasi, setFormDurasi] = useState('')
  const [formCatatan, setFormCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const [bulkConfirm, setBulkConfirm] = useState<'aktif' | 'terkunci' | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  // Diagnostic placement test question bank — see "Admin edit (dosen)" in
  // docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md.
  // Separate query/state from the module-management block above; only shares
  // the page's Layout, toast, and modal styling conventions.
  const { data: diagQuestions = [] } = useQuery({
    queryKey: ['diagnostic-questions'],
    queryFn: fetchDiagnosticQuestions,
  })
  const sortedDiagQuestions = useMemo(
    () => [...diagQuestions].sort((a, b) => a.order_num - b.order_num),
    [diagQuestions],
  )

  const [diagEditId, setDiagEditId] = useState<number | 'new' | null>(null)
  const [diagPertanyaan, setDiagPertanyaan] = useState('')
  const [diagOpsi, setDiagOpsi] = useState<string[]>(['', '', '', ''])
  const [diagJawaban, setDiagJawaban] = useState(0)
  const [diagOrderNum, setDiagOrderNum] = useState(1)
  const [diagSaving, setDiagSaving] = useState(false)
  const [diagDeleteId, setDiagDeleteId] = useState<number | null>(null)

  function openDiagAddModal() {
    const maxOrder = diagQuestions.reduce((m, q) => Math.max(m, q.order_num), 0)
    setDiagEditId('new')
    setDiagPertanyaan('')
    setDiagOpsi(['', '', '', ''])
    setDiagJawaban(0)
    setDiagOrderNum(maxOrder + 1)
  }

  function openDiagEditModal(q: DiagnosticQuestion) {
    setDiagEditId(q.id)
    setDiagPertanyaan(q.pertanyaan)
    setDiagOpsi([...q.opsi])
    setDiagJawaban(q.jawaban)
    setDiagOrderNum(q.order_num)
  }

  function closeDiagModal() {
    setDiagEditId(null)
  }

  function updateDiagOpsi(idx: number, value: string) {
    setDiagOpsi((prev) => prev.map((o, i) => (i === idx ? value : o)))
  }

  async function saveDiagQuestion() {
    const pertanyaan = diagPertanyaan.trim()
    const opsi = diagOpsi.map((o) => o.trim())
    if (!pertanyaan || opsi.some((o) => !o)) return
    setDiagSaving(true)
    try {
      const payload = { pertanyaan, opsi, jawaban: diagJawaban, order_num: diagOrderNum }
      if (diagEditId === 'new') {
        await createDiagnosticQuestion(payload)
      } else if (diagEditId != null) {
        await updateDiagnosticQuestion(diagEditId, payload)
      }
      await queryClient.invalidateQueries({ queryKey: ['diagnostic-questions'] })
      showToast(diagEditId === 'new' ? 'Soal diagnostik ditambahkan' : 'Soal diagnostik disimpan')
      setDiagEditId(null)
    } catch {
      showToast('Gagal menyimpan soal diagnostik')
    } finally {
      setDiagSaving(false)
    }
  }

  async function confirmDeleteDiag() {
    if (diagDeleteId == null) return
    try {
      await deleteDiagnosticQuestion(diagDeleteId)
      await queryClient.invalidateQueries({ queryKey: ['diagnostic-questions'] })
      showToast('Soal diagnostik dihapus')
    } catch {
      showToast('Gagal menghapus soal diagnostik')
    } finally {
      setDiagDeleteId(null)
    }
  }

  // Mirrors legacy init(): use saved order only when it matches the current
  // module count, else fall back to sequential module order.
  const defaultOrder = useMemo(() => modules.map((m) => m.id), [modules])
  const order = orderOverride ?? (savedOrder && savedOrder.length === modules.length ? savedOrder : defaultOrder)

  function customFor(id: number): ModulCustom {
    return customsOverride[id] ?? fetchedCustoms[id] ?? {}
  }

  function statusFor(id: number): ModulStatus {
    return (customFor(id).status as ModulStatus) || 'aktif'
  }

  const modMap = useMemo(() => {
    const map: Record<number, (typeof modules)[number]> = {}
    modules.forEach((m) => {
      map[m.id] = m
    })
    return map
  }, [modules])

  const totalModul = order.length
  const totalAktif = order.filter((id) => statusFor(id) === 'aktif').length
  const totalTerkunci = order.filter((id) => statusFor(id) === 'terkunci').length

  async function persistOrder(next: number[]) {
    const previous = order // last known-good order, captured before the optimistic update below
    setOrderOverride(next)
    try {
      await saveModulOrder(next)
      await queryClient.invalidateQueries({ queryKey: ['manajemen', 'order'] })
      showToast('Urutan disimpan')
    } catch {
      // saveModulOrder can now partial-fail (Promise.allSettled) — don't leave
      // the optimistic full-success order on screen when it isn't what's
      // actually saved. Roll back to the last known-good order instead.
      setOrderOverride(previous)
      showToast('Gagal menyimpan urutan')
    }
  }

  function moveUp(id: number) {
    const idx = order.indexOf(id)
    if (idx <= 0) return
    const next = order.slice()
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    void persistOrder(next)
  }

  function moveDown(id: number) {
    const idx = order.indexOf(id)
    if (idx < 0 || idx >= order.length - 1) return
    const next = order.slice()
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    void persistOrder(next)
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleCheckAll(checked: boolean) {
    setSelectedIds(checked ? new Set(order) : new Set())
  }

  const allChecked = order.length > 0 && order.every((id) => selectedIds.has(id))
  const someChecked = order.some((id) => selectedIds.has(id))

  async function runBulkSetStatus(newStatus: 'aktif' | 'terkunci') {
    const ids = Array.from(selectedIds)
    const n = ids.length
    const failedIds: number[] = []
    for (const id of ids) {
      const previousCustom = customFor(id)
      const custom = { ...previousCustom, status: newStatus }
      setCustomsOverride((prev) => ({ ...prev, [id]: custom }))
      try {
        await saveModulCustom(id, custom)
      } catch {
        // Unlike the legacy console.warn-only behavior, actually roll back the
        // optimistic override for this module — saveModulCustom really failed,
        // so the UI shouldn't keep claiming the new status stuck.
        failedIds.push(id)
        setCustomsOverride((prev) => ({ ...prev, [id]: previousCustom }))
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['manajemen', 'customs'] })
    setBulkConfirm(null)
    setSelectedIds(new Set())
    const verb = newStatus === 'aktif' ? 'diaktifkan' : 'dikunci'
    const succeeded = n - failedIds.length
    if (failedIds.length === 0) {
      showToast(`Status diperbarui: ${n} modul ${verb}`)
    } else if (succeeded === 0) {
      showToast(`Gagal memperbarui status untuk semua ${n} modul`)
    } else {
      showToast(`Berhasil untuk ${succeeded} dari ${n} modul — gagal: modul ${failedIds.join(', ')}`)
    }
  }

  function openEditModal(id: number) {
    const m = modMap[id]
    const custom = customFor(id)
    setCreatingNew(false)
    setEditId(id)
    setFormJudul(custom.judul || m?.title || '')
    setFormDeskripsi(custom.deskripsi || m?.description || '')
    setFormStatus((custom.status as ModulStatus) || 'aktif')
    setFormDurasi(custom.durasi || '')
    setFormCatatan(custom.catatan || '')
    setPdfFile(null)
    setPdfError('')
  }

  function openCreateModal() {
    setEditId(null)
    setCreatingNew(true)
    setFormJudul('')
    setFormDeskripsi('')
    setFormStatus('aktif')
    setFormDurasi('')
    setFormCatatan('')
    setPdfFile(null)
    setPdfError('')
  }

  function closeEditModal() {
    setEditId(null)
    setCreatingNew(false)
  }

  async function handleUploadPdf() {
    if (editId == null || !pdfFile) return
    if (pdfFile.type !== 'application/pdf') {
      setPdfError('File harus berformat PDF.')
      return
    }
    setPdfError('')
    setUploadingPdf(true)
    try {
      await uploadModulPdf(editId, pdfFile)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setPdfFile(null)
      showToast('PDF modul berhasil diunggah')
    } catch {
      setPdfError('Gagal mengunggah PDF. Coba lagi.')
    } finally {
      setUploadingPdf(false)
    }
  }

  async function saveEdit() {
    const judul = formJudul.trim()
    if (!judul) return

    if (creatingNew) {
      if (!isSupabaseConfigured) {
        showToast('Tambah modul butuh koneksi Supabase — belum tersedia di mode demo.')
        return
      }
      setSaving(true)
      try {
        const nextOrderNum = Math.max(0, ...modules.map((m) => m.order_num)) + 1
        await createModul({
          judul,
          deskripsi: formDeskripsi.trim(),
          orderNum: nextOrderNum,
          status: formStatus,
          durasi: formDurasi.trim(),
          catatan: formCatatan.trim(),
        })
        await queryClient.invalidateQueries({ queryKey: ['modules'] })
        setEditId(null)
        setCreatingNew(false)
        showToast('Modul baru ditambahkan')
      } catch {
        showToast('Gagal menambahkan modul')
      } finally {
        setSaving(false)
      }
      return
    }

    if (editId == null) return
    setSaving(true)
    try {
      const updated: ModulCustom = {
        ...customFor(editId),
        judul,
        deskripsi: formDeskripsi.trim(),
        status: formStatus,
        durasi: formDurasi.trim(),
        catatan: formCatatan.trim(),
        updatedAt: new Date().toISOString(),
      }
      await saveModulCustom(editId, updated)
      setCustomsOverride((prev) => ({ ...prev, [editId]: updated }))
      await queryClient.invalidateQueries({ queryKey: ['manajemen', 'customs'] })
      setEditId(null)
      showToast('Modul disimpan')
    } catch {
      showToast('Gagal menyimpan modul')
    } finally {
      setSaving(false)
    }
  }

  function previewModule(id: number) {
    window.open(`/modul/${id}`, '_blank')
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold text-brown">Kelola Modul</h1>
          <p className="text-sm text-brown-3 mt-1">
            Manajemen {totalModul} modul pembelajaran — edit metadata, atur status &amp; urutan
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          <StatCard bar="var(--sage)" val={String(totalModul)} label="Total modul" />
          <StatCard bar="var(--terra)" val={String(totalAktif)} label="Modul aktif/published" />
          <StatCard bar="#E8A030" val={String(totalTerkunci)} label="Modul terkunci" />
        </div>

        <div className="bg-ivory rounded-2xl border overflow-hidden mb-4" style={BORDER}>
          <div className="flex items-center justify-between px-4 py-3.5 border-b flex-wrap gap-2" style={BORDER}>
            <span className="text-sm font-semibold text-brown">Daftar Modul</span>
            <button
              onClick={openCreateModal}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: 'var(--terra)' }}
            >
              + Tambah Modul
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b flex-wrap"
              style={{ ...BORDER, background: 'rgba(212,163,115,.06)' }}
            >
              <span className="text-sm font-semibold text-terra">{selectedIds.size} dipilih</span>
              <button
                onClick={() => setBulkConfirm('aktif')}
                className="h-8 px-3 rounded-lg border text-xs font-medium text-brown-2"
                style={BORDER}
              >
                Aktifkan semua terpilih
              </button>
              <button
                onClick={() => setBulkConfirm('terkunci')}
                className="h-8 px-3 rounded-lg border text-xs font-medium text-brown-2"
                style={BORDER}
              >
                Kunci semua terpilih
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="px-3 py-2.5 w-9">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = !allChecked && someChecked
                      }}
                      onChange={(e) => toggleCheckAll(e.target.checked)}
                      aria-label="Pilih semua"
                      className="w-4 h-4 accent-terra cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-10">No</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Judul</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 hidden md:table-cell max-w-[220px]">
                    Deskripsi
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-24">Status</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-20">Urutan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-32">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {order.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada modul.
                    </td>
                  </tr>
                ) : (
                  order.map((id, idx) => {
                    const m = modMap[id]
                    if (!m) return null
                    const custom = customFor(id)
                    const judul = custom.judul || m.title || ''
                    const desc = custom.deskripsi || m.description || ''
                    const status = statusFor(id)
                    const badge = STATUS_BADGE[status] || STATUS_BADGE.aktif
                    const descTrunc = desc.length > 60 ? desc.slice(0, 60) + '…' : desc
                    const isFirst = idx === 0
                    const isLast = idx === order.length - 1
                    const checked = selectedIds.has(id)

                    return (
                      <tr key={id} className="border-t" style={BORDER}>
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleRow(id, e.target.checked)}
                            className="w-4 h-4 accent-terra cursor-pointer"
                            aria-label={`Pilih ${judul}`}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-brown">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-brown min-w-[160px]">{judul}</td>
                        <td className="px-3 py-2.5 text-xs text-brown-3 hidden md:table-cell max-w-[220px] truncate">
                          {descTrunc}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {STATUS_LABEL[status] || 'Aktif'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button
                              onClick={() => moveUp(id)}
                              disabled={isFirst}
                              title="Geser ke atas"
                              aria-label={`Geser ${judul} ke atas`}
                              className="w-11 h-11 rounded-md border text-brown-3 flex items-center justify-center disabled:opacity-30"
                              style={BORDER}
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveDown(id)}
                              disabled={isLast}
                              title="Geser ke bawah"
                              aria-label={`Geser ${judul} ke bawah`}
                              className="w-11 h-11 rounded-md border text-brown-3 flex items-center justify-center disabled:opacity-30"
                              style={BORDER}
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col sm:flex-row gap-1.5">
                            <button
                              onClick={() => openEditModal(id)}
                              className="h-11 px-3 rounded-md text-xs font-semibold whitespace-nowrap"
                              style={{ background: 'var(--brown)', color: 'var(--terra)' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => previewModule(id)}
                              className="h-11 px-3 rounded-md border text-xs font-medium text-brown-2 whitespace-nowrap"
                              style={BORDER}
                            >
                              Preview
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

        {/* Diagnostic placement test question bank — dosen-only CRUD, see
            docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md's
            "Admin edit (dosen)" section. Same table/modal/confirm-modal pattern
            as the module-management block above — no new UI pattern invented. */}
        <div className="bg-ivory rounded-2xl border overflow-hidden mb-4" style={BORDER}>
          <div className="flex items-center justify-between px-4 py-3.5 border-b flex-wrap gap-2" style={BORDER}>
            <span className="text-sm font-semibold text-brown">Soal Tes Diagnostik</span>
            <button
              onClick={openDiagAddModal}
              className="h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{ background: 'var(--brown)', color: 'var(--terra)' }}
            >
              + Tambah Soal
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-14">Urutan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Pertanyaan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-28">Jawaban Benar</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-28">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedDiagQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada soal tes diagnostik.
                    </td>
                  </tr>
                ) : (
                  sortedDiagQuestions.map((q) => {
                    const pertanyaanTrunc = q.pertanyaan.length > 70 ? q.pertanyaan.slice(0, 70) + '…' : q.pertanyaan
                    return (
                      <tr key={q.id} className="border-t" style={BORDER}>
                        <td className="px-3 py-2.5 font-semibold text-brown">{q.order_num}</td>
                        <td className="px-3 py-2.5 text-brown min-w-[200px]">{pertanyaanTrunc}</td>
                        <td className="px-3 py-2.5 text-brown-2">Opsi {q.jawaban + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openDiagEditModal(q)}
                              aria-label={`Edit soal urutan ${q.order_num}`}
                              className="w-11 h-11 rounded-md border text-brown-2 flex items-center justify-center flex-shrink-0"
                              style={BORDER}
                            >
                              <IconEdit size={15} />
                            </button>
                            <button
                              onClick={() => setDiagDeleteId(q.id)}
                              aria-label={`Hapus soal urutan ${q.order_num}`}
                              className="w-11 h-11 rounded-md border border-red/20 bg-red/10 text-red flex items-center justify-center flex-shrink-0"
                            >
                              <IconTrash size={15} />
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
      </div>

      {/* Edit/create modal — matches legacy #editModal fields exactly */}
      {(editId != null || creatingNew) && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(44,36,32,.55)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal()
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-[520px] w-full my-8" style={{ boxShadow: '0 16px 48px rgba(44,36,32,.25)', animation: 'slideUpModal 0.22s ease' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-brown">
                {creatingNew ? 'Tambah Modul Baru' : `Edit — ${modMap[editId!]?.title || ''}`}
              </h3>
              <button onClick={closeEditModal} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-3">
                ×
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Judul Modul <span className="font-normal text-brown-3">maks. 100 karakter</span>
              <input
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value.slice(0, 100))}
                maxLength={100}
                className="h-10 rounded-lg border px-3 text-base text-brown"
                style={BORDER}
              />
              <span className="text-[11px] text-brown-3 text-right">{formJudul.length} / 100</span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Deskripsi Singkat <span className="font-normal text-brown-3">maks. 200 karakter</span>
              <textarea
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={3}
                className="rounded-lg border px-3 py-2 text-sm text-brown resize-y min-h-[70px]"
                style={BORDER}
              />
              <span className="text-[11px] text-brown-3 text-right">{formDeskripsi.length} / 200</span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Status
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ModulStatus)}
                className="h-10 rounded-lg border px-3 text-sm text-brown cursor-pointer"
                style={BORDER}
              >
                <option value="aktif">Aktif — mahasiswa bisa akses</option>
                <option value="draf">Draf — belum dipublish</option>
                <option value="terkunci">Terkunci — dikunci manual dosen</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Estimasi Durasi
              <input
                value={formDurasi}
                onChange={(e) => setFormDurasi(e.target.value.slice(0, 50))}
                maxLength={50}
                placeholder="Contoh: 2 × 50 menit"
                className="h-10 rounded-lg border px-3 text-sm text-brown"
                style={BORDER}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
              Catatan Dosen{' '}
              <span className="font-normal text-brown-3">privat — tidak ditampilkan ke mahasiswa, maks. 500 karakter</span>
              <textarea
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={4}
                className="rounded-lg border px-3 py-2 text-sm text-brown resize-y min-h-[90px]"
                style={BORDER}
              />
              <span className="text-[11px] text-brown-3 text-right">{formCatatan.length} / 500</span>
            </label>

            <div className="flex flex-col gap-1.5 text-xs font-semibold text-brown-2 mb-4">
              <span>File PDF Modul</span>
              <div className="flex items-center gap-2 flex-wrap">
                <IconDocument size={16} className="text-brown-3 flex-shrink-0" />
                <span className="text-[11px] font-normal text-brown-3 truncate max-w-[220px]">
                  {editId != null && modMap[editId]?.pdf_path
                    ? modMap[editId].pdf_path?.split('/').pop()
                    : 'Belum ada PDF terpasang'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={creatingNew}
                  onChange={(e) => { setPdfFile(e.target.files?.[0] ?? null); setPdfError('') }}
                  className="text-xs text-brown-2 flex-1 min-w-[160px] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleUploadPdf}
                  disabled={creatingNew || !pdfFile || uploadingPdf}
                  className="h-9 px-3.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex-shrink-0"
                  style={{ background: 'var(--terra)', color: 'white' }}
                >
                  {uploadingPdf ? 'Mengunggah…' : 'Unggah PDF'}
                </button>
              </div>
              {creatingNew && (
                <span className="text-[11px] text-brown-3">Simpan modul dulu sebelum unggah PDF.</span>
              )}
              {pdfError && <span className="text-[11px] text-red">{pdfError}</span>}
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={closeEditModal} className="h-[38px] px-5 rounded-lg border text-sm text-brown-2" style={BORDER}>
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !formJudul.trim()}
                className="h-[38px] px-5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brown)', color: 'var(--terra)' }}
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action confirmation modal — per CLAUDE.md, bulk actions must be
          gated behind a confirmation modal (inline component, not window.confirm()),
          mirroring LogoutModal.tsx / Profil.tsx's reset-demo-data modal pattern. */}
      {bulkConfirm && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setBulkConfirm(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">
              {bulkConfirm === 'aktif' ? 'Aktifkan modul terpilih?' : 'Kunci modul terpilih?'}
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {selectedIds.size} modul akan{' '}
              {bulkConfirm === 'aktif' ? 'diaktifkan dan bisa diakses mahasiswa' : 'dikunci dan tidak bisa diakses mahasiswa'}.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setBulkConfirm(null)} className="flex-1 h-[38px] rounded-lg border text-sm text-brown-2" style={BORDER}>
                Batal
              </button>
              <button
                onClick={() => void runBulkSetStatus(bulkConfirm)}
                className="flex-1 h-[38px] rounded-lg text-white text-sm font-semibold"
                style={{ background: bulkConfirm === 'aktif' ? 'var(--sage-d)' : 'var(--red)' }}
              >
                {bulkConfirm === 'aktif' ? 'Ya, Aktifkan' : 'Ya, Kunci'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic question add/edit modal — reuses the exact fadeInBg/slideUpModal
          modal styling as the module edit modal above. */}
      {diagEditId != null && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(44,36,32,.55)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDiagModal()
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-[520px] w-full my-8" style={{ boxShadow: '0 16px 48px rgba(44,36,32,.25)', animation: 'slideUpModal 0.22s ease' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-brown">
                {diagEditId === 'new' ? 'Tambah Soal Diagnostik' : `Edit Soal — Urutan ${diagOrderNum}`}
              </h3>
              <button onClick={closeDiagModal} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-3">
                ×
              </button>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Pertanyaan
              <textarea
                value={diagPertanyaan}
                onChange={(e) => setDiagPertanyaan(e.target.value)}
                rows={3}
                className="rounded-lg border px-3 py-2 text-sm text-brown resize-y min-h-[70px]"
                style={BORDER}
              />
            </label>

            <div className="flex flex-col gap-2 mb-3">
              <span className="text-xs font-semibold text-brown-2">
                4 Opsi Jawaban <span className="font-normal text-brown-3">— pilih radio di sebelah opsi yang benar</span>
              </span>
              {diagOpsi.map((opsi, idx) => (
                <label key={idx} className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="diagJawaban"
                    checked={diagJawaban === idx}
                    onChange={() => setDiagJawaban(idx)}
                    aria-label={`Tandai opsi ${idx + 1} sebagai jawaban benar`}
                    className="w-4 h-4 accent-terra cursor-pointer flex-shrink-0"
                  />
                  <input
                    value={opsi}
                    onChange={(e) => updateDiagOpsi(idx, e.target.value)}
                    placeholder={`Opsi ${idx + 1}`}
                    className="h-10 flex-1 min-w-0 rounded-lg border px-3 text-sm text-brown"
                    style={BORDER}
                  />
                </label>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4 max-w-[140px]">
              Urutan (order_num)
              <input
                type="number"
                min={1}
                value={diagOrderNum}
                onChange={(e) => setDiagOrderNum(parseInt(e.target.value, 10) || 1)}
                className="h-10 rounded-lg border px-3 text-sm text-brown"
                style={BORDER}
              />
            </label>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={closeDiagModal} className="h-[38px] px-5 rounded-lg border text-sm text-brown-2" style={BORDER}>
                Batal
              </button>
              <button
                onClick={() => void saveDiagQuestion()}
                disabled={diagSaving || !diagPertanyaan.trim() || diagOpsi.some((o) => !o.trim())}
                className="h-[38px] px-5 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brown)', color: 'var(--terra)' }}
              >
                {diagSaving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic question delete confirmation modal — destructive action per
          CLAUDE.md, mirrors bulkConfirm above / Ngain.tsx's per-row delete confirm. */}
      {diagDeleteId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDiagDeleteId(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus soal ini?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Soal tes diagnostik ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDiagDeleteId(null)} className="flex-1 h-[38px] rounded-lg border text-sm text-brown-2" style={BORDER}>
                Batal
              </button>
              <button
                onClick={() => void confirmDeleteDiag()}
                className="flex-1 h-[38px] rounded-lg text-white text-sm font-semibold"
                style={{ background: 'var(--red)' }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--terra)', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

function StatCard({ bar, val, label }: { bar: string; val: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-ivory px-4 py-3.5" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <div className="text-xl font-bold text-brown leading-none">{val}</div>
      <div className="text-[11px] text-brown-3 mt-1">{label}</div>
    </div>
  )
}

export default Manajemen
