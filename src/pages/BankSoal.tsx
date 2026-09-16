import { useMemo, useState, type DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { fetchBankSoal, createKuisSoal, updateKuisSoal, deleteKuisSoal, type SoalKind } from '../lib/kuisSoal'
import {
  fetchDiagnosticQuestions,
  createDiagnosticQuestion,
  updateDiagnosticQuestion,
  deleteDiagnosticQuestion,
} from '../lib/diagnostic'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { PillGroup } from '../components/PillGroup'
import { IconEdit, IconTrash, IconGrip } from '../components/icons'

// Bank soal terpadu — dosen mengelola 5 jenis soal (pre/formatif/post/vark
// via quiz_questions, diagnostik via diagnostic_questions) dari satu layar.
// Spec: docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §6, §9 WP3.
// Pola tabel/modal/drag-reorder ditiru dari Manajemen.tsx:119-219, 886-995
// (Soal Diagnostik/Soal Kuis blocks) — bukan pola baru.

type FilterKind = SoalKind | 'diagnostik'

const KIND_ORDER: FilterKind[] = ['pre', 'formatif', 'post', 'diagnostik', 'vark']
const KIND_LABELS: Record<FilterKind, string> = {
  pre: 'Pre-test',
  formatif: 'Formatif',
  post: 'Post-test',
  diagnostik: 'Diagnostik',
  vark: 'VARK',
}
const LETTERS = ['A', 'B', 'C', 'D'] as const
const VARK_LETTER_LABELS = ['A=V', 'B=A', 'C=R', 'D=K'] as const // opsi index 0..3 → V,A,R,K, sama seperti lib/vark.ts computeVarkDominant

const BORDER = { borderColor: 'var(--border)' } as const

// Baris tabel dinormalisasi dari dua sumber berbeda (quiz_questions vs
// diagnostic_questions) supaya tabel/modal/drag di bawah tidak perlu tahu
// jenis tabel aslinya.
interface Row {
  id: number
  question: string
  options: string[]
  answer_idx: number | null
  order_num: number
  module_id: number | null
}

export function BankSoal() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: modules = [] } = useModules()

  const jenis = (searchParams.get('jenis') as FilterKind | null) ?? 'pre'
  const modulParam = searchParams.get('modul')
  const modulId = modulParam ? parseInt(modulParam, 10) : (modules[0]?.id ?? null)

  const bankQuery = useQuery({
    queryKey: ['bank-soal', jenis, jenis === 'formatif' ? modulId : null],
    queryFn: () => fetchBankSoal(jenis as SoalKind, jenis === 'formatif' ? (modulId ?? undefined) : undefined),
    enabled: jenis !== 'diagnostik' && (jenis !== 'formatif' || modulId != null),
  })
  const diagQuery = useQuery({
    queryKey: ['diagnostic-questions'],
    queryFn: fetchDiagnosticQuestions,
    enabled: jenis === 'diagnostik',
  })

  const rows: Row[] = useMemo(() => {
    const list =
      jenis === 'diagnostik'
        ? (diagQuery.data ?? []).map((q) => ({
            id: q.id,
            question: q.pertanyaan,
            options: q.opsi,
            answer_idx: q.jawaban,
            order_num: q.order_num,
            module_id: null,
          }))
        : (bankQuery.data ?? []).map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            answer_idx: q.answer_idx,
            order_num: q.order_num,
            module_id: q.module_id,
          }))
    return list.sort((a, b) => a.order_num - b.order_num)
  }, [jenis, diagQuery.data, bankQuery.data])

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function invalidate() {
    if (jenis === 'diagnostik') {
      await queryClient.invalidateQueries({ queryKey: ['diagnostic-questions'] })
    } else {
      await queryClient.invalidateQueries({ queryKey: ['bank-soal', jenis, jenis === 'formatif' ? modulId : null] })
    }
  }

  function selectJenis(k: FilterKind) {
    if (k === 'formatif') {
      const modId = modulId ?? modules[0]?.id
      setSearchParams(modId != null ? { jenis: k, modul: String(modId) } : { jenis: k })
    } else {
      setSearchParams({ jenis: k })
    }
  }

  function selectModul(id: number) {
    setSearchParams({ jenis: 'formatif', modul: String(id) })
  }

  // ── Modal Tambah/Ubah ──
  const [modalOpen, setModalOpen] = useState<'new' | number | null>(null)
  const [pertanyaan, setPertanyaan] = useState('')
  const [opsi, setOpsi] = useState<string[]>(['', '', '', ''])
  const [jawaban, setJawaban] = useState(0)
  const [modalModuleId, setModalModuleId] = useState<number | null>(null)
  const [nextOrderNum, setNextOrderNum] = useState(1)
  const [saving, setSaving] = useState(false)

  function openAddModal() {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.order_num), 0)
    setModalOpen('new')
    setPertanyaan('')
    setOpsi(['', '', '', ''])
    setJawaban(0)
    setModalModuleId(modulId ?? modules[0]?.id ?? null)
    setNextOrderNum(maxOrder + 1)
  }

  function openEditModal(r: Row) {
    setModalOpen(r.id)
    setPertanyaan(r.question)
    setOpsi(r.options.length === 4 ? [...r.options] : [...r.options, '', '', '', ''].slice(0, 4))
    setJawaban(r.answer_idx ?? 0)
    setModalModuleId(r.module_id ?? modulId ?? modules[0]?.id ?? null)
  }

  function closeModal() {
    setModalOpen(null)
  }

  function updateOpsi(idx: number, value: string) {
    setOpsi((prev) => prev.map((o, i) => (i === idx ? value : o)))
  }

  const isVark = jenis === 'vark'
  const isFormatif = jenis === 'formatif'

  async function saveQuestion() {
    const question = pertanyaan.trim()
    const options = opsi.map((o) => o.trim())
    if (!question || options.some((o) => !o)) return
    if (isFormatif && modalModuleId == null) return
    setSaving(true)
    try {
      if (jenis === 'diagnostik') {
        if (modalOpen === 'new') {
          await createDiagnosticQuestion({ pertanyaan: question, opsi: options, jawaban, order_num: nextOrderNum })
        } else if (modalOpen != null) {
          await updateDiagnosticQuestion(modalOpen, { pertanyaan: question, opsi: options, jawaban })
        }
      } else {
        const answer_idx = isVark ? null : jawaban
        const module_id = isFormatif ? modalModuleId : null
        if (modalOpen === 'new') {
          await createKuisSoal({ kind: jenis, module_id, question, options, answer_idx, explanation: null, order_num: nextOrderNum })
        } else if (modalOpen != null) {
          await updateKuisSoal(modalOpen, { kind: jenis, module_id, question, options, answer_idx })
        }
      }
      await invalidate()
      showToast(modalOpen === 'new' ? 'Soal ditambahkan' : 'Soal disimpan')
      setModalOpen(null)
    } catch {
      showToast('Gagal menyimpan soal')
    } finally {
      setSaving(false)
    }
  }

  // ── Modal hapus ──
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const deleteRow = rows.find((r) => r.id === deleteId) ?? null

  async function confirmDelete() {
    if (deleteId == null) return
    try {
      if (jenis === 'diagnostik') {
        await deleteDiagnosticQuestion(deleteId)
      } else {
        await deleteKuisSoal(deleteId, isFormatif ? modulId : null, jenis)
      }
      await invalidate()
      showToast('Soal dihapus')
    } catch {
      showToast('Gagal menghapus soal')
    } finally {
      setDeleteId(null)
    }
  }

  // ── Seret urutan — pola dua fase persistDiagOrder di Manajemen.tsx:174-187 ──
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  async function persistOrder(next: Row[]) {
    const changed = next.map((r, i) => ({ r, orderNum: i + 1 })).filter(({ r, orderNum }) => r.order_num !== orderNum)
    if (!changed.length) return
    try {
      if (jenis === 'diagnostik') {
        await Promise.all(changed.map(({ r, orderNum }) => updateDiagnosticQuestion(r.id, { order_num: orderNum })))
      } else {
        await Promise.all(changed.map(({ r, orderNum }) => updateKuisSoal(r.id, { order_num: orderNum })))
      }
      showToast('Urutan soal disimpan')
    } catch {
      showToast('Gagal menyimpan urutan soal')
    } finally {
      await invalidate()
    }
  }

  function handleDragStart(id: number) {
    setDragId(id)
  }
  function handleDragOver(e: DragEvent, id: number) {
    e.preventDefault()
    if (id !== dragOverId) setDragOverId(id)
  }
  function handleDrop(targetId: number) {
    if (dragId != null && dragId !== targetId) {
      const next = rows.slice()
      const from = next.findIndex((r) => r.id === dragId)
      const to = next.findIndex((r) => r.id === targetId)
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      void persistOrder(next)
    }
    setDragId(null)
    setDragOverId(null)
  }
  function handleDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <Link to="/asesmen" className="text-brown-3 text-sm mb-4 inline-block inline-flex items-center min-h-11">
          ← Hasil asesmen
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
          <h1 className="font-display text-2xl font-bold text-brown">Bank soal</h1>
          <button onClick={openAddModal} className="btn btn-primary">
            + Tambah soal
          </button>
        </div>

        {/* Filter jenis */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <PillGroup
            options={KIND_ORDER.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
            value={jenis}
            onChange={(v) => selectJenis(v as FilterKind)}
            ariaLabel="Filter jenis soal"
          />
          {jenis === 'formatif' && (
            <Select
              value={String(modulId ?? '')}
              onChange={(v) => selectModul(parseInt(v, 10))}
              aria-label="Pilih topik"
              size="sm"
              options={modules.map((m) => ({ value: String(m.id), label: m.title }))}
            />
          )}
        </div>

        <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="w-11" aria-label="Urutan (seret)" />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-10">No</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Pertanyaan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-40">
                    {isVark ? 'Gaya belajar per opsi' : 'Kunci'}
                  </th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-3 w-36">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada soal jenis ini. Tambah soal pertama.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const trunc = r.question.length > 46 ? r.question.slice(0, 46) + '…' : r.question
                    const isDragging = dragId === r.id
                    const isDropTarget = dragOverId === r.id && dragId !== r.id
                    return (
                      <tr
                        key={r.id}
                        draggable
                        onDragStart={() => handleDragStart(r.id)}
                        onDragOver={(e) => handleDragOver(e, r.id)}
                        onDrop={() => handleDrop(r.id)}
                        onDragEnd={handleDragEnd}
                        className="row-divider transition-colors"
                        style={{ opacity: isDragging ? 0.4 : 1, background: isDropTarget ? 'var(--accent-soft)' : undefined }}
                      >
                        <td className="px-3 py-2.5">
                          <div
                            className="w-11 h-11 flex items-center justify-center text-brown-3 cursor-grab active:cursor-grabbing"
                            title="Seret untuk mengurutkan"
                            aria-label={`Seret untuk mengurutkan soal urutan ${r.order_num}`}
                          >
                            <IconGrip size={16} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-brown">{r.order_num}</td>
                        <td className="px-3 py-2.5 text-brown min-w-[200px]">{trunc}</td>
                        <td className="px-3 py-2.5">
                          {isVark ? (
                            <div className="flex gap-1 flex-wrap">
                              {VARK_LETTER_LABELS.map((label) => (
                                <span
                                  key={label}
                                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{ background: 'var(--bg3)', color: 'var(--brown2)' }}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span
                              className="w-7 h-7 inline-flex items-center justify-center rounded-full text-xs font-bold"
                              style={{ background: 'var(--accent-soft)', color: 'var(--terra-d)' }}
                            >
                              {LETTERS[r.answer_idx ?? 0]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(r)}
                              aria-label={`Ubah soal urutan ${r.order_num}`}
                              title="Ubah soal"
                              className="btn btn-secondary whitespace-nowrap"
                            >
                              <IconEdit size={15} /> <span className="hidden sm:inline">Ubah soal</span>
                            </button>
                            <button
                              onClick={() => setDeleteId(r.id)}
                              aria-label={`Hapus soal urutan ${r.order_num}`}
                              title="Hapus soal"
                              className="btn btn-danger btn-icon flex-shrink-0"
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

      {/* Modal Tambah/Ubah */}
      {modalOpen != null && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[520px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-brown">
                {modalOpen === 'new' ? `Tambah Soal: ${KIND_LABELS[jenis]}` : `Ubah Soal: ${KIND_LABELS[jenis]}`}
              </h3>
              <button onClick={closeModal} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-3">
                ×
              </button>
            </div>

            {isFormatif && (
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
                Topik
                <Select
                  value={String(modalModuleId ?? '')}
                  onChange={(v) => setModalModuleId(parseInt(v, 10))}
                  aria-label="Pilih topik"
                  options={modules.map((m) => ({ value: String(m.id), label: m.title }))}
                />
              </label>
            )}

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Pertanyaan
              <textarea
                value={pertanyaan}
                onChange={(e) => setPertanyaan(e.target.value)}
                rows={3}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y min-h-[70px]"
                style={BORDER}
              />
            </label>

            <div className="flex flex-col gap-2 mb-4">
              <span className="text-xs font-semibold text-brown-2">
                4 Opsi Jawaban
                {!isVark && <span className="font-normal text-brown-3">, pilih radio di sebelah opsi yang benar</span>}
              </span>
              {opsi.map((o, idx) => (
                <label key={idx} className="flex items-center gap-2.5">
                  {!isVark && (
                    <input
                      type="radio"
                      name="jawabanBenar"
                      checked={jawaban === idx}
                      onChange={() => setJawaban(idx)}
                      aria-label={`Tandai opsi ${idx + 1} sebagai jawaban benar`}
                      className="w-4 h-4 accent-terra cursor-pointer flex-shrink-0"
                    />
                  )}
                  <span className="w-6 text-xs font-bold text-brown-3 flex-shrink-0">
                    {LETTERS[idx]}
                    {isVark && ` (${VARK_LETTER_LABELS[idx].split('=')[1]})`}
                  </span>
                  <input
                    value={o}
                    onChange={(e) => updateOpsi(idx, e.target.value)}
                    placeholder={`Opsi ${idx + 1}`}
                    className="h-10 flex-1 min-w-0 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                    style={BORDER}
                  />
                </label>
              ))}
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={closeModal} className="btn btn-secondary">
                Batal
              </button>
              <button
                onClick={() => void saveQuestion()}
                disabled={saving || !pertanyaan.trim() || opsi.some((o) => !o.trim()) || (isFormatif && modalModuleId == null)}
                className="btn btn-primary min-w-[7.5rem]"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus (WAJIB, CLAUDE.md "Modal Wajib") */}
      {deleteId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[384px] max-h-[90vh] overflow-y-auto text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus soal nomor {deleteRow?.order_num ?? ''}?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">Soal ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} className="btn btn-danger flex-1">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[800] px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 8px 24px color-mix(in srgb, var(--shadow-color) 25%, transparent)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default BankSoal
