import { useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { IconDownload, IconStar, IconTrendingUp, IconChart, IconWarning, IconBell, IconCheck } from '../components/icons'
import { useModules } from '../hooks/useModules'
import { useStudentStats, useModulDistributionStats, useFeedbackAspectAvg } from '../hooks/useAnalitik'
import { TOTAL_MODULES } from '../lib/progress'
import {
  DUMMY_STUDENTS,
  DUMMY_MODUL_DIST,
  DUMMY_KEPRAKTISAN_ASPEK,
  bucketKuisDist,
  computeStatSummary,
  computeInactiveStudents,
  sortStudents,
  buildAnalitikCsv,
  downloadCsv,
  type SortKey,
  type StudentStatus,
} from '../lib/analitik'

const BORDER = { borderColor: 'var(--border)' } as const

type FilterStatus = 'semua' | StudentStatus

const COLUMNS: { key: SortKey; label: string; align?: 'left' | 'center' }[] = [
  { key: 'no', label: 'No', align: 'center' },
  { key: 'nama', label: 'Nama' },
  { key: 'modul', label: 'Modul Selesai', align: 'center' },
  { key: 'kuis', label: 'Avg Kuis', align: 'center' },
  { key: 'jam', label: 'Waktu (jam)', align: 'center' },
  { key: 'kepraktisan', label: 'Kepraktisan', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
]

function initialsOf(name: string): string {
  return (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function modulBarColor(pct: number): string {
  if (pct >= 70) return 'var(--sage)'
  if (pct >= 30) return 'var(--terra)'
  return 'var(--brown3)'
}

const STATUS_BADGE: Record<StudentStatus, { bg: string; color: string; label: string }> = {
  aktif: { bg: '#C0DD97', color: '#27500A', label: 'Aktif' },
  tidak: { bg: '#FAD9B0', color: '#7A4010', label: 'Tidak Aktif' },
}

export function Analitik() {
  const { data: modules = [] } = useModules()
  const { data: rawStudents } = useStudentStats()
  const { data: rawModulDist } = useModulDistributionStats()
  const { data: rawKprakAspek } = useFeedbackAspectAvg()

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('semua')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [remindedIds, setRemindedIds] = useState<Set<string | number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  // Real Supabase aggregate when available, otherwise the same illustrative
  // demo dataset legacy/analitik.html ships with (see report: precedent
  // matches src/pages/Profil.tsx's dosen "28 mahasiswa terdaftar" fallback).
  const students = rawStudents && rawStudents.length ? rawStudents : DUMMY_STUDENTS
  const modulDist = rawModulDist && rawModulDist.length ? rawModulDist : DUMMY_MODUL_DIST
  const kepraktisanAspek = rawKprakAspek && rawKprakAspek.length ? rawKprakAspek : DUMMY_KEPRAKTISAN_ASPEK
  const totalModules = modules.length || TOTAL_MODULES

  const summary = useMemo(() => computeStatSummary(students, totalModules), [students, totalModules])
  const kuisDist = useMemo(() => bucketKuisDist(students), [students])
  const inactiveStudents = useMemo(() => computeInactiveStudents(students), [students])
  const maxKuisCount = Math.max(...kuisDist.map((k) => k.count), 1)

  const filtered = useMemo(
    () => (filterStatus === 'semua' ? students : students.filter((s) => s.status === filterStatus)),
    [students, filterStatus],
  )
  const displayed = useMemo(
    () => (sortKey ? sortStudents(filtered, sortKey, sortAsc) : filtered),
    [filtered, sortKey, sortAsc],
  )

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((prev) => !prev)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function handleExport() {
    const csv = buildAnalitikCsv(students)
    const filename = 'analitik-kelas-' + new Date().toISOString().slice(0, 10) + '.csv'
    downloadCsv(filename, csv)
    showToast('File CSV berhasil diunduh')
  }

  function handleRemind(id: string | number, nama: string) {
    setRemindedIds((prev) => new Set(prev).add(id))
    showToast('Pengingat terkirim ke ' + nama)
    setTimeout(() => {
      setRemindedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 4000)
  }

  return (
    <Layout>
      <div className="page-fadein max-w-[1100px] mx-auto p-4 md:p-6 pb-16">
        <div className="mb-5">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-bold text-brown">Analitik Kelas</h1>
          <p className="text-sm text-brown-3 mt-1">
            Dasbor progress, nilai, dan kepraktisan seluruh mahasiswa — MK Metpen &amp; Pengembangan, Kelas A
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3.5 mb-5">
          <StatCard bar="var(--sage)" val={String(summary.totalAktif)} label="Mahasiswa Aktif" sub={`dari ${summary.totalStudents} terdaftar`} />
          <StatCard bar="var(--terra)" val={`${summary.avgModulPct}%`} label="Rata-rata Progress Modul" sub={`dari ${totalModules} modul total`} />
          <StatCard bar="#6B7EAF" val={summary.avgKuis.toFixed(1)} label="Rata-rata Skor Kuis" sub="formatif per modul" />
          <StatCard bar="#B07A3E" val={summary.avgKepraktisan.toFixed(1)} label="Rata-rata Kepraktisan" sub="dari 5 skala rating" />
        </div>

        {/* ── TABEL PROGRESS MAHASISWA ── */}
        <SectionDivider label="Progress Mahasiswa" />

        <div className="bg-ivory rounded-2xl border overflow-hidden mb-5" style={BORDER}>
          <div className="flex items-center justify-between gap-2.5 px-4 md:px-5 py-3.5 border-b flex-wrap" style={BORDER}>
            <div>
              <div className="text-sm font-semibold text-brown">Tabel Progress Mahasiswa</div>
              <div className="text-xs text-brown-3">Klik header kolom untuk mengurutkan</div>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                aria-label="Filter status"
                className="h-9 md:h-9 px-3 rounded-lg border text-sm text-brown outline-none cursor-pointer"
                style={{ ...BORDER, background: 'var(--bg3)', minHeight: 44 }}
              >
                <option value="semua">Semua</option>
                <option value="aktif">Aktif</option>
                <option value="tidak">Tidak Aktif</option>
              </select>
              <button
                onClick={handleExport}
                className="h-9 px-3.5 rounded-lg border text-xs font-semibold text-brown-2 flex items-center gap-1.5"
                style={{ ...BORDER, minHeight: 44 }}
              >
                <IconDownload size={14} /> Export CSV
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  {COLUMNS.map((col) => {
                    const active = sortKey === col.key
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-3.5 py-2.5 text-xs font-semibold text-brown-3 cursor-pointer select-none whitespace-nowrap ${
                          col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                        <span className="ml-1 opacity-60 text-[10px]">
                          {active ? (sortAsc ? '▲' : '▼') : '⇅'}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-brown-3 py-8 text-sm">
                      Tidak ada data untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  displayed.map((s, i) => {
                    const badge = STATUS_BADGE[s.status]
                    return (
                      <tr
                        key={s.id}
                        className="border-t"
                        style={{ ...BORDER, background: s.status === 'tidak' ? 'rgba(212,163,115,.07)' : undefined }}
                      >
                        <td className="px-3.5 py-2.5 text-center text-xs text-brown-3">{i + 1}</td>
                        <td className="px-3.5 py-2.5 font-medium text-brown">{s.nama}</td>
                        <td className="px-3.5 py-2.5 text-center text-brown-2">{s.modul}/{totalModules}</td>
                        <td className="px-3.5 py-2.5 text-center text-brown-2">{s.kuis > 0 ? s.kuis : '—'}</td>
                        <td className="px-3.5 py-2.5 text-center text-brown-2">{s.jam}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          {s.kepraktisan != null ? (
                            <span className="inline-flex items-center gap-0.5 text-terra text-sm"><IconStar size={12} />{s.kepraktisan.toFixed(1)}</span>
                          ) : (
                            <span className="text-brown-3 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── GRAFIK SECTION ── */}
        <SectionDivider label="Distribusi & Analitik" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
          {/* Distribusi modul (horizontal bar) */}
          <div className="bg-ivory rounded-2xl border p-4 md:p-5" style={BORDER}>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-brown mb-4"><IconTrendingUp size={16} /> Penyelesaian per Modul</div>
            <div className="flex flex-col gap-2.5">
              {modulDist.map((m) => (
                <div key={m.label} className="flex items-center gap-2.5">
                  <div className="w-14 text-right text-xs text-brown-2 flex-shrink-0 whitespace-nowrap">{m.label}</div>
                  <div
                    className="flex-1 h-5 rounded-full overflow-hidden relative"
                    style={{ background: 'rgba(62,54,46,.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${m.pct}%`, minWidth: m.pct > 0 ? 2 : 0, background: modulBarColor(m.pct) }}
                    />
                  </div>
                  <div className="w-9 text-xs text-brown-3 tabular-nums flex-shrink-0">{m.pct}%</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap mt-3 text-[11px] text-brown-3">
              <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: 'var(--sage)' }} />≥70% selesai</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: 'var(--terra)' }} />30–69%</span>
              <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: 'var(--brown3)' }} />&lt;30%</span>
            </div>
          </div>

          {/* Distribusi skor kuis (vertical bar) */}
          <div className="bg-ivory rounded-2xl border p-4 md:p-5" style={BORDER}>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-brown mb-4"><IconChart size={16} /> Distribusi Skor Kuis</div>
            <div className="flex items-end gap-2 md:gap-2.5 h-[130px] px-1">
              {kuisDist.map((k) => (
                <div key={k.label} className="flex flex-col items-center flex-1 gap-1.5 justify-end h-full">
                  <div className="text-xs font-bold text-brown-2">{k.count}</div>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(k.count / maxKuisCount) * 100}%`,
                      minHeight: 4,
                      background: k.color,
                    }}
                    title={`${k.sublabel}: ${k.count} mahasiswa`}
                  />
                  <div className="text-[10px] text-brown-3 text-center leading-tight">
                    {k.label}
                    <br />
                    <span className="opacity-80">{k.sublabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kepraktisan per aspek (full width) */}
          <div className="bg-ivory rounded-2xl border p-4 md:p-5 md:col-span-2" style={BORDER}>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-brown mb-4">
              <IconStar size={16} /> Kepraktisan per Aspek (rata-rata skala 1–5)
            </div>
            <div className="flex flex-col gap-3">
              {kepraktisanAspek.map((a) => (
                <div key={a.label} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 text-sm text-brown-2">{a.label}</div>
                  <div className="w-24 md:w-32 h-2.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(62,54,46,.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(a.nilai / 5) * 100}%`, background: 'var(--terra)' }}
                    />
                  </div>
                  <div className="w-8 text-sm font-semibold text-terra-d text-right flex-shrink-0">{a.nilai.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FLAG MAHASISWA TIDAK AKTIF ── */}
        <SectionDivider label="Perhatian Khusus" />

        <div className="bg-ivory rounded-2xl border overflow-hidden mb-5" style={BORDER}>
          <div
            className="flex items-center gap-2.5 px-4 md:px-5 py-3.5 border-b flex-wrap"
            style={{ ...BORDER, background: 'rgba(176,48,32,.04)' }}
          >
            <IconWarning size={18} />
            <span className="text-sm font-semibold text-brown">Mahasiswa Tidak Aktif</span>
            <span className="ml-auto text-xs text-brown-3">Tidak aktif 3+ hari terakhir</span>
          </div>
          <div className="p-3.5 md:p-4 flex flex-col gap-2.5">
            {inactiveStudents.length === 0 ? (
              <div className="text-sm text-brown-3 py-2">Tidak ada mahasiswa yang tidak aktif. Semua baik-baik saja!</div>
            ) : (
              inactiveStudents.map((s) => {
                const modulLabel = s.modul === 0 ? 'Belum memulai modul' : `${s.modul} modul selesai`
                const lastSeen = s.modul === 0 ? 'Terakhir aktif: lebih dari 7 hari lalu' : 'Terakhir aktif: 3+ hari lalu'
                const reminded = remindedIds.has(s.id)
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 flex-wrap p-3 rounded-xl"
                    style={{ background: 'rgba(212,163,115,.06)', border: '1px solid rgba(212,163,115,.15)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--terra)' }}
                    >
                      {initialsOf(s.nama)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brown">{s.nama}</div>
                      <div className="text-xs text-brown-3 mt-0.5">
                        {modulLabel} · {lastSeen}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemind(s.id, s.nama)}
                      disabled={reminded}
                      aria-label={`Kirim pengingat ke ${s.nama}`}
                      className="min-h-11 px-3.5 rounded-lg border text-xs font-semibold whitespace-nowrap flex-shrink-0 disabled:opacity-60 inline-flex items-center justify-center gap-1"
                      style={{ borderColor: 'rgba(212,163,115,.4)', background: 'rgba(212,163,115,.08)', color: 'var(--terra-d)' }}
                    >
                      {reminded ? <><IconCheck size={14} /> Terkirim</> : <><IconBell size={14} /> Kirim Pengingat</>}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] whitespace-nowrap"
          style={{ background: 'var(--brown)', color: 'var(--terra)', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: 'var(--border2, var(--border))' }} />
      <div className="text-[11px] font-bold tracking-widest uppercase text-brown-3 whitespace-nowrap">{label}</div>
      <div className="flex-1 h-px" style={{ background: 'var(--border2, var(--border))' }} />
    </div>
  )
}

function StatCard({ bar, val, label, sub }: { bar: string; val: string; label: string; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-ivory px-3.5 md:px-4 py-3.5" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <div className="text-xl md:text-2xl font-medium text-brown leading-none">{val}</div>
      <div className="text-[11px] text-brown-3 mt-1.5">{label}</div>
      <div className="text-[10px] text-brown-3 mt-0.5 opacity-80">{sub}</div>
    </div>
  )
}

export default Analitik
