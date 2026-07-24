import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useKelasByDosen } from '../hooks/useKelas'
import {
  createKelas,
  deleteKelas,
  summarizeKelas,
  parseImportCsv,
  importMahasiswaCSV,
  type KelasWithCount,
  type ParsedImportRow,
  type ImportResult,
} from '../lib/kelas'
import { downloadCsv } from '../lib/analitik'
import { Layout } from '../components/Layout'
import { IconTrash, IconLink, IconDocument, IconDownload, IconWarning, IconX, IconUsers } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const
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

// Dosen-only "Kelola Kelas" page — Tahap 1 of the kelas/rombongan-belajar
// feature (see database/migration_v7_kelas.sql for the full context). Dosen
// create a kelas (name + angkatan + capacity, code auto-generated), share
// the code with mahasiswa, and mahasiswa self-register with it
// (Register.tsx's optional "Kode Kelas" field). This page only reads/writes
// through src/lib/kelas.ts — same DataLayer-abstraction convention as every
// other dosen-only management page (see Manajemen.tsx).
export function Kelas() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: classes = [], isLoading } = useKelasByDosen(user?.id)
  const summary = summarizeKelas(classes)

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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
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
    // Reset the input value so choosing the SAME file again (e.g. after
    // fixing it and re-exporting under the same name) still fires onChange.
    e.target.value = ''
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
      showToast(`Kelas "${kelas.name}" dibuat — kode: ${kelas.code}`)
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
      showToast('Gagal menyalin — salin manual dari layar.')
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
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-bold text-brown">Kelola Kelas</h1>
          <p className="text-sm text-brown-3 mt-1">
            Buat kelas, bagikan kode kelas ke mahasiswa, dan pantau jumlah pendaftar per kelas.
          </p>
        </div>

        {/* Ringkasan agregat — total mahasiswa lintas semua kelas + breakdown per angkatan.
            auto-fit (bukan grid-cols tetap) supaya kartu angkatan yang jumlahnya
            berubah-ubah (tergantung berapa angkatan aktif) gak nyisain baris
            terakhir yang cuma keisi 1-2 kartu ganjil. */}
        <div className="grid grid-cols-2 sm:[grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] gap-3 mb-5">
          <StatCard bar="var(--terra)" val={String(classes.length)} label="Total kelas" />
          <StatCard bar="var(--sage)" val={String(summary.totalStudents)} label="Total mahasiswa" />
          {summary.byAngkatan.map((a) => (
            <StatCard key={a.angkatan} bar="#8B7EC8" val={String(a.total)} label={`Angkatan ${a.angkatan}`} />
          ))}
        </div>

        {/* Daftar kelas, dikelompokkan per angkatan (tahun) */}
        <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
          <div className="flex items-center justify-between px-4 py-3.5 border-b" style={BORDER}>
            <span className="text-sm font-semibold text-brown">Daftar Kelas</span>
            <button
              onClick={() => setCreateOpen(true)}
              className="h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap"
              style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
            >
              + Buat Kelas Baru
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-brown-3 text-sm">Memuat…</div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-brown-3 text-sm">
              Belum ada kelas. Klik "+ Buat Kelas Baru" di atas.
            </div>
          ) : (
            Array.from(new Set(classes.map((k) => k.angkatan)))
              .sort((a, b) => b - a)
              .map((year) => {
                const rows = classes.filter((k) => k.angkatan === year)
                return (
                  <div key={year} className="border-t" style={BORDER}>
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
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((k) => {
                            const full = k.studentCount >= k.max_students
                            return (
                              <tr key={k.id} className="border-t" style={BORDER}>
                                <td className="px-3 py-2.5 font-medium text-brown min-w-[140px]">{k.name}</td>
                                <td className="px-3 py-2.5">
                                  <button
                                    onClick={() => void copyCode(k.code)}
                                    title="Salin kode kelas"
                                    aria-label={`Salin kode kelas ${k.code}`}
                                    className="inline-flex items-center gap-1.5 h-11 px-2.5 rounded-md border font-mono text-xs font-semibold text-brown-2 whitespace-nowrap"
                                    style={BORDER}
                                  >
                                    {k.code} <IconLink size={13} />
                                  </button>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span
                                    className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                                    style={
                                      full
                                        ? { background: '#FAD7A0', color: '#7D4E00' }
                                        : { background: '#C0DD97', color: '#27500A' }
                                    }
                                  >
                                    {k.studentCount}/{k.max_students}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => openImport(k)}
                                      title="Import CSV mahasiswa"
                                      aria-label={`Import CSV mahasiswa ke kelas ${k.name}`}
                                      className="w-11 h-11 rounded-md border text-brown-2 flex items-center justify-center flex-shrink-0"
                                      style={BORDER}
                                    >
                                      <IconDocument size={15} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteTarget(k)}
                                      aria-label={`Hapus kelas ${k.name}`}
                                      className="w-11 h-11 rounded-md border border-red/20 bg-red/10 text-red flex items-center justify-center flex-shrink-0"
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
      </div>

      {/* Buat kelas baru — modal (dipindah dari section inline biar halaman
          gak kepanjangan) */}
      {createOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOpen(false)
          }}
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
                className="w-9 h-9 -mr-1.5 rounded-md flex items-center justify-center text-brown-3"
              >
                <IconX size={16} />
              </button>
            </div>
            {formError && (
              <div className="text-red text-sm rounded-lg px-3 py-2.5 border border-red/30 bg-red/10">{formError}</div>
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
                className="h-11 rounded-lg border px-3 text-base text-brown"
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
                  className="h-11 rounded-lg border px-3 text-base text-brown"
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
                  className="h-11 rounded-lg border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
            </div>
            <p className="text-[11px] text-brown-3">
              Kode kelas dibuat otomatis secara acak setelah kelas disimpan — tidak bisa diisi manual.
            </p>
            <div className="flex gap-2.5">
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="flex-1 h-11 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--terra)' }}
              >
                {creating ? 'Membuat…' : 'Buat Kelas'}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-11 px-4 rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
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
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus kelas "{deleteTarget.name}"?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {deleteTarget.studentCount > 0
                ? `Kelas ini punya ${deleteTarget.studentCount} mahasiswa terdaftar. Mereka TIDAK akan terhapus — hanya keluar dari kelas ini (class_id jadi kosong).`
                : 'Tindakan ini tidak dapat dibatalkan.'}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 h-11 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--red)' }}
              >
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
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
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeImport()
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-5 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-base font-semibold text-brown">
                Import CSV Mahasiswa — {importTarget.name}
              </h3>
              {importStep !== 'memproses' && (
                <button
                  onClick={closeImport}
                  aria-label="Tutup"
                  className="w-11 h-11 -mr-2 rounded-md flex items-center justify-center text-brown-3 flex-shrink-0"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>

            {importError && (
              <div className="text-red text-sm rounded-lg px-3 py-2.5 border border-red/30 bg-red/10 mb-3.5">
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
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  aria-label="Pilih file CSV mahasiswa"
                  className="text-sm text-brown-2 file:mr-3 file:h-11 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:text-white file:bg-[var(--terra)] cursor-pointer"
                />
              </div>
            )}

            {/* ── Step: pratinjau ── */}
            {importStep === 'pratinjau' && (
              <div className="flex flex-col gap-3.5">
                <p className="text-xs text-brown-3 truncate">File: {csvFileName}</p>
                <div className="flex gap-2.5 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#C0DD97', color: '#27500A' }}>
                    {validRows.length} baris valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FAD7A0', color: '#7D4E00' }}>
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
                          <tr key={i} className="border-t" style={BORDER}>
                            <td className="px-2.5 py-1.5 text-brown-3">{r.line}</td>
                            <td className="px-2.5 py-1.5 text-brown">{r.nama || '—'}</td>
                            <td className="px-2.5 py-1.5 text-brown-2">{r.nim || '—'}</td>
                            <td className="px-2.5 py-1.5 text-brown-2 truncate max-w-[140px]">{r.email || '—'}</td>
                            <td className="px-2.5 py-1.5">
                              {r.valid ? (
                                <span style={{ color: '#27500A' }}>Valid</span>
                              ) : (
                                <span className="text-red" title={r.reason}>
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
                    <div className="px-2.5 py-2 text-[11px] text-brown-3 border-t" style={BORDER}>
                      +{csvRows.length - 20} baris lainnya tidak ditampilkan di pratinjau ini.
                    </div>
                  )}
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setImportStep('pilih')}
                    className="flex-1 h-11 rounded-lg border text-sm text-brown-2"
                    style={BORDER}
                  >
                    Pilih File Lain
                  </button>
                  <button
                    onClick={() => setImportStep('konfirmasi')}
                    disabled={validRows.length === 0}
                    className="flex-1 h-11 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                    style={{ background: 'var(--terra)' }}
                  >
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
                  <button
                    onClick={() => setImportStep('pratinjau')}
                    className="flex-1 h-11 rounded-lg border text-sm text-brown-2"
                    style={BORDER}
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => void handleImport()}
                    className="flex-1 h-11 rounded-lg text-white text-sm font-semibold"
                    style={{ background: 'var(--color-red)' }}
                  >
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
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#C0DD97', color: '#27500A' }}>
                    {importSummary.berhasil} berhasil
                  </span>
                  {importSummary.kelasPenuh > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FAD7A0', color: '#7D4E00' }}>
                      {importSummary.kelasPenuh} kelas penuh
                    </span>
                  )}
                  {importSummary.error > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red/10 text-red">
                      {importSummary.error} gagal
                    </span>
                  )}
                </div>

                <p className="text-xs text-brown-3 leading-relaxed">
                  Password hanya ditampilkan <strong>satu kali di sini</strong> — unduh sekarang sebelum menutup atau
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
                          <tr key={i} className="border-t" style={BORDER}>
                            <td className="px-2.5 py-1.5 text-brown">{r.nama}</td>
                            <td className="px-2.5 py-1.5 text-brown-2 truncate max-w-[140px]">{r.email}</td>
                            <td className="px-2.5 py-1.5">
                              {r.status === 'berhasil' && <span style={{ color: '#27500A' }}>Berhasil</span>}
                              {r.status === 'kelas_penuh' && <span style={{ color: '#7D4E00' }}>Kelas Penuh</span>}
                              {r.status === 'error' && (
                                <span className="text-red" title={r.error}>
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
                  <button
                    onClick={closeImport}
                    className="flex-1 h-11 rounded-lg border text-sm text-brown-2"
                    style={BORDER}
                  >
                    Selesai
                  </button>
                  <button
                    onClick={() => setDownloadConfirmOpen(true)}
                    disabled={importSummary.berhasil === 0}
                    className="flex-1 h-11 rounded-lg text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    style={{ background: 'var(--terra)' }}
                  >
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
          style={{ background: 'rgba(62,54,46,.52)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDownloadConfirmOpen(false)
          }}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ background: 'var(--ivory)', boxShadow: '0 8px 40px rgba(62,54,46,.22)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-2">Unduh Kredensial?</h3>
            <p className="text-sm text-brown-2 mb-6 opacity-80">
              File berisi email &amp; password {importSummary.berhasil} akun mahasiswa akan diunduh ke perangkatmu.
              Simpan dan distribusikan dengan hati-hati.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDownloadConfirmOpen(false)}
                className="flex-1 min-h-11 rounded-lg font-medium text-sm cursor-pointer"
                style={{ border: '1.5px solid var(--border)', background: 'transparent' }}
              >
                Batal
              </button>
              <button
                onClick={confirmDownloadCredentials}
                className="flex-1 min-h-11 rounded-lg bg-terra text-white font-semibold text-sm cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <IconDownload size={15} /> Unduh
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] max-w-[calc(100vw-3rem)]"
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

export default Kelas
