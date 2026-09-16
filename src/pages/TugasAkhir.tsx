import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useKelasByDosen } from '../hooks/useKelas'
import { labelKelas, tahunUnik } from '../lib/kelas'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  fetchProjectsDosen,
  createProject,
  updateProject,
  deleteProject,
  fetchSubmissionsDosen,
  gradeSubmission,
  signedFileUrl,
  hitungTotal,
  RUBRIK_BAWAAN,
  type FinalProject,
  type RubrikKriteria,
  type SubmissionDosenRow,
} from '../lib/tugasAkhir'
import { Layout } from '../components/Layout'
import { IconEdit, IconTrash, IconLock, IconLink, IconDocument } from '../components/icons'

// Tugas akhir sisi dosen (antrean #57 opsi A). Pola daftar + modal ditiru
// dari TesKhusus.tsx (DosenTesKhusus): kartu bukan tabel untuk daftar brief
// karena tiap brief punya beberapa info ringkas (tenggat, status, jumlah
// kriteria), lalu tabel kiriman muncul di bawah saat satu brief dipilih
// lewat ?brief=<id>.
const BORDER = { borderColor: 'var(--border)' } as const

function formatTenggat(deadline: string | null): string {
  if (!deadline) return 'Tanpa tenggat'
  return new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function TugasAkhir() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: kelasList = [] } = useKelasByDosen(user?.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const briefId = searchParams.get('brief')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['final-projects'],
    queryFn: fetchProjectsDosen,
  })
  const selectedProject = projects.find((p) => p.id === briefId) ?? null

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function invalidateProjects() {
    await queryClient.invalidateQueries({ queryKey: ['final-projects'] })
  }

  function namaKelas(id: string | null): string {
    if (!id) return '—'
    const k = kelasList.find((k) => k.id === id)
    return k ? labelKelas(k, kelasList) : '—'
  }

  // == Modal buat/ubah brief ==
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FinalProject | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [semuaKelas, setSemuaKelas] = useState(true)
  const [classIds, setClassIds] = useState<string[]>([])
  const [rubric, setRubric] = useState<RubrikKriteria[]>(RUBRIK_BAWAAN)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setTitle('')
    setDescription('')
    setDeadline('')
    setSemuaKelas(true)
    setClassIds([])
    setRubric(RUBRIK_BAWAAN.map((r) => ({ ...r })))
    setModalOpen(true)
  }

  function openEdit(p: FinalProject) {
    setEditing(p)
    setTitle(p.title)
    setDescription(p.description)
    setDeadline(p.deadline ? p.deadline.slice(0, 16) : '')
    setSemuaKelas(p.class_ids.length === 0)
    setClassIds(p.class_ids)
    setRubric(p.rubric.length ? p.rubric.map((r) => ({ ...r })) : RUBRIK_BAWAAN.map((r) => ({ ...r })))
    setModalOpen(true)
  }

  function toggleKelas(id: string) {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))
  }

  function ubahRubrik(i: number, patch: Partial<RubrikKriteria>) {
    setRubric((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function tambahKriteria() {
    setRubric((prev) => [...prev, { nama: '', bobot: 10 }])
  }
  function hapusKriteria(i: number) {
    setRubric((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  async function submitBrief() {
    if (!user?.id || !title.trim() || rubric.length === 0) return
    setSaving(true)
    try {
      const input = {
        title: title.trim(),
        description: description.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        rubric,
        classIds: semuaKelas ? [] : classIds,
      }
      if (editing) await updateProject(editing.id, input)
      else await createProject(input, user.id)
      await invalidateProjects()
      showToast(editing ? 'Brief disimpan' : 'Brief dibuat')
      setModalOpen(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan brief')
    } finally {
      setSaving(false)
    }
  }

  async function toggleBuka(p: FinalProject) {
    try {
      await updateProject(p.id, { isOpen: !p.is_open })
      await invalidateProjects()
      showToast(p.is_open ? 'Brief ditutup' : 'Brief dibuka lagi')
    } catch {
      showToast('Gagal mengubah status brief')
    }
  }

  // == Hapus brief ==
  const [deleteTarget, setDeleteTarget] = useState<FinalProject | null>(null)
  const [deleting, setDeleting] = useState(false)
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProject(deleteTarget.id)
      await invalidateProjects()
      if (briefId === deleteTarget.id) setSearchParams({})
      showToast('Brief dihapus')
      setDeleteTarget(null)
    } catch {
      showToast('Gagal menghapus brief')
    } finally {
      setDeleting(false)
    }
  }

  // == Panel kiriman untuk brief terpilih ==
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ['final-submissions', briefId],
    queryFn: () => fetchSubmissionsDosen(briefId as string),
    enabled: briefId != null,
  })

  async function invalidateSubmissions() {
    await queryClient.invalidateQueries({ queryKey: ['final-submissions', briefId] })
  }

  async function bukaBerkas(path: string) {
    try {
      const url = await signedFileUrl(path)
      window.open(url, '_blank')
    } catch {
      showToast('Gagal membuka berkas')
    }
  }

  // == Modal nilai ==
  const [gradingSub, setGradingSub] = useState<SubmissionDosenRow | null>(null)
  const [scores, setScores] = useState<Array<number | ''>>([])
  const [feedback, setFeedback] = useState('')
  const [gradingSaving, setGradingSaving] = useState(false)

  function openGrade(s: SubmissionDosenRow) {
    if (!selectedProject) return
    setGradingSub(s)
    setScores(selectedProject.rubric.map((_, i) => s.scores?.[i] ?? ''))
    setFeedback(s.feedback ?? '')
  }

  const totalPreview =
    selectedProject && gradingSub ? hitungTotal(selectedProject.rubric, scores.map((v) => (v === '' ? null : v))) : null

  async function submitGrade() {
    if (!gradingSub || !selectedProject) return
    setGradingSaving(true)
    try {
      await gradeSubmission(
        gradingSub.id,
        selectedProject.rubric,
        scores.map((v) => Number(v)),
        feedback,
      )
      await invalidateSubmissions()
      showToast('Nilai tersimpan')
      setGradingSub(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan nilai')
    } finally {
      setGradingSaving(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <Link to="/asesmen" className="text-brown-3 text-sm mb-4 inline-block inline-flex items-center min-h-11">
          ← Hasil asesmen
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h1 className="font-display text-2xl font-bold text-brown">Tugas akhir</h1>
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            + Buat brief
          </button>
        </div>
        <p className="text-brown-3 text-sm mb-5">Brief proyek untuk mahasiswa dan penilaian rubrik.</p>

        {!isSupabaseConfigured ? (
          <div className="bg-ivory rounded-2xl border p-5 text-sm text-brown-3" style={BORDER}>
            Butuh Supabase untuk mengelola tugas akhir.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {isLoading ? (
                <p className="text-brown-3 text-sm">Memuat…</p>
              ) : projects.length === 0 ? (
                <p className="text-brown-3 text-sm">Belum ada brief. Buat brief pertama untuk mahasiswa.</p>
              ) : (
                projects.map((p) => (
                  <div key={p.id} className="bg-ivory rounded-xl border p-4 flex flex-col gap-2" style={BORDER}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-brown truncate">{p.title}</h3>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={
                          p.is_open
                            ? { background: 'var(--success-soft)', color: 'var(--success)' }
                            : { background: 'var(--bg3)', color: 'var(--brown2)' }
                        }
                      >
                        {p.is_open ? 'Dibuka' : 'Ditutup'}
                      </span>
                    </div>
                    <p className="text-xs text-brown-3">{formatTenggat(p.deadline)}</p>
                    <p className="text-xs text-brown-3">
                      {p.rubric.length} kriteria rubrik{p.id === briefId ? ` · ${submissions.length} kiriman` : ''}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2 border-t" style={BORDER}>
                      <button
                        onClick={() => setSearchParams({ brief: p.id })}
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        Lihat kiriman
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        aria-label="Ubah brief"
                        title="Ubah brief"
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        <IconEdit size={13} /> <span className="hidden sm:inline">Ubah</span>
                      </button>
                      <button
                        onClick={() => void toggleBuka(p)}
                        aria-label={p.is_open ? 'Tutup brief' : 'Buka lagi'}
                        title={p.is_open ? 'Tutup brief' : 'Buka lagi'}
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        <IconLock size={13} /> <span className="hidden sm:inline">{p.is_open ? 'Tutup' : 'Buka lagi'}</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`Hapus brief ${p.title}`}
                        title="Hapus brief"
                        className="btn btn-danger btn-icon flex-shrink-0"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedProject && (
              <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
                <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={BORDER}>
                  <span className="text-sm font-semibold text-brown">Kiriman · {selectedProject.title}</span>
                  <button onClick={() => setSearchParams({})} className="btn btn-ghost btn-sm">
                    Tutup panel
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-bg3">
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Nama</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Kelas</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Dikirim</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Berkas</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Nilai</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-3 w-40">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSubmissions ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-brown-3 text-sm">
                            Memuat…
                          </td>
                        </tr>
                      ) : submissions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-brown-3 text-sm">
                            Belum ada kiriman.
                          </td>
                        </tr>
                      ) : (
                        submissions.map((s) => (
                          <tr key={s.id} className="row-divider">
                            <td className="px-3 py-2.5 text-brown font-medium">{s.full_name}</td>
                            <td className="px-3 py-2.5 text-brown-2">{namaKelas(s.class_id)}</td>
                            <td className="px-3 py-2.5 text-brown-3 text-xs whitespace-nowrap">{formatTanggal(s.submitted_at)}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {s.file_path && (
                                  <button
                                    onClick={() => void bukaBerkas(s.file_path as string)}
                                    aria-label="Buka berkas kiriman"
                                    title="Buka berkas"
                                    className="btn btn-secondary btn-sm whitespace-nowrap"
                                  >
                                    <IconDocument size={13} /> Buka
                                  </button>
                                )}
                                {s.link && (
                                  <a
                                    href={s.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm whitespace-nowrap"
                                  >
                                    <IconLink size={13} /> Tautan
                                  </a>
                                )}
                                {!s.file_path && !s.link && <span className="text-brown-3 text-xs">—</span>}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              {s.total != null ? (
                                <span className="font-semibold text-brown tabular-nums">{s.total}</span>
                              ) : (
                                <span
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                                  style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}
                                >
                                  Belum dinilai
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button onClick={() => openGrade(s)} className="btn btn-secondary whitespace-nowrap">
                                {s.total != null ? 'Ubah nilai' : 'Nilai'}
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
          </>
        )}
      </div>

      {/* Modal buat/ubah brief */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[560px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">{editing ? 'Ubah brief' : 'Buat brief'}</h3>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Judul
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="mis. Laporan proyek akhir"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Deskripsi
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y"
                style={BORDER}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Tenggat (opsional)
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>

            <div className="mb-3">
              <span className="text-xs font-semibold text-brown-2 block mb-1.5">Kelas</span>
              <label className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                <input
                  type="checkbox"
                  checked={semuaKelas}
                  onChange={(e) => setSemuaKelas(e.target.checked)}
                  className="w-4 h-4 accent-terra"
                />
                Semua kelas
              </label>
              {!semuaKelas && (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border rounded-lg p-2" style={BORDER}>
                  {tahunUnik(kelasList).map((tahun) => (
                    <div key={tahun}>
                      <div className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-1">{tahun}</div>
                      <div className="flex flex-col gap-1.5">
                        {kelasList
                          .filter((k) => k.angkatan === tahun)
                          .map((k) => (
                            <label key={k.id} className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                              <input
                                type="checkbox"
                                checked={classIds.includes(k.id)}
                                onChange={() => toggleKelas(k.id)}
                                className="w-4 h-4 accent-terra"
                              />
                              {labelKelas(k, kelasList)}
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <span className="text-xs font-semibold text-brown-2 block mb-1.5">Rubrik penilaian</span>
              <div className="flex flex-col gap-2">
                {rubric.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={r.nama}
                      onChange={(e) => ubahRubrik(i, { nama: e.target.value })}
                      placeholder="Nama kriteria"
                      className="h-11 flex-1 rounded-[var(--radius-control)] border px-3 text-base text-brown min-w-0"
                      style={BORDER}
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      value={r.bobot}
                      onChange={(e) => ubahRubrik(i, { bobot: Number(e.target.value) })}
                      aria-label={`Bobot ${r.nama || 'kriteria'}`}
                      className="h-11 w-20 flex-shrink-0 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                      style={BORDER}
                    />
                    <button
                      type="button"
                      onClick={() => hapusKriteria(i)}
                      disabled={rubric.length <= 1}
                      aria-label="Hapus kriteria"
                      className="btn btn-danger btn-icon flex-shrink-0"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={tambahKriteria} className="btn btn-secondary btn-sm mt-2">
                + Kriteria
              </button>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Batal
              </button>
              <button
                onClick={() => void submitBrief()}
                disabled={saving || !title.trim() || rubric.length === 0}
                className="btn btn-primary min-w-[7.5rem]"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hapus brief */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus brief "{deleteTarget.title}"?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">Kiriman mahasiswa untuk brief ini ikut terhapus.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn btn-secondary btn-sm flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} disabled={deleting} className="btn btn-danger btn-sm flex-1 min-w-[7.5rem]">
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nilai */}
      {gradingSub && selectedProject && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGradingSub(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[480px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">Nilai kiriman {gradingSub.full_name}</h3>

            <div className="flex flex-col gap-3 mb-4">
              {selectedProject.rubric.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-brown">{r.nama}</div>
                    <div className="text-xs text-brown-3">Bobot {r.bobot}</div>
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={scores[i] ?? ''}
                    onChange={(e) =>
                      setScores((prev) =>
                        prev.map((v, idx) => (idx === i ? (e.target.value === '' ? '' : Number(e.target.value)) : v)),
                      )
                    }
                    aria-label={`Nilai ${r.nama}`}
                    className="h-11 w-20 flex-shrink-0 rounded-[var(--radius-control)] border px-3 text-base text-brown text-center"
                    style={BORDER}
                  />
                </div>
              ))}
            </div>

            <div className="text-center mb-4 p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <div className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-1">Total</div>
              <div className="font-display text-2xl font-bold text-brown">{totalPreview ?? '—'}</div>
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
              Umpan balik
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y"
                style={BORDER}
              />
            </label>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={() => setGradingSub(null)} className="btn btn-secondary">
                Batal
              </button>
              <button
                onClick={() => void submitGrade()}
                disabled={gradingSaving || totalPreview == null}
                className="btn btn-primary min-w-[7.5rem]"
              >
                {gradingSaving ? 'Menyimpan…' : 'Simpan nilai'}
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
export default TugasAkhir
