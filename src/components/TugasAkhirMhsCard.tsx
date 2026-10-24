import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProjectsMhs,
  type FinalProject,
  fetchMySubmission,
  submitTugasAkhir,
  signedFileUrl,
  lewatTenggat,
  BERKAS_ACCEPT,
  BERKAS_MAKS_MB,
} from '../lib/tugasAkhir'
import { useCourse } from '../contexts/CourseContext'
import { BilahUnggah, LangkahBerkas, LencanaSiap, ModalBerkas, ZonaBerkas } from './ModalBerkas'
import { IconDocument } from './icons'

// Kartu mini projek (dulu "tugas akhir", antrean #170) di kolom kanan AsesmenDaftar (AsesmenMhs.tsx),
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
  const { courseId } = useCourse()
  const { data: semua = [], isLoading } = useQuery({
    queryKey: ['final-projects-mhs', courseId],
    queryFn: () => fetchProjectsMhs(courseId),
  })
  // Brief Paket Rancangan Proposal (antrean #179) dikerjakan di /mini-projek, bukan di kartu ini.
  const projects = semua.filter((p) => !p.paket_id)
  const adaPaket = semua.some((p) => p.paket_id)
  return (
    <div className="bg-ivory rounded-xl border p-4" style={BORDER}>
      <div className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-1.5">Mini Projek</div>
      {isLoading ? (
        <p className="text-sm text-brown-3">Memuat…</p>
      ) : projects.length === 0 && !adaPaket ? (
        <p className="text-sm text-brown-3">Belum ada brief dari dosen.</p>
      ) : (
        <div className="flex flex-col">
          {projects.map((p, i) => (
            <div key={p.id} className={i > 0 ? 'row-divider pt-3 mt-3' : ''}>
              <BriefItem project={p} />
            </div>
          ))}
          {adaPaket && (
            <Link to="/mini-projek" className={`btn btn-secondary btn-sm self-start no-underline ${projects.length > 0 ? 'mt-3' : ''}`}>
              Paket Rancangan Proposal
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// Satu brief: status kiriman, tombol kirim, modal. Dipisah supaya tiap brief
// punya query kiriman dan state modalnya sendiri.
function BriefItem({ project }: { project: FinalProject }) {
  const queryClient = useQueryClient()
  const { data: submission } = useQuery({
    queryKey: ['final-submission-mhs', project.id],
    queryFn: () => fetchMySubmission(project.id),
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
    if (!file && !link.trim() && !submission?.file_path) {
      setError('Pilih berkas atau isi tautan.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await submitTugasAkhir({ projectId: project.id, file, link, note })
      await queryClient.invalidateQueries({ queryKey: ['final-submission-mhs', project.id] })
      showToast(submission ? 'Kiriman diperbarui' : 'Mini projek terkirim')
      setModalOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim mini projek.')
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
    <div>
      {(
        <>
          <h3 className="text-sm font-semibold text-brown mb-1">{project.title}</h3>
          <p className="text-xs text-brown-3 mb-2 flex items-center gap-1.5 flex-wrap">
            {formatTenggat(project.deadline)}
            {lewatTenggat(project.deadline) && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}
              >
                Lewat Tenggat
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
                Belum Kirim
              </span>
            </div>
          )}

          {submission?.file_path && (
            <button type="button" onClick={() => void bukaBerkas()} className="btn btn-secondary btn-sm mb-2">
              Buka Berkas
            </button>
          )}

          {submission?.total == null && (
            <button type="button" onClick={openModal} className="btn btn-primary btn-sm">
              {submission ? 'Kirim Ulang' : 'Kirim Mini Projek'}
            </button>
          )}
        </>
      )}

      {modalOpen && (
        <ModalBerkas
          judul={submission ? 'Kirim Ulang Mini Projek' : 'Kirim Mini Projek'}
          subjudul={project.title}
          ikon={<IconDocument size={20} />}
          lebar={760}
          onTutup={() => setModalOpen(false)}
          sibuk={saving}
          status={
            saving ? (
              <BilahUnggah persen={null} />
            ) : error ? (
              <p className="text-[13px] text-danger" role="alert">{error}</p>
            ) : file || link.trim() || submission?.file_path ? (
              <LencanaSiap>Siap dikirim</LencanaSiap>
            ) : null
          }
          aksi={
            <>
              <button type="button" onClick={() => setModalOpen(false)} disabled={saving} className="btn btn-secondary">
                Batal
              </button>
              <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="btn btn-primary min-w-[7.5rem]">
                {saving ? 'Mengirim…' : 'Kirim'}
              </button>
            </>
          }
        >
          <LangkahBerkas nomor={1} judul="Berkas" aktif={!!file}>
            {submission?.file_name && (
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-[10px] border bg-bg3 min-w-0" style={BORDER}>
                <IconDocument size={18} className="text-brown-3 flex-shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-brown-2 truncate" title={submission.file_name}>{submission.file_name}</span>
                <span className="text-xs text-brown-3 flex-shrink-0">{file ? 'akan diganti' : 'terkirim'}</span>
              </div>
            )}
            <ZonaBerkas
              accept={BERKAS_ACCEPT}
              label="Pilih Berkas"
              petunjuk="Hanya berkas Word (.docx), maks 20 MB."
              maxSizeMb={BERKAS_MAKS_MB}
              file={file}
              disabled={saving}
              onChange={setFile}
            />
          </LangkahBerkas>
          <LangkahBerkas nomor={2} judul="Tautan (opsional)" aktif={!!link.trim()}>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
              aria-label="Tautan"
              disabled={saving}
              className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown w-full"
              style={BORDER}
            />
          </LangkahBerkas>
          <LangkahBerkas nomor={3} judul="Catatan (opsional)" aktif={!!note.trim()} akhir>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              aria-label="Catatan"
              disabled={saving}
              className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y w-full"
              style={BORDER}
            />
          </LangkahBerkas>
        </ModalBerkas>
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
