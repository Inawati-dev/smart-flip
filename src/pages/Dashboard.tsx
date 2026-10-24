import { KabarTerbaruCard } from '../components/KabarPaket'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useAllQuizAttempts } from '../hooks/useQuizAttempts'
import { useKelasByDosen } from '../hooks/useKelas'
import { cocokFilter, fetchMyKelas } from '../lib/kelas'
import { hitungLangkah, type Langkah } from '../lib/langkah'
import { useTopikStatus } from '../lib/topik'
import { formatTanggal } from '../lib/jadwal'
import { GOLONGAN_LABEL, GOLONGAN_CHIP, golonganDariSkor, type Golongan } from '../lib/golongan'
import { useAmbang } from '../lib/ambang'
import { TOTAL_MODULES, type ProgressMap } from '../lib/progress'
import type { ModuleRow } from '../lib/modules'
import type { QuizAttemptWithModule } from '../lib/quizAttempts'
import { WelcomeModal } from '../components/WelcomeModal'
import { hasSeenOnboarding, markOnboardingSeen } from '../lib/onboarding'
import { Layout } from '../components/Layout'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { KelasTahunFilter } from '../components/KelasTahunFilter'
import { PillGroup } from '../components/PillGroup'
import { StatCard } from '../components/StatCard'
import { ChipRak } from '../components/KartuTopik'
import { timeAgo } from '../lib/forum'
import { TautanPanduan } from '../components/TautanPanduan'
import {
  fetchSumberAktivitas,
  gabungKejadian,
  ringkasKelas,
  perluPerhatian,
  matriksProgres,
  type FilterAktivitas,
  type MatriksSel,
} from '../lib/aktivitas'
import {
  IconTrendingUp,
  IconFolder,
  IconCheck,
} from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

const HARI_OPTIONS: Array<{ value: FilterAktivitas['hari']; label: string }> = [
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
  { value: 'semester', label: 'Semester' },
]

function KartuRingkas({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-ivory rounded-2xl border p-4 flex flex-col gap-2 min-w-0" style={BORDER}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brown-3">{label}</p>
      {children}
    </div>
  )
}

// Bilah 8 px; segmen berurutan sebanding bagian/total; penanda = garis tegak di nilai tertentu (skala total).
function Bilah({ segmen, total, penanda }: { segmen: Array<{ bagian: number; warna: string }>; total: number; penanda?: number }) {
  return (
    <div className="relative h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }} aria-hidden>
      {total > 0 &&
        segmen.map((g, i) => (
          <span key={i} style={{ width: `${Math.min(100, (g.bagian / total) * 100)}%`, background: g.warna }} />
        ))}
      {penanda != null && total > 0 && (
        <span className="absolute top-0 bottom-0 w-0.5" style={{ left: `${Math.min(100, (penanda / total) * 100)}%`, background: 'var(--brown)' }} />
      )}
    </div>
  )
}

const STATUS_LABEL: Record<MatriksSel['status'], { label: string; bg: string; color: string }> = {
  L: { label: 'L', bg: 'var(--success-soft)', color: 'var(--success)' },
  R: { label: 'R', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  '-': { label: '—', bg: 'transparent', color: 'var(--brown3)' },
}

function StatusChip({ status }: { status: MatriksSel['status'] }) {
  const s = STATUS_LABEL[status]
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

// Dashboard dosen = seluruh aktivitas kelas (spec §5.0, §9 WP9). Satu
// useQuery menarik 5 tabel sekaligus (fetchSumberAktivitas); 4 fungsi murni
// di src/lib/aktivitas.ts mengubahnya jadi umpan, ringkasan, daftar
// perhatian, dan matriks — tidak ada angka statis di halaman ini.
export function DosenHome({ dosenId, nama }: { dosenId?: string; nama?: string }) {
  const { courseId } = useCourse()
  const { data: kelasList = [] } = useKelasByDosen(dosenId)
  const [tahun, setTahun] = useState<number | null>(null)
  const [kelas, setKelas] = useState<string | null>(null)
  const [hari, setHari] = useState<FilterAktivitas['hari']>(7)
  const [feedLimit, setFeedLimit] = useState(50)
  const [searchParams, setSearchParams] = useSearchParams()

  // Kelas yang lolos filter tahun/kelas terpilih. RLS + fetchSumberAktivitas
  // hanya tahu memfilter satu class_id di server, jadi: tepat satu kelas lolos
  // -> filter di server seperti sebelumnya; filter aktif tapi kelasnya
  // beberapa (mis. tahun saja) atau tidak ada yang cocok -> tarik 'semua' dan
  // saring sumber di klien menurut himpunan id ini.
  const filterAktif = tahun != null || kelas != null
  const kelasIdCocok = useMemo(
    () => new Set(kelasList.filter((k) => cocokFilter(k, { tahun, kelas })).map((k) => k.id)),
    [kelasList, tahun, kelas],
  )
  const idTunggal = kelasIdCocok.size === 1 ? [...kelasIdCocok][0] : null
  const kelasIdServer: FilterAktivitas['kelasId'] = !filterAktif ? 'semua' : (idTunggal ?? 'semua')
  const perluSaringKlien = filterAktif && idTunggal == null
  const ambang = useAmbang()
  const ambangFormatif = ambang.formatif
  const filter = useMemo<FilterAktivitas>(
    () => ({ kelasId: kelasIdServer, hari, courseId, passScore: ambangFormatif }),
    [kelasIdServer, hari, courseId, ambangFormatif],
  )

  const { data: sumberMentah, isLoading } = useQuery({
    queryKey: ['aktivitas', filter],
    queryFn: () => fetchSumberAktivitas(filter),
  })

  // Sumber sudah dibatasi server saat kelasIdServer bukan 'semua'; saring
  // tambahan di klien hanya dijalankan saat server mengirim 'semua' padahal
  // filter tahun/kelas aktif dan cocok dengan beberapa (atau nol) kelas.
  const sumber = useMemo(() => {
    if (!sumberMentah || !perluSaringKlien) return sumberMentah
    const profiles = sumberMentah.profiles.filter((p) => p.classId != null && kelasIdCocok.has(p.classId))
    const ids = new Set(profiles.map((p) => p.id))
    return {
      ...sumberMentah,
      profiles,
      attempts: sumberMentah.attempts.filter((a) => ids.has(a.userId)),
      progress: sumberMentah.progress.filter((p) => ids.has(p.userId)),
      video: sumberMentah.video.filter((v) => ids.has(v.userId)),
    }
  }, [sumberMentah, perluSaringKlien, kelasIdCocok])

  const kejadian = useMemo(() => (sumber ? gabungKejadian(sumber) : []), [sumber])
  const perhatian = useMemo(() => (sumber ? perluPerhatian(sumber) : []), [sumber])
  const profilMap = useMemo(() => new Map((sumber?.profiles ?? []).map((p) => [p.id, p])), [sumber])
  const matriks = useMemo(() => (sumber ? matriksProgres(sumber) : []), [sumber])

  // Jendela aktif mengikuti rentang terpilih; 'semester' = semua data yang masuk.
  const hariAktif = hari === 'semester' ? 36_500 : hari
  const rentangLabel = HARI_OPTIONS.find((o) => o.value === hari)?.label.toUpperCase() ?? ''
  const ringkas = useMemo(() => (sumber ? ringkasKelas(sumber, { hariAktif }) : null), [sumber, hariAktif])
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  // Golongan per mahasiswa dari skor pre-test terbaru.
  const golonganJumlah = useMemo(() => {
    const skor = new Map<string, { s: number; t: string }>()
    for (const a of sumber?.attempts ?? []) {
      if (a.kind !== 'pre') continue
      const lama = skor.get(a.userId)
      if (!lama || a.attemptedAt >= lama.t) skor.set(a.userId, { s: a.score, t: a.attemptedAt })
    }
    const j = { mahir: 0, remedial: 0 }
    for (const { s } of skor.values()) {
      if (golonganDariSkor(s, ambang.diagnostik) === 'mahir') j.mahir++
      else j.remedial++
    }
    return j
  }, [sumber, ambang.diagnostik])
  const adaFormatif = (sumber?.attempts ?? []).some((a) => a.kind === 'formatif')
  const topikM = sumber?.modules.length ?? 0
  const topikP = Number((ringkas?.topikRataRata ?? 'P0').slice(1)) || 0
  const topikK = topikM > 0 ? Math.min(topikM, Math.max(1, topikP)) : topikP

  // Tab tersimpan di ?tab=. Bawaan 'aktivitas'; kalau belum ada ?tab di URL
  // dan sudah ada baris perlu perhatian, buka 'perhatian' dulu supaya
  // notifikasinya langsung terlihat (bukan tersembunyi di tab kedua).
  const tabParam = searchParams.get('tab')
  const tab: 'aktivitas' | 'perhatian' | 'progres' =
    tabParam === 'perhatian' || tabParam === 'progres' || tabParam === 'aktivitas'
      ? tabParam
      : perhatian.length > 0
        ? 'perhatian'
        : 'aktivitas'
  function pindahTab(t: string) {
    setSearchParams({ tab: t })
  }

  function handleKelasTahunChange(f: { tahun: number | null; kelas: string | null }) {
    setTahun(f.tahun)
    setKelas(f.kelas)
    setFeedLimit(50)
  }
  function handleHariChange(v: FilterAktivitas['hari']) {
    setHari(v)
    setFeedLimit(50)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Kepala: tanggal + sapaan di kiri, saringan di kanan (antrean #301) */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-xs text-brown-3 flex items-center gap-2 flex-wrap">
            <span>Dashboard Dosen · {tanggalHariIni}</span>
            {perhatian.length > 0 && (
              <Link
                to="?tab=perhatian"
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-2 text-[11px] font-bold rounded-full"
                style={{ background: 'var(--danger)', color: 'var(--btn-text)' }}
              >
                {perhatian.length} perlu perhatian
              </Link>
            )}
          </p>
          <h1 className="text-2xl font-bold text-brown">Halo, {nama || 'Pengguna'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MataKuliahSelect size="sm" />
          <KelasTahunFilter kelasList={kelasList} tahun={tahun} kelas={kelas} onChange={handleKelasTahunChange} />
          <PillGroup
            ariaLabel="Filter rentang waktu"
            size="sm"
            value={String(hari)}
            onChange={(v) => handleHariChange(v === 'semester' ? 'semester' : (Number(v) as 7 | 30))}
            options={HARI_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
          />
        </div>
      </div>

      {/* Empat kartu ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KartuRingkas label={`Mahasiswa aktif · ${rentangLabel}`}>
          <p className="text-3xl font-bold text-brown tabular-nums">
            {ringkas ? ringkas.aktif7Hari : '—'}
            <span className="text-sm font-medium text-brown-2"> dari {ringkas?.totalMhs ?? '—'} mahasiswa</span>
          </p>
          <Bilah segmen={[{ bagian: ringkas?.aktif7Hari ?? 0, warna: 'var(--sage)' }]} total={ringkas?.totalMhs ?? 0} />
          <p className="text-xs text-brown-3">
            {!ringkas || ringkas.totalMhs === 0
              ? 'Belum ada mahasiswa'
              : ringkas.aktif7Hari >= ringkas.totalMhs
                ? 'Semua membuka modul'
                : `${ringkas.totalMhs - ringkas.aktif7Hari} belum aktif`}
          </p>
        </KartuRingkas>

        <KartuRingkas label="Tes diagnostik awal">
          <p className="text-3xl font-bold text-brown tabular-nums">
            {ringkas ? ringkas.preSelesai : '—'}
            <span className="text-sm font-medium text-brown-2"> dari {ringkas?.totalMhs ?? '—'} selesai</span>
          </p>
          <Bilah
            segmen={[
              { bagian: golonganJumlah.mahir, warna: 'var(--sage)' },
              { bagian: golonganJumlah.remedial, warna: 'var(--warning)' },
            ]}
            total={ringkas?.totalMhs ?? 0}
          />
          <p className="text-xs text-brown-3">
            {GOLONGAN_LABEL.mahir} {golonganJumlah.mahir} · {GOLONGAN_LABEL.remedial} {golonganJumlah.remedial}
          </p>
        </KartuRingkas>

        <KartuRingkas label="Posisi kelas">
          <p className="text-3xl font-bold text-brown tabular-nums">
            {!ringkas ? '—' : topikM === 0 ? 'Belum ada topik' : `Topik ${topikK}`}
            {topikM > 0 && <span className="text-sm font-medium text-brown-2"> dari {topikM}</span>}
          </p>
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: topikM }, (_, i) => (
              <span
                key={i}
                className="h-2 flex-1 rounded-sm"
                style={{ background: i < topikK ? 'var(--terra)' : 'var(--border)' }}
              />
            ))}
          </div>
          <p className="text-xs text-brown-3">Rata-rata topik yang sedang dikerjakan</p>
        </KartuRingkas>

        <KartuRingkas label="Tes formatif">
          <p className="text-3xl font-bold text-brown tabular-nums">
            {!ringkas ? '—' : adaFormatif ? ringkas.rataFormatif : 'Belum ada'}
            {/* Data percobaan dipotong sesuai rentang, jadi "Belum ada" hanya berlaku untuk rentang itu. */}
            {ringkas && hari !== 'semester' && (
              <span className="text-sm font-medium text-brown-2"> dalam {rentangLabel.toLowerCase()}</span>
            )}
          </p>
          <Bilah
            segmen={[{ bagian: adaFormatif ? (ringkas?.rataFormatif ?? 0) : 0, warna: 'var(--terra)' }]}
            total={100}
            penanda={ambangFormatif}
          />
          <p className="text-xs text-brown-3">
            Batas lulus {ambangFormatif} · remedial 7 hari: {ringkas?.remedial7Hari ?? 0} percobaan
          </p>
        </KartuRingkas>
      </div>

      {/* Langkah berikutnya: hanya bila jelas dari data. Percobaan formatif dipotong
          sesuai rentang (fetchSumberAktivitas), jadi "belum ada formatif" baru pasti
          pada rentang Semester. */}
      {ringkas && !isLoading && hari === 'semester' && !adaFormatif && topikM > 0 && (
        <div
          className="bg-ivory rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          style={BORDER}
        >
          <p className="text-sm text-brown">
            Langkah berikutnya: buka tes formatif Topik {topikK} supaya kelas bisa lanjut.
          </p>
          <Link to="/modul" className="btn btn-primary">
            Atur Jadwal Tes
          </Link>
        </div>
      )}

      {/* Tab: Aktivitas kelas / Perlu perhatian / Progres mahasiswa x topik */}
      <PillGroup
        ariaLabel="Tab dashboard dosen"
        value={tab}
        onChange={pindahTab}
        options={[
          { value: 'aktivitas', label: 'Aktivitas', badge: kejadian.length },
          { value: 'perhatian', label: 'Perlu Perhatian', badge: perhatian.length, badgeTone: 'danger' },
          { value: 'progres', label: 'Progres', badge: matriks.length },
        ]}
      />
      <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
        {tab === 'aktivitas' &&
          (isLoading ? (
            <p className="text-brown-3 text-sm p-4">Memuat…</p>
          ) : kejadian.length === 0 ? (
            <p className="text-brown-3 text-sm p-4">Belum ada aktivitas di rentang ini</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  {/* Judul kolom (antrean #243) */}
                  <thead>
                    <tr className="row-divider text-left">
                      <th className="px-4 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">Waktu</th>
                      <th className="px-4 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">Nama</th>
                      <th className="px-4 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">NIM</th>
                      <th className="px-4 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">Angkatan</th>
                      <th className="px-4 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">Kegiatan</th>
                      <th className="px-4 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">Kelas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kejadian.slice(0, feedLimit).map((k, i) => {
                      const mhs = profilMap.get(k.userId)
                      return (
                        <tr key={i} className="row-divider">
                          <td className="px-4 py-2 text-brown-3 text-xs whitespace-nowrap">{timeAgo(k.waktu)}</td>
                          <td className="px-4 py-2 text-brown font-medium whitespace-nowrap">{k.nama}</td>
                          <td className="px-4 py-2 text-brown-2 text-xs whitespace-nowrap">{mhs?.nim || '—'}</td>
                          <td className="px-4 py-2 text-brown-2 text-xs whitespace-nowrap">{mhs?.angkatan || '—'}</td>
                          <td className="px-4 py-2 text-brown-2 min-w-[220px]">{k.keterangan}</td>
                          <td className="px-4 py-2 text-brown-3 text-xs whitespace-nowrap">{k.kelasNama ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {kejadian.length > feedLimit && (
                <div className="p-3 text-center row-divider">
                  <button
                    onClick={() => setFeedLimit((n) => n + 50)}
                    className="btn btn-ghost"
                    style={{ color: 'var(--terra-d)' }}
                  >
                    Muat 50 berikutnya
                  </button>
                </div>
              )}
            </>
          ))}

        {tab === 'perhatian' && (
          <div className="p-3 flex flex-col gap-2">
            {perhatian.length === 0 ? (
              <p className="text-brown-3 text-sm px-2 py-1">Belum ada yang perlu diperhatikan</p>
            ) : (
              perhatian.map((p, i) => (
                <Link
                  key={i}
                  to={p.tautan}
                  className="flex items-center justify-between gap-2 px-3 min-h-11 rounded-lg border text-sm"
                  style={BORDER}
                >
                  <span className="font-medium text-brown">{p.judul}</span>
                  <span className="text-brown-3 text-xs">{p.keterangan}</span>
                </Link>
              ))
            )}
          </div>
        )}

        {tab === 'progres' && (
          <>
            {matriks.length === 0 ? (
              <p className="text-brown-3 text-sm p-4">Belum ada aktivitas di rentang ini</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-bg3">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3 whitespace-nowrap">Nama</th>
                      {matriks[0].sel.map((s) => (
                        <th key={s.moduleId} className="px-3 py-2 text-xs font-semibold text-brown-3 text-center">
                          M{s.orderNum}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matriks.map((b) => (
                      <tr key={b.userId} className="row-divider">
                        <td className="px-3 py-2 font-medium text-brown whitespace-nowrap">{b.nama}</td>
                        {b.sel.map((s) => (
                          <td key={s.moduleId} className="px-3 py-2 text-center">
                            <StatusChip status={s.status} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Aksi mahasiswa per langkah (§4.0 spec WP8) — tombol utama dipilih dari
// `hasil.langkah`, dua sisanya jadi tombol sekunder di kartu yang sama.
function langkahActions(topikId: number, orderNum: number): Record<Exclude<Langkah, 'selesai-semua'>, { label: string; to: string }> {
  return {
    baca: { label: `Baca Topik ${orderNum}`, to: `/modul/${topikId}` },
    video: { label: `Tonton Video ${orderNum}`, to: `/video/${topikId}` },
    formatif: { label: `Kerjakan Tes Formatif ${orderNum}`, to: `/asesmen/formatif/${topikId}` },
  }
}

export function Dashboard() {
  const { user, profile, role, loading } = useAuth()
  const { data: modules = [], isLoading: modulesLoading } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { data: attempts = [] } = useAllQuizAttempts()
  const { golongan, skorPre, bukaPada, formatifPada } = useTopikStatus()
  const ambang = useAmbang()
  const { data: kelasSaya = null } = useQuery({ queryKey: ['kelas-saya'], queryFn: fetchMyKelas, enabled: role === 'mahasiswa' })
  const [showWelcome, setShowWelcome] = useState(false)

  // Gerbang pre-test menggantikan gerbang diagnostik lama (D4 = A, spec §4.1):
  // mahasiswa tanpa quiz_attempts kind='pre' dialihkan ke /asesmen/pre. Belum
  // dikerjakan di WP8 — datang di WP6 bersama AsesmenMhs.tsx/gerbang pre-test.

  // First-visit onboarding — same trigger point as the legacy dashboard,
  // ported to React (see Changelog v0.9.4). Re-triggerable from Profil,
  // which just clears the localStorage flag and navigates back here.
  useEffect(() => {
    if (!loading && role && !hasSeenOnboarding(role)) setShowWelcome(true)
  }, [loading, role])

  return (
    <Layout>
      {showWelcome && role && (
        <WelcomeModal
          role={role}
          userName={profile?.full_name}
          onClose={() => {
            markOnboardingSeen(role)
            setShowWelcome(false)
          }}
        />
      )}
      <div className="p-6">
        {role === 'dosen' ? (
          <>
            <DosenHome dosenId={user?.id} nama={profile?.full_name ?? undefined} />
          </>
        ) : modules.length === 0 ? (
          <p className="text-brown-3">{modulesLoading ? 'Memuat…' : 'Belum ada topik. Dosen menambah topik lewat menu Modul.'}</p>
        ) : (
          <DashboardMhs
            modules={modules}
            progress={progress}
            attempts={attempts}
            pre={{ skor: skorPre, golongan }}
            ambangFormatif={ambang.formatif}
            bukaPada={bukaPada}
            formatifPada={formatifPada}
            identitas={{ nama: profile?.full_name || 'Mahasiswa', kelas: kelasSaya }}
          />
        )}
        <div className="mt-6">
          <TautanPanduan />
        </div>
      </div>
    </Layout>
  )
}

// Exported terpisah supaya bisa diuji langsung dengan props (bukan hook
// async) — lihat Dashboard.test.tsx.
export function DashboardMhs({
  modules,
  progress,
  attempts,
  pre,
  identitas,
  ambangFormatif,
  bukaPada,
  formatifPada,
}: {
  modules: ModuleRow[]
  progress: ProgressMap
  attempts: QuizAttemptWithModule[]
  /** Skor dan golongan pre-test (antrean #105). */
  pre?: { skor: number | null; golongan: Golongan }
  /** Nama, kelas, dan angkatan untuk kepala halaman (antrean #143). */
  identitas?: { nama: string; kelas: { name: string; angkatan: number } | null }
  /** Batas lulus formatif mata kuliah (antrean #136); kosong = bawaan. */
  ambangFormatif?: number
  /** Tanggal buka materi dan tes topik menurut jadwal (antrean #153); `null` = sudah terbuka. */
  bukaPada?: (id: number) => Date | null
  formatifPada?: (id: number) => Date | null
}) {
  const hasil = hitungLangkah({ modules, progress, attempts, passScore: ambangFormatif })
  const totalModules = modules.length || TOTAL_MODULES
  const actions = langkahActions(hasil.topikAktif.id, hasil.topikAktif.orderNum)
  const materiDibuka = bukaPada?.(hasil.topikAktif.id) ?? null
  const tesDibuka = formatifPada?.(hasil.topikAktif.id) ?? null
  // Tes yang belum waktunya tidak ditawarkan; membaca jadi langkah utama.
  const utama = hasil.langkah === 'formatif' && tesDibuka ? 'baca' : hasil.langkah
  const langkahLain = (Object.keys(actions) as Array<keyof typeof actions>).filter(
    (k) => k !== utama && !(k === 'formatif' && tesDibuka),
  )

  return (
    <>
      {/* Kepala: sapaan, golongan hasil tes diagnostik, kelas dan angkatan;
          pemilih mata kuliah di kanan (antrean #143). */}
      <div className="flex items-start justify-between gap-x-4 gap-y-3 flex-wrap mb-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-brown">Selamat Datang, {identitas?.nama || 'Mahasiswa'}</h1>
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            {pre && <ChipRak jenis={GOLONGAN_CHIP[pre.golongan]} label={GOLONGAN_LABEL[pre.golongan]} />}
            <span className="text-sm text-brown-3">
              {identitas?.kelas ? `${identitas.kelas.name} · Angkatan ${identitas.kelas.angkatan}` : 'Belum punya kelas: ditentukan dari tes diagnostik awal'}
            </span>
          </div>
        </div>
        <MataKuliahSelect />
      </div>
      <p className="text-brown-3 mb-4">
        Topik {hasil.topikAktif.orderNum} dari {totalModules} · {hasil.topikAktif.title}
      </p>

      <div className="bg-ivory rounded-2xl border p-5 mb-4" style={BORDER}>
        <div className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-3">
          Langkah Berikutnya
        </div>
        {utama === 'selesai-semua' ? (
          <p className="text-brown-2 text-sm">
            Semua topik selesai. Lanjutkan ke mini projek.
          </p>
        ) : materiDibuka ? (
          <p className="text-brown-2 text-sm">
            Topik {hasil.topikAktif.orderNum} dibuka {formatTanggal(materiDibuka)}.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link to={actions[utama].to} className="btn btn-primary">
              {actions[utama].label}
            </Link>
            {langkahLain.map((k) => (
              <Link key={k} to={actions[k].to} className="btn btn-secondary">
                {actions[k].label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <KabarTerbaruCard />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard icon={IconCheck} val={`${hasil.topikSelesai}/${totalModules}`} label="Topik Selesai" bar="var(--sage)" to="/modul" />
        <StatCard
          icon={IconTrendingUp}
          val={hasil.skorTerakhir ? `${hasil.skorTerakhir.score}%` : '—'}
          label={
            hasil.skorTerakhir
              ? `Formatif Terakhir · ${hasil.skorTerakhir.lulus ? 'Lulus' : 'Remedial'}`
              : 'Formatif Terakhir'
          }
          bar="var(--terra)"
          to="/asesmen"
        />
        <StatCard
          icon={IconFolder}
          val={pre?.skor != null ? String(pre.skor) : '—'}
          label="Tes Diagnostik Awal"
          bar="var(--info)"
          to="/asesmen"
        />
      </div>
    </>
  )
}
