import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjectMhs,
  fetchMySubmission,
  submitTugasAkhir,
  signedFileUrl,
  lewatTenggat,
  BERKAS_ACCEPT,
  BERKAS_MAKS_MB,
} from '../lib/tugasAkhir'
import { useCourse } from '../contexts/CourseContext'
import { FileInput } from './FileInput'

// Kartu tugas akhir di kolom kanan AsesmenDaftar (AsesmenMhs.tsx),
// menggantikan PanelCard VARK (antrean #57 opsi A). Pola kartu meniru
// PanelCard yang ada di AsesmenMhs.tsx: judul kecil uppercase, isi, tautan.
const BORDER = { borderColor: 'var(--border)' } as const

function formatTenggat(deadline: string | null): string {
  if (!deadline) return 'Tanpa tenggat'
  return new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function TugasAkhirMhsCard() {
  const queryClient = useQueryClient()
  const { courseId } = useCourse()
  const { data: project, isLoading } = useQuery({
    queryKey: ['final-project-mhs', courseId],
    queryFn: () => fetchProjectMhs(courseId),
  })
  const { data: submission } = useQuery({
    queryKey: ['final-submission-mhs', project?.id],
    queryFn: () => fetchMySubmission(project!.id),
    enabled: project != null,
  })

  const [expand, setExpand] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  // == Modal kirim ==
  const [modalOpen, setModalOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function openModal() {
    setFile(null)
    setLink(submission?.link ?? '')
    setNote(submission?.note ?? '')
    setError('')
    setModalOpen(true)
  }

  async function handleSubmit() {
    if (!project) return
    if (!file && !link.trim() && !submission?.file_path) {
      setError('Pilih berkas atau isi tautan.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await submitTugasAkhir({ projectId: project.id, file, link, note })
      await queryClient.invalidateQueries({ queryKey: ['final-submission-mhs', project.id] })
      showToast(submission ? 'Kiriman diperbarui' : 'Tugas terkirim')
      setModalOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim tugas.')
    } finally {
      setSaving(false)
    }
  }

  async function bukaBerkas() {
    if (!submission?.file_path) return
    try {
      const url = await signedFileUrl(submission.file_path)
      window.open(url, '_blank')
    } catch {
      showToast('Gagal membuka berkas')
    }
  }

  return (
    <div className="bg-ivory rounded-xl border p-4" style={BORDER}>
      <div className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-1.5">Tugas akhir</div>

      {isLoading ? (
        <p className="text-sm text-brown-3">Memuat…</p>
      ) : !project ? (
        <p className="text-sm text-brown-3">Belum ada brief dari dosen.</p>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-brown mb-1">{project.title}</h3>
          <p className="text-xs text-brown-3 mb-2 flex items-center gap-1.5 flex-wrap">
            {formatTenggat(project.deadline)}
            {lewatTenggat(project.deadline) && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}
              >
                Lewat tenggat
              </span>
            )}
          </p>

          {project.description && (
            <div className="mb-2">
              <p className={`text-sm text-brown-2 ${expand ? '' : 'line-clamp-3'}`}>{project.description}</p>
              <button type="button" onClick={() => setExpand((v) => !v)} className="text-terra text-xs font-semibold">
                {expand ? 'Sembunyikan' : 'Selengkapnya'}
              </button>
            </div>
          )}

          {project.rubric.length > 0 && (
            <ul className="text-xs text-brown-3 mb-3 flex flex-col gap-0.5">
              {project.rubric.map((r, i) => (
                <li key={i}>
                  {r.nama} · bobot {r.bobot}
                </li>
              ))}
            </ul>
          )}

          {submission?.total != null ? (
            <div className="mb-3">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
              >
                Dinilai: {submission.total}
              </span>
              {submission.feedback && <p className="text-xs text-brown-3 mt-1.5">{submission.feedback}</p>}
            </div>
          ) : submission ? (
            <div className="mb-3">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'var(--info-soft)', color: 'var(--info)' }}
              >
                Terkirim {formatTanggal(submission.submitted_at)}
              </span>
            </div>
          ) : (
            <div className="mb-3">
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: 'var(--bg3)', color: 'var(--brown2)' }}
              >
                Belum kirim
              </span>
            </div>
          )}

          {submission?.file_path && (
            <button type="button" onClick={() => void bukaBerkas()} className="btn btn-secondary btn-sm mb-2">
              Buka berkas
            </button>
          )}

          {submission?.total == null && (
            <button type="button" onClick={openModal} className="btn btn-primary btn-sm">
              {submission ? 'Kirim ulang' : 'Kirim tugas'}
            </button>
          )}
        </>
      )}

      {modalOpen && project && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[480px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">
              {submission ? 'Kirim ulang tugas akhir' : 'Kirim tugas akhir'}
            </h3>

            <div className="mb-3">
              <span className="block text-xs font-semibold text-brown-2 mb-1.5">Berkas</span>
              <FileInput
                accept={BERKAS_ACCEPT}
                label="Pilih berkas"
                hint="PDF atau DOCX, maks 20 MB"
                maxSizeMb={BERKAS_MAKS_MB}
                file={file}
                onChange={setFile}
              />
            </div>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Tautan (opsional)
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Catatan (opsional)
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y"
                style={BORDER}
              />
            </label>

            {error && <p className="text-xs text-danger mb-3">{error}</p>}

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Batal
              </button>
              <button onClick={() => void handleSubmit()} disabled={saving} className="btn btn-primary min-w-[7.5rem]">
                {saving ? 'Mengirim…' : 'Kirim'}
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
    </div>
  )
}
export default TugasAkhirMhsCard
