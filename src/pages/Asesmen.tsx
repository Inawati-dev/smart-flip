import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { IconChart, IconClipboard, IconDownload, IconTrendingUp, IconUsers } from '../components/icons'
import { useAuth } from '../contexts/AuthContext'
import { useKelasByDosen } from '../hooks/useKelas'
import { labelKelas } from '../lib/kelas'
import {
  buildAsesmenCsv,
  fetchAsesmenAttempts,
  fetchAttemptsPrePost,
  hitungPeningkatanKelas,
  rekapPerModul,
  type PeningkatanMahasiswa,
} from '../lib/asesmen'
import { downloadCsv } from '../lib/analitik'
import type { NGainCategory } from '../lib/ngain'
import { PASS_SCORE } from '../lib/quizAttempts'

const BORDER = { borderColor: 'var(--border)' } as const

const KATEGORI_LABEL: Record<NGainCategory, string> = { tinggi: 'Tinggi', sedang: 'Sedang', rendah: 'Rendah' }
const KATEGORI_CLASS: Record<NGainCategory, string> = {
  tinggi: 'bg-sage/20 text-sage-d',
  sedang: 'bg-terra/20 text-terra-d',
  rendah: 'bg-red/10 text-red',
}
const KATEGORI_BAR: Record<NGainCategory, string> = {
  tinggi: 'var(--sage)',
  sedang: 'var(--terra)',
  rendah: 'var(--red)',
}

function formatSkor(v: number | null): string {
  return v == null ? '—' : String(Math.round(v))
}

function formatGain(v: number | null): string {
  return v == null ? '—' : v.toFixed(2).replace('.', ',')
}

// Dua warna saja, mengikuti ambang lulus PASS_SCORE (80). Bukan gradasi
// tiga warna lama yang tengahnya masih menyimpan ambang 60 yang sudah tidak
// dipakai (lihat src/lib/quizAttempts.ts).
function scoreClass(score: number): string {
  return score >= PASS_SCORE ? 'text-sage-d' : 'text-red'
}

export default function Asesmen() {
  const { user } = useAuth()
  const { data: kelasList = [] } = useKelasByDosen(user?.id)
  const [kelasFilter, setKelasFilter] = useState('')

  const { data: prePostRows, isLoading: loadingPrePost } = useQuery({
    queryKey: ['asesmen-pre-post'],
    queryFn: fetchAttemptsPrePost,
  })
  const { data: formatifRows, isLoading: loadingFormatif } = useQuery({
    queryKey: ['asesmen-formatif'],
    queryFn: fetchAsesmenAttempts,
  })

  // `null` di KEDUA query = Supabase belum dikonfigurasi / gagal (mode
  // demo), beda maknanya dari array kosong (terhubung, memang belum ada
  // pengerjaan). Sama seperti pola offline di halaman Analitik/Manajemen.
  const offline = prePostRows === null && formatifRows === null
  const loading = loadingPrePost || loadingFormatif

  const kelasOptions = useMemo(
    () => [{ value: '', label: 'Semua kelas' }, ...kelasList.map((k) => ({ value: k.name, label: labelKelas(k, kelasList) }))],
    [kelasList],
  )

  const prePostFiltered = useMemo(() => {
    const rows = prePostRows ?? []
    return kelasFilter ? rows.filter((r) => r.kelasId === kelasFilter) : rows
  }, [prePostRows, kelasFilter])

  const formatifFiltered = useMemo(() => {
    const rows = formatifRows ?? []
    return kelasFilter ? rows.filter((r) => r.kelas === kelasFilter) : rows
  }, [formatifRows, kelasFilter])

  const peningkatan = useMemo(() => hitungPeningkatanKelas(prePostFiltered), [prePostFiltered])
  const rekapFormatif = useMemo(() => rekapPerModul(formatifFiltered), [formatifFiltered])

  const totalKategori = peningkatan.sebaran.tinggi + peningkatan.sebaran.sedang + peningkatan.sebaran.rendah

  function exportCsv() {
    downloadCsv(
      `asesmen-${new Date().toISOString().slice(0, 10)}.csv`,
      buildAsesmenCsv(peningkatan.perMahasiswa, rekapFormatif),
    )
  }

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
            <p className="text-sm text-brown-3 leading-relaxed">Hasil kelas</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              to="/asesmen/bank"
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
              style={BORDER}
            >
              Bank soal
            </Link>
            <Link
              to="/asesmen/tes"
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
              style={BORDER}
            >
              Tes khusus
            </Link>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
            >
              <IconDownload size={16} /> Unduh CSV
            </button>
          </div>
        </div>

        {/* FILTER KELAS */}
        <div className="mb-5 max-w-xs">
          <Select value={kelasFilter} onChange={setKelasFilter} label="Filter Kelas" options={kelasOptions} />
        </div>

        {/* TIGA ANGKA */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
          <div className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">Rata-rata Pre-test</div>
            <div className="font-display text-2xl font-bold text-brown">{formatSkor(peningkatan.rataPre)}</div>
          </div>
          <div className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">Rata-rata Post-test</div>
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
          Peningkatan = kenaikan dari pre-test ke post-test dibanding ruang naik yang tersisa.
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

        {/* TABEL PER MAHASISWA */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6 mb-5" style={BORDER}>
          <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
            <IconUsers size={18} /> Hasil per Mahasiswa
            {loading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
          </div>
          {peningkatan.perMahasiswa.length === 0 ? (
            emptyState('pengerjaan pre-test atau post-test yang tercatat')
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={BORDER}>
              <table className="w-full border-collapse min-w-[620px]">
                <thead className="bg-cream">
                  <tr>
                    {['Nama', 'Kelas', 'Pre', 'Post', 'Peningkatan', 'Kategori'].map((h, i) => (
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
                  {peningkatan.perMahasiswa.map((m: PeningkatanMahasiswa) => (
                    <tr key={m.userId} className="border-b last:border-b-0" style={BORDER}>
                      <td className="px-3 py-2.5 text-sm font-medium text-brown">{m.nama}</td>
                      <td className="px-3 py-2.5 text-sm text-brown-3">{m.kelasId ?? '—'}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">
                        {m.pre != null ? m.pre : '—'}
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
            <IconChart size={18} /> Tes Formatif per Modul
            {loading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
          </div>
          {rekapFormatif.length === 0 ? (
            emptyState('hasil tes formatif')
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={BORDER}>
              <table className="w-full border-collapse min-w-[640px]">
                <thead className="bg-cream">
                  <tr>
                    {['Modul', 'Pengerjaan', 'Mahasiswa', 'Rata-rata', 'Tertinggi', 'Terendah', '% Lulus'].map((h, i) => (
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
                <tbody>
                  {rekapFormatif.map((r) => (
                    <tr key={r.moduleId} className="border-b last:border-b-0" style={BORDER}>
                      <td className="px-3 py-2.5 text-sm font-medium text-brown">{r.judul}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.jumlahPengerjaan}</td>
                      <td className="px-3 py-2.5 text-sm text-center text-brown-2 tabular-nums">{r.jumlahMahasiswa}</td>
                      <td className={`px-3 py-2.5 text-sm text-center font-bold tabular-nums ${scoreClass(r.rataRata)}`}>
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
    </Layout>
  )
}
