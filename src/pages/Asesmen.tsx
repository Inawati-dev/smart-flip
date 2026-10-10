import { useMemo, useState } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { KelasTahunFilter } from '../components/KelasTahunFilter'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { GrafikBatang } from '../components/GrafikBatang'
import { IconChart, IconClipboard, IconTrendingUp, IconUsers } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { useKelasByDosen } from '../hooks/useKelas'
import { cocokFilter } from '../lib/kelas'
import {
  fetchAsesmenAttempts,
  fetchAttemptsPrePost,
  hitungPeningkatanKelas,
  pakaiFormatifSebagaiPost,
  rekapPerModul,
  type PeningkatanMahasiswa,
} from '../lib/asesmen'
import type { NGainCategory } from '../lib/ngain'
import { ambangDari } from '../lib/ambang'
import { updateCourse, isMissingCourseSchema, type Course } from '../lib/courses'
import { ChipRak } from '../components/KartuTopik'
import { golonganDariSkor, GOLONGAN_LABEL, GOLONGAN_CHIP } from '../lib/golongan'
import { fetchProjectsDosen, fetchSubmissionsDosen } from '../lib/tugasAkhir'
import { bobotPaket, briefPaket, nilaiMiniProjek } from '../lib/paketProposal'

const BORDER = { borderColor: 'var(--border)' } as const

const KATEGORI_LABEL: Record<NGainCategory, string> = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' }
const KATEGORI_CLASS: Record<NGainCategory, string> = {
  tinggi: 'bg-sage/20 text-sage-d',
  sedang: 'bg-terra/20 text-terra-d',
  rendah: 'bg-danger/10 text-danger',
}
const KATEGORI_BAR: Record<NGainCategory, string> = {
  tinggi: 'var(--sage)',
  sedang: 'var(--terra)',
  rendah: 'var(--danger)',
}

function formatSkor(v: number | null): string {
  return v == null ? '—' : String(Math.round(v))
}

function formatGain(v: number | null): string {
  return v == null ? '—' : v.toFixed(2).replace('.', ',')
}

// Dua warna saja, mengikuti batas lulus formatif mata kuliah (lib/ambang.ts).
function scoreClass(score: number, ambang: number): string {
  return score >= ambang ? 'text-sage-d' : 'text-danger'
}

// Modal "Batas skor" (antrean #136): dosen mengatur batas golongan tes
// diagnostik dan batas lulus formatif untuk mata kuliah yang sedang dipilih.
function BatasSkorModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const queryClient = useQueryClient()
  const awal = ambangDari(course)
  const [diagnostik, setDiagnostik] = useState(String(awal.diagnostik))
  const [formatif, setFormatif] = useState(String(awal.formatif))
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')
  const d = Number(diagnostik)
  const f = Number(formatif)
  const sah = diagnostik !== '' && formatif !== '' && [d, f].every((n) => Number.isInteger(n) && n >= 0 && n <= 100)

  async function simpan() {
    setSaving(true)
    setGalat('')
    try {
      await updateCourse(course.id, { ambang_diagnostik: d, ambang_formatif: f })
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      onClose()
    } catch (e) {
      setGalat(
        isMissingCourseSchema(e)
          ? 'Kolom batas skor belum ada di basis data. Jalankan migration_v27_batas_skor.sql di Supabase dulu.'
          : (e as { message?: string } | null)?.message || 'Gagal menyimpan batas skor',
      )
    } finally {
      setSaving(false)
    }
  }

  const KOTAK = 'w-full h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown tabular-nums'
  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div className="bg-ivory rounded-2xl p-5 max-w-md w-full max-h-[90dvh] overflow-y-auto" style={{ animation: 'slideUpModal 0.22s ease' }}>
        <h3 className="text-base font-semibold text-brown mb-1">Batas Skor</h3>
        <p className="text-xs text-brown-3 mb-4">{course.name}. Berlaku juga untuk pengerjaan yang sudah ada.</p>
        <div className="flex flex-col gap-3 mb-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
            Tes diagnostik awal: skor mulai dari sini masuk Jalur cepat
            <input type="number" inputMode="numeric" min={0} max={100} value={diagnostik} onChange={(e) => setDiagnostik(e.target.value)} className={KOTAK} style={BORDER} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
            Tes formatif: skor mulai dari sini lulus dan topik berikutnya terbuka
            <input type="number" inputMode="numeric" min={0} max={100} value={formatif} onChange={(e) => setFormatif(e.target.value)} className={KOTAK} style={BORDER} />
          </label>
        </div>
        {!sah && <p className="text-xs text-danger mb-3">Isi dua angka bulat antara 0 dan 100.</p>}
        {galat && <p className="text-xs text-danger mb-3">{galat}</p>}
        <div className="flex gap-2.5 justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button onClick={() => void simpan()} disabled={!sah || saving} className="btn btn-primary min-w-[7.5rem]">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Asesmen() {
  const { user } = useAuth()
  const { courseId, course } = useCourse()
  const ambang = ambangDari(course)
  const [batasOpen, setBatasOpen] = useState(false)
  const { data: kelasList = [] } = useKelasByDosen(user?.id)
  const [tahunFilter, setTahunFilter] = useState<number | null>(null)
  const [kelasFilter, setKelasFilter] = useState<string | null>(null)

  const { data: prePostRows, isLoading: loadingPrePost } = useQuery({
    queryKey: ['asesmen-prepost', courseId],
    queryFn: () => fetchAttemptsPrePost(courseId),
  })
  const { data: formatifRows, isLoading: loadingFormatif } = useQuery({
    queryKey: ['asesmen-formatif', courseId],
    queryFn: () => fetchAsesmenAttempts(courseId),
  })
  // Kolom "Mini Projek" (dulu tugas akhir) di tabel bawah: nilai total kiriman untuk brief
  // TERBARU dosen ini saja (antrean #57 opsi A) — dosen dengan beberapa
  // brief lama tetap hanya melihat kolom untuk yang paling baru dibuat.
  const { data: latestProject } = useQuery({ queryKey: ['final-projects', courseId], queryFn: () => fetchProjectsDosen(courseId) })
  // Mata kuliah dengan Paket Rancangan Proposal (antrean #179): nilai Mini Projek
  // = jumlah nilai keempat bab kali bobotnya; tanpa paket, brief terbaru saja.
  const paket = useMemo(() => briefPaket(latestProject ?? []), [latestProject])
  const brief = paket.length > 0 ? null : (latestProject?.[0] ?? null)
  const { data: briefSubmissions = [] } = useQuery({
    queryKey: ['final-submissions', brief?.id],
    queryFn: () => fetchSubmissionsDosen(brief!.id),
    enabled: brief != null,
  })
  const paketSubmissions = useQueries({
    queries: paket.map((b) => ({ queryKey: ['final-submissions', b.id], queryFn: () => fetchSubmissionsDosen(b.id) })),
  })
  const paketData = paketSubmissions.map((q) => q.data)
  // Tanpa useMemo: jumlah query paket berubah-ubah dan datanya kecil.
  const tugasAkhirByUser = (() => {
    const m = new Map<string, number | string | null>()
    if (paket.length > 0) {
      const bobot = bobotPaket(paket)
      const rows = paketData.flatMap((d) => d ?? [])
      for (const uid of new Set(rows.map((s) => s.user_id))) {
        const total = paketData.map((d) => d?.find((s) => s.user_id === uid)?.total ?? null)
        const nilai = nilaiMiniProjek(bobot, total)
        const dinilai = total.filter((t) => t != null).length
        m.set(uid, nilai ?? (dinilai > 0 ? `${dinilai} dari ${paket.length} dinilai` : null))
      }
      return m
    }
    for (const s of briefSubmissions) m.set(s.user_id, s.total)
    return m
  })()

  // `null` di KEDUA query = Supabase belum dikonfigurasi / gagal (mode
  // demo), beda maknanya dari array kosong (terhubung, memang belum ada
  // pengerjaan). Sama seperti pola offline di halaman Analitik/Manajemen.
  const offline = prePostRows === null && formatifRows === null
  const loading = loadingPrePost || loadingFormatif

  // Baris pre/post dan formatif hanya membawa NAMA kelas (r.kelasId / r.kelas,
  // lihat AttemptPrePostRow/AsesmenAttempt di lib/asesmen.ts), bukan
  // angkatan. Untuk menyaring menurut tahun, hitung dulu himpunan nama kelas
  // yang lolos filter dari kelasList (yang punya angkatan), baru saring
  // baris berdasarkan nama itu. Batas: kalau ada dua kelas bernama sama di
  // angkatan berbeda, baris kedua kelas itu ikut lolos bersama karena nama
  // kelas di baris data tidak membawa angkatan untuk membedakannya.
  const namaKelasCocok = useMemo(() => {
    if (tahunFilter == null && kelasFilter == null) return null
    return new Set(kelasList.filter((k) => cocokFilter(k, { tahun: tahunFilter, kelas: kelasFilter })).map((k) => k.name))
  }, [kelasList, tahunFilter, kelasFilter])

  const prePostFiltered = useMemo(() => {
    const rows = prePostRows ?? []
    return namaKelasCocok ? rows.filter((r) => r.kelasId != null && namaKelasCocok.has(r.kelasId)) : rows
  }, [prePostRows, namaKelasCocok])

  const formatifFiltered = useMemo(() => {
    const rows = formatifRows ?? []
    return namaKelasCocok ? rows.filter((r) => r.kelas != null && namaKelasCocok.has(r.kelas)) : rows
  }, [formatifRows, namaKelasCocok])

  // Tes formatif menggantikan post-test sebagai pembanding tes diagnostik (antrean #172).
  const peningkatan = useMemo(
    () => hitungPeningkatanKelas(pakaiFormatifSebagaiPost(prePostFiltered, formatifFiltered)),
    [prePostFiltered, formatifFiltered],
  )
  const rekapFormatif = useMemo(() => rekapPerModul(formatifFiltered, ambang.formatif), [formatifFiltered, ambang.formatif])

  const totalKategori = peningkatan.sebaran.tinggi + peningkatan.sebaran.sedang + peningkatan.sebaran.rendah

  // Golongan pre-test per mahasiswa (antrean #105 opsi B; batasnya setelan mata kuliah, antrean #136).
  const jumlahGolongan = useMemo(() => {
    const n = { mahir: 0, remedial: 0, belum: 0 }
    for (const m of peningkatan.perMahasiswa) n[golonganDariSkor(m.pre, ambang.diagnostik)]++
    return n
  }, [peningkatan.perMahasiswa, ambang.diagnostik])

  const grafikFormatif = useMemo(
    () => rekapFormatif.map((r) => ({ label: r.judul, value: r.rataRata, sub: `${r.jumlahPengerjaan} pengerjaan` })),
    [rekapFormatif],
  )
  const grafikLulus = useMemo(
    () => rekapFormatif.map((r) => ({ label: r.judul, value: r.persenLulus, sub: `${r.jumlahPengerjaan} pengerjaan` })),
    [rekapFormatif],
  )

  const emptyState = (label: string) => (
    <div className="text-center py-14 px-4 text-brown-3 text-sm">
      <span className="flex justify-center mb-2">
        <IconClipboard size={28} />
      </span>
      {offline ? 'Data asesmen butuh koneksi Supabase, belum tersedia di mode demo.' : `Belum ada ${label}.`}
    </div>
  )

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        {/* HEADER */}
        <div className="mb-5 pb-4 border-b flex items-start justify-between gap-3 flex-wrap" style={BORDER}>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-brown mb-1">Asesmen</h1>
            <p className="text-sm text-brown-3 leading-relaxed">Hasil Kelas</p>
          </div>
        </div>

        {/* FILTER MATA KULIAH + TAHUN + KELAS */}
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <MataKuliahSelect size="sm" />
          {course && (
            <button onClick={() => setBatasOpen(true)} className="btn btn-secondary btn-sm whitespace-nowrap">
              Batas Skor: {ambang.diagnostik} dan {ambang.formatif}
            </button>
          )}
          <KelasTahunFilter
            kelasList={kelasList}
            tahun={tahunFilter}
            kelas={kelasFilter}
            onChange={(f) => {
              setTahunFilter(f.tahun)
              setKelasFilter(f.kelas)
            }}
          />
        </div>

        {/* TIGA ANGKA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">Rata-rata Tes Diagnostik Awal</div>
            <div className="font-display text-2xl font-bold text-brown">{formatSkor(peningkatan.rataPre)}</div>
            <div className="text-xs text-brown-3 mt-1 tabular-nums">
              {GOLONGAN_LABEL.mahir} {jumlahGolongan.mahir} · {GOLONGAN_LABEL.remedial} {jumlahGolongan.remedial}
              {jumlahGolongan.belum > 0 && ` · Belum dipetakan ${jumlahGolongan.belum}`}
            </div>
          </div>
          <div className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">Rata-rata Tes Formatif</div>
            <div className="font-display text-2xl font-bold text-brown">{formatSkor(peningkatan.rataPost)}</div>
          </div>
          <div className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1 flex items-center gap-1.5">
              <IconTrendingUp size={13} /> Peningkatan Skor Kelas
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-display text-2xl font-bold text-brown">{formatGain(peningkatan.rataPeningkatan)}</div>
              {peningkatan.kategoriKelas && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${KATEGORI_CLASS[peningkatan.kategoriKelas]}`}>
                  {KATEGORI_LABEL[peningkatan.kategoriKelas]}
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-brown-3 leading-relaxed mb-5">
          Peningkatan = kenaikan dari tes diagnostik awal ke rata-rata skor terbaik tes formatif tiap topik, dibanding ruang naik yang tersisa.
        </p>

        {/* SEBARAN PENINGKATAN */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6 mb-5" style={BORDER}>
          <div className="font-display text-base font-semibold text-brown mb-3">Sebaran Peningkatan</div>
          <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
            {totalKategori === 0 ? null : (
              <>
                <div style={{ width: `${(peningkatan.sebaran.tinggi / totalKategori) * 100}%`, background: KATEGORI_BAR.tinggi }} />
                <div style={{ width: `${(peningkatan.sebaran.sedang / totalKategori) * 100}%`, background: KATEGORI_BAR.sedang }} />
                <div style={{ width: `${(peningkatan.sebaran.rendah / totalKategori) * 100}%`, background: KATEGORI_BAR.rendah }} />
              </>
            )}
          </div>
          <div className="flex gap-4 flex-wrap mt-3 text-xs text-brown-2">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: KATEGORI_BAR.tinggi }} />Tinggi ({peningkatan.sebaran.tinggi})</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: KATEGORI_BAR.sedang }} />Sedang ({peningkatan.sebaran.sedang})</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: KATEGORI_BAR.rendah }} />Rendah ({peningkatan.sebaran.rendah})</span>
          </div>
        </div>

        {/* GRAFIK FORMATIF PER TOPIK */}
        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
            <div className="font-display text-base font-semibold text-brown mb-3">Rata-rata Formatif per Topik</div>
            <div className="overflow-x-auto">
              <GrafikBatang
                data={grafikFormatif}
                ambang={ambang.formatif}
                ambangLabel={`Lulus ${ambang.formatif}`}
                warna={(v) => (v >= ambang.formatif ? 'var(--success)' : 'var(--danger)')}
                ariaLabel="Rata-rata formatif per topik"
              />
            </div>
            <p className="text-xs text-brown-3 mt-2">Garis putus-putus = ambang lulus {ambang.formatif}.</p>
          </div>
          <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
            <div className="font-display text-base font-semibold text-brown mb-3">Persentase Lulus per Topik</div>
            <div className="overflow-x-auto">
              <GrafikBatang
                data={grafikLulus}
                max={100}
                warna={(v) => (v >= 50 ? 'var(--success)' : 'var(--warning)')}
                format={(v) => `${v}%`}
                ariaLabel="Persentase lulus per topik"
              />
            </div>
          </div>
        </div>

        {/* TABEL PER MAHASISWA */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6 mb-5" style={BORDER}>
          <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
            <IconUsers size={18} /> Hasil per mahasiswa
            {loading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
          </div>
          {peningkatan.perMahasiswa.length === 0 ? (
            emptyState('pengerjaan tes diagnostik awal atau tes formatif yang tercatat')
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={BORDER}>
              <table className="w-full border-collapse min-w-[820px]">
                <thead className="bg-cream">
                  <tr>
                    {['Nama', 'Kelas', 'Diagnostik', 'Golongan', 'Formatif', 'Peningkatan', 'Kategori', 'Mini Projek'].map((h, i) => (
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
                <tbody className="[&>tr+tr]:row-divider">
                  {peningkatan.perMahasiswa.map((m: PeningkatanMahasiswa) => (
                    <tr key={m.userId}>
                      <td className="px-3 py-2.5 text-sm font-medium text-brown">{m.nama}</td>
                      <td className="px-3 py-2.5 text-sm text-brown-3">{m.kelasId ?? '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                        {m.pre != null ? m.pre : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ChipRak jenis={GOLONGAN_CHIP[golonganDariSkor(m.pre, ambang.diagnostik)]} label={GOLONGAN_LABEL[golonganDariSkor(m.pre, ambang.diagnostik)]} />
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                        {m.post != null ? m.post : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center font-bold tabular-nums text-brown">
                        {formatGain(m.peningkatan)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {m.kategori ? (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${KATEGORI_CLASS[m.kategori]}`}>
                            {KATEGORI_LABEL[m.kategori]}
                          </span>
                        ) : (
                          <span className="text-brown-3 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center font-semibold tabular-nums text-brown">
                        {tugasAkhirByUser.get(m.userId) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* TABEL FORMATIF PER MODUL */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
          <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
            <IconChart size={18} /> Tes formatif per topik
            {loading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
          </div>
          {rekapFormatif.length === 0 ? (
            emptyState('hasil tes formatif')
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={BORDER}>
              <table className="w-full border-collapse min-w-[640px]">
                <thead className="bg-cream">
                  <tr>
                    {['Topik', 'Pengerjaan', 'Mahasiswa', 'Rata-rata', 'Tertinggi', 'Terendah', '% Lulus'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                          i === 0 ? 'text-left' : 'text-center'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&>tr+tr]:row-divider">
                  {rekapFormatif.map((r) => (
                    <tr key={r.moduleId}>
                      <td className="px-3 py-2.5 text-sm font-medium text-brown">{r.judul}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.jumlahPengerjaan}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.jumlahMahasiswa}</td>
                      <td className={`px-3 py-2.5 text-sm text-center font-bold tabular-nums ${scoreClass(r.rataRata, ambang.formatif)}`}>
                        {r.rataRata}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.tertinggi}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.terendah}</td>
                      <td className="px-3 py-2.5 text-sm text-center tabular-nums">
                        <span className="font-semibold text-brown-2">{r.persenLulus}%</span>
                        <span className="text-xs text-brown-3 ml-1">
                          ({r.lulus}/{r.jumlahPengerjaan})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {batasOpen && course && <BatasSkorModal course={course} onClose={() => setBatasOpen(false)} />}
    </Layout>
  )
}
