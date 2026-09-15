import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { useModules } from '../hooks/useModules'
import { useTopikStatus } from '../lib/topik'
import { useAuth } from '../contexts/AuthContext'
import { parseVideoUrl } from '../lib/video'
import { saveVideoUrl } from '../lib/manajemen'
import { upsertVideoProgress, shouldSendTimeUpdate } from '../lib/videoProgress'
import type { ModuleRow } from '../lib/modules'

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
        <div className="p-6 text-brown-3 text-sm">{modulesLoading ? 'Memuat…' : 'Modul tidak ditemukan.'}</div>
      </Layout>
    )
  }

  const status = statusOf(current)

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-brown mb-4">
          Pertemuan {idx + 1} · {modul.title}
        </h1>
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
          className="mt-3 min-h-11 px-4 rounded-lg border text-sm font-semibold disabled:opacity-60"
          style={{ borderColor: 'var(--border)' }}
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
          <Link
            to={`/modul/${current}`}
            className="min-h-11 flex items-center px-3 rounded-lg border text-sm text-brown-2"
            style={BORDER}
          >
            Baca modul {idx + 1}
          </Link>
          <Link
            to={`/asesmen/formatif/${current}`}
            className="min-h-11 flex items-center px-3 rounded-lg bg-terra text-white text-sm font-semibold"
          >
            Kerjakan tes formatif
          </Link>
        </div>
      </div>

      {next.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-brown-3 uppercase mb-2">Pertemuan berikutnya</h3>
          <div className="flex flex-col gap-2">
            {next.map((m) => (
              <Link
                key={m.id}
                to={`/video/${m.id}`}
                className="min-h-11 flex items-center px-3 rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
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

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function openEdit(m: ModuleRow) {
    setEditModul(m)
    setUrlInput(m.video_url || '')
    setUrlError('')
  }
  function closeEdit() {
    setEditModul(null)
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
        <h1 className="font-display text-2xl font-bold text-brown mb-4">Video</h1>

        <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-10">No</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Judul</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Tautan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-20">Durasi</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-36">Status</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada modul.
                    </td>
                  </tr>
                ) : (
                  sorted.map((m, idx) => {
                    const url = m.video_url || ''
                    const parsed = parseVideoUrl(url)
                    const chip = !url
                      ? { label: 'Belum ada tautan', bg: '#E5E0D8', color: '#6B5D4F' }
                      : parsed
                        ? { label: 'Tayang', bg: '#C0DD97', color: '#27500A' }
                        : { label: 'Tautan tidak dikenal', bg: '#FAD7A0', color: '#7D4E00' }
                    return (
                      <tr key={m.id} className="border-t" style={BORDER}>
                        <td className="px-3 py-2.5 font-semibold text-brown">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-brown min-w-[160px]">{m.title}</td>
                        <td className="px-3 py-2.5 text-xs text-brown-3 max-w-[240px] truncate">
                          {url ? (url.length > 40 ? url.slice(0, 40) + '…' : url) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-brown-3">—</td>
                        <td className="px-3 py-2.5">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ background: chip.bg, color: chip.color }}
                          >
                            {chip.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => openEdit(m)}
                            className="min-h-11 px-3 rounded-md text-xs font-semibold whitespace-nowrap"
                            style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
                          >
                            Ubah
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
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full" style={{ boxShadow: '0 8px 40px rgba(62,54,46,.22)' }}>
            <h3 className="font-display text-lg font-bold text-brown mb-1">Ubah tautan video</h3>
            <p className="text-xs text-brown-3 mb-3">{editModul.title}</p>
            <input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setUrlError('')
              }}
              placeholder="https://youtube.com/watch?v=... atau .mp4"
              className="w-full h-11 rounded-lg border px-3 mb-2"
              style={{ ...BORDER, fontSize: '16px' }}
            />
            {urlError && <p className="text-xs mb-2" style={{ color: 'var(--red, #C0392B)' }}>{urlError}</p>}
            <div className="flex gap-3 mt-3">
              <button
                onClick={closeEdit}
                className="flex-1 min-h-11 rounded-lg font-medium text-sm"
                style={{ border: '1.5px solid var(--border)', background: 'transparent' }}
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 min-h-11 rounded-lg bg-terra text-white font-semibold text-sm disabled:opacity-50"
              >
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
    </Layout>
  )
}
