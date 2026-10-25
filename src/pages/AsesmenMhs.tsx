import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { fetchBankSoal } from '../lib/kuisSoal'
import { fetchAttemptsByKind, saveQuizAttempt } from '../lib/quizAttempts'
import { useAmbang } from '../lib/ambang'
import { acakSoal, nilai, type AcakSoalResult, ambilSeimbang, SOAL_TAMPIL_DIAGNOSTIK } from '../lib/acak'
import { useTopikStatus, markPretestSkipped, markPretestDone } from '../lib/topik'
import { computeNGain } from '../lib/ngain'
import { rincianDariBenar, rincianDariPercobaan, type RincianTopik } from '../lib/rincianTopik'
import { useCourse } from '../contexts/CourseContext'
import { formatTanggal, nomorPertemuan } from '../lib/jadwal'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { SoalRunner, TinjauanJawaban } from '../components/SoalRunner'
import { TugasAkhirMhsCard } from '../components/TugasAkhirMhsCard'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { ChipRak } from '../components/KartuTopik'
import { golonganDariSkor, simpanSkorPreDemo, GOLONGAN_LABEL, GOLONGAN_CHIP } from '../lib/golongan'
import { babSaja } from '../lib/jenisTopik'

// Asesmen sisi mahasiswa (spec §4, §9 WP6): satu komponen, tiga tampilan
// dipilih dari path — App.tsx sudah memasang route /asesmen, /asesmen/pre,
// /asesmen/post ke komponen yang sama (lihat App.tsx AsesmenRoute).
const BORDER = { borderColor: 'var(--border)' } as const

export function AsesmenMhs() {
  const { pathname } = useLocation()
  if (pathname === '/asesmen/pre') return <PreTestPerMataKuliah />
  if (pathname === '/asesmen/post') return <PostTest />
  return <AsesmenDaftar />
}

export default AsesmenMhs

function StatusChip({ label }: { label: string }) {
  const style =
    label === 'Lulus'
      ? { background: 'var(--success-soft)', color: 'var(--success)' }
      : label === 'Remedial'
        ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
        : label === 'Terkunci'
          ? { background: 'var(--border2)', color: 'var(--brown2)' }
          : { background: 'var(--accent-soft)', color: 'var(--terra-d)' }
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={style}>
      {label}
    </span>
  )
}

function PanelCard({
  title,
  value,
  linkTo,
  linkLabel,
}: {
  title: string
  value?: string
  linkTo?: string
  linkLabel?: string
}) {
  return (
    <div className="bg-ivory rounded-xl border p-4" style={BORDER}>
      <div className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-1.5">{title}</div>
      {value && <p className="text-sm text-brown-2 mb-2">{value}</p>}
      {linkTo && linkLabel && (
        <Link to={linkTo} className="text-terra text-sm font-semibold inline-flex items-center min-h-11">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

// §5a — /asesmen mahasiswa: kartu tes formatif topik aktif + panel
// pre-test/post-test/mini projek + daftar topik. Panel gaya belajar
// (antrean #57 opsi A) diganti mini projek (dulu "tugas akhir", antrean #170) —
// rute lamanya dibiarkan ada, tidak ditautkan lagi dari sini. Tautan ke tes
// khusus dan tes kelompok juga dicabut (antrean #170); rutenya tetap ada.
function AsesmenDaftar() {
  const { courseId, course } = useCourse()
  const ambang = useAmbang()
  const { data: modules = [] } = useModules()
  const { statusOf, bukaPada, formatifPada } = useTopikStatus()
  // Tes formatif hanya untuk Bab; Bagian (Pendahuluan, Penutup) tidak punya tes (antrean #321).
  const sorted = babSaja([...modules].sort((a, b) => a.order_num - b.order_num))
  const topikAktif = sorted.find((m) => statusOf(m.id) === 'open') ?? sorted.find((m) => statusOf(m.id) === 'done')

  const { data: attemptsAktif = [] } = useQuizAttempts(topikAktif?.id ?? 0)
  const { data: preAttempts = [] } = useQuery({
    queryKey: ['attempts-by-kind', 'pre', courseId],
    queryFn: () => fetchAttemptsByKind('pre', courseId),
  })

  const bestAktif = attemptsAktif.length ? Math.max(...attemptsAktif.map((a) => a.score)) : null
  const preSkor = preAttempts.length ? preAttempts[preAttempts.length - 1].score : null

  const aktifLulus = !!topikAktif && statusOf(topikAktif.id) === 'done'
  // Jadwal (antrean #153): tes topik aktif bisa belum dibuka walau materinya sudah.
  const tesDibuka = topikAktif && !aktifLulus ? formatifPada(topikAktif.id) : null
  const topikPertamaDibuka = sorted[0] ? bukaPada(sorted[0].id) : null

  const chipAktif = !topikAktif
    ? null
    : aktifLulus
      ? 'Lulus'
      : statusOf(topikAktif.id) === 'locked' || tesDibuka
        ? 'Terkunci'
        : bestAktif != null
          ? 'Remedial'
          : 'Siap'

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 flex-wrap mb-1">
          <h1 className="font-display text-2xl font-bold text-brown">Asesmen</h1>
          <MataKuliahSelect />
        </div>
        <p className="text-brown-3 mb-4">Tes diagnostik awal, tes formatif tiap topik, dan mini projek.</p>
        <PertemuanStepper
          current={topikAktif?.id ?? sorted[0]?.id ?? 0}
          basePath="/asesmen/formatif"
          statusOf={statusOf}
          tanpaBagian
        />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 mt-6">
          <div>
            {topikAktif ? (
              <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h2 className="font-semibold text-brown">Tes Formatif · {topikAktif.title}</h2>
                  {chipAktif && <StatusChip label={chipAktif} />}
                </div>
                <p className="text-sm text-brown-3 mb-1">Syarat lulus: skor ≥ {ambang.formatif}</p>
                <p className="text-sm text-brown-3 mb-4">Skor terbaik: {bestAktif != null ? bestAktif : '—'}</p>
                {tesDibuka ? (
                  <p className="text-sm text-brown-2">Tes formatif topik ini dibuka {formatTanggal(tesDibuka)}.</p>
                ) : (
                  <Link to={`/asesmen/formatif/${topikAktif.id}`} className="btn btn-primary">
                    {aktifLulus ? 'Lihat Hasil' : 'Kerjakan'}
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-brown-3">
                {sorted.length === 0
                  ? 'Memuat topik…'
                  : topikPertamaDibuka
                    ? `Belum ada topik yang terbuka. Topik pertama dibuka ${formatTanggal(topikPertamaDibuka)}.`
                    : 'Belum ada topik yang terbuka.'}
              </p>
            )}

            <div className="mt-5">
              <h3 className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-2.5">{sorted.length} topik</h3>
              <div className="flex flex-col gap-2">
                {sorted.map((m, i) => {
                  const st = statusOf(m.id)
                  const label = st === 'done' ? 'Lulus' : st === 'locked' ? 'Terkunci' : 'Terbuka'
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-ivory rounded-xl border px-4 py-2.5 gap-2"
                      style={BORDER}
                    >
                      <span className="text-sm text-brown-2">
                        Pertemuan {nomorPertemuan(i, m.minggu_mulai, 2)} · {m.title}
                      </span>
                      <StatusChip label={label} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <PanelCard
              title="Tes diagnostik awal"
              value={preSkor != null ? `Skor ${preSkor} · ${GOLONGAN_LABEL[golonganDariSkor(preSkor, ambang.diagnostik)]} · ${course?.name ?? ''}` : `Belum · ${course?.name ?? ''}`}
            />
            <TugasAkhirMhsCard />
          </div>
        </div>
      </div>
    </Layout>
  )
}

// §5b — /asesmen/pre: pre-test tanpa kode, sekali seumur akun. Bank kosong
// TIDAK mengunci mahasiswa (keputusan sementara — lihat laporan WP6): tombol
// "Lanjut tanpa pre-test" menandai localStorage sfp_pretest_skip supaya
// usePreTestDone (lib/topik.ts) menganggap gerbang lolos.
// Layar hasil tes diagnostik, opsi B "Skor dan Rincian Topik" (antrean #142,
// pilihan Johan 10 Okt 2026). Kiri: skor, golongan, tiga langkah berikutnya.
// Kanan: jumlah benar per topik, dari tanda topik tiap soal (migration_v31);
// soal yang belum ditandai dosen dikumpulkan di baris "Belum Ditandai Topik".
function HasilDiagnostik({ skor, adaTinjauan, rincian }: { skor: number; adaTinjauan: boolean; rincian: RincianTopik[] | null }) {
  const ambang = useAmbang()
  const { data: modules = [] } = useModules()
  const { statusOf } = useTopikStatus()
  const sorted = babSaja([...modules].sort((a, b) => a.order_num - b.order_num))
  const golongan = golonganDariSkor(skor, ambang.diagnostik)
  const warna = golongan === 'mahir' ? 'var(--success)' : 'var(--warning)'
  const pertama = sorted.find((m) => statusOf(m.id) === 'open')
  const langkah =
    golongan === 'mahir'
      ? ['Pilih topik mana pun, semuanya sudah terbuka.', `Kerjakan tes formatif tiap topik sampai skor ${ambang.formatif}.`, 'Sesudah semua topik selesai, lanjut ke mini projek.']
      : [
          `Mulai dari Topik ${pertama ? sorted.indexOf(pertama) + 1 : 1}: baca modul dan tonton videonya.`,
          `Kerjakan tes formatifnya sampai skor ${ambang.formatif}.`,
          'Topik berikutnya terbuka sesudah itu, begitu seterusnya.',
        ]
  const benar = rincian?.reduce((n, r) => n + r.benar, 0) ?? null
  const total = rincian?.reduce((n, r) => n + r.total, 0) ?? null
  const bertanda = rincian?.filter((r) => r.topikId != null) ?? []
  const tanpaTanda = rincian?.find((r) => r.topikId == null)
  const barisTopik = sorted
    .map((m) => ({ m, r: bertanda.find((x) => x.topikId === m.id) }))
    .filter((x): x is { m: (typeof sorted)[number]; r: RincianTopik } => !!x.r)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-4">
      <div className="bg-ivory border rounded-xl p-5 md:p-6 flex flex-col gap-4" style={BORDER}>
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="w-[132px] h-[132px] rounded-full grid place-items-center flex-shrink-0"
            style={{ background: `conic-gradient(${warna} ${Math.min(100, Math.max(0, skor))}%, var(--border) 0)` }}
            role="img"
            aria-label={`Skor ${skor} dari 100, batas ${GOLONGAN_LABEL.mahir} ${ambang.diagnostik}`}
          >
            <div className="w-[108px] h-[108px] rounded-full bg-ivory grid place-items-center text-center">
              <div>
                <div className="text-xs text-brown-3">Skor Kamu</div>
                <div className="text-4xl font-bold text-brown leading-none tabular-nums">{skor}</div>
                <div className="text-[11px] text-brown-3">dari 100</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-start">
            {/* Golongan tes diagnostik (antrean #105 opsi B; batasnya setelan mata kuliah). */}
            <ChipRak jenis={GOLONGAN_CHIP[golongan]} label={GOLONGAN_LABEL[golongan]} />
            <span className="text-xs text-brown-3 tabular-nums">
              {benar != null && total ? `${benar} benar dari ${total} soal · ` : ''}batas {GOLONGAN_LABEL.mahir} {ambang.diagnostik}
            </span>
          </div>
        </div>
        <ol className="flex flex-col gap-2">
          {langkah.map((l, n) => (
            <li key={n} className="flex items-start gap-2.5 text-sm text-brown-2">
              <span className="w-6 h-6 rounded-full grid place-items-center text-xs font-bold flex-shrink-0 text-brown tabular-nums" style={{ background: 'var(--accent-soft)' }}>
                {n + 1}
              </span>
              <span>{l}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 mt-auto">
          <Link to={golongan === 'mahir' || !pertama ? '/modul' : `/modul/${pertama.id}`} className="btn btn-primary">
            {golongan === 'mahir' || !pertama ? 'Pilih Topik' : `Mulai Topik ${sorted.indexOf(pertama) + 1}`}
          </Link>
          {adaTinjauan && (
            <button onClick={() => document.getElementById('tinjauan-jawaban')?.scrollIntoView?.({ behavior: 'smooth' })} className="btn btn-secondary">
              Tinjau Jawaban
            </button>
          )}
          <Link to="/dashboard" className="btn btn-secondary">
            Ke Dashboard
          </Link>
        </div>
      </div>

      <div className="bg-ivory border rounded-xl p-5 md:p-6" style={BORDER}>
        <h2 className="text-sm font-semibold text-brown mb-1">Benar per Topik</h2>
        {barisTopik.length === 0 ? (
          <p className="text-sm text-brown-3">
            {rincian
              ? 'Rincian per topik belum tersedia karena soal tes ini belum ditandai topiknya oleh dosen.'
              : 'Rincian per topik tidak tersedia untuk pengerjaan ini.'}
          </p>
        ) : (
          <ul>
            {barisTopik.map(({ m, r }) => (
              <BarisRincian key={m.id} nama={`${sorted.findIndex((x) => x.id === m.id) + 1 || m.order_num}. ${m.title}`} benar={r.benar} total={r.total} />
            ))}
            {tanpaTanda && <BarisRincian nama="Belum Ditandai Topik" benar={tanpaTanda.benar} total={tanpaTanda.total} />}
          </ul>
        )}
      </div>
    </div>
  )
}

function BarisRincian({ nama, benar, total }: { nama: string; benar: number; total: number }) {
  const p = total ? benar / total : 0
  return (
    <li className="row-divider flex items-center gap-2.5 py-2">
      <span className="flex-1 min-w-0 text-[13px] text-brown-2">{nama}</span>
      <span className="w-[86px] h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--border)' }} aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${p * 100}%`, background: p >= 0.75 ? 'var(--success)' : p >= 0.5 ? 'var(--warning)' : 'var(--danger)' }} />
      </span>
      <span className="w-9 text-right text-[13px] text-brown tabular-nums">
        {benar}/{total}
      </span>
    </li>
  )
}

// Ganti mata kuliah = tes lain: hasil dan tinjauan mata kuliah sebelumnya
// tidak boleh terbawa, jadi komponennya dipasang ulang (antrean #141).
function PreTestPerMataKuliah() {
  const { courseId } = useCourse()
  return <PreTest key={courseId} />
}

function PreTest() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { courseId, course } = useCourse()
  const ambang = useAmbang()
  const { data: soal = [], isLoading: soalLoading } = useQuery({
    queryKey: ['bank-soal', 'pre', courseId],
    queryFn: () => fetchBankSoal('pre', undefined, courseId),
  })
  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['attempts-by-kind', 'pre', courseId],
    queryFn: () => fetchAttemptsByKind('pre', courseId),
  })

  const [acak, setAcak] = useState<AcakSoalResult | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)
  const [hasilBaru, setHasilBaru] = useState<number | null>(null)
  // Benar/salah baru ditunjukkan sesudah dikirim (antrean #138). Hanya ada
  // sampai halaman ditinggalkan; pengerjaan lama tidak punya tinjauan.
  const [tinjau, setTinjau] = useState<{ soal: AcakSoalResult['tampil']; jawaban: number[] } | null>(null)

  if (soalLoading || attemptsLoading) {
    return (
      <Layout>
        <div className="p-6 text-brown-3">Memuat…</div>
      </Layout>
    )
  }

  const terakhir = attempts.length ? attempts[attempts.length - 1] : null
  const skorTersimpan = terakhir ? terakhir.score : null
  const skorFinal = hasilBaru ?? skorTersimpan
  // Benar per topik (antrean #142 opsi B): dari pengerjaan yang baru dikirim, atau dari percobaan tersimpan.
  const rincian = tinjau
    ? rincianDariBenar(soal, new Map(tinjau.soal.map((s, n) => [s.id, s.kunciTampil != null && tinjau.jawaban[n] === s.kunciTampil])))
    : terakhir
      ? rincianDariPercobaan(soal, terakhir.answers, terakhir.questionOrder)
      : null

  function mulai() {
    setAcak(acakSoal(ambilSeimbang(soal, SOAL_TAMPIL_DIAGNOSTIK)))
    setCurrentQ(0)
    setJawaban({})
  }

  async function lanjutTanpaPreTest() {
    markPretestSkipped()
    await queryClient.invalidateQueries({ queryKey: ['pretest-done'] })
    navigate('/dashboard')
  }

  async function handleFinish() {
    if (!acak) return
    const jawabanTampil = acak.tampil.map((_, i) => jawaban[i] ?? -1)
    const hasil = nilai(acak.tampil, jawabanTampil)
    setSaving(true)
    try {
      await saveQuizAttempt(null, {
        score: hasil.score,
        answers: jawabanTampil,
        kind: 'pre',
        questionOrder: acak.urut,
        courseId,
      })
      markPretestDone()
      simpanSkorPreDemo(courseId, hasil.score)
      await queryClient.invalidateQueries({ queryKey: ['pretest-done'] })
      // Status topik ikut golongan pre-test (antrean #105), jadi hitung ulang.
      await queryClient.invalidateQueries({ queryKey: ['topik-pretest-done'] })
      await queryClient.invalidateQueries({ queryKey: ['attempts-by-kind', 'pre'] })
      // Basis data menempatkan mahasiswa ke kelas otomatis saat tes ini tersimpan (antrean #228).
      await queryClient.invalidateQueries({ queryKey: ['kelas-saya'] })
    } catch (e) {
      console.warn('[asesmen-pre] saveQuizAttempt gagal:', e)
    }
    setSaving(false)
    setTinjau({ soal: acak.tampil, jawaban: jawabanTampil })
    setAcak(null)
    setHasilBaru(hasil.score)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        {/* Pemilih mata kuliah disembunyikan selama mengerjakan; di luar itu ia
            jalan keluar bagi yang salah memilih mata kuliah (antrean #141). */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <h1 className="font-display text-xl font-bold text-brown">Tes Diagnostik Awal</h1>
          {!acak && <MataKuliahSelect />}
        </div>

        {acak ? (
          <SoalRunner
            total={acak.tampil.length}
            q={acak.tampil[currentQ]}
            currentQ={currentQ}
            selected={jawaban[currentQ] ?? -1}
            isSubmitted={false}
            tunda
            saving={saving}
            finishLabel="Kirim ✓"
            onSelect={(i) => setJawaban((a) => ({ ...a, [currentQ]: i }))}
            onPrev={() => setCurrentQ((c) => Math.max(0, c - 1))}
            onNext={() => setCurrentQ((c) => Math.min(acak.tampil.length - 1, c + 1))}
            onFinish={handleFinish}
          />
        ) : skorFinal != null ? (
          <>
            <HasilDiagnostik skor={skorFinal} adaTinjauan={!!tinjau} rincian={rincian} />
            {tinjau && (
              <div id="tinjauan-jawaban">
                <TinjauanJawaban soal={tinjau.soal} jawaban={tinjau.jawaban} />
              </div>
            )}
          </>
        ) : soal.length === 0 ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-5">Dosen belum menyiapkan tes diagnostik awal.</p>
            <button onClick={lanjutTanpaPreTest} className="btn btn-primary">
              Lanjut Tanpa Tes Diagnostik Awal
            </button>
          </div>
        ) : (
          // Kartu pembuka (antrean #334): tujuan, tiga fakta, dua jalur hasil, lalu tombol mulai.
          <div className="bg-ivory border rounded-2xl p-5 sm:p-7 max-w-3xl mx-auto flex flex-col gap-5" style={BORDER}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brown-3">Langkah pertama sebelum belajar</p>
              <h2 className="text-lg sm:text-xl font-bold text-brown mt-1">
                Kenali kemampuan awalmu{course ? ` di ${course.name}` : ''}
              </h2>
              <p className="text-sm text-brown-2 mt-1.5 leading-relaxed">
                Tes ini memetakan pemahamanmu sebelum materi dimulai. Hasilnya menentukan jalur belajarmu, jadi kerjakan sendiri sesuai pemahamanmu sekarang.
              </p>
            </div>

            {/* Tiga kolom juga di telepon supaya tombol Mulai Tes tetap di atas lipatan layar */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {[
                {
                  angka: `${Math.min(soal.length, SOAL_TAMPIL_DIAGNOSTIK)} soal`,
                  ket: soal.length > SOAL_TAMPIL_DIAGNOSTIK ? `acak dari ${soal.length}` : 'pilihan ganda',
                },
                { angka: 'Tanpa kode', ket: 'langsung mulai' },
                { angka: `Batas ${ambang.diagnostik}`, ket: 'penentu jalur' },
              ].map((f) => (
                <div key={f.angka} className="rounded-xl border p-2.5 sm:p-3.5 bg-cream" style={BORDER}>
                  <div className="text-[15px] sm:text-base font-bold text-brown leading-tight">{f.angka}</div>
                  <div className="text-[13px] text-brown-3 mt-0.5 leading-snug">{f.ket}</div>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-brown mb-2">Sesudah tes, kamu masuk salah satu jalur:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-xl border p-3.5" style={BORDER}>
                  <ChipRak jenis={GOLONGAN_CHIP.mahir} label={`${GOLONGAN_LABEL.mahir} · skor ${ambang.diagnostik} ke atas`} />
                  <p className="text-[13px] text-brown-2 mt-2 leading-snug">Semua topik langsung terbuka. Kerjakan tes formatif tiap topik dalam urutan mana pun.</p>
                </div>
                <div className="rounded-xl border p-3.5" style={BORDER}>
                  <ChipRak jenis={GOLONGAN_CHIP.remedial} label={`${GOLONGAN_LABEL.remedial} · di bawah ${ambang.diagnostik}`} />
                  <p className="text-[13px] text-brown-2 mt-2 leading-snug">
                    Topik terbuka satu per satu: topik berikutnya terbuka sesudah tes formatif topik sebelumnya mencapai skor {ambang.formatif}.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-1">
              <p className="text-xs text-brown-3 sm:flex-1">
                Tiap mata kuliah punya tes diagnostik awal sendiri. Tes ini hanya untuk mata kuliah yang sedang dipilih.
              </p>
              <button onClick={mulai} className="btn btn-primary w-full sm:w-auto">
                Mulai Tes →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

// §5c — /asesmen/post: dibuka dosen (lewat sesi WP6b), jadi di sini cuma
// membaca hasil kalau sudah ada. "Peningkatan skor" pakai rumus computeNGain
// (lib/ngain.ts) — istilah teknisnya sendiri tidak boleh tampil di antarmuka
// (spec §1.1).
function PostTest() {
  const { courseId } = useCourse()
  const { data: postAttempts = [], isLoading: postLoading } = useQuery({
    queryKey: ['attempts-by-kind', 'post', courseId],
    queryFn: () => fetchAttemptsByKind('post', courseId),
  })
  const { data: preAttempts = [], isLoading: preLoading } = useQuery({
    queryKey: ['attempts-by-kind', 'pre', courseId],
    queryFn: () => fetchAttemptsByKind('pre', courseId),
  })

  if (postLoading || preLoading) {
    return (
      <Layout>
        <div className="p-6 text-brown-3">Memuat…</div>
      </Layout>
    )
  }

  const post = postAttempts[postAttempts.length - 1]
  const pre = preAttempts[preAttempts.length - 1]

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="font-display text-xl font-bold text-brown mb-4">Post-test</h1>
        {!post ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2">Post-test dibuka oleh dosen.</p>
          </div>
        ) : (
          <div className="bg-ivory border rounded-xl p-7" style={BORDER}>
            <p className="text-brown-2 mb-1">
              Skor post-test: <strong>{post.score}</strong>
            </p>
            {!pre ? (
              <p className="text-sm text-brown-3">Belum ada skor tes diagnostik awal, peningkatan skor belum bisa dihitung.</p>
            ) : pre.score >= 100 ? (
              <p className="text-sm text-brown-3">Peningkatan skor tidak dihitung karena skor tes diagnostik awal sudah 100.</p>
            ) : (
              (() => {
                const { gain, category } = computeNGain(pre.score, post.score, 100)
                return (
                  <p className="text-sm text-brown-3">
                    Peningkatan skor dari tes diagnostik awal: {gain.toFixed(2)} ({category})
                  </p>
                )
              })()
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
