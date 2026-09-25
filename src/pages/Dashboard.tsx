import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useAllQuizAttempts } from '../hooks/useQuizAttempts'
import { useKelasByDosen } from '../hooks/useKelas'
import { cocokFilter } from '../lib/kelas'
import { hitungLangkah, type Langkah } from '../lib/langkah'
import { useTopikStatus } from '../lib/topik'
import { GOLONGAN_LABEL, type Golongan } from '../lib/golongan'
import { TOTAL_MODULES, type ProgressMap } from '../lib/progress'
import type { ModuleRow } from '../lib/modules'
import type { QuizAttemptWithModule } from '../lib/quizAttempts'
import { WelcomeModal } from '../components/WelcomeModal'
import { hasSeenOnboarding, markOnboardingSeen } from '../lib/onboarding'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { KelasTahunFilter } from '../components/KelasTahunFilter'
import { PillGroup } from '../components/PillGroup'
import { timeAgo } from '../lib/forum'
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
  IconUsers,
  IconFolder,
  IconCheck,
  IconBook,
  IconChart,
  IconRefresh,
  IconTarget,
  IconVideo,
  IconClipboard,
  IconGraduationCap,
} from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

function StatCard({ icon: Icon, val, label, bar }: { icon: typeof IconUsers; val: string; label: string; bar: string }) {
  return (
    <div className="bg-ivory rounded-2xl border p-3.5 relative overflow-hidden" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-terra" style={{ background: 'var(--accent-soft)' }}>
          <Icon size={16} />
        </div>
        <div className="text-xl font-bold text-brown">{val}</div>
      </div>
      <div className="text-[11px] text-brown-3 mt-1.5">{label}</div>
    </div>
  )
}

function ShortcutCard({ to, icon: Icon, label, desc }: { to: string; icon: typeof IconUsers; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="bg-ivory rounded-2xl border border-[color:var(--border)] p-3.5 flex flex-col items-start gap-2 hover:shadow-sm hover:border-terra transition-colors"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-terra" style={{ background: 'var(--accent-soft)' }}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-sm font-semibold text-brown">{label}</div>
        <div className="text-[11px] text-brown-3">{desc}</div>
      </div>
    </Link>
  )
}

const HARI_OPTIONS: Array<{ value: FilterAktivitas['hari']; label: string }> = [
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
  { value: 'semester', label: 'Semester' },
]

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
export function DosenHome({ dosenId }: { dosenId?: string }) {
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
  const filter = useMemo<FilterAktivitas>(() => ({ kelasId: kelasIdServer, hari, courseId }), [kelasIdServer, hari, courseId])

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
  const ringkas = useMemo(() => (sumber ? ringkasKelas(sumber) : null), [sumber])
  const perhatian = useMemo(() => (sumber ? perluPerhatian(sumber) : []), [sumber])
  const matriks = useMemo(() => (sumber ? matriksProgres(sumber) : []), [sumber])

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
      {/* Judul + lencana perlu perhatian */}
      <div className="flex items-center justify-between gap-2 flex-wrap -mt-1 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-brown-3">Dashboard dosen</p>
          {perhatian.length > 0 && (
            <Link
              to="?tab=perhatian"
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-2 text-[11px] font-bold rounded-full"
              style={{ background: 'var(--danger)', color: 'var(--btn-text)' }}
            >
              {perhatian.length} perlu perhatian
            </Link>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <MataKuliahSelect size="sm" />
        <KelasTahunFilter kelasList={kelasList} tahun={tahun} kelas={kelas} onChange={handleKelasTahunChange} />
        <Select
          value={String(hari)}
          onChange={(v) => handleHariChange(v === 'semester' ? 'semester' : (Number(v) as 7 | 30))}
          aria-label="Filter rentang waktu"
          size="sm"
          options={HARI_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }))}
        />
      </div>

      {/* 6 angka ringkas */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          icon={IconUsers}
          val={ringkas ? `${ringkas.aktif7Hari}/${ringkas.totalMhs}` : '—'}
          label="Mahasiswa aktif 7 hari"
          bar="var(--sage)"
        />
        <StatCard
          icon={IconCheck}
          val={ringkas ? `${ringkas.preSelesai}/${ringkas.totalMhs}` : '—'}
          label="Pre-test selesai"
          bar="var(--terra)"
        />
        <StatCard icon={IconTrendingUp} val={ringkas?.topikRataRata ?? '—'} label="Topik rata-rata kelas" bar="var(--info)" />
        <StatCard icon={IconChart} val={ringkas ? String(ringkas.rataFormatif) : '—'} label="Rata-rata formatif" bar="var(--sage)" />
        <StatCard icon={IconRefresh} val={ringkas ? String(ringkas.remedial7Hari) : '—'} label="Remedial 7 hari" bar="var(--terra)" />
        <StatCard icon={IconTarget} val={ringkas ? String(ringkas.sesiAktif) : '—'} label="Sesi tes khusus aktif" bar="var(--info)" />
      </div>

      {/* Jalan pintas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ShortcutCard to="/asesmen/bank" icon={IconClipboard} label="Bank soal" desc="Soal, tes khusus, tes kelompok, tugas akhir" />
        <ShortcutCard to="/modul" icon={IconFolder} label="PDF topik" desc="PDF tiap topik" />
        <ShortcutCard to="/video" icon={IconVideo} label="Video topik" desc="Video tiap topik" />
        <ShortcutCard to="/kelas" icon={IconGraduationCap} label="Kelas" desc="Kelas dan kode gabung" />
      </div>

      {/* Tab: Aktivitas kelas / Perlu perhatian / Progres mahasiswa x topik */}
      <PillGroup
        ariaLabel="Tab dashboard dosen"
        value={tab}
        onChange={pindahTab}
        options={[
          { value: 'aktivitas', label: 'Aktivitas', badge: kejadian.length },
          { value: 'perhatian', label: 'Perlu perhatian', badge: perhatian.length, badgeTone: 'danger' },
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
                  <tbody>
                    {kejadian.slice(0, feedLimit).map((k, i) => (
                      <tr key={i} className="row-divider">
                        <td className="px-4 py-2 text-brown-3 text-xs whitespace-nowrap">{timeAgo(k.waktu)}</td>
                        <td className="px-4 py-2 text-brown font-medium whitespace-nowrap">{k.nama}</td>
                        <td className="px-4 py-2 text-brown-2">{k.keterangan}</td>
                        <td className="px-4 py-2 text-brown-3 text-xs whitespace-nowrap">{k.kelasNama ?? '—'}</td>
                      </tr>
                    ))}
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
    baca: { label: `Baca topik ${orderNum}`, to: `/modul/${topikId}` },
    video: { label: `Tonton video ${orderNum}`, to: `/video/${topikId}` },
    formatif: { label: `Kerjakan tes formatif ${orderNum}`, to: `/asesmen/formatif/${topikId}` },
  }
}

export function Dashboard() {
  const { user, profile, role, loading } = useAuth()
  const { data: modules = [], isLoading: modulesLoading } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { data: attempts = [] } = useAllQuizAttempts()
  const { golongan, skorPre } = useTopikStatus()
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
            <h1 className="text-2xl font-bold text-brown mb-1">
              Halo, {profile?.full_name || 'Pengguna'}
            </h1>
            <DosenHome dosenId={user?.id} />
          </>
        ) : modules.length === 0 ? (
          <p className="text-brown-3">{modulesLoading ? 'Memuat…' : 'Belum ada topik. Dosen menambah topik lewat menu Modul.'}</p>
        ) : (
          <DashboardMhs modules={modules} progress={progress} attempts={attempts} pre={{ skor: skorPre, golongan }} />
        )}
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
}: {
  modules: ModuleRow[]
  progress: ProgressMap
  attempts: QuizAttemptWithModule[]
  /** Skor dan golongan pre-test (antrean #105). */
  pre?: { skor: number | null; golongan: Golongan }
}) {
  const hasil = hitungLangkah({ modules, progress, attempts })
  const totalModules = modules.length || TOTAL_MODULES
  const actions = langkahActions(hasil.topikAktif.id, hasil.topikAktif.orderNum)
  const langkahLain = (Object.keys(actions) as Array<keyof typeof actions>).filter(
    (k) => k !== hasil.langkah,
  )

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h1 className="text-2xl font-bold text-brown">Dashboard</h1>
        <MataKuliahSelect />
      </div>
      <p className="text-brown-3 mb-6">
        Topik {hasil.topikAktif.orderNum} dari {totalModules} · {hasil.topikAktif.title}
      </p>

      <div className="bg-ivory rounded-2xl border p-5 mb-4" style={BORDER}>
        <div className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-3">
          Langkah berikutnya
        </div>
        {hasil.langkah === 'selesai-semua' ? (
          <p className="text-brown-2 text-sm">
            Semua topik selesai. Menunggu sesi post-test dari dosen.
          </p>
        ) : (
          <>
            <Link to={actions[hasil.langkah].to} className="btn btn-primary mb-3">
              {actions[hasil.langkah].label}
            </Link>
            <div className="flex flex-wrap gap-2">
              {langkahLain.map((k) => (
                <Link key={k} to={actions[k].to} className="btn btn-secondary">
                  {actions[k].label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard icon={IconCheck} val={`${hasil.topikSelesai}/${totalModules}`} label="Topik selesai" bar="var(--sage)" />
        <StatCard
          icon={IconTrendingUp}
          val={hasil.skorTerakhir ? `${hasil.skorTerakhir.score}%` : '—'}
          label={
            hasil.skorTerakhir
              ? `Formatif terakhir · ${hasil.skorTerakhir.lulus ? 'Lulus' : 'Remedial'}`
              : 'Formatif terakhir'
          }
          bar="var(--terra)"
        />
        <StatCard
          icon={IconFolder}
          val={pre?.skor != null ? String(pre.skor) : '—'}
          label={pre ? `Pre-test · ${GOLONGAN_LABEL[pre.golongan]}` : 'Pre-test'}
          bar="var(--info)"
        />
      </div>

      <div className="bg-ivory rounded-2xl border p-4" style={BORDER}>
        <div className="text-sm font-semibold text-brown mb-1 flex items-center gap-1.5">
          <IconBook size={15} /> Tes khusus dari dosen
        </div>
        <p className="text-xs text-brown-3 mb-3">Punya kode dari dosen? Masukkan di sini.</p>
        <Link to="/asesmen/tes" className="btn btn-secondary btn-sm">
          Masukkan kode
        </Link>
      </div>
    </>
  )
}
