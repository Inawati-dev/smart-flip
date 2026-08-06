import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import {
  IconChart,
  IconClipboard,
  IconCompass,
  IconDocument,
  IconDownload,
  IconEdit,
  IconLink,
  IconTrash,
  IconTrendingUp,
  IconUsers,
} from '../components/icons'
import { NgainPanel } from './Ngain'
import { useModules } from '../hooks/useModules'
import {
  buildAsesmenCsv,
  fetchAsesmenAttempts,
  rekapPerModul,
  tallyAnswers,
  type AsesmenAttempt,
} from '../lib/asesmen'
import { downloadCsv } from '../lib/analitik'
import {
  buildObservasiCsv,
  computeMahasiswaProgress,
  computeTugasProgress,
  createObservasiTugas,
  deleteObservasiTugas,
  fetchObservasiMahasiswa,
  fetchObservasiSubmissions,
  fetchObservasiTugas,
  formatTanggalObservasi,
  isTerlambat,
  jalurPengumpulan,
  OBSERVASI_STATUS_BADGE,
  OBSERVASI_STATUS_LABEL,
  ringkasObservasi,
  updateObservasiReview,
  updateObservasiTugas,
  type ObservasiStatus,
  type ObservasiSubmission,
  type ObservasiTugas,
} from '../lib/observasi'

const BORDER = { borderColor: 'var(--border)' } as const

// Dua tab terpisah untuk observasi, bukan satu tab gabungan: menyusun tugas
// (jarang, mode "menulis") dan memantau siapa yang sudah mengumpulkan (sering,
// mode "membaca tabel") adalah dua pekerjaan berbeda dengan lebar tabel dan
// alur klik yang berbeda pula. Digabung, tab-nya akan panjang sekali di layar
// 360px dan bagian progres selalu terdorong di bawah daftar tugas.
type Tab = 'formatif' | 'pilihan-ganda' | 'ngain' | 'observasi' | 'progres-observasi'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'formatif', label: 'Tes Formatif' },
  { key: 'pilihan-ganda', label: 'Pilihan Ganda' },
  { key: 'ngain', label: 'N-Gain' },
  { key: 'observasi', label: 'Aktivitas Mandiri' },
  { key: 'progres-observasi', label: 'Progres Observasi' },
]

const JALUR_LABEL: Record<ReturnType<typeof jalurPengumpulan>, string> = {
  teks: 'Tulisan',
  berkas: 'Berkas',
  keduanya: 'Tulisan + Berkas',
  kosong: '—',
}

function scoreClass(score: number): string {
  if (score >= 80) return 'text-sage-d'
  if (score >= 60) return 'text-terra-d'
  return 'text-red'
}

// <input type="date"> bekerja dalam tanggal LOKAL tanpa jam, sementara kolom
// deadline-nya timestamptz. Dua helper di bawah menjaga perjalanan bolak-balik
// itu tidak menggeser tanggal satu hari gara-gara offset zona waktu (WIB = UTC+7,
// jadi konversi naif lewat toISOString() akan memundurkan tanggalnya).
function deadlineToInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function inputToDeadline(value: string): string | null {
  if (!value) return null
  // Batas waktu dianggap akhir hari — mengumpulkan jam 23.00 di tanggal
  // deadline tidak boleh dihitung terlambat.
  const d = new Date(`${value}T23:59:59`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default function Asesmen() {
  const [tab, setTab] = useState<Tab>('formatif')
  const [modulFilter, setModulFilter] = useState('')

  const { data: attempts, isLoading } = useQuery({
    queryKey: ['asesmen-attempts'],
    queryFn: fetchAsesmenAttempts,
  })

  // `null` = Supabase belum dikonfigurasi atau query gagal (mode demo), yang
  // beda maknanya dari array kosong (terhubung, tapi memang belum ada yang
  // mengerjakan kuis) — dua kondisi ini butuh pesan yang berbeda.
  const offline = attempts === null
  const rows: AsesmenAttempt[] = useMemo(() => attempts ?? [], [attempts])

  const rekap = useMemo(() => rekapPerModul(rows), [rows])

  const modulOptions = useMemo(
    () => [
      { value: '', label: '— Semua modul —' },
      ...rekap.map((r) => ({ value: String(r.moduleId), label: r.judul })),
    ],
    [rekap],
  )

  const filtered = useMemo(
    () => (modulFilter ? rows.filter((r) => r.moduleId === Number(modulFilter)) : rows),
    [rows, modulFilter],
  )

  const total = rows.length
  const rataKelas = total ? Math.round(rows.reduce((a, b) => a + b.score, 0) / total) : 0
  const lulus = rows.filter((r) => r.passed).length

  function exportCsv() {
    downloadCsv(`asesmen-${new Date().toISOString().slice(0, 10)}.csv`, buildAsesmenCsv(filtered))
  }

  // ── Aktivitas Mandiri (Observasi Lapangan) ─────────────────────────
  const queryClient = useQueryClient()
  const observasiAktif = tab === 'observasi' || tab === 'progres-observasi'
  const { data: modules = [] } = useModules()

  // Query baru hanya jalan saat tab observasinya dibuka — tab Tes Formatif
  // tidak perlu ikut menanggung tiga request tambahan setiap kali halaman ini
  // dimuat.
  const { data: tugasData, isLoading: loadingTugas } = useQuery({
    queryKey: ['observasi-tugas'],
    queryFn: fetchObservasiTugas,
    enabled: observasiAktif,
  })
  const { data: mhsData } = useQuery({
    queryKey: ['observasi-mahasiswa'],
    queryFn: fetchObservasiMahasiswa,
    enabled: observasiAktif,
  })
  const { data: subsData, isLoading: loadingSubs } = useQuery({
    queryKey: ['observasi-submissions'],
    queryFn: fetchObservasiSubmissions,
    enabled: observasiAktif,
  })

  // `null` = Supabase belum terkonfigurasi / query gagal, sama seperti
  // `offline` di atas — tabelnya memang belum ada sebelum migration v14 dijalankan.
  const observasiOffline = tugasData === null
  const tugasList = useMemo(() => tugasData ?? [], [tugasData])
  const mahasiswaList = useMemo(() => mhsData ?? [], [mhsData])
  const submissions = useMemo(() => subsData ?? [], [subsData])

  const tugasProgress = useMemo(
    () => computeTugasProgress(tugasList, mahasiswaList, submissions),
    [tugasList, mahasiswaList, submissions],
  )
  const mahasiswaProgress = useMemo(
    () => computeMahasiswaProgress(tugasList, mahasiswaList, submissions),
    [tugasList, mahasiswaList, submissions],
  )
  const ringkasan = useMemo(
    () => ringkasObservasi(tugasList, mahasiswaList, submissions),
    [tugasList, mahasiswaList, submissions],
  )

  const [tugasFilter, setTugasFilter] = useState('')
  const tugasTerpilih = tugasList.find((t) => String(t.id) === tugasFilter) ?? null
  const jawabanTerpilih = useMemo(
    () => (tugasTerpilih ? submissions.filter((s) => s.tugasId === tugasTerpilih.id) : []),
    [submissions, tugasTerpilih],
  )

  // Form tugas (buat & ubah pakai modal yang sama — bedanya cuma ada/tidaknya id)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [fJudul, setFJudul] = useState('')
  const [fDeskripsi, setFDeskripsi] = useState('')
  const [fModul, setFModul] = useState('')
  const [fDeadline, setFDeadline] = useState('')
  const [fUrutan, setFUrutan] = useState('0')
  const [savingTugas, setSavingTugas] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [hapusId, setHapusId] = useState<number | null>(null)
  const [menghapus, setMenghapus] = useState(false)

  const [reviewTarget, setReviewTarget] = useState<ObservasiSubmission | null>(null)
  const [reviewStatus, setReviewStatus] = useState<ObservasiStatus>('submitted')
  const [reviewCatatan, setReviewCatatan] = useState('')
  const [savingReview, setSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  async function refreshObservasi() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['observasi-tugas'] }),
      queryClient.invalidateQueries({ queryKey: ['observasi-submissions'] }),
    ])
  }

  function bukaFormBaru() {
    setEditId(null)
    setFJudul('')
    setFDeskripsi('')
    setFModul('')
    setFDeadline('')
    // Urutan default = paling belakang, supaya tugas baru tidak menyelinap ke
    // tengah daftar yang sudah disusun dosen.
    setFUrutan(String(tugasList.reduce((max, t) => Math.max(max, t.orderNum), 0) + 1))
    setFormError(null)
    setFormOpen(true)
  }

  function bukaFormUbah(t: ObservasiTugas) {
    setEditId(t.id)
    setFJudul(t.judul)
    setFDeskripsi(t.deskripsi)
    setFModul(t.moduleId != null ? String(t.moduleId) : '')
    setFDeadline(deadlineToInput(t.deadline))
    setFUrutan(String(t.orderNum))
    setFormError(null)
    setFormOpen(true)
  }

  async function simpanTugas() {
    const judul = fJudul.trim()
    if (!judul) {
      setFormError('Judul tugas wajib diisi.')
      return
    }
    const payload = {
      judul,
      deskripsi: fDeskripsi.trim(),
      moduleId: fModul ? Number(fModul) : null,
      deadline: inputToDeadline(fDeadline),
      orderNum: Number(fUrutan) || 0,
    }
    setSavingTugas(true)
    setFormError(null)
    try {
      if (editId != null) await updateObservasiTugas(editId, payload)
      else await createObservasiTugas(payload)
      setFormOpen(false)
      await refreshObservasi()
      showToast(editId != null ? 'Tugas observasi diperbarui' : 'Tugas observasi ditambahkan')
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Gagal menyimpan tugas. Coba lagi.')
    } finally {
      setSavingTugas(false)
    }
  }

  async function konfirmasiHapus() {
    if (hapusId == null) return
    setMenghapus(true)
    try {
      await deleteObservasiTugas(hapusId)
      setHapusId(null)
      // Filter di tab Progres bisa menunjuk tugas yang barusan hilang —
      // dikembalikan ke "semua tugas" supaya tabelnya tidak jadi kosong melompong.
      if (tugasFilter === String(hapusId)) setTugasFilter('')
      await refreshObservasi()
      showToast('Tugas observasi dihapus')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghapus tugas')
    } finally {
      setMenghapus(false)
    }
  }

  function bukaReview(s: ObservasiSubmission) {
    setReviewTarget(s)
    setReviewStatus(s.status)
    setReviewCatatan(s.catatanDosen ?? '')
    setReviewError(null)
  }

  async function simpanReview() {
    if (!reviewTarget) return
    setSavingReview(true)
    setReviewError(null)
    try {
      await updateObservasiReview(reviewTarget.id, reviewStatus, reviewCatatan.trim() || null)
      setReviewTarget(null)
      await refreshObservasi()
      showToast('Catatan review tersimpan')
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Gagal menyimpan catatan. Coba lagi.')
    } finally {
      setSavingReview(false)
    }
  }

  function exportObservasiCsv() {
    downloadCsv(
      `progres-observasi-${new Date().toISOString().slice(0, 10)}.csv`,
      buildObservasiCsv(mahasiswaProgress),
    )
  }

  const observasiEmpty = (label: string) => (
    <div className="text-center py-14 px-4 text-brown-3 text-sm">
      <span className="flex justify-center mb-2">
        <IconCompass size={28} />
      </span>
      {observasiOffline
        ? 'Data observasi butuh koneksi Supabase — pastikan migration v14 sudah dijalankan.'
        : `Belum ada ${label}.`}
    </div>
  )

  const emptyState = (label: string) => (
    <div className="text-center py-14 px-4 text-brown-3 text-sm">
      <span className="flex justify-center mb-2">
        <IconClipboard size={28} />
      </span>
      {offline
        ? 'Data asesmen butuh koneksi Supabase — belum tersedia di mode demo.'
        : `Belum ada ${label} yang tercatat.`}
    </div>
  )

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5 pb-4 border-b" style={BORDER}>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-brown mb-1">Asesmen</h1>
          <p className="text-sm text-brown-3 leading-relaxed">
            Rekap hasil tes formatif dan soal pilihan ganda mahasiswa, kalkulator N-Gain, serta tugas
            observasi lapangan beserta progres pengumpulannya.
          </p>
        </div>

        {/* Ringkasan cepat — hanya relevan untuk dua tab berbasis quiz_attempts;
            tab N-Gain dan tab observasi punya angka ringkasannya sendiri. */}
        {(tab === 'formatif' || tab === 'pilihan-ganda') && !offline && total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {(
              [
                ['Pengerjaan', String(total), 'text-brown'],
                ['Rata-rata Skor', String(rataKelas), scoreClass(rataKelas)],
                ['Lulus', `${lulus}/${total}`, 'text-sage-d'],
                ['Modul Dinilai', String(rekap.length), 'text-brown'],
              ] as const
            ).map(([label, value, cls]) => (
              <div key={label} className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">{label}</div>
                <div className={`font-display text-2xl font-bold ${cls}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB BAR */}
        <div className="flex gap-1 border-b mb-5 overflow-x-auto" style={BORDER}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3.5 min-h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px"
              style={{
                borderColor: tab === t.key ? 'var(--terra)' : 'transparent',
                color: tab === t.key ? 'var(--terra-d)' : 'var(--brown3)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: TES FORMATIF — agregat per modul ── */}
        {tab === 'formatif' && (
          <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
            <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
              <IconTrendingUp size={18} /> Rekap per Modul
              {isLoading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
            </div>
            {rekap.length === 0 ? (
              emptyState('hasil tes formatif')
            ) : (
              <div className="overflow-x-auto rounded-lg border" style={BORDER}>
                <table className="w-full border-collapse min-w-[640px]">
                  <thead className="bg-cream">
                    <tr>
                      {['Modul', 'Pengerjaan', 'Mahasiswa', 'Rata-rata', 'Tertinggi', 'Terendah', 'Lulus'].map(
                        (h, i) => (
                          <th
                            key={h}
                            className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                              i === 0 ? 'text-left' : 'text-center'
                            }`}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.map((r) => (
                      <tr key={r.moduleId} className="border-b last:border-b-0" style={BORDER}>
                        <td className="px-3 py-2.5 text-sm font-medium text-brown">{r.judul}</td>
                        <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                          {r.jumlahPengerjaan}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                          {r.jumlahMahasiswa}
                        </td>
                        <td className={`px-3 py-2.5 text-sm text-center font-bold tabular-nums ${scoreClass(r.rataRata)}`}>
                          {r.rataRata}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.tertinggi}</td>
                        <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.terendah}</td>
                        <td className="px-3 py-2.5 text-sm text-center tabular-nums">
                          <span className="font-semibold text-brown-2">
                            {r.lulus}/{r.jumlahPengerjaan}
                          </span>
                          <span className="text-xs text-brown-3 ml-1">({r.persenLulus}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PILIHAN GANDA — rincian tiap pengerjaan ── */}
        {tab === 'pilihan-ganda' && (
          <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
            <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
              <IconChart size={18} /> Rincian Pengerjaan
              {isLoading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
            </div>

            {rows.length > 0 && (
              <div className="flex items-end gap-2.5 flex-wrap mb-4">
                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                  <label className="text-xs font-semibold text-brown-2 tracking-wide">Filter Modul</label>
                  <Select
                    value={modulFilter}
                    onChange={setModulFilter}
                    className="h-11 px-3 rounded-lg border-[1.5px] bg-[var(--bg3)] text-sm text-brown cursor-pointer outline-none"
                    style={BORDER}
                    options={modulOptions}
                  />
                </div>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
                  style={BORDER}
                >
                  <IconDownload size={16} /> Export CSV
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              emptyState('pengerjaan soal pilihan ganda')
            ) : (
              <div className="overflow-x-auto rounded-lg border" style={BORDER}>
                <table className="w-full border-collapse min-w-[680px]">
                  <thead className="bg-cream">
                    <tr>
                      {['Mahasiswa', 'Kelas', 'Modul', 'Benar', 'Skor', 'Status', 'Tanggal'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                            i <= 2 ? 'text-left' : 'text-center'
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const tally = tallyAnswers(a.answers)
                      return (
                        <tr key={a.id} className="border-b last:border-b-0" style={BORDER}>
                          <td className="px-3 py-2.5 text-sm font-medium text-brown">{a.nama}</td>
                          <td className="px-3 py-2.5 text-sm text-brown-3">{a.kelas ?? '—'}</td>
                          <td className="px-3 py-2.5 text-sm text-brown-2">{a.modulJudul}</td>
                          <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                            {tally ? `${tally.benar}/${tally.total}` : '—'}
                          </td>
                          <td className={`px-3 py-2.5 text-sm text-center font-bold tabular-nums ${scoreClass(a.score)}`}>
                            {a.score}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                                a.passed ? 'bg-sage/20 text-sage-d' : 'bg-red/10 text-red'
                              }`}
                            >
                              {a.passed ? 'Lulus' : 'Belum Lulus'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-center text-brown-3 whitespace-nowrap">
                            {new Date(a.attemptedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: N-GAIN — kalkulator lama, utuh ── */}
        {tab === 'ngain' && <NgainPanel />}

        {/* ── TAB: AKTIVITAS MANDIRI — dosen menyusun tugas observasi ── */}
        {tab === 'observasi' && (
          <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div className="font-display text-base font-semibold text-brown flex items-center gap-2">
                <IconCompass size={18} /> Tugas Observasi Lapangan
                {loadingTugas && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
              </div>
              <button
                onClick={bukaFormBaru}
                disabled={observasiOffline}
                className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
              >
                + Tugas Baru
              </button>
            </div>
            <p className="text-sm text-brown-3 leading-relaxed mb-4">
              Mahasiswa mengumpulkan hasilnya dengan mengunggah berkas, menulis langsung di sistem, atau
              keduanya sekaligus.
            </p>

            {tugasList.length === 0 ? (
              observasiEmpty('tugas observasi yang dibuat')
            ) : (
              <div className="flex flex-col gap-3">
                {tugasList.map((t) => {
                  const p = tugasProgress.find((x) => x.tugasId === t.id)
                  return (
                    <div key={t.id} className="border rounded-xl p-4" style={{ ...BORDER, background: 'var(--bg3)' }}>
                      <div className="flex items-start gap-3 flex-wrap">
                        <div className="flex-1 min-w-[180px]">
                          <div className="text-sm font-semibold text-brown leading-snug">{t.judul}</div>
                          <div className="text-xs text-brown-3 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                            <span>{t.modulJudul ? t.modulJudul : 'Tanpa modul'}</span>
                            <span aria-hidden>&middot;</span>
                            <span>
                              Batas: {t.deadline ? formatTanggalObservasi(t.deadline) : 'bebas'}
                            </span>
                            <span aria-hidden>&middot;</span>
                            <span>Urutan {t.orderNum}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => bukaFormUbah(t)}
                            aria-label={`Ubah tugas ${t.judul}`}
                            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg border-[1.5px] bg-ivory text-brown-2 text-sm font-semibold"
                            style={BORDER}
                          >
                            <IconEdit size={15} /> Ubah
                          </button>
                          <button
                            onClick={() => setHapusId(t.id)}
                            aria-label={`Hapus tugas ${t.judul}`}
                            className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg border-[1.5px] bg-ivory text-sm font-semibold"
                            style={{ ...BORDER, color: 'var(--red)' }}
                          >
                            <IconTrash size={15} /> Hapus
                          </button>
                        </div>
                      </div>

                      {t.deskripsi && (
                        <p className="text-sm text-brown-2 leading-relaxed mt-2.5 whitespace-pre-wrap break-words">
                          {t.deskripsi}
                        </p>
                      )}

                      {p && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-brown-3 mb-1.5">
                            <span>
                              {p.sudah}/{p.totalMahasiswa} mahasiswa mengumpulkan
                            </span>
                            <span className="font-semibold text-brown-2 tabular-nums">{p.persen}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${p.persen}%`, background: 'var(--sage)' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PROGRES OBSERVASI — siapa sudah/belum mengumpulkan ── */}
        {tab === 'progres-observasi' && (
          <div className="flex flex-col gap-4">
            {!observasiOffline && tugasList.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(
                  [
                    ['Tugas Observasi', String(ringkasan.totalTugas), 'text-brown'],
                    ['Pengumpulan', `${ringkasan.persenPengumpulan}%`, 'text-sage-d'],
                    ['Menunggu Review', String(ringkasan.menunggu), 'text-terra-d'],
                    ['Perlu Revisi', String(ringkasan.perluRevisi), 'text-red'],
                  ] as const
                ).map(([label, value, cls]) => (
                  <div key={label} className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">
                      {label}
                    </div>
                    <div className={`font-display text-2xl font-bold ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
              <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
                <IconUsers size={18} /> Progres Pengumpulan
                {loadingSubs && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
              </div>

              {tugasList.length === 0 ? (
                observasiEmpty('tugas observasi — buat dulu di tab Aktivitas Mandiri')
              ) : (
                <>
                  <div className="flex items-end gap-2.5 flex-wrap mb-4">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                      <label className="text-xs font-semibold text-brown-2 tracking-wide">Tampilkan</label>
                      <Select
                        value={tugasFilter}
                        onChange={setTugasFilter}
                        className="h-11 px-3 rounded-lg border-[1.5px] bg-[var(--bg3)] text-sm text-brown cursor-pointer outline-none"
                        style={BORDER}
                        options={[
                          { value: '', label: '— Rekap semua tugas —' },
                          ...tugasList.map((t) => ({ value: String(t.id), label: t.judul })),
                        ]}
                      />
                    </div>
                    <button
                      onClick={exportObservasiCsv}
                      className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
                      style={BORDER}
                    >
                      <IconDownload size={16} /> Export CSV
                    </button>
                  </div>

                  {/* Tanpa filter: rekap dua sisi — per mahasiswa (siapa yang
                      belum) dan per tugas (tugas mana yang macet). */}
                  {!tugasTerpilih && (
                    <>
                      {mahasiswaProgress.length === 0 ? (
                        observasiEmpty('mahasiswa di kelas yang kamu ampu')
                      ) : (
                        <div className="overflow-x-auto rounded-lg border mb-5" style={BORDER}>
                          <table className="w-full border-collapse min-w-[620px]">
                            <thead className="bg-cream">
                              <tr>
                                {['Mahasiswa', 'Kelas', 'Terkumpul', 'Progres', 'Perlu Revisi', 'Belum Dikumpulkan'].map(
                                  (h, i) => (
                                    <th
                                      key={h}
                                      className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                                        i <= 1 || i === 5 ? 'text-left' : 'text-center'
                                      }`}
                                    >
                                      {h}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {mahasiswaProgress.map((m) => (
                                <tr key={m.userId} className="border-b last:border-b-0" style={BORDER}>
                                  <td className="px-3 py-2.5 text-sm font-medium text-brown">{m.nama}</td>
                                  <td className="px-3 py-2.5 text-sm text-brown-3">{m.kelas ?? '—'}</td>
                                  <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                                    {m.sudah}/{m.totalTugas}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2 justify-center">
                                      <div
                                        className="h-2 w-16 rounded-full overflow-hidden flex-shrink-0"
                                        style={{ background: 'var(--border)' }}
                                      >
                                        <div
                                          className="h-full rounded-full"
                                          style={{
                                            width: `${m.persen}%`,
                                            background: m.persen === 100 ? 'var(--sage)' : 'var(--terra)',
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs font-semibold text-brown-2 tabular-nums">
                                        {m.persen}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-sm text-center tabular-nums">
                                    {m.perluRevisi > 0 ? (
                                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red/10 text-red">
                                        {m.perluRevisi}
                                      </span>
                                    ) : (
                                      <span className="text-brown-3">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-xs text-brown-3 leading-relaxed">
                                    {m.belumJudul.length === 0 ? 'Lengkap' : m.belumJudul.join(', ')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="text-xs font-semibold uppercase tracking-wide text-brown-3 mb-2">
                        Rekap per Tugas
                      </div>
                      <div className="overflow-x-auto rounded-lg border" style={BORDER}>
                        <table className="w-full border-collapse min-w-[600px]">
                          <thead className="bg-cream">
                            <tr>
                              {['Tugas', 'Batas Waktu', 'Terkumpul', 'Menunggu', 'Direview', 'Revisi', 'Telat'].map(
                                (h, i) => (
                                  <th
                                    key={h}
                                    className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                                      i === 0 ? 'text-left' : 'text-center'
                                    }`}
                                  >
                                    {h}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {tugasProgress.map((p) => (
                              <tr key={p.tugasId} className="border-b last:border-b-0" style={BORDER}>
                                <td className="px-3 py-2.5 text-sm font-medium text-brown">{p.judul}</td>
                                <td className="px-3 py-2.5 text-sm text-center text-brown-3 whitespace-nowrap">
                                  {p.deadline ? formatTanggalObservasi(p.deadline) : 'Bebas'}
                                </td>
                                <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                                  {p.sudah}/{p.totalMahasiswa} ({p.persen}%)
                                </td>
                                <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                                  {p.menunggu}
                                </td>
                                <td className="px-3 py-2.5 text-sm text-center text-sage-d tabular-nums">
                                  {p.diperiksa}
                                </td>
                                <td className="px-3 py-2.5 text-sm text-center text-red tabular-nums">
                                  {p.perluRevisi}
                                </td>
                                <td className="px-3 py-2.5 text-sm text-center text-brown-3 tabular-nums">
                                  {p.terlambat}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Dengan filter: daftar jawaban satu tugas, siap dibaca/diunduh. */}
                  {tugasTerpilih && (
                    <>
                      {jawabanTerpilih.length === 0 ? (
                        observasiEmpty(`jawaban untuk "${tugasTerpilih.judul}"`)
                      ) : (
                        <div className="overflow-x-auto rounded-lg border" style={BORDER}>
                          <table className="w-full border-collapse min-w-[660px]">
                            <thead className="bg-cream">
                              <tr>
                                {['Mahasiswa', 'Kelas', 'Bentuk Hasil', 'Status', 'Dikumpulkan', 'Aksi'].map((h, i) => (
                                  <th
                                    key={h}
                                    className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                                      i <= 1 ? 'text-left' : 'text-center'
                                    }`}
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {jawabanTerpilih.map((s) => {
                                const badge = OBSERVASI_STATUS_BADGE[s.status]
                                const telat = isTerlambat(tugasTerpilih.deadline, s.submittedAt)
                                return (
                                  <tr key={s.id} className="border-b last:border-b-0" style={BORDER}>
                                    <td className="px-3 py-2.5 text-sm font-medium text-brown">{s.nama}</td>
                                    <td className="px-3 py-2.5 text-sm text-brown-3">{s.kelas ?? '—'}</td>
                                    <td className="px-3 py-2.5 text-sm text-center text-brown-2">
                                      {JALUR_LABEL[jalurPengumpulan(s)]}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <span
                                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                                        style={{ background: badge.bg, color: badge.color }}
                                      >
                                        {OBSERVASI_STATUS_LABEL[s.status]}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-center whitespace-nowrap">
                                      <span className="text-brown-3">{formatTanggalObservasi(s.submittedAt)}</span>
                                      {telat && <span className="block text-[11px] text-red font-semibold">Telat</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <button
                                        onClick={() => bukaReview(s)}
                                        className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
                                        style={BORDER}
                                      >
                                        <IconDocument size={15} /> Buka
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal tambah/ubah tugas observasi */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingTugas) setFormOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 16px 48px rgba(44,36,32,.2)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">
              {editId != null ? 'Ubah Tugas Observasi' : 'Tugas Observasi Baru'}
            </h3>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Judul Tugas
              <input
                value={fJudul}
                onChange={(e) => setFJudul(e.target.value)}
                maxLength={140}
                placeholder="Mis. Observasi praktik UMKM di sekitar kampus"
                className="block w-full mt-1 h-11 rounded-lg border px-3 text-base md:text-sm text-brown"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Instruksi Observasi
              <textarea
                value={fDeskripsi}
                onChange={(e) => setFDeskripsi(e.target.value)}
                rows={5}
                placeholder="Apa yang diamati, di mana, dan bukti apa yang harus dikumpulkan…"
                className="block w-full mt-1 rounded-lg border px-3 py-2.5 text-base md:text-sm text-brown resize-y min-h-[100px]"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="block text-xs font-semibold text-brown-2">
                Modul Terkait
                <Select
                  value={fModul}
                  onChange={setFModul}
                  className="block w-full mt-1 h-11 rounded-lg border px-3 text-sm text-brown"
                  style={{ ...BORDER, background: 'var(--bg3)' }}
                  options={[
                    { value: '', label: '— Tanpa modul —' },
                    ...modules.map((m) => ({ value: String(m.id), label: m.title })),
                  ]}
                />
              </label>

              <label className="block text-xs font-semibold text-brown-2">
                Batas Waktu (opsional)
                <input
                  type="date"
                  value={fDeadline}
                  onChange={(e) => setFDeadline(e.target.value)}
                  className="block w-full mt-1 h-11 rounded-lg border px-3 text-base md:text-sm text-brown"
                  style={{ ...BORDER, background: 'var(--bg3)' }}
                />
              </label>
            </div>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Urutan Tampil
              <input
                type="number"
                min={0}
                value={fUrutan}
                onChange={(e) => setFUrutan(e.target.value)}
                className="block w-full mt-1 h-11 rounded-lg border px-3 text-base md:text-sm text-brown"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>

            {formError && <p className="text-xs text-red mb-3 leading-relaxed">{formError}</p>}

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setFormOpen(false)}
                disabled={savingTugas}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void simpanTugas()}
                disabled={savingTugas}
                className="flex-[2] min-h-11 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
              >
                {savingTugas ? 'Menyimpan…' : 'Simpan Tugas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus tugas — aksi destruktif wajib pakai modal (CLAUDE.md),
          pola sama dengan modal hapus modul di Manajemen.tsx. Konsekuensinya
          disebut eksplisit: jawaban mahasiswa ikut hilang (ON DELETE CASCADE). */}
      {hapusId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !menghapus) setHapusId(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="text-base font-semibold text-brown mb-1.5">
              Hapus tugas “{tugasList.find((t) => t.id === hapusId)?.judul || ''}”?
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Semua hasil observasi yang sudah dikumpulkan mahasiswa untuk tugas ini ikut terhapus permanen —
              termasuk tulisan yang mereka ketik langsung di sistem. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setHapusId(null)}
                disabled={menghapus}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void konfirmasiHapus()}
                disabled={menghapus}
                className="flex-1 min-h-11 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--red)' }}
              >
                {menghapus ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal baca hasil observasi + beri status/catatan */}
      {reviewTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingReview) setReviewTarget(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 16px 48px rgba(44,36,32,.2)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-0.5">{reviewTarget.nama}</h3>
            <p className="text-xs text-brown-3 mb-4">
              {reviewTarget.kelas ?? 'Tanpa kelas'} &middot; dikumpulkan{' '}
              {formatTanggalObservasi(reviewTarget.submittedAt)}
            </p>

            {reviewTarget.fileUrl && (
              <a
                href={reviewTarget.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-11 px-4 mb-4 rounded-lg border-[1.5px] text-sm font-semibold text-brown-2"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              >
                <IconLink size={15} /> Buka berkas {reviewTarget.fileName ? `(${reviewTarget.fileName})` : ''}
              </a>
            )}

            <div className="text-xs font-semibold uppercase tracking-wide text-brown-3 mb-1.5">
              Tulisan Mahasiswa
            </div>
            <div
              className="rounded-lg border p-3 mb-4 text-sm text-brown-2 leading-relaxed whitespace-pre-wrap break-words"
              style={{ ...BORDER, background: 'var(--bg3)' }}
            >
              {reviewTarget.isiTeks.trim() || 'Mahasiswa tidak menulis di sistem — hasilnya berupa berkas unggahan.'}
            </div>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Status
              <Select
                value={reviewStatus}
                onChange={(v) => setReviewStatus(v as ObservasiStatus)}
                className="block w-full mt-1 h-11 rounded-lg border px-3 text-sm text-brown"
                style={{ ...BORDER, background: 'var(--bg3)' }}
                options={(['submitted', 'reviewed', 'revision'] as ObservasiStatus[]).map((s) => ({
                  value: s,
                  label: OBSERVASI_STATUS_LABEL[s],
                }))}
              />
            </label>

            <label className="block text-xs font-semibold text-brown-2 mb-3">
              Catatan untuk Mahasiswa
              <textarea
                value={reviewCatatan}
                onChange={(e) => setReviewCatatan(e.target.value)}
                rows={4}
                placeholder="Umpan balik singkat, atau apa yang perlu diperbaiki…"
                className="block w-full mt-1 rounded-lg border px-3 py-2.5 text-base md:text-sm text-brown resize-y min-h-[90px]"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>

            {reviewError && <p className="text-xs text-red mb-3 leading-relaxed">{reviewError}</p>}

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => setReviewTarget(null)}
                disabled={savingReview}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Tutup
              </button>
              <button
                onClick={() => void simpanReview()}
                disabled={savingReview}
                className="flex-[2] min-h-11 rounded-lg text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
              >
                {savingReview ? 'Menyimpan…' : 'Simpan Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 left-6 sm:left-auto px-5 py-2.5 rounded-xl text-sm font-semibold z-[999] text-center sm:text-left"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}
