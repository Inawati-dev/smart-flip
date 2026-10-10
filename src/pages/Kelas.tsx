import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { useKelasByDosen } from '../hooks/useKelas'
import {
  createKelas,
  deleteKelas,
  summarizeKelas,
  parseImportCsv,
  importMahasiswaCSV,
  fetchGolonganKelas,
  resetDiagnostik,
  type AnggotaGolongan,
  type KelasWithCount,
  type ParsedImportRow,
  type ImportResult,
} from '../lib/kelas'
import { downloadCsv } from '../lib/analitik'
import { FileInput } from '../components/FileInput'
import { Layout } from '../components/Layout'
import { StatCard } from '../components/StatCard'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { PillGroup } from '../components/PillGroup'
import { ChipRak } from '../components/KartuTopik'
import { GOLONGAN_LABEL, GOLONGAN_CHIP } from '../lib/golongan'
import { useAmbang } from '../lib/ambang'
import { IconTrash, IconLink, IconDocument, IconDownload, IconWarning, IconX, IconUsers } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

type SeksiMahasiswa = { judul: string | null; baris: AnggotaGolongan[] }

// Daftar mahasiswa per seksi (angkatan dan kelas), dipakai modal daftar kelas
// dan tampilan tersaring di bawah kartu golongan (antrean #145, #150).
// `pilih` + `onPilih`: kotak centang untuk mahasiswa yang sudah punya skor
// (dipakai reset tes diagnostik, antrean #155).
function DaftarSeksi({
  seksi,
  tampilGolongan,
  pilih,
  onPilih,
}: {
  seksi: SeksiMahasiswa[]
  tampilGolongan: boolean
  pilih?: Set<string>
  onPilih?: (id: string) => void
}) {
  if (seksi.every((x) => x.baris.length === 0)) return <p className="text-sm text-brown-3">Belum ada mahasiswa.</p>
  return (
    <>
      {seksi.map((x, n) => (
        <div key={x.judul ?? n} className="mb-3 last:mb-0">
          {x.judul && <div className="text-[11px] font-bold uppercase tracking-wide text-brown-3 mb-1">{x.judul}</div>}
          <ul className="flex flex-col">
            {x.baris.map((a) => (
              <li key={a.id} className="row-divider flex items-center justify-between gap-2 py-1.5 text-sm text-brown-2">
                {pilih && onPilih && a.skor != null ? (
                  <label className="flex items-center gap-2.5 min-w-0 min-h-11 cursor-pointer">
                    <input type="checkbox" checked={pilih.has(a.id)} onChange={() => onPilih(a.id)} className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate min-w-0">{a.nama}</span>
                  </label>
                ) : (
                  <span className="truncate min-w-0">{a.nama}</span>
                )}
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className="tabular-nums text-brown-3">{a.skor ?? '—'}</span>
                  {tampilGolongan && <ChipRak jenis={GOLONGAN_CHIP[a.golongan]} label={GOLONGAN_LABEL[a.golongan]} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function gulirKe(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const CURRENT_YEAR = new Date().getFullYear()

type ImportStep = 'pilih' | 'pratinjau' | 'konfirmasi' | 'memproses' | 'hasil'

// Credentials CSV -- separate shape from analitik.ts's buildAnalitikCsv, but
// reuses its generic downloadCsv() Blob+anchor trigger (that helper only
// needs a filename + a finished CSV string, nothing analitik-specific).
function buildCredentialsCsv(results: ImportResult[]): string {
  let csv = 'Nama,NIM,Email,Status,Password\n'
  results.forEach((r) => {
    const nama = (r.nama || '').replace(/"/g, '""')
    const status = r.status === 'berhasil' ? 'Berhasil' : r.status === 'kelas_penuh' ? 'Kelas Penuh' : 'Gagal'
    csv += `"${nama}",${r.nim},${r.email},${status},${r.password ?? ''}\n`
  })
  return csv
}

// Dosen-only "Kelola Kelas" panel — Tahap 1 of the kelas/rombongan-belajar
// feature (see database/migration_v7_kelas.sql for the full context). Dosen
// create a kelas (name + angkatan + capacity, code auto-generated), share
// the code with mahasiswa, and mahasiswa self-register with it
// (Register.tsx's optional "Kode Kelas" field). This panel only reads/writes
// through src/lib/kelas.ts — same DataLayer-abstraction convention as every
// other dosen-only management page (see Manajemen.tsx).
//
// Dirender oleh Kelas() di bawah sebagai halaman penuh /kelas, item rel
// navigasi sendiri (Layout.tsx) — koreksi Johan 16 Sep 2026 "page kelas ini
// dipindah jadi sidebar yaa biar enak mantau", membatalkan percobaan
// sebelumnya di hari yang sama yang sempat menjadikannya tab di Akun.tsx.
export function KelasPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: classes = [], isLoading } = useKelasByDosen(user?.id)
  const summary = summarizeKelas(classes)

  // Dua kelompok hasil tes diagnostik per kelas (antrean #140). Tes itu per
  // mata kuliah, jadi daftar ini ikut mata kuliah yang dipilih.
  const { courseId, course } = useCourse()
  const ambangDiagnostik = useAmbang().diagnostik
  const idKelas = classes.map((k) => k.id)
  const { data: golongan = {} } = useQuery({
    queryKey: ['golongan-kelas', courseId, ambangDiagnostik, idKelas.join(',')],
    queryFn: () => fetchGolonganKelas(idKelas, courseId, ambangDiagnostik),
    enabled: idKelas.length > 0,
  })
  const [golTarget, setGolTarget] = useState<KelasWithCount | null>(null)
  // Daftar mahasiswa (antrean #145): satu kelas penuh, atau satu golongan
  // lintas kelas yang dipecah per angkatan dan kelas.
  const [daftar, setDaftar] = useState<{ judul: string; tampilGolongan: boolean; seksi: SeksiMahasiswa[] } | null>(null)
  const jumlahGolongan = (g: 'mahir' | 'remedial') =>
    classes.reduce((n, k) => n + (golongan[k.id] ?? []).filter((a) => a.golongan === g).length, 0)
  // Angkatan jadi pil penyaring di kop daftar (antrean #151), bukan satu kartu
  // per tahun: jumlah kartu tidak lagi bertambah tiap angkatan baru.
  const [tahun, setTahun] = useState<number | null>(null)
  const daftarTahun = Array.from(new Set(classes.map((k) => k.angkatan))).sort((a, b) => b - a)
  const kelasTersaring = tahun == null ? classes : classes.filter((k) => k.angkatan === tahun)
  const seksiGolongan = (g: 'mahir' | 'remedial'): SeksiMahasiswa[] =>
    [...kelasTersaring]
      .sort((a, b) => b.angkatan - a.angkatan || a.name.localeCompare(b.name))
      .map((k) => ({ judul: `Angkatan ${k.angkatan} · ${k.name}`, baris: (golongan[k.id] ?? []).filter((a) => a.golongan === g) }))
      .filter((x) => x.baris.length > 0)
  // Klik kartu golongan menyaring daftar di bawahnya, bukan membuka modal
  // (antrean #150). Klik lagi, atau kartu lain, mengembalikan daftar kelas.
  const [filterGol, setFilterGol] = useState<'mahir' | 'remedial' | null>(null)
  function pilihGolongan(g: 'mahir' | 'remedial') {
    setFilterGol((f) => (f === g ? null : g))
    gulirKe('daftar-kelas')
  }
  function keDaftarKelas() {
    setFilterGol(null)
    setTahun(null)
    gulirKe('daftar-kelas')
  }
  // Reset tes diagnostik untuk mahasiswa yang dicentang di daftar kelas.
  const [pilih, setPilih] = useState<Set<string>>(new Set())
  const [konfirmasiReset, setKonfirmasiReset] = useState(false)
  const [mereset, setMereset] = useState(false)
  const bisaDireset = (daftar?.seksi ?? []).flatMap((x) => x.baris).filter((a) => a.skor != null)
  function togglePilih(id: string) {
    setPilih((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function tutupDaftar() {
    setDaftar(null)
    setPilih(new Set())
    setKonfirmasiReset(false)
  }
  async function jalankanReset() {
    setMereset(true)
    try {
      const terhapus = await resetDiagnostik([...pilih], courseId)
      await queryClient.invalidateQueries({ queryKey: ['golongan-kelas'] })
      showToast(
        terhapus > 0
          ? `Tes diagnostik ${pilih.size} mahasiswa direset`
          : 'Tidak ada yang terhapus. Jalankan migration_v28_reset_diagnostik.sql di Supabase dulu.',
      )
      if (terhapus > 0) tutupDaftar()
      else setKonfirmasiReset(false)
    } catch (e) {
      showToast((e as { message?: string } | null)?.message || 'Gagal mereset tes diagnostik')
      setKonfirmasiReset(false)
    } finally {
      setMereset(false)
    }
  }
  function bukaKelas(k: KelasWithCount) {
    setPilih(new Set())
    setDaftar({ judul: `Daftar Mahasiswa · ${k.name} (${k.angkatan})`, tampilGolongan: true, seksi: [{ judul: null, baris: golongan[k.id] ?? [] }] })
  }

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [angkatan, setAngkatan] = useState(CURRENT_YEAR)
  const [maxStudents, setMaxStudents] = useState(40)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KelasWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Import CSV mahasiswa (Tahap 2) ──
  const [importTarget, setImportTarget] = useState<KelasWithCount | null>(null)
  const [importStep, setImportStep] = useState<ImportStep>('pilih')
  const [csvRows, setCsvRows] = useState<ParsedImportRow[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvFileName, setCsvFileName] = useState('')
  const [importError, setImportError] = useState('')
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function openImport(kelas: KelasWithCount) {
    setImportTarget(kelas)
    setImportStep('pilih')
    setCsvRows([])
    setCsvFile(null)
    setCsvFileName('')
    setImportError('')
    setImportResults([])
  }

  function closeImport() {
    // Blocked entirely while an import is actually in flight -- see the
    // overlay's onClick guard below, this is a defense-in-depth no-op.
    if (importStep === 'memproses') return
    setImportTarget(null)
  }

  function handleFileChange(file: File | null) {
    setCsvFile(file)
    if (!file) return
    setImportError('')
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const rows = parseImportCsv(text)
      if (rows.length === 0) {
        setImportError('File CSV kosong atau hanya berisi baris header.')
        return
      }
      setCsvRows(rows)
      setImportStep('pratinjau')
    }
    reader.onerror = () => setImportError('Gagal membaca file. Pastikan formatnya CSV.')
    reader.readAsText(file)
  }

  const validRows = csvRows.filter((r) => r.valid)
  const invalidRows = csvRows.filter((r) => !r.valid)

  async function handleImport() {
    if (!importTarget) return
    setImportStep('memproses')
    try {
      const results = await importMahasiswaCSV(
        importTarget.id,
        validRows.map((r) => ({ nama: r.nama, nim: r.nim, email: r.email })),
      )
      setImportResults(results)
      setImportStep('hasil')
      await queryClient.invalidateQueries({ queryKey: ['kelas', 'byDosen', importTarget.dosen_id] })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Gagal mengimpor mahasiswa.')
      setImportStep('pratinjau')
    }
  }

  function confirmDownloadCredentials() {
    const filename = `kredensial-${(importTarget?.name ?? 'kelas').toLowerCase().replace(/\s+/g, '-')}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`
    downloadCsv(filename, buildCredentialsCsv(importResults))
    setDownloadConfirmOpen(false)
    showToast('File kredensial berhasil diunduh')
  }

  const importSummary = {
    berhasil: importResults.filter((r) => r.status === 'berhasil').length,
    kelasPenuh: importResults.filter((r) => r.status === 'kelas_penuh').length,
    error: importResults.filter((r) => r.status === 'error').length,
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setFormError('')
    setCreating(true)
    try {
      const kelas = await createKelas({ name, angkatan, maxStudents, dosenId: user.id })
      await queryClient.invalidateQueries({ queryKey: ['kelas', 'byDosen', user.id] })
      setName('')
      setAngkatan(CURRENT_YEAR)
      setMaxStudents(40)
      showToast(`Kelas "${kelas.name}" dibuat, kode: ${kelas.code}`)
      setCreateOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal membuat kelas.')
    } finally {
      setCreating(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast(`Kode "${code}" disalin`)
    } catch {
      showToast('Gagal menyalin: salin manual dari layar.')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !user) return
    setDeleting(true)
    try {
      await deleteKelas(deleteTarget.id)
      await queryClient.invalidateQueries({ queryKey: ['kelas', 'byDosen', user.id] })
      showToast(`Kelas "${deleteTarget.name}" dihapus`)
      setDeleteTarget(null)
    } catch {
      showToast('Gagal menghapus kelas. Coba lagi.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <p className="text-sm text-brown-3 mb-4">
        Buat kelas, bagikan kode kelas ke mahasiswa, dan pantau jumlah pendaftar per kelas.
      </p>

      {/* Dua baris kartu (antrean #151). Baris 1: dua golongan hasil tes
          diagnostik, urutannya sama dengan Gambar 1.1 (Belajar mendalam di
          kiri, Jalur cepat di kanan); klik menyaring daftar di bawah. Baris 2:
          total kelas dan mahasiswa. Angkatan pindah jadi pil di kop daftar. */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatCard bar="var(--warning)" val={String(jumlahGolongan('remedial'))} label={GOLONGAN_LABEL.remedial} onClick={() => pilihGolongan('remedial')} aktif={filterGol === 'remedial'} />
        <StatCard bar="var(--success)" val={String(jumlahGolongan('mahir'))} label={GOLONGAN_LABEL.mahir} onClick={() => pilihGolongan('mahir')} aktif={filterGol === 'mahir'} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard bar="var(--terra)" val={String(classes.length)} label="Total Kelas" onClick={keDaftarKelas} />
        <StatCard bar="var(--sage)" val={String(summary.totalStudents)} label="Total Mahasiswa" onClick={keDaftarKelas} />
      </div>

      {/* Daftar kelas, dikelompokkan per angkatan (tahun) */}
      {/* scroll-mt: kop Layout lengket 58 px, tanpa ini judul tertutup sesudah digulir dari kartu angka */}
      <div id="daftar-kelas" className="bg-ivory rounded-2xl border overflow-hidden scroll-mt-20" style={BORDER}>
        <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3.5 border-b" style={BORDER}>
          <span className="text-sm font-semibold text-brown">
            {filterGol ? `Mahasiswa ${GOLONGAN_LABEL[filterGol]} · ${seksiGolongan(filterGol).reduce((n, x) => n + x.baris.length, 0)}` : 'Daftar Kelas'}
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
            {filterGol && (
              <button onClick={() => setFilterGol(null)} className="btn btn-secondary btn-sm whitespace-nowrap">
                Tampilkan Semua Kelas
              </button>
            )}
            <MataKuliahSelect size="sm" />
            <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm whitespace-nowrap">
              + Buat Kelas Baru
            </button>
          </div>
        </div>

        {daftarTahun.length > 1 && (
          <div className="px-4 py-2.5 border-b overflow-x-auto" style={BORDER}>
            <PillGroup
              size="sm"
              ariaLabel="Saring angkatan"
              value={tahun == null ? 'semua' : String(tahun)}
              onChange={(v) => setTahun(v === 'semua' ? null : parseInt(v, 10))}
              options={[
                { value: 'semua', label: 'Semua Angkatan', badge: summary.totalStudents },
                ...daftarTahun.map((t) => ({
                  value: String(t),
                  label: `Angkatan ${t}`,
                  badge: classes.filter((k) => k.angkatan === t).reduce((n, k) => n + k.studentCount, 0),
                })),
              ]}
            />
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-8 text-brown-3 text-sm">Memuat…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 text-brown-3 text-sm">
            Belum ada kelas. Klik "+ Buat kelas baru" di atas.
          </div>
        ) : filterGol ? (
          <div className="p-4">
            <p className="text-xs text-brown-3 mb-3">
              {course?.name ? `Tes diagnostik ${course.name}. ` : ''}Angka di kanan = skor tes diagnostik.
            </p>
            <DaftarSeksi seksi={seksiGolongan(filterGol)} tampilGolongan={false} />
          </div>
        ) : (
          daftarTahun
            .filter((t) => tahun == null || t === tahun)
            .map((year) => {
              const rows = classes.filter((k) => k.angkatan === year)
              return (
                <div key={year} id={`angkatan-${year}`} className="row-divider scroll-mt-20">
                  <div className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-brown-3 bg-bg3">
                    Angkatan {year} <span className="font-normal normal-case">({rows.length} kelas)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-bg3">
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Nama Kelas</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-40">Kode Kelas</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-28">Mahasiswa</th>
                          <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-52">Tes Diagnostik</th>
                          <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-3 w-28">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((k) => {
                          const full = k.studentCount >= k.max_students
                          const anggota = golongan[k.id] ?? []
                          const cepat = anggota.filter((a) => a.golongan === 'mahir').length
                          const dalam = anggota.filter((a) => a.golongan === 'remedial').length
                          return (
                            <tr key={k.id} className="row-divider">
                              <td className="px-3 py-2.5 min-w-[140px]">
                                <button
                                  onClick={() => bukaKelas(k)}
                                  title="Lihat daftar mahasiswa"
                                  aria-label={`Lihat daftar mahasiswa kelas ${k.name}`}
                                  className="min-h-[44px] font-medium text-brown text-left underline decoration-dotted underline-offset-4 hover:decoration-solid cursor-pointer"
                                >
                                  {k.name}
                                </button>
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => void copyCode(k.code)}
                                  title="Salin kode kelas"
                                  aria-label={`Salin kode kelas ${k.code}`}
                                  className="btn btn-secondary whitespace-nowrap font-mono"
                                >
                                  {k.code} <IconLink size={13} />
                                </button>
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                                  style={
                                    full
                                      ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
                                      : { background: 'var(--success-soft)', color: 'var(--success)' }
                                  }
                                >
                                  {k.studentCount}/{k.max_students}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <button
                                  onClick={() => setGolTarget(k)}
                                  title="Lihat dua kelompok hasil tes diagnostik"
                                  aria-label={`Hasil tes diagnostik kelas ${k.name}: ${GOLONGAN_LABEL.mahir} ${cepat}, ${GOLONGAN_LABEL.remedial} ${dalam}`}
                                  className="btn btn-secondary whitespace-nowrap"
                                >
                                  Cepat {cepat} · Mendalam {dalam}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="inline-flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => openImport(k)}
                                    title="Import CSV mahasiswa"
                                    aria-label={`Import CSV mahasiswa ke kelas ${k.name}`}
                                    className="btn btn-secondary btn-icon flex-shrink-0"
                                  >
                                    <IconDocument size={15} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(k)}
                                    aria-label={`Hapus kelas ${k.name}`}
                                    title="Hapus kelas"
                                    className="btn btn-danger btn-icon flex-shrink-0"
                                  >
                                    <IconTrash size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })
        )}
      </div>

      {/* Buat kelas baru — modal (dipindah dari section inline biar halaman
          gak kepanjangan) */}
      {createOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <form
            onSubmit={handleCreate}
            className="bg-ivory rounded-2xl border p-5 max-w-md w-full flex flex-col gap-3.5"
            style={{ ...BORDER, animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brown inline-flex items-center gap-1.5">
                <IconUsers size={16} /> Buat Kelas Baru
              </span>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Tutup"
                className="w-9 h-9 -mr-1.5 rounded-[var(--radius-control)] flex items-center justify-center text-brown-3"
              >
                <IconX size={16} />
              </button>
            </div>
            {formError && (
              <div className="text-danger text-sm rounded-lg px-3 py-2.5 border border-danger/30 bg-danger/10">{formError}</div>
            )}
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
              Nama Kelas
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kelas A"
                required
                maxLength={80}
                autoFocus
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Angkatan
                <input
                  type="number"
                  value={angkatan}
                  onChange={(e) => setAngkatan(parseInt(e.target.value, 10) || CURRENT_YEAR)}
                  min={2000}
                  max={2100}
                  required
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Kapasitas Maksimal
                <input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(parseInt(e.target.value, 10) || 1)}
                  min={1}
                  required
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
            </div>
            <p className="text-[11px] text-brown-3">
              Kode kelas dibuat otomatis secara acak setelah kelas disimpan: tidak bisa diisi manual.
            </p>
            <div className="flex gap-2.5">
              <button type="submit" disabled={creating || !name.trim()} className="btn btn-primary flex-1">
                {creating ? 'Membuat…' : 'Buat Kelas'}
              </button>
              <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-secondary">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hapus kelas — aksi destruktif, WAJIB modal konfirmasi (CLAUDE.md) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus Kelas "{deleteTarget.name}"?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {deleteTarget.studentCount > 0
                ? `Kelas ini punya ${deleteTarget.studentCount} mahasiswa terdaftar. Mereka TIDAK akan terhapus, hanya keluar dari kelas ini (class_id jadi kosong).`
                : 'Tindakan ini tidak dapat dibatalkan.'}
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} disabled={deleting} className="btn btn-danger flex-1">
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dua kelompok hasil tes diagnostik satu kelas (antrean #140) */}
      {golTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl p-5 max-w-2xl w-full max-h-[90dvh] overflow-y-auto" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-semibold text-brown min-w-0">
                Hasil Tes Diagnostik · {golTarget.name} ({golTarget.angkatan})
              </h3>
              <button onClick={() => setGolTarget(null)} aria-label="Tutup" className="btn btn-secondary btn-icon flex-shrink-0">
                <IconX size={15} />
              </button>
            </div>
            <p className="text-xs text-brown-3 mb-4">
              {course?.name ? `${course.name}. ` : ''}Skor {ambangDiagnostik} ke atas masuk {GOLONGAN_LABEL.mahir}, di bawah itu {GOLONGAN_LABEL.remedial}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['remedial', 'mahir'] as const).map((g) => {
                const daftar = (golongan[golTarget.id] ?? []).filter((a) => a.golongan === g)
                return (
                  <div key={g} className="border rounded-xl p-3 min-w-0" style={BORDER}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <ChipRak jenis={GOLONGAN_CHIP[g]} label={GOLONGAN_LABEL[g]} />
                      <span className="text-xs text-brown-3">{daftar.length} mahasiswa</span>
                    </div>
                    {daftar.length === 0 ? (
                      <p className="text-xs text-brown-3">Belum ada.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {daftar.map((a) => (
                          <li key={a.id} className="flex justify-between gap-2 text-sm text-brown-2">
                            <span className="truncate">{a.nama}</span>
                            <span className="tabular-nums text-brown-3 flex-shrink-0">{a.skor}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
            {(() => {
              const belum = (golongan[golTarget.id] ?? []).filter((a) => a.golongan === 'belum')
              return belum.length > 0 ? (
                <p className="text-xs text-brown-3 mt-3">
                  Belum mengerjakan ({belum.length}): {belum.map((a) => a.nama).join(', ')}
                </p>
              ) : null
            })()}
          </div>
        </div>
      )}

      {/* Daftar mahasiswa satu kelas atau satu golongan (antrean #145) */}
      {daftar && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl p-5 max-w-lg w-full max-h-[90dvh] overflow-y-auto" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-semibold text-brown min-w-0">{daftar.judul}</h3>
              <button onClick={tutupDaftar} aria-label="Tutup" className="btn btn-secondary btn-icon flex-shrink-0">
                <IconX size={15} />
              </button>
            </div>
            <p className="text-xs text-brown-3 mb-3">{course?.name ? `Tes diagnostik ${course.name}. ` : ''}Angka di kanan = skor tes diagnostik.</p>
            {bisaDireset.length > 0 && (
              <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                <button
                  onClick={() => setPilih(pilih.size === bisaDireset.length ? new Set() : new Set(bisaDireset.map((a) => a.id)))}
                  className="btn btn-secondary btn-sm"
                >
                  {pilih.size === bisaDireset.length ? 'Lepas Semua' : `Pilih Semua yang Sudah Tes (${bisaDireset.length})`}
                </button>
                <button onClick={() => setKonfirmasiReset(true)} disabled={pilih.size === 0} className="btn btn-danger btn-sm">
                  Reset Tes Diagnostik ({pilih.size})
                </button>
              </div>
            )}
            <DaftarSeksi seksi={daftar.seksi} tampilGolongan={daftar.tampilGolongan} pilih={pilih} onPilih={togglePilih} />
          </div>
        </div>
      )}

      {/* Konfirmasi reset tes diagnostik: menghapus data, tidak bisa dibatalkan */}
      {konfirmasiReset && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Reset Tes Diagnostik {pilih.size} Mahasiswa?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Skor dan jawaban tes diagnostik mereka{course?.name ? ` di ${course.name}` : ''} dihapus, dan mereka harus mengerjakannya lagi sebelum bisa
              membuka materi. Tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setKonfirmasiReset(false)} disabled={mereset} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void jalankanReset()} disabled={mereset} className="btn btn-danger flex-1">
                {mereset ? 'Mereset…' : 'Ya, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV mahasiswa (Tahap 2) — file → pratinjau → konfirmasi (WAJIB,
          bikin banyak akun sekaligus) → proses → hasil + unduh kredensial */}
      {importTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div
            className="bg-ivory rounded-2xl p-5 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-base font-semibold text-brown">
                Import CSV Mahasiswa: {importTarget.name}
              </h3>
              {importStep !== 'memproses' && (
                <button
                  onClick={closeImport}
                  aria-label="Tutup"
                  className="w-11 h-11 -mr-2 rounded-[var(--radius-control)] flex items-center justify-center text-brown-3 flex-shrink-0"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>

            {importError && (
              <div className="text-danger text-sm rounded-lg px-3 py-2.5 border border-danger/30 bg-danger/10 mb-3.5">
                {importError}
              </div>
            )}

            {/* ── Step: pilih file ── */}
            {importStep === 'pilih' && (
              <div className="flex flex-col gap-3.5">
                <p className="text-sm text-brown-3 leading-relaxed">
                  Unggah file CSV dengan kolom <strong className="text-brown-2">nama, nim, email</strong> (baris
                  pertama = header, dilewati otomatis). Tiap baris akan dibuatkan satu akun mahasiswa dengan password
                  otomatis.
                </p>
                <FileInput
                  accept=".csv,text/csv"
                  label="Pilih CSV"
                  hint="CSV, maks 2 MB"
                  maxSizeMb={2}
                  file={csvFile}
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* ── Step: pratinjau ── */}
            {importStep === 'pratinjau' && (
              <div className="flex flex-col gap-3.5">
                <p className="text-xs text-brown-3 truncate">File: {csvFileName}</p>
                <div className="flex gap-2.5 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                    {validRows.length} baris valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                      {invalidRows.length} baris tidak valid (dilewati)
                    </span>
                  )}
                </div>
                <div className="rounded-xl border overflow-hidden" style={BORDER}>
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-bg3">
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3 whitespace-nowrap">Baris</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Nama</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">NIM</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Email</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, 20).map((r, i) => (
                          <tr key={i} className="row-divider">
                            <td className="px-2.5 py-1.5 text-brown-3">{r.line}</td>
                            <td className="px-2.5 py-1.5 text-brown">{r.nama || '—'}</td>
                            <td className="px-2.5 py-1.5 text-brown-2">{r.nim || '—'}</td>
                            <td className="px-2.5 py-1.5 text-brown-2 truncate max-w-[140px]">{r.email || '—'}</td>
                            <td className="px-2.5 py-1.5">
                              {r.valid ? (
                                <span style={{ color: 'var(--success)' }}>Valid</span>
                              ) : (
                                <span className="text-danger" title={r.reason}>
                                  {r.reason}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvRows.length > 20 && (
                    <div className="px-2.5 py-2 text-[11px] text-brown-3 row-divider">
                      +{csvRows.length - 20} baris lainnya tidak ditampilkan di pratinjau ini.
                    </div>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <button onClick={() => setImportStep('pilih')} className="btn btn-secondary flex-1">
                    Pilih File Lain
                  </button>
                  <button onClick={() => setImportStep('konfirmasi')} disabled={validRows.length === 0} className="btn btn-primary flex-1">
                    Lanjutkan ({validRows.length})
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: konfirmasi — WAJIB modal konfirmasi, aksi bikin banyak
                akun sekaligus (CLAUDE.md "Modal Wajib") ── */}
            {importStep === 'konfirmasi' && (
              <div className="flex flex-col gap-3.5">
                <div
                  className="flex gap-2.5 rounded-xl px-3.5 py-3"
                  style={{ background: 'rgba(212,163,115,.10)', border: '1px solid rgba(212,163,115,.3)' }}
                >
                  <IconWarning size={18} />
                  <p className="text-sm text-brown-2 leading-relaxed">
                    Anda akan membuat <strong>{validRows.length} akun mahasiswa baru</strong> dengan password otomatis
                    untuk kelas "{importTarget.name}". Setiap akun langsung aktif (tanpa konfirmasi email). Proses ini{' '}
                    <strong>tidak bisa dibatalkan di tengah jalan</strong> setelah dimulai.
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <button onClick={() => setImportStep('pratinjau')} className="btn btn-secondary flex-1">
                    Batal
                  </button>
                  <button onClick={() => void handleImport()} className="btn btn-primary flex-1">
                    Ya, Impor Sekarang
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: memproses ── */}
            {importStep === 'memproses' && (
              <div className="flex flex-col items-center justify-center gap-3 min-h-[160px] text-center">
                <div
                  className="w-9 h-9 rounded-full border-4 border-brown-3/30 border-t-terra animate-spin"
                  aria-hidden="true"
                />
                <p className="text-sm text-brown-2 font-medium">Memproses {validRows.length} mahasiswa…</p>
                <p className="text-xs text-brown-3 max-w-xs">
                  Mohon tunggu, jangan tutup atau muat ulang halaman ini sampai selesai.
                </p>
              </div>
            )}

            {/* ── Step: hasil ── */}
            {importStep === 'hasil' && (
              <div className="flex flex-col gap-3.5">
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                    {importSummary.berhasil} berhasil
                  </span>
                  {importSummary.kelasPenuh > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                      {importSummary.kelasPenuh} kelas penuh
                    </span>
                  )}
                  {importSummary.error > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-danger/10 text-danger">
                      {importSummary.error} gagal
                    </span>
                  )}
                </div>

                <p className="text-xs text-brown-3 leading-relaxed">
                  Password hanya ditampilkan <strong>satu kali di sini</strong>: unduh sekarang sebelum menutup atau
                  memuat ulang halaman ini, karena tidak akan tersimpan/terlihat lagi setelahnya.
                </p>

                <div className="rounded-xl border overflow-hidden" style={BORDER}>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-bg3">
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Nama</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Email</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Status</th>
                          <th className="text-left px-2.5 py-2 font-semibold text-brown-3">Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.map((r, i) => (
                          <tr key={i} className="row-divider">
                            <td className="px-2.5 py-1.5 text-brown">{r.nama}</td>
                            <td className="px-2.5 py-1.5 text-brown-2 truncate max-w-[140px]">{r.email}</td>
                            <td className="px-2.5 py-1.5">
                              {r.status === 'berhasil' && <span style={{ color: 'var(--success)' }}>Berhasil</span>}
                              {r.status === 'kelas_penuh' && <span style={{ color: 'var(--warning)' }}>Kelas Penuh</span>}
                              {r.status === 'error' && (
                                <span className="text-danger" title={r.error}>
                                  Gagal
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5 font-mono text-brown-2 whitespace-nowrap">{r.password ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button onClick={closeImport} className="btn btn-secondary flex-1">
                    Selesai
                  </button>
                  <button onClick={() => setDownloadConfirmOpen(true)} disabled={importSummary.berhasil === 0} className="btn btn-primary flex-1">
                    <IconDownload size={15} /> Unduh Kredensial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unduh kredensial CSV — konfirmasi dulu (pola sama dengan Analitik.tsx
          "Unduh CSV?"), karena file ini berisi password plaintext. */}
      {downloadConfirmOpen && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ background: 'var(--ivory)', boxShadow: '0 8px 40px rgba(62,54,46,.22)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-bold text-brown mb-2">Unduh Kredensial?</h3>
            <p className="text-sm text-brown-2 mb-6 opacity-80">
              File berisi email &amp; password {importSummary.berhasil} akun mahasiswa akan diunduh ke perangkatmu.
              Simpan dan distribusikan dengan hati-hati.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDownloadConfirmOpen(false)} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={confirmDownloadCredentials} className="btn btn-primary flex-1">
                <IconDownload size={15} /> Unduh
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] max-w-[calc(100vw-3rem)]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

// /kelas — halaman penuh, item rel navigasi sendiri (dosen saja).
export function Kelas() {
  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <h1 className="font-display text-2xl font-bold text-brown mb-1">Kelas</h1>
        <KelasPanel />
      </div>
    </Layout>
  )
}

export default Kelas
