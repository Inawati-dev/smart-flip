import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { useModules, useIkutiMataKuliah } from '../hooks/useModules'
import { useTopikStatus } from '../lib/topik'
import { useAuth } from '../contexts/AuthContext'
import { parseVideoUrl } from '../lib/video'
import { saveVideoUrl, uploadModulVideo, saveModulOrder, buangBerkasYatim, PESAN_V50, type PertemuanTopik } from '../lib/manajemen'
import { PillGroup } from '../components/PillGroup'
import { upsertVideoProgress, shouldSendTimeUpdate, fetchVideoProgressMap } from '../lib/videoProgress'
import type { ModuleRow } from '../lib/modules'
import { PreviewModal } from '../components/PdfPreviewLink'
import { FileInput } from '../components/FileInput'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { IconEdit, IconPlay } from '../components/icons'
import { KartuVideo } from '../components/KartuVideo'
import { KelompokTopik, KISI_TOPIK } from '../components/KelompokTopik'
import { ChipRak, warnaSampul } from '../components/KartuTopik'
import { UrutkanTopikModal, useSeretTopik } from '../components/UrutkanTopik'
import { useAmbang } from '../lib/ambang'
import { formatTanggal, labelPertemuan, nomorPertemuan } from '../lib/jadwal'

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

// Satu topik memakai dua pertemuan (antrean #271): isian kedua opsional, di kolom `_2`.
const PILIHAN_PERTEMUAN = [
  { value: '1', label: 'Pertemuan Pertama' },
  { value: '2', label: 'Pertemuan Kedua' },
]
const urlPertemuan = (m: ModuleRow, p: PertemuanTopik) => (p === 2 ? m.video_url_2 : m.video_url) || ''


function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Rak /video mahasiswa (antrean #85 opsi B): topik dengan video berkas
// (bukan YouTube) belum tahu durasinya sampai <video preload="metadata">
// dibaca — probe tersembunyi ini merekam durasinya ke state lokal lewat
// onLoadedMetadata, sekali per topik, lalu lenyap dari DOM. Tidak dirender
// terlihat karena KartuVideo sudah menampilkan sampul gradasi sendiri.
function DurationProbe({ src, onDuration }: { src: string; onDuration: (sec: number) => void }) {
  return (
    <video
      src={src}
      preload="metadata"
      muted
      style={{ display: 'none' }}
      onLoadedMetadata={(e) => onDuration(e.currentTarget.duration)}
    />
  )
}

type ChipJenis = 'ok' | 'now' | 'todo' | 'warn'

function chipMahasiswa(
  status: ReturnType<ReturnType<typeof useTopikStatus>['statusOf']>,
  hasVideo: boolean,
  seconds: number,
  done: boolean,
): { jenis: ChipJenis; label: string } {
  if (!hasVideo) return { jenis: 'todo', label: 'Belum Ada Video' }
  if (status === 'locked') return { jenis: 'todo', label: 'Terkunci' }
  if (done) return { jenis: 'ok', label: 'Selesai' }
  if (seconds > 0) return { jenis: 'now', label: 'Sedang Ditonton' }
  return { jenis: 'now', label: 'Siap Ditonton' }
}

function VideoMahasiswa() {
  const { id } = useParams()
  const { data: modules = [], isLoading: modulesLoading } = useModules()
  const { statusOf, bukaPada } = useTopikStatus()
  const ambangFormatif = useAmbang().formatif
  const { data: progressMap = {} } = useQuery({ queryKey: ['video-progress'], queryFn: fetchVideoProgressMap })
  const sorted = useMemo(() => sortModules(modules), [modules])
  const current = id ? parseInt(id, 10) : null
  const menyesuaikan = useIkutiMataKuliah(current)
  const [durations, setDurations] = useState<Record<number, number>>({})
  const [cari, setCari] = useSearchParams()

  function handleDuration(moduleId: number, sec: number) {
    setDurations((prev) => (prev[moduleId] === sec ? prev : { ...prev, [moduleId]: sec }))
  }

  // /video tanpa id → rak semua topik (antrean #85 opsi B, mengganti alihkan
  // otomatis WP4 lama).
  if (current == null) {
    // Durasi tiap kotak video: isian dosen, atau metadata berkas (probe; kunci negatif = video pertemuan kedua).
    const detikKotak = (m: ModuleRow, p: PertemuanTopik) => (p === 2 ? (m.duration_sec_2 ?? durations[-m.id]) : (m.duration_sec ?? durations[m.id])) ?? null
    const kotak = sorted.flatMap((m) => ([1, 2] as const).filter((p) => urlPertemuan(m, p)).map((p) => detikKotak(m, p)))
    const semuaDurasiTahu = kotak.length > 0 && kotak.every((d) => d != null)
    const totalMenit = Math.round(kotak.reduce<number>((s, d) => s + (d ?? 0), 0) / 60)
    return (
      <Layout>
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-brown">Video</h1>
            <MataKuliahSelect />
          </div>
          {modulesLoading ? (
            <p className="text-brown-3 text-sm p-6">Memuat…</p>
          ) : sorted.length === 0 ? (
            <div className="mt-4 p-6 rounded-xl bg-ivory border text-center text-brown-3 text-sm" style={BORDER}>
              Belum ada topik di mata kuliah ini.
            </div>
          ) : (
            <>
              <p className="text-xs text-brown-3 mb-4">
                {`${sorted.length} topik · ${kotak.length} video`}
                {semuaDurasiTahu ? ` · ${totalMenit} menit` : ''}
              </p>
              <div className={KISI_TOPIK}>
                {sorted.map((m, i) => {
                  const status = statusOf(m.id)
                  const prog = progressMap[m.id]
                  const judulKunci = bukaPada(m.id) ? `Dibuka ${formatTanggal(bukaPada(m.id)!)}` : `Selesaikan tes formatif topik sebelumnya (skor ${ambangFormatif}) dulu`
                  // Kotak hanya untuk pertemuan yang punya video; topik tanpa video tetap satu kotak "Belum Ada Video".
                  const ada = ([1, 2] as const).filter((p) => urlPertemuan(m, p))
                  return (
                    <KelompokTopik key={m.id} nomor={m.order_num} label={labelPertemuan(i, m.minggu_mulai)} judul={m.title}>
                      {(ada.length ? ada : ([1] as const)).map((p) => {
                        const url = urlPertemuan(m, p)
                        const parsed = parseVideoUrl(url)
                        const kunci = p === 2 ? -m.id : m.id
                        const dtk = detikKotak(m, p)
                        const chip = chipMahasiswa(status, !!url, (p === 2 ? prog?.seconds2 : prog?.seconds) ?? 0, !!(p === 2 ? prog?.done2 : prog?.done))
                        return (
                          <div key={p}>
                            {parsed?.kind === 'file' && dtk == null && <DurationProbe src={parsed.src} onDuration={(sec) => handleDuration(kunci, sec)} />}
                            <KartuVideo
                              ringkas
                              nomor={m.order_num}
                              pertemuan={`Pertemuan ${nomorPertemuan(i, m.minggu_mulai, p)}`}
                              judul={m.title}
                              url={url || null}
                              durasi={dtk ? formatDuration(dtk) : undefined}
                              chip={<ChipRak jenis={chip.jenis} label={chip.label} />}
                              terkunci={status === 'locked'}
                              judulKunci={judulKunci}
                              to={url ? `/video/${m.id}${p === 2 ? '?p=2' : ''}` : undefined}
                              warna={warnaSampul(m.order_num)}
                            />
                          </div>
                        )
                      })}
                    </KelompokTopik>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </Layout>
    )
  }

  const idx = sorted.findIndex((m) => m.id === current)
  const modul = sorted[idx]

  if (!modul) {
    return (
      <Layout>
        <div className="p-6 text-brown-3 text-sm">{modulesLoading || menyesuaikan ? 'Memuat…' : 'Topik tidak ditemukan.'}</div>
      </Layout>
    )
  }

  const status = statusOf(current)
  // ?p=2 memutar video pertemuan kedua; topik yang hanya punya video kedua langsung ke sana.
  const duaVideo = !!(modul.video_url && modul.video_url_2)
  const pertemuan: PertemuanTopik = modul.video_url_2 && (cari.get('p') === '2' || !modul.video_url) ? 2 : 1
  const prog = progressMap[modul.id]

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <Link to="/video" className="text-terra text-xs font-semibold inline-flex items-center min-h-11 mb-1">
          ← Semua Video
        </Link>
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <h1 className="text-2xl font-bold text-brown">
            Pertemuan {nomorPertemuan(Math.max(0, idx), modul.minggu_mulai, pertemuan)} · {modul.title}
          </h1>
          <MataKuliahSelect />
        </div>
        <PertemuanStepper current={current} basePath="/video" statusOf={statusOf} />

        {status === 'locked' ? (
          <div className="mt-6 p-6 rounded-xl bg-ivory border text-center" style={BORDER}>
            <p className="text-brown-2 mb-3 text-sm">
              {bukaPada(modul.id) ? `Topik ini dibuka ${formatTanggal(bukaPada(modul.id)!)}.` : `Selesaikan topik ${modul.order_num - 1} dulu.`}
            </p>
            <Link to="/video" className="text-terra font-semibold text-sm inline-flex items-center min-h-11">
              ← Kembali
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
            <div className="min-w-0 flex flex-col gap-3">
              {duaVideo && (
                <PillGroup
                  ariaLabel="Video pertemuan"
                  options={PILIHAN_PERTEMUAN}
                  value={String(pertemuan)}
                  onChange={(v) => setCari(v === '2' ? { p: '2' } : {}, { replace: true })}
                />
              )}
              <VideoPlayer
                key={`${modul.id}-${pertemuan}`}
                modul={modul}
                pertemuan={pertemuan}
                sudahSelesai={(pertemuan === 2 ? prog?.done2 : prog?.done) ?? false}
              />
            </div>
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
function VideoPlayer({ modul, pertemuan = 1, sudahSelesai }: { modul: ModuleRow; pertemuan?: PertemuanTopik; sudahSelesai: boolean }) {
  const parsed = parseVideoUrl(urlPertemuan(modul, pertemuan))
  const lastSentRef = useRef<number | null>(null)
  const [baruSelesai, setDone] = useState(false)
  // Tanda yang sudah tersimpan tetap tampil saat pemutar dibuka lagi (antrean #191).
  const done = baruSelesai || sudahSelesai
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    lastSentRef.current = null
    setDone(false)
    if (parsed) void upsertVideoProgress(modul.id, 0, false, pertemuan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modul.id])

  function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const now = Date.now()
    if (!shouldSendTimeUpdate(lastSentRef.current, now)) return
    lastSentRef.current = now
    void upsertVideoProgress(modul.id, Math.floor(e.currentTarget.currentTime), false, pertemuan)
  }

  function handleEnded(e: React.SyntheticEvent<HTMLVideoElement>) {
    setDone(true)
    void upsertVideoProgress(modul.id, Math.floor(e.currentTarget.currentTime), true, pertemuan)
  }

  async function handleTandaiSelesai() {
    setMarking(true)
    try {
      await upsertVideoProgress(modul.id, 0, true, pertemuan)
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
          {done ? 'Video Ditandai Selesai' : marking ? 'Menyimpan…' : 'Tandai Selesai Ditonton'}
        </button>
      )}
    </div>
  )
}

function SetelahVideoPanel({ current, idx, sorted }: { current: number; idx: number; sorted: ModuleRow[] }) {
  const { statusOf, formatifPada } = useTopikStatus()
  const lulus = statusOf(current) === 'done'
  const tesDibuka = lulus ? null : formatifPada(current)
  const next = [sorted[idx + 1], sorted[idx + 2]].filter((m): m is ModuleRow => !!m)
  return (
    <div className="bg-ivory rounded-xl border p-4 flex flex-col gap-4" style={BORDER}>
      <div>
        <h2 className="font-semibold text-brown mb-2 text-sm">Setelah Video Ini</h2>
        <div className="flex flex-col gap-2">
          <Link to={`/modul/${current}`} className="btn btn-secondary">
            Baca Topik {idx + 1}
          </Link>
          {tesDibuka ? (
            <p className="text-xs text-brown-3">Tes formatif dibuka {formatTanggal(tesDibuka)}.</p>
          ) : (
            <Link to={`/asesmen/formatif/${current}`} className="btn btn-primary">
              {lulus ? 'Lihat Hasil Tes Formatif' : 'Kerjakan Tes Formatif'}
            </Link>
          )}
        </div>
      </div>

      {next.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-brown-3 uppercase mb-2">Pertemuan Berikutnya</h3>
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
  // Isian dua pertemuan topik (antrean #271); `slot` = tab yang sedang tampil di modal. Simpan menulis keduanya.
  const [slot, setSlot] = useState<PertemuanTopik>(1)
  const [isi, setIsi] = useState<Record<PertemuanTopik, { url: string; durasi: string }>>({ 1: { url: '', durasi: '' }, 2: { url: '', durasi: '' } })
  const urlInput = isi[slot].url
  const setUrlInput = (url: string) => setIsi((s) => ({ ...s, [slot]: { ...s[slot], url } }))
  const [urlError, setUrlError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoFileError, setVideoFileError] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  // Durasi dalam menit (v26). YouTube tidak bisa dibaca klien, jadi dosen mengisi
  // manual; berkas unggahan terisi otomatis dari metadata.
  const durasiMenit = isi[slot].durasi
  const setDurasiMenit = (durasi: string) => setIsi((s) => ({ ...s, [slot]: { ...s[slot], durasi } }))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  // Urutan topik (antrean #104): sama dengan rak Modul, baris `modules` yang sama.
  const [urutkanOpen, setUrutkanOpen] = useState(false)
  async function simpanUrutan(ids: number[]) {
    try {
      await saveModulOrder(ids)
      showToast('Urutan topik disimpan')
    } catch {
      showToast('Gagal menyimpan urutan topik')
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
    }
  }
  const { seretProps } = useSeretTopik(sorted, simpanUrutan)

  const menitDari = (detik: number | null | undefined) => (detik ? String(Math.round(detik / 60)) : '')
  function openEdit(m: ModuleRow, p: PertemuanTopik = 1) {
    setEditModul(m)
    setSlot(p)
    setIsi({ 1: { url: m.video_url || '', durasi: menitDari(m.duration_sec) }, 2: { url: m.video_url_2 || '', durasi: menitDari(m.duration_sec_2) } })
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
      const url = await uploadModulVideo(editModul.id, videoFile, slot)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setUrlInput(url)
      setVideoFile(null)
      showToast('Video berhasil diunggah')
    } catch (e) {
      setVideoFileError(e instanceof Error && e.message === PESAN_V50 ? PESAN_V50 : 'Gagal mengunggah video. Coba lagi.')
    } finally {
      setUploadingVideo(false)
    }
  }

  async function saveEdit() {
    if (!editModul) return
    for (const p of [1, 2] as const) {
      const u = isi[p].url.trim()
      if (u && !parseVideoUrl(u)) {
        setSlot(p)
        setUrlError('URL tidak dikenal. Pakai tautan YouTube atau file .mp4/.webm.')
        return
      }
    }
    setSaving(true)
    // Berkas lama dibuang sesudah KEDUA isian tersimpan, supaya video yang dipindah antartab tidak terhapus di tengah jalan.
    const lama = [editModul.video_url, editModul.video_url_2].filter((u): u is string => !!u && !Object.values(isi).some((s) => s.url.trim() === u))
    try {
      for (const p of [1, 2] as const) {
        const u = isi[p].url.trim()
        const menit = isi[p].durasi.trim() === '' ? null : Math.max(0, Math.round(Number(isi[p].durasi)))
        const detik = menit == null || Number.isNaN(menit) ? null : menit * 60
        // Pertemuan kedua yang tidak diubah tidak dikirim, supaya topik tanpa isian kedua tetap tersimpan walau SQL v50 belum dijalankan.
        if (p === 2 && u === (editModul.video_url_2 || '') && detik === (editModul.duration_sec_2 ?? null)) continue
        try {
          await saveVideoUrl(editModul.id, u, detik, p, false)
        } catch (e) {
          setSlot(p)
          throw e
        }
      }
      await buangBerkasYatim(lama)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setEditModul(null)
      showToast('Tautan video disimpan')
    } catch (e) {
      setUrlError(e instanceof Error && e.message === PESAN_V50 ? PESAN_V50 : 'Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const punyaVideo = sorted.filter((m) => m.video_url || m.video_url_2).length

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="font-display text-2xl font-bold text-brown">Video</h1>
          <MataKuliahSelect />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <p className="text-xs text-brown-3">
            {sorted.length} topik · {punyaVideo} punya video
          </p>
          <button onClick={() => setUrutkanOpen(true)} disabled={sorted.length < 2} className="btn btn-secondary btn-sm">
            Urutkan
          </button>
        </div>
        <UrutkanTopikModal open={urutkanOpen} modules={sorted} onClose={() => setUrutkanOpen(false)} onSimpan={simpanUrutan} />

        {sorted.length === 0 ? (
          <div className="p-6 rounded-xl bg-ivory border text-center text-brown-3 text-sm" style={BORDER}>
            Belum ada topik.
          </div>
        ) : (
          <div className={KISI_TOPIK}>
            {sorted.map((m, i) => (
              <div key={m.id} {...seretProps(m.id)}>
                <KelompokTopik nomor={m.order_num} label={labelPertemuan(i, m.minggu_mulai)} judul={m.title}>
                  {([1, 2] as const).map((p) => {
                    const url = urlPertemuan(m, p)
                    const parsed = parseVideoUrl(url)
                    const label = `Pertemuan ${nomorPertemuan(i, m.minggu_mulai, p)}`
                    const dtk = p === 2 ? m.duration_sec_2 : m.duration_sec
                    if (p === 2 && !url) {
                      // Pertemuan kedua tanpa video: kotak tambah, bukan kartu kosong (antrean #279).
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => openEdit(m, 2)}
                          title={`Tambah video untuk ${label.toLowerCase()}`}
                          className="w-full aspect-video rounded-[10px] border border-dashed flex items-center justify-center px-2 text-center text-xs font-semibold text-terra hover:bg-bg3 transition-colors"
                          style={BORDER}
                        >
                          + Video {label}
                        </button>
                      )
                    }
                    return (
                      <KartuVideo
                        key={p}
                        ringkas
                        nomor={m.order_num}
                        pertemuan={label}
                        judul={m.title}
                        url={url || null}
                        buatSampul
                        durasi={dtk ? formatDuration(dtk) : undefined}
                        chip={url && !parsed ? <ChipRak jenis="warn" label="Tautan Tidak Dikenal" /> : undefined}
                        onClick={url ? () => setPreviewUrl(url) : undefined}
                        warna={warnaSampul(m.order_num)}
                        aksi={
                          <>
                            <button
                              onClick={() => openEdit(m, p)}
                              aria-label={`${url ? 'Ubah' : 'Tambah'} video ${label.toLowerCase()}`}
                              title={url ? 'Ubah Video' : 'Tambah Video'}
                              className={`btn btn-secondary btn-sm w-full whitespace-nowrap ${url ? '' : 'col-span-2'}`}
                            >
                              <IconEdit size={13} /> <span className={url ? 'hidden @min-[13rem]:inline' : 'hidden sm:inline'}>{url ? 'Ubah' : 'Tambah Video'}</span>
                            </button>
                            {url && (
                              <button
                                type="button"
                                onClick={() => setPreviewUrl(url)}
                                aria-label={`Pratinjau video ${label.toLowerCase()}`}
                                title="Pratinjau video"
                                className="btn btn-secondary btn-sm w-full whitespace-nowrap"
                              >
                                {/* label hanya bila kotak cukup lebar (antrean #279): kotak di kelompok bisa sesempit 140 px */}
                                <IconPlay size={13} /> <span className="hidden @min-[13rem]:inline">Pratinjau</span>
                              </button>
                            )}
                          </>
                        }
                      />
                    )
                  })}
                </KelompokTopik>
              </div>
            ))}
          </div>
        )}
      </div>

      {editModul && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div
            className="bg-ivory rounded-2xl modal-lebar p-6 my-8 overflow-x-hidden"
            // 1080 px supaya isian dan pratinjau berdampingan dan tombol Simpan terlihat tanpa digulir (antrean #274); modal lain tetap 760 px
            style={{ maxWidth: 'min(1080px, 94vw)', boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-bold text-brown mb-1">{editModul.video_url || editModul.video_url_2 ? 'Ubah Video' : 'Tambah Video'}</h3>
            <p className="text-xs text-brown-3 mb-3">{editModul.title}</p>
            {/* Satu topik = dua pertemuan (antrean #271). Isian kedua opsional; Simpan menulis kedua tab. */}
            <div className="mb-2">
              <PillGroup
                variant="tab"
                ariaLabel="Video untuk pertemuan"
                options={PILIHAN_PERTEMUAN}
                value={String(slot)}
                onChange={(v) => {
                  setSlot(v === '2' ? 2 : 1)
                  setUrlError('')
                  setVideoFile(null)
                  setVideoFileError('')
                }}
              />
            </div>
            <p className="text-xs text-brown-3 mb-4">
              {slot === 1 ? 'Video yang diputar di pertemuan pertama topik ini.' : 'Opsional: isi bila topik ini memakai video lain di pertemuan keduanya. Kosongkan bila tidak.'}
            </p>

            {/* Dua kolom di laptop (antrean #274): isian di kiri, pratinjau di kanan, supaya modal muat tanpa digulir.
                Telepon satu kolom dengan urutan lama: tautan, pratinjau, unggah. */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-6">
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            {/* Bagian 1: tautan. Pola sama dengan modal Ganti PDF (antrean #67):
                subjudul kecil, isi di kiri, aksi di kanan, tanpa flex-wrap. */}
            <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2">Tempel Tautan</p>
            <input
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value)
                setUrlError('')
              }}
              placeholder="https://youtube.com/watch?v=... atau .mp4"
              className="w-full min-w-0 h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown mb-2"
              style={BORDER}
            />
            {urlError && <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{urlError}</p>}
            <div className="grid grid-cols-[auto_6rem_minmax(0,1fr)] items-center gap-2 mb-3">
              <label htmlFor="durasi-menit" className="text-xs font-semibold text-brown-2 whitespace-nowrap">
                Durasi (menit)
              </label>
              <input
                id="durasi-menit"
                type="number"
                min={0}
                inputMode="numeric"
                value={durasiMenit}
                onChange={(e) => setDurasiMenit(e.target.value)}
                placeholder="12"
                className="w-full min-w-0 h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
              <span className="text-xs text-brown-3">Tautan YouTube diisi manual, berkas unggahan terisi otomatis.</span>
            </div>
              </div>
              <div className="min-w-0 mb-3 lg:mb-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
                <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2 hidden lg:block">Pratinjau</p>
                {parsedInput ? (
                  <div className="rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                {parsedInput.kind === 'youtube' ? (
                  <iframe
                    src={parsedInput.embedUrl}
                    title="Pratinjau video"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    controls
                    src={parsedInput.src}
                    className="w-full h-full"
                    onLoadedMetadata={(e) => {
                      if (durasiMenit.trim() === '' && Number.isFinite(e.currentTarget.duration)) setDurasiMenit(String(Math.round(e.currentTarget.duration / 60)))
                    }}
                  />
                )}
              </div>
                ) : (
                  <div className="hidden lg:flex items-center justify-center rounded-lg border border-dashed text-xs text-brown-3 text-center p-4" style={{ ...BORDER, aspectRatio: '16/9' }}>
                    Pratinjau video tampil di sini sesudah tautan ditempel atau berkas diunggah.
                  </div>
                )}
              </div>
              <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {/* Bagian 2: unggah berkas */}
            <div className="pt-4 mt-1 border-t" style={BORDER}>
              <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2">Atau Unggah Berkas</p>
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <FileInput
                  accept="video/mp4,video/webm,.mp4,.webm"
                  label="Pilih Video"
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
                  className="btn btn-primary btn-sm min-w-[8rem]"
                >
                  {uploadingVideo ? 'Mengunggah…' : 'Unggah'}
                </button>
              </div>
              {videoFileError && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>{videoFileError}</p>}
            </div>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-4 mt-4 border-t" style={BORDER}>
              <button onClick={closeEdit} className="btn btn-secondary">
                Batal
              </button>
              <button onClick={saveEdit} disabled={saving} className="btn btn-primary min-w-[7.5rem]">
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
