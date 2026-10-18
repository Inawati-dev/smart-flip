import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { useKelasByDosen } from '../hooks/useKelas'
import {
  deleteKelas,
  summarizeKelas,
  fetchGolonganKelas,
  fetchBelumTes,
  kelasUntukMataKuliah,
  pindahMahasiswa,
  resetDiagnostik,
  hapusMahasiswa,
  fetchBelumKonfirmasi,
  konfirmasiAkun,
  aturSandiMahasiswa,
  MIN_SANDI_SEMENTARA,
  MAKS_SANDI_SEMENTARA,
  type AnggotaGolongan,
  type KelasWithCount,
} from '../lib/kelas'
import { buatKodeAcak, getKodeMataKuliah, kodeMataKuliahSah, rapikanKodeMataKuliah, setKodeMataKuliah } from '../lib/courses'
import { isSupabaseConfigured } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { PasswordInput } from '../components/PasswordInput'
import { StatCard } from '../components/StatCard'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { Select } from '../components/Select'
import { ChipRak } from '../components/KartuTopik'
import { GOLONGAN_LABEL, GOLONGAN_CHIP } from '../lib/golongan'
import { useAmbang } from '../lib/ambang'
import { IconTrash, IconLink, IconX } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

type SeksiMahasiswa = { judul: string | null; baris: AnggotaGolongan[] }

// Daftar mahasiswa per seksi (angkatan dan kelas), dipakai modal daftar kelas
// dan tampilan tersaring di bawah kartu golongan (antrean #145, #150).
// `pilih` + `onPilih`: kotak centang di tiap baris, dipakai reset tes
// diagnostik (antrean #155) dan hapus akun (antrean #174).
function DaftarSeksi({
  seksi,
  tampilGolongan,
  pilih,
  onPilih,
  belumKonfirmasi,
}: {
  seksi: SeksiMahasiswa[]
  tampilGolongan: boolean
  pilih?: Set<string>
  onPilih?: (id: string) => void
  /** Id yang emailnya belum dikonfirmasi (antrean #246). */
  belumKonfirmasi?: Set<string>
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
                {pilih && onPilih ? (
                  <label className="flex items-center gap-2.5 min-w-0 min-h-11 cursor-pointer">
                    <input type="checkbox" checked={pilih.has(a.id)} onChange={() => onPilih(a.id)} aria-label={`Pilih ${a.nama}`} className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate min-w-0">{a.nama}</span>
                  </label>
                ) : (
                  <span className="truncate min-w-0">{a.nama}</span>
                )}
                <span className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {belumKonfirmasi?.has(a.id) && <ChipRak jenis="warn" label="Belum dikonfirmasi" />}
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
// Halaman Kelas dosen. Sejak antrean #228 (migration_v40) kelas terbentuk
// otomatis dari tes diagnostik awal per mata kuliah: dosen tidak membuat
// kelas, tidak membagikan kode kelas, dan tidak mengimpor mahasiswa. Dosen
// membagikan SATU kode mata kuliah, melihat kelas otomatis (kuota 25),
// daftar yang belum tes, dan bisa memindahkan mahasiswa antar kelas lewat modal.
//
// Dirender oleh Kelas() di bawah sebagai halaman penuh /kelas, item rel
// navigasi sendiri (Layout.tsx) — koreksi Johan 16 Sep 2026 "page kelas ini
// dipindah jadi sidebar yaa biar enak mantau", membatalkan percobaan
// sebelumnya di hari yang sama yang sempat menjadikannya tab di Akun.tsx.
export function KelasPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: semuaKelas = [], isLoading } = useKelasByDosen(user?.id)
  const { courseId, course } = useCourse()
  // Kelas otomatis mata kuliah terpilih, lalu kelas lama buatan dosen (antrean #228).
  const classes = kelasUntukMataKuliah(semuaKelas, courseId)
  const summary = summarizeKelas(classes)

  // Dua kelompok hasil tes diagnostik per kelas (antrean #140). Tes itu per
  // mata kuliah, jadi daftar ini ikut mata kuliah yang dipilih.
  const ambangDiagnostik = useAmbang().diagnostik
  const { data: belumTes = [] } = useQuery({ queryKey: ['belum-tes', courseId], queryFn: () => fetchBelumTes(courseId) })
  const kode = useQuery({ queryKey: ['kode-mk', courseId], queryFn: () => getKodeMataKuliah(courseId), enabled: isSupabaseConfigured })
  const idKelas = classes.map((k) => k.id)
  const { data: golongan = {} } = useQuery({
    queryKey: ['golongan-kelas', courseId, ambangDiagnostik, idKelas.join(',')],
    queryFn: () => fetchGolonganKelas(idKelas, courseId, ambangDiagnostik),
    enabled: idKelas.length > 0,
  })
  const [golTarget, setGolTarget] = useState<KelasWithCount | null>(null)
  // Daftar mahasiswa (antrean #145): satu kelas penuh, atau satu golongan
  // lintas kelas yang dipecah per angkatan dan kelas.
  // kelasAsal: kelas otomatis yang daftarnya dibuka; hanya daftar seperti itu yang bisa dipindahkan.
  const [daftar, setDaftar] = useState<{ judul: string; tampilGolongan: boolean; seksi: SeksiMahasiswa[]; kelasAsal?: string } | null>(null)
  const jumlahGolongan = (g: 'mahir' | 'remedial') =>
    classes.reduce((n, k) => n + (golongan[k.id] ?? []).filter((a) => a.golongan === g).length, 0)
  // Angkatan jadi satu dropdown penyaring di kop daftar (antrean #151, lalu
  // #175 "dibuat dropdown saja"): bilahnya tidak memanjang tiap angkatan baru.
  const [tahunDipilih, setTahun] = useState<number | null>(null)
  const daftarTahun = Array.from(new Set(classes.map((k) => k.angkatan))).sort((a, b) => b - a)
  // Angkatan terpilih yang sudah tidak ada (kelasnya dihapus) dianggap "semua",
  // supaya daftar tidak kosong tanpa dropdown untuk membatalkannya.
  const tahun = tahunDipilih != null && daftarTahun.includes(tahunDipilih) ? tahunDipilih : null
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
  const semuaBaris = (daftar?.seksi ?? []).flatMap((x) => x.baris)
  // Reset hanya berlaku bagi yang sudah punya skor; hapus akun berlaku bagi semua yang dicentang.
  const dipilihBisaDireset = semuaBaris.filter((a) => a.skor != null && pilih.has(a.id)).map((a) => a.id)
  // Hapus akun mahasiswa yang dicentang (antrean #174): permanen, jadi lewat modal konfirmasi.
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false)
  const [menghapus, setMenghapus] = useState(false)
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
    setKonfirmasiHapus(false)
    setPindahOpen(false)
    setKonfirmasiAkunOpen(false)
    tutupSandi()
  }
  // Daftar Akun Mahasiswa (antrean #253): semua mahasiswa mata kuliah ini, berkelas maupun belum tes,
  // dengan aksi per baris yang langsung terlihat (sebelumnya hanya di modal daftar sesudah dicentang).
  const akun = [
    ...classes.flatMap((k) => (golongan[k.id] ?? []).map((a) => ({ id: a.id, nama: a.nama, nim: a.nim ?? null, angkatan: a.angkatan ?? (String(k.angkatan) as string | null), kelas: k.name as string | null }))),
    ...belumTes.map((b) => ({ id: b.id, nama: b.nama, nim: b.nim ?? null, angkatan: b.angkatan ?? null, kelas: null })),
  ].sort((a, b) => a.nama.localeCompare(b.nama))
  // Tautan /kelas#akun-mahasiswa (dari kartu Notifikasi di Akun) menggulir ke daftar begitu datanya tampil.
  const adaAkun = akun.length > 0
  useEffect(() => {
    if (adaAkun && window.location.hash === '#akun-mahasiswa') gulirKe('akun-mahasiswa')
  }, [adaAkun])
  // Akun mahasiswa berEmail rekaan (antrean #246): status, konfirmasi, sandi sementara.
  const idStatus = Array.from(new Set([...akun.map((a) => a.id), ...semuaBaris.map((a) => a.id)])).sort()
  const { data: belumKonfirmasi = new Set<string>() } = useQuery({
    queryKey: ['status-konfirmasi', idStatus.join(',')],
    queryFn: () => fetchBelumKonfirmasi(idStatus),
    enabled: idStatus.length > 0,
  })
  const dipilihBelumKonfirmasi = [...pilih].filter((id) => belumKonfirmasi.has(id))
  // nama satu-satunya yang dipilih, untuk judul modal aksi dari daftar Akun Mahasiswa
  const namaTunggal = pilih.size === 1 ? [...akun, ...semuaBaris].find((a) => pilih.has(a.id))?.nama : undefined
  const [konfirmasiAkunOpen, setKonfirmasiAkunOpen] = useState(false)
  const [mengonfirmasi, setMengonfirmasi] = useState(false)
  async function jalankanKonfirmasiAkun() {
    setMengonfirmasi(true)
    try {
      const n = await konfirmasiAkun(dipilihBelumKonfirmasi)
      await queryClient.invalidateQueries({ queryKey: ['status-konfirmasi'] })
      showToast(n > 0 ? `${n} akun dikonfirmasi. Mahasiswa sudah bisa masuk.` : 'Tidak ada akun yang berubah.')
      setKonfirmasiAkunOpen(false)
    } catch (e) {
      showToast((e as { message?: string } | null)?.message || 'Gagal mengonfirmasi akun')
      setKonfirmasiAkunOpen(false)
    } finally {
      setMengonfirmasi(false)
    }
  }
  const [sandiTarget, setSandiTarget] = useState<{ id: string; nama: string } | null>(null)
  const [sandiBaru, setSandiBaru] = useState('')
  const [sandiGalat, setSandiGalat] = useState('')
  const [sandiSelesai, setSandiSelesai] = useState(false)
  const [menyimpanSandi, setMenyimpanSandi] = useState(false)
  function bukaSandi() {
    const id = [...pilih][0]
    const a = semuaBaris.find((b) => b.id === id)
    if (a) bukaSandiUntuk(a)
  }
  function bukaSandiUntuk(a: { id: string; nama: string }) {
    setSandiTarget({ id: a.id, nama: a.nama })
    setSandiBaru('')
    setSandiGalat('')
    setSandiSelesai(false)
  }
  function tutupSandi() {
    setSandiTarget(null)
    setSandiBaru('') // sandi tidak disimpan di mana pun sesudah modal ditutup
    setSandiGalat('')
    setSandiSelesai(false)
  }
  async function simpanSandi() {
    if (!sandiTarget) return
    setMenyimpanSandi(true)
    setSandiGalat('')
    try {
      await aturSandiMahasiswa(sandiTarget.id, sandiBaru)
      setSandiBaru('')
      setSandiSelesai(true)
    } catch (e) {
      setSandiGalat((e as { message?: string } | null)?.message || 'Gagal mengatur ulang kata sandi.')
    } finally {
      setMenyimpanSandi(false)
    }
  }
  // Pindah kelas (antrean #228): ke kelas otomatis lain di mata kuliah ini.
  const [pindahOpen, setPindahOpen] = useState(false)
  const [tujuan, setTujuan] = useState('')
  const [memindah, setMemindah] = useState(false)
  const kelasTujuan = classes.filter((k) => k.golongan && k.id !== daftar?.kelasAsal)
  function bukaPindah() {
    setTujuan(kelasTujuan[0]?.id ?? '')
    setPindahOpen(true)
  }
  async function jalankanPindah() {
    if (!tujuan) return
    setMemindah(true)
    let berhasil = 0
    let galat = ''
    for (const id of pilih) {
      try {
        await pindahMahasiswa(id, tujuan)
        berhasil++
      } catch (e) {
        galat = (e as { message?: string } | null)?.message || 'Gagal memindahkan'
        break
      }
    }
    await queryClient.invalidateQueries({ queryKey: ['kelas'] })
    await queryClient.invalidateQueries({ queryKey: ['golongan-kelas'] })
    setMemindah(false)
    const nama = classes.find((k) => k.id === tujuan)?.name ?? 'kelas tujuan'
    showToast(galat ? `${berhasil} dipindahkan ke ${nama}. Berhenti: ${galat}` : `${berhasil} mahasiswa dipindahkan ke ${nama}`)
    if (berhasil > 0) tutupDaftar()
    else setPindahOpen(false)
  }
  async function jalankanHapus() {
    setMenghapus(true)
    try {
      const terhapus = await hapusMahasiswa([...pilih])
      await queryClient.invalidateQueries({ queryKey: ['golongan-kelas'] })
      await queryClient.invalidateQueries({ queryKey: ['kelas'] })
      await queryClient.invalidateQueries({ queryKey: ['belum-tes'] })
      showToast(
        terhapus > 0
          ? `${terhapus} akun mahasiswa dihapus`
          : 'Tidak ada akun yang terhapus. Hanya mahasiswa di kelas atau mata kuliah Anda yang bisa dihapus.',
      )
      await queryClient.invalidateQueries({ queryKey: ['status-konfirmasi'] })
      if (terhapus > 0) tutupDaftar()
      else setKonfirmasiHapus(false)
    } catch (e) {
      showToast((e as { message?: string } | null)?.message || 'Gagal menghapus akun')
      setKonfirmasiHapus(false)
    } finally {
      setMenghapus(false)
    }
  }
  async function jalankanReset() {
    setMereset(true)
    try {
      const { dihapus: terhapus, dikeluarkan, jalurLama } = await resetDiagnostik(dipilihBisaDireset, courseId)
      await queryClient.invalidateQueries({ queryKey: ['golongan-kelas'] })
      await queryClient.invalidateQueries({ queryKey: ['kelas'] })
      await queryClient.invalidateQueries({ queryKey: ['belum-tes'] })
      showToast(
        terhapus > 0
          ? jalurLama
            ? `Tes diagnostik ${dipilihBisaDireset.length} mahasiswa direset, tetapi mereka masih di kelasnya: jalankan migration_v47_reset_diagnostik_kelas.sql di Supabase.`
            : `Tes diagnostik ${dipilihBisaDireset.length} mahasiswa direset${dikeluarkan > 0 ? `; ${dikeluarkan} keluar dari kelas dan diarahkan ke tes lagi saat masuk` : ''}`
          : 'Tidak ada yang direset. Mahasiswa ini tidak ada di kelas atau mata kuliah Anda.',
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
    setDaftar({
      judul: `Daftar Mahasiswa · ${k.name} (${k.angkatan})`,
      tampilGolongan: true,
      seksi: [{ judul: null, baris: golongan[k.id] ?? [] }],
      kelasAsal: k.golongan ? k.id : undefined,
    })
  }
  function bukaBelumTes() {
    setPilih(new Set())
    setDaftar({
      judul: `Belum Tes Diagnostik · ${belumTes.length}`,
      tampilGolongan: false,
      seksi: [{ judul: null, baris: belumTes.map((b) => ({ id: b.id, nama: b.nama, skor: null, golongan: 'belum' as const })) }],
    })
  }

  // Kode mata kuliah untuk mendaftar (antrean #228): lihat, salin, ganti lewat modal.
  const [kodeOpen, setKodeOpen] = useState(false)
  const [kodeDraft, setKodeDraft] = useState('')
  const [kodeError, setKodeError] = useState('')
  const [menyimpanKode, setMenyimpanKode] = useState(false)
  function bukaKode() {
    setKodeDraft(kode.data ?? buatKodeAcak())
    setKodeError('')
    setKodeOpen(true)
  }
  async function simpanKode() {
    setMenyimpanKode(true)
    setKodeError('')
    try {
      await setKodeMataKuliah(courseId, kodeDraft)
      await queryClient.invalidateQueries({ queryKey: ['kode-mk', courseId] })
      setKodeOpen(false)
      showToast('Kode mata kuliah disimpan. Kode lama tidak berlaku lagi.')
    } catch (e) {
      setKodeError((e as { message?: string } | null)?.message || 'Gagal menyimpan kode.')
    } finally {
      setMenyimpanKode(false)
    }
  }

  const [toast, setToast] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KelasWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
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
        Kelas terbentuk otomatis dari tes diagnostik awal: skor {ambangDiagnostik} ke atas masuk {GOLONGAN_LABEL.mahir}, di bawahnya{' '}
        {GOLONGAN_LABEL.remedial}, paling banyak 25 mahasiswa per kelas. Mahasiswa mendaftar dengan kode mata kuliah di bawah.
      </p>

      {/* Kode mata kuliah: satu kode untuk semua mahasiswa mata kuliah ini (antrean #228). */}
      <div className="bg-ivory rounded-2xl border px-4 py-3.5 mb-3 flex items-center justify-between gap-3 flex-wrap" style={BORDER}>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-brown-3">Kode Mata Kuliah{course?.name ? ` · ${course.name}` : ''}</div>
          {kode.isLoading ? (
            <div className="text-sm text-brown-3">Memuat…</div>
          ) : kode.error ? (
            <div className="text-sm text-danger">Kode belum bisa dibaca. Jalankan migration_v40_kelas_otomatis.sql di Supabase dulu.</div>
          ) : kode.data ? (
            <div className="text-lg font-bold tracking-wider text-brown break-all">{kode.data}</div>
          ) : (
            <div className="text-sm text-warning">
              {isSupabaseConfigured ? 'Belum ada kode: mahasiswa baru belum bisa mendaftar ke mata kuliah ini.' : 'Tidak tersedia di mode demo.'}
            </div>
          )}
        </div>
        {isSupabaseConfigured && !kode.error && (
          <div className="flex gap-2 flex-wrap">
            {kode.data && (
              <button onClick={() => void copyCode(kode.data as string)} className="btn btn-secondary btn-sm whitespace-nowrap">
                <IconLink size={13} /> Salin
              </button>
            )}
            <button onClick={bukaKode} disabled={kode.isLoading} className="btn btn-primary btn-sm whitespace-nowrap">
              {kode.data ? 'Ganti Kode' : 'Atur Kode'}
            </button>
          </div>
        )}
      </div>

      {belumTes.length > 0 && (
        <div className="bg-ivory rounded-2xl border px-4 py-3 mb-3 flex items-center justify-between gap-3 flex-wrap" style={BORDER}>
          <span className="text-sm text-brown-2">
            {belumTes.length} mahasiswa belum tes diagnostik, jadi belum punya kelas. Mereka diarahkan ke tes itu saat masuk.
          </span>
          <button onClick={bukaBelumTes} className="btn btn-secondary btn-sm whitespace-nowrap">
            Lihat Daftar
          </button>
        </div>
      )}

      {/* Dua baris kartu (antrean #151). Baris 1: dua golongan hasil tes
          diagnostik, urutannya sama dengan Gambar 1.1 (Belajar mendalam di
          kiri, Jalur cepat di kanan); klik menyaring daftar di bawah. Baris 2:
          total kelas dan mahasiswa. Angkatan pindah jadi dropdown di kop daftar. */}
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
            {daftarTahun.length > 1 && (
              <Select
                size="sm"
                aria-label="Saring angkatan"
                value={tahun == null ? 'semua' : String(tahun)}
                onChange={(v) => setTahun(v === 'semua' ? null : parseInt(v, 10))}
                options={[
                  { value: 'semua', label: `Semua Angkatan (${summary.totalStudents})` },
                  ...daftarTahun.map((t) => ({
                    value: String(t),
                    label: `Angkatan ${t} (${classes.filter((k) => k.angkatan === t).reduce((n, k) => n + k.studentCount, 0)})`,
                  })),
                ]}
              />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-brown-3 text-sm">Memuat…</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-8 px-4 text-brown-3 text-sm">
            Belum ada kelas di mata kuliah ini. Kelas terbentuk sendiri begitu mahasiswa pertama selesai tes diagnostik.
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
                                {!k.golongan && <div className="text-[11px] text-brown-3">Kelas lama, sebelum kelas otomatis</div>}
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
                                {/* Kelas otomatis tidak dihapus: urutan A, B, ... dikelola basis data. */}
                                {k.golongan ? (
                                  <button onClick={() => bukaKelas(k)} className="btn btn-secondary btn-sm whitespace-nowrap">
                                    Kelola
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setDeleteTarget(k)}
                                    aria-label={`Hapus kelas ${k.name}`}
                                    title="Hapus kelas lama"
                                    className="btn btn-danger btn-icon flex-shrink-0"
                                  >
                                    <IconTrash size={15} />
                                  </button>
                                )}
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

      {/* Akun Mahasiswa (antrean #253): aksi akun per baris tanpa membuka modal daftar */}
      {akun.length > 0 && (
        <div id="akun-mahasiswa" className="bg-ivory rounded-2xl border overflow-hidden mt-5" style={BORDER}>
          <div className="px-4 py-3.5 border-b" style={BORDER}>
            <span className="text-sm font-semibold text-brown">Akun Mahasiswa · {akun.length}</span>
            <p className="text-xs text-brown-3 mt-0.5">
              Konfirmasi akun yang emailnya belum dikonfirmasi, beri kata sandi sementara, atau hapus akun. Tiap aksi meminta konfirmasi dulu.
            </p>
          </div>
          <ul className="flex flex-col px-4">
            {akun.map((a) => (
              <li key={a.id} className="row-divider flex items-center justify-between gap-x-3 gap-y-2 py-2.5 flex-wrap">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="text-sm font-medium text-brown truncate">{a.nama}</div>
                  <div className="text-xs text-brown-3 flex items-center gap-1.5 flex-wrap">
                    <span>{a.nim || 'NIM belum diisi'}</span>
                    <span aria-hidden>·</span>
                    <span>{a.angkatan ? `Angkatan ${a.angkatan}` : 'Angkatan belum diisi'}</span>
                    <span aria-hidden>·</span>
                    <span>{a.kelas ?? 'Belum tes diagnostik'}</span>
                    {belumKonfirmasi.has(a.id) && <ChipRak jenis="warn" label="Belum dikonfirmasi" />}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {belumKonfirmasi.has(a.id) && (
                    <button
                      onClick={() => {
                        setPilih(new Set([a.id]))
                        setKonfirmasiAkunOpen(true)
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Konfirmasi Akun
                    </button>
                  )}
                  <button onClick={() => bukaSandiUntuk(a)} className="btn btn-secondary btn-sm">
                    Atur Ulang Kata Sandi
                  </button>
                  <button
                    onClick={() => {
                      setPilih(new Set([a.id]))
                      setKonfirmasiHapus(true)
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Hapus Akun
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hapus kelas — aksi destruktif, WAJIB modal konfirmasi (CLAUDE.md) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus Kelas "{deleteTarget.name}"?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {deleteTarget.studentCount > 0
                ? `Kelas ini punya ${deleteTarget.studentCount} mahasiswa terdaftar. Mereka TIDAK akan terhapus, hanya keluar dari kelas ini.`
                : 'Tugas atau tes yang pernah ditujukan ke kelas ini tidak lagi menyebut kelasnya. Tidak dapat dibatalkan.'}
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
          <div className="bg-ivory rounded-2xl modal-lebar p-5" style={{ animation: 'slideUpModal 0.22s ease' }}>
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
          <div className="bg-ivory rounded-2xl modal-lebar p-5" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-semibold text-brown min-w-0">{daftar.judul}</h3>
              <button onClick={tutupDaftar} aria-label="Tutup" className="btn btn-secondary btn-icon flex-shrink-0">
                <IconX size={15} />
              </button>
            </div>
            <p className="text-xs text-brown-3 mb-3">{course?.name ? `Tes diagnostik ${course.name}. ` : ''}Angka di kanan = skor tes diagnostik.</p>
            {semuaBaris.length > 0 && (
              // Bilah aksi dua baris (antrean #256, "rapikan juga ini tombol-tombol nya"): baris pilih,
              // lalu aksi; di telepon aksi jadi dua kolom selebar penuh, Hapus Akun selalu di ujung.
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPilih(pilih.size === semuaBaris.length ? new Set() : new Set(semuaBaris.map((a) => a.id)))}
                    className="btn btn-secondary btn-sm"
                  >
                    {pilih.size === semuaBaris.length ? 'Lepas Semua' : `Pilih Semua (${semuaBaris.length})`}
                  </button>
                  <span className="text-xs text-brown-3">{pilih.size} dipilih</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  {daftar.kelasAsal && (
                    <button onClick={bukaPindah} disabled={pilih.size === 0 || kelasTujuan.length === 0} className="btn btn-secondary btn-sm">
                      Pindahkan ({pilih.size})
                    </button>
                  )}
                  <button
                    onClick={() => setKonfirmasiReset(true)}
                    disabled={dipilihBisaDireset.length === 0}
                    title="Hanya berlaku bagi mahasiswa yang sudah mengerjakan tes diagnostik"
                    className="btn btn-secondary btn-sm"
                  >
                    Reset Tes Diagnostik ({dipilihBisaDireset.length})
                  </button>
                  <button
                    onClick={() => setKonfirmasiAkunOpen(true)}
                    disabled={dipilihBelumKonfirmasi.length === 0}
                    title="Untuk mahasiswa yang emailnya belum dikonfirmasi"
                    className="btn btn-secondary btn-sm"
                  >
                    Konfirmasi Akun ({dipilihBelumKonfirmasi.length})
                  </button>
                  <button onClick={bukaSandi} disabled={pilih.size !== 1} title="Pilih tepat satu mahasiswa" className="btn btn-secondary btn-sm">
                    Atur Ulang Kata Sandi
                  </button>
                  <button onClick={() => setKonfirmasiHapus(true)} disabled={pilih.size === 0} className="btn btn-danger btn-sm sm:ml-auto">
                    Hapus Akun ({pilih.size})
                  </button>
                </div>
              </div>
            )}
            <DaftarSeksi seksi={daftar.seksi} tampilGolongan={daftar.tampilGolongan} pilih={pilih} onPilih={togglePilih} belumKonfirmasi={belumKonfirmasi} />
          </div>
        </div>
      )}

      {/* Konfirmasi akun mahasiswa yang emailnya belum dikonfirmasi (antrean #246) */}
      {konfirmasiAkunOpen && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">{namaTunggal ? `Konfirmasi Akun ${namaTunggal}?` : `Konfirmasi ${dipilihBelumKonfirmasi.length} Akun Mahasiswa?`}</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Akun dianggap sudah mengonfirmasi email, jadi mahasiswa bisa langsung masuk. Pakai hanya untuk mahasiswa yang Anda kenal.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setKonfirmasiAkunOpen(false)} disabled={mengonfirmasi} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void jalankanKonfirmasiAkun()} disabled={mengonfirmasi} className="btn btn-primary flex-1">
                {mengonfirmasi ? 'Mengonfirmasi…' : 'Ya, Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Atur ulang kata sandi satu mahasiswa (antrean #246). Sandi tidak ditampilkan lagi sesudah disimpan. */}
      {sandiTarget && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void simpanSandi()
            }}
            className="bg-ivory rounded-2xl modal-sempit p-6 flex flex-col gap-3.5"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="text-base font-semibold text-brown">Atur Ulang Kata Sandi · {sandiTarget.nama}</h3>
            {sandiSelesai ? (
              <>
                <p className="text-sm text-brown-2 leading-relaxed">
                  Kata sandi sementara sudah disimpan. Sampaikan langsung ke {sandiTarget.nama} (bukan lewat grup). Ia masuk dengan sandi ini mulai sekarang.
                  {belumKonfirmasi.has(sandiTarget.id) ? ' Akunnya belum dikonfirmasi: tekan juga Konfirmasi Akun supaya ia bisa masuk.' : ''}
                </p>
                <button type="button" onClick={tutupSandi} className="btn btn-primary">
                  Selesai
                </button>
              </>
            ) : (
              <>
                {sandiGalat && <div className="text-danger text-sm rounded-lg px-3 py-2.5 border border-danger/30 bg-danger/10">{sandiGalat}</div>}
                <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                  Kata sandi sementara
                  <PasswordInput
                    value={sandiBaru}
                    onChange={(e) => setSandiBaru(e.target.value)}
                    minLength={MIN_SANDI_SEMENTARA}
                    maxLength={MAKS_SANDI_SEMENTARA}
                    autoComplete="new-password"
                    autoFocus
                    className="w-full h-11 rounded-[var(--radius-control)] border px-3 text-base font-normal text-brown"
                    style={BORDER}
                  />
                </label>
                <p className="text-[13px] text-brown-3 leading-relaxed">
                  Minimal {MIN_SANDI_SEMENTARA} karakter. Sesudah disimpan, mahasiswa tidak bisa lagi masuk dengan sandi lama; perangkat yang sedang masuk tidak otomatis keluar.
                </p>
                <div className="flex gap-2.5">
                  <button type="button" onClick={tutupSandi} disabled={menyimpanSandi} className="btn btn-secondary flex-1">
                    Batal
                  </button>
                  <button type="submit" disabled={menyimpanSandi || sandiBaru.length < MIN_SANDI_SEMENTARA || !sandiBaru.trim()} className="btn btn-primary flex-1">
                    {menyimpanSandi ? 'Menyimpan…' : 'Simpan'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Konfirmasi hapus akun mahasiswa (antrean #174): permanen */}
      {konfirmasiHapus && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">{namaTunggal ? `Hapus Akun ${namaTunggal}?` : `Hapus ${pilih.size} Akun Mahasiswa?`}</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Akun yang dipilih dihapus permanen beserta seluruh pengerjaannya: tes, progres baca, dan kiriman. Mahasiswa itu tidak bisa masuk lagi.
              Tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setKonfirmasiHapus(false)} disabled={menghapus} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void jalankanHapus()} disabled={menghapus} className="btn btn-danger flex-1">
                {menghapus ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi reset tes diagnostik: menghapus data, tidak bisa dibatalkan */}
      {konfirmasiReset && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Reset Tes Diagnostik {dipilihBisaDireset.length} Mahasiswa?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Skor dan jawaban tes diagnostik mereka{course?.name ? ` di ${course.name}` : ''} dihapus, dan mereka harus mengerjakannya lagi sebelum bisa
              membuka materi. Kelasnya ditentukan ulang dari tes berikutnya. Tidak bisa dibatalkan.
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

      {/* Pindahkan mahasiswa terpilih ke kelas lain (antrean #228). Kuota dicek basis data. */}
      {pindahOpen && (
        <div
          className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 flex flex-col gap-3.5" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown">Pindahkan {pilih.size} Mahasiswa</h3>
            <Select
              label="Kelas tujuan"
              value={tujuan}
              onChange={setTujuan}
              options={kelasTujuan.map((k) => ({ value: k.id, label: `${k.name} · ${k.angkatan} (${k.studentCount}/${k.max_students})` }))}
            />
            <p className="text-xs text-brown-3 leading-relaxed">Kelas yang sudah penuh menolak tambahan; mahasiswa yang belum pindah tetap di kelasnya.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setPindahOpen(false)} disabled={memindah} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void jalankanPindah()} disabled={memindah || !tujuan} className="btn btn-primary flex-1">
                {memindah ? 'Memindahkan…' : 'Pindahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Atur atau ganti kode mata kuliah (antrean #228). */}
      {kodeOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void simpanKode()
            }}
            className="bg-ivory rounded-2xl modal-sedang border p-5 flex flex-col gap-3.5"
            style={{ ...BORDER, animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-brown min-w-0">Kode Mata Kuliah{course?.name ? ` · ${course.name}` : ''}</span>
              <button
                type="button"
                onClick={() => setKodeOpen(false)}
                aria-label="Tutup"
                className="w-9 h-9 -mr-1.5 rounded-[var(--radius-control)] flex items-center justify-center text-brown-3 flex-shrink-0"
              >
                <IconX size={16} />
              </button>
            </div>
            {kodeError && <div className="text-danger text-sm rounded-lg px-3 py-2.5 border border-danger/30 bg-danger/10">{kodeError}</div>}
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
              Kode
              <input
                value={kodeDraft}
                onChange={(e) => setKodeDraft(e.target.value)}
                maxLength={20}
                autoFocus
                autoCapitalize="characters"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown tracking-wider"
                style={BORDER}
              />
            </label>
            <p className="text-[11px] text-brown-3 leading-relaxed">
              6 sampai 20 huruf, angka, atau tanda hubung. Hanya dosen pengampu mata kuliah ini yang bisa menggantinya. Kode lama langsung tidak berlaku; akun yang sudah terdaftar tidak terpengaruh.
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <button type="button" onClick={() => setKodeDraft(buatKodeAcak())} className="btn btn-secondary">
                Buat Acak
              </button>
              <button
                type="submit"
                disabled={menyimpanKode || !kodeMataKuliahSah(kodeDraft) || rapikanKodeMataKuliah(kodeDraft) === kode.data}
                className="btn btn-primary flex-1"
              >
                {menyimpanKode ? 'Menyimpan…' : 'Simpan Kode'}
              </button>
            </div>
          </form>
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
