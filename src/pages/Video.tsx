import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { useModules } from '../hooks/useModules'
import { useTopikStatus } from '../lib/topik'
import { useAuth } from '../contexts/AuthContext'
import { parseVideoUrl, thumbnailUrl } from '../lib/video'
import { saveVideoUrl, uploadModulVideo } from '../lib/manajemen'
import { upsertVideoProgress, shouldSendTimeUpdate } from '../lib/videoProgress'
import type { ModuleRow } from '../lib/modules'
import { PreviewModal } from '../components/PdfPreviewLink'
import { FileInput } from '../components/FileInput'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { IconEdit } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

// WP4 (spec §9, §5.1): /video dan /video/:id. Mahasiswa menonton, dosen
// mengelola tautan — sama route, dibedakan lewat useAuth().role.
export default function Video() {
  const { role, loading } = useAuth()
  if (loading) return null
  return role === 'dosen' ? <VideoDosen /> : <VideoMahasiswa />
}

function sortModules(modules: ModuleRow[]) {
  return [...modules].sort((a, b) => a.order_num - b.order_num)
}

function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Gambar kecil 16:9 kolom "Video" tabel dosen (antrean #44b). YouTube punya
// thumbnail siap pakai; berkas video memuat frame pertamanya sendiri lewat
// <video preload="metadata"> — elemen yang sama juga dipakai untuk membaca
// durasinya lewat onLoadedMetadata, supaya tidak perlu <video> tersembunyi
// kedua hanya untuk itu.
function VideoThumb({
  url,
  moduleId,
  onDuration,
}: {
  url: string
  moduleId: number
  onDuration?: (moduleId: number, sec: number) => void
}) {
  const thumb = thumbnailUrl(url)
  const parsed = parseVideoUrl(url)
  const cls = 'w-24 aspect-video rounded object-cover bg-bg3 flex-shrink-0'
  if (thumb) return <img src={thumb} alt="" className={cls} />
  if (parsed?.kind === 'file') {
    return (
      <video
        src={parsed.src}
        preload="metadata"
        muted
        onLoadedMetadata={(e) => onDuration?.(moduleId, e.currentTarget.duration)}
        className={cls}
      />
    )
  }
  return <div className={cls} />
}

function VideoMahasiswa() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: modules = [], isLoading: modulesLoading } = useModules()
  const { statusOf } = useTopikStatus()
  const sorted = useMemo(() => sortModules(modules), [modules])
  const current = id ? parseInt(id, 10) : null

  // /video tanpa id → alihkan ke modul pertama yang belum terkunci (spec §9 WP4).
  useEffect(() => {
    if (current != null || sorted.length === 0) return
    const firstOpen = sorted.find((m) => statusOf(m.id) !== 'locked') ?? sorted[0]
    navigate(`/video/${firstOpen.id}`, { replace: true })
  }, [current, sorted, statusOf, navigate])

  if (current == null) {
    return (
      <Layout>
        <div className="p-6 text-brown-3 text-sm">Memuat…</div>
      </Layout>
    )
  }

  const idx = sorted.findIndex((m) => m.id === current)
  const modul = sorted[idx]

  if (!modul) {
    return (
      <Layout>
        <div className="p-6 text-brown-3 text-sm">{modulesLoading ? 'Memuat…' : 'Topik tidak ditemukan.'}</div>
      </Layout>
    )
  }

  const status = statusOf(current)

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-2xl font-bold text-brown">
            Pertemuan {idx + 1} · {modul.title}
          </h1>
          <MataKuliahSelect />
        </div>
        <PertemuanStepper current={current} basePath="/video" statusOf={statusOf} />

        {status === 'locked' ? (
          <div className="mt-6 p-6 rounded-xl bg-ivory border text-center" style={BORDER}>
            <p className="text-brown-2 mb-3 text-sm">Selesaikan topik {idx} dulu.</p>
            <Link to="/video" className="text-terra font-semibold text-sm">
              ← Kembali
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
            <VideoPlayer modul={modul} />
            <SetelahVideoPanel current={current} idx={idx} sorted={sorted} />
          </div>
        )}
      </div>
    </Layout>
  )
}

// Menulis progres tonton (spec §9 WP9): <video> memakai timeupdate (dibatasi
// tiap 30 detik lewat shouldSendTimeUpdate) + ended → done=true. YouTube
// (iframe) tidak punya API tanpa skrip tambahan, jadi hanya seconds=0/
// done=false saat pemutar dibuka, dan tombol "Tandai selesai ditonton" di
// bawah pemutar — muncul untuk kedua jenis — yang menulis done=true.
function VideoPlayer({ modul }: { modul: ModuleRow }) {
  const parsed = parseVideoUrl(modul.video_url)
  const lastSentRef = useRef<number | null>(null)
  const [done, setDone] = useState(false)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    lastSentRef.current = null
    setDone(false)
    if (parsed) void upsertVideoProgress(modul.id, 0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modul.id])

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const now = Date.now()
    if (!shouldSendTimeUpdate(lastSentRef.current, now)) return
    lastSentRef.current = now
    void upsertVideoProgress(modul.id, Math.floor(e.currentTarget.currentTime), false)
  }

  function handleEnded(e: React.SyntheticEvent<HTMLVideoElement>) {
    setDone(true)
    void upsertVideoProgress(modul.id, Math.floor(e.currentTarget.currentTime), true)
  }

  async function handleTandaiSelesai() {
    setMarking(true)
    try {
      await upsertVideoProgress(modul.id, 0, true)
      setDone(true)
    } finally {
      setMarking(false)
    }
  }

  return (
    <div>
      <div data-testid="video-player">
        {parsed?.kind === 'youtube' && (
          <iframe
            src={parsed.embedUrl}
            title={modul.title}
            className="w-full rounded-xl border-0"
            style={{ aspectRatio: '16/9', maxWidth: '100%' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        {parsed?.kind === 'file' && (
          <video
            controls
            playsInline
            src={parsed.src}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="w-full rounded-xl bg-black"
            style={{ aspectRatio: '16/9', maxWidth: '100%' }}
          />
        )}
        {!parsed && (
          <div
            className="flex items-center justify-center rounded-xl bg-bg3 text-brown-3 text-sm text-center p-6"
            style={{ aspectRatio: '16/9', maxWidth: '100%' }}
          >
            Dosen belum memasang video untuk pertemuan ini.
          </div>
        )}
      </div>
      {parsed && (
        <button
          onClick={() => void handleTandaiSelesai()}
          disabled={marking || done}
          className="btn btn-secondary mt-3 min-w-[7.5rem]"
        >
          {done ? 'Video ditandai selesai' : marking ? 'Menyimpan…' : 'Tandai selesai ditonton'}
        </button>
      )}
    </div>
  )
}

function SetelahVideoPanel({ current, idx, sorted }: { current: number; idx: number; sorted: ModuleRow[] }) {
  const next = [sorted[idx + 1], sorted[idx + 2]].filter((m): m is ModuleRow => !!m)
  return (
    <div className="bg-ivory rounded-xl border p-4 flex flex-col gap-4" style={BORDER}>
      <div>
        <h2 className="font-semibold text-brown mb-2 text-sm">Setelah video ini</h2>
        <div className="flex flex-col gap-2">
          <Link to={`/modul/${current}`} className="btn btn-secondary">
            Baca topik {idx + 1}
          </Link>
          <Link to={`/asesmen/formatif/${current}`} className="btn btn-primary">
            Kerjakan tes formatif
          </Link>
        </div>
      </div>

      {next.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-brown-3 uppercase mb-2">Pertemuan berikutnya</h3>
          <div className="flex flex-col gap-2">
            {next.map((m) => (
              <Link key={m.id} to={`/video/${m.id}`} className="btn btn-secondary">
                {m.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function VideoDosen() {
  const queryClient = useQueryClient()
  const { data: modules = [] } = useModules()
  const sorted = useMemo(() => sortModules(modules), [modules])

  const [editModul, setEditModul] = useState<ModuleRow | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [durations, setDurations] = useState<Record<number, number>>({})
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoFileError, setVideoFileError] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)

  function handleDuration(moduleId: number, sec: number) {
    setDurations((prev) => (prev[moduleId] === sec ? prev : { ...prev, [moduleId]: sec }))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function openEdit(m: ModuleRow) {
    setEditModul(m)
    setUrlInput(m.video_url || '')
    setUrlError('')
    setVideoFile(null)
    setVideoFileError('')
  }
  function closeEdit() {
    setEditModul(null)
  }
  const parsedInput = parseVideoUrl(urlInput.trim())

  const MAX_VIDEO_BYTES = 100 * 1024 * 1024

  async function handleUploadVideoFile() {
    if (!editModul || !videoFile) return
    if (videoFile.size > MAX_VIDEO_BYTES) {
      setVideoFileError('Ukuran berkas maksimal 100 MB.')
      return
    }
    setVideoFileError('')
    setUploadingVideo(true)
    try {
      const url = await uploadModulVideo(editModul.id, videoFile)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setUrlInput(url)
      setVideoFile(null)
      showToast('Video berhasil diunggah')
    } catch {
      setVideoFileError('Gagal mengunggah video. Coba lagi.')
    } finally {
      setUploadingVideo(false)
    }
  }

  async function saveEdit() {
    if (!editModul) return
    const trimmed = urlInput.trim()
    if (trimmed && !parseVideoUrl(trimmed)) {
      setUrlError('URL tidak dikenal. Pakai tautan YouTube atau file .mp4/.webm.')
      return
    }
    setSaving(true)
    try {
      await saveVideoUrl(editModul.id, trimmed)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setEditModul(null)
      showToast('Tautan video disimpan')
    } catch {
      setUrlError('Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="font-display text-2xl font-bold text-brown">Video</h1>
          <MataKuliahSelect />
        </div>

        <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-10">No</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Judul</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Video</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-20">Durasi</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-36">Status</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-3 w-40">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada topik.
                    </td>
                  </tr>
                ) : (
                  sorted.map((m, idx) => {
                    const url = m.video_url || ''
                    const parsed = parseVideoUrl(url)
                    const chip = !url
                      ? { label: 'Belum ada tautan', bg: 'var(--bg3)', color: 'var(--brown2)' }
                      : parsed
                        ? { label: 'Tayang', bg: 'var(--success-soft)', color: 'var(--success)' }
                        : { label: 'Tautan tidak dikenal', bg: 'var(--warning-soft)', color: 'var(--warning)' }
                    return (
                      <tr key={m.id} className="row-divider">
                        <td className="px-3 py-2.5 font-semibold text-brown">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-brown min-w-[160px]">{m.title}</td>
                        <td className="px-3 py-2.5 text-xs text-brown-3 max-w-[280px]">
                          {url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(url)}
                              aria-label="Pratinjau video"
                              title="Pratinjau video"
                              className="inline-flex items-center gap-2 max-w-full text-left"
                            >
                              <VideoThumb url={url} moduleId={m.id} onDuration={handleDuration} />
                              <span className="truncate">{url.length > 30 ? url.slice(0, 30) + '…' : url}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <div className="w-24 aspect-video rounded bg-bg3 flex-shrink-0" />
                              Belum ada
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-brown-3">
                          {parsed?.kind === 'file' ? formatDuration(durations[m.id] ?? 0) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ background: chip.bg, color: chip.color }}
                          >
                            {chip.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => openEdit(m)}
                            aria-label={url ? 'Ubah video' : 'Tambah video'}
                            title={url ? 'Ubah video' : 'Tambah video'}
                            className="btn btn-secondary whitespace-nowrap"
                          >
                            <IconEdit size={13} /> <span className="hidden sm:inline">{url ? 'Ubah video' : 'Tambah video'}</span>
                          </button>
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

      {editModul && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ background: 'rgba(62,54,46,.52)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit()
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[420px] max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 8px 40px rgba(62,54,46,.22)' }}
          >
            <h3 className="font-display text-lg font-bold text-brown mb-1">Ubah tautan video</h3>
            <p className="text-xs text-brown-3 mb-3">{editModul.title}</p>

            <p className="text-xs font-semibold text-brown-2 mb-1">Tempel tautan</p>
            <input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setUrlError('')
              }}
              placeholder="https://youtube.com/watch?v=... atau .mp4"
              className="w-full h-11 rounded-[var(--radius-control)] border px-3 mb-2"
              style={{ ...BORDER, fontSize: '16px' }}
            />
            {urlError && <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{urlError}</p>}
            {parsedInput && (
              <div className="mb-2 rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                {parsedInput.kind === 'youtube' ? (
                  <iframe
                    src={parsedInput.embedUrl}
                    title="Pratinjau video"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video controls src={parsedInput.src} className="w-full h-full" />
                )}
              </div>
            )}

            <div className="mt-3 pt-3 border-t" style={BORDER}>
              <p className="text-xs font-semibold text-brown-2 mb-1">atau unggah berkas</p>
              <div className="flex items-end gap-2 flex-wrap">
                <FileInput
                  accept="video/mp4,video/webm,.mp4,.webm"
                  label="Pilih video"
                  hint="MP4 atau WebM, maks 100 MB"
                  maxSizeMb={100}
                  file={videoFile}
                  onChange={(f) => {
                    setVideoFile(f)
                    setVideoFileError('')
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleUploadVideoFile()}
                  disabled={!videoFile || uploadingVideo}
                  className="btn btn-primary btn-sm flex-shrink-0 min-w-[7.5rem]"
                >
                  {uploadingVideo ? 'Mengunggah…' : 'Unggah'}
                </button>
              </div>
              {videoFileError && <p className="text-[11px] mt-1" style={{ color: 'var(--danger)' }}>{videoFileError}</p>}
            </div>

            <div className="flex gap-3 mt-3">
              <button onClick={closeEdit} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={saveEdit} disabled={saving} className="btn btn-primary flex-1 min-w-[7.5rem]">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm font-medium text-white z-[700]"
          style={{ background: 'var(--brown)' }}
        >
          {toast}
        </div>
      )}

      {previewUrl && <PreviewModal url={previewUrl} title="Pratinjau video" onClose={() => setPreviewUrl(null)} />}
    </Layout>
  )
}
