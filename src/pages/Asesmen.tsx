import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { IconChart, IconClipboard, IconDownload, IconTrendingUp } from '../components/icons'
import { NgainPanel } from './Ngain'
import {
  buildAsesmenCsv,
  fetchAsesmenAttempts,
  rekapPerModul,
  tallyAnswers,
  type AsesmenAttempt,
} from '../lib/asesmen'
import { downloadCsv } from '../lib/analitik'

const BORDER = { borderColor: 'var(--border)' } as const

type Tab = 'formatif' | 'pilihan-ganda' | 'ngain'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'formatif', label: 'Tes Formatif' },
  { key: 'pilihan-ganda', label: 'Pilihan Ganda' },
  { key: 'ngain', label: 'N-Gain' },
]

function scoreClass(score: number): string {
  if (score >= 80) return 'text-sage-d'
  if (score >= 60) return 'text-terra-d'
  return 'text-red'
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
            Rekap hasil tes formatif dan soal pilihan ganda mahasiswa, plus kalkulator N-Gain.
          </p>
        </div>

        {/* Ringkasan cepat — hanya relevan untuk dua tab berbasis quiz_attempts;
            tab N-Gain punya angka ringkasannya sendiri di dalam panelnya. */}
        {tab !== 'ngain' && !offline && total > 0 && (
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
                color: tab === t.key ? 'var(--terra-d)' : 'var(--brown-3)',
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
      </div>
    </Layout>
  )
}
