import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { fetchBankSoal } from '../lib/kuisSoal'
import { fetchAttemptsByKind, saveQuizAttempt, PASS_SCORE } from '../lib/quizAttempts'
import { acakSoal, nilai, type AcakSoalResult } from '../lib/acak'
import { useTopikStatus, markPretestSkipped, markPretestDone } from '../lib/topik'
import { computeNGain } from '../lib/ngain'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { SoalRunner } from '../components/SoalRunner'

// Asesmen sisi mahasiswa (spec §4, §9 WP6): satu komponen, tiga tampilan
// dipilih dari path — App.tsx sudah memasang route /asesmen, /asesmen/pre,
// /asesmen/post ke komponen yang sama (lihat App.tsx AsesmenRoute).
const BORDER = { borderColor: 'var(--border)' } as const

export function AsesmenMhs() {
  const { pathname } = useLocation()
  if (pathname === '/asesmen/pre') return <PreTest />
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
// pre-test/VARK/post-test + daftar 9 topik.
function AsesmenDaftar() {
  const { profile } = useAuth()
  const { data: modules = [] } = useModules()
  const { statusOf } = useTopikStatus()
  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)
  const topikAktif = sorted.find((m) => statusOf(m.id) === 'open') ?? sorted.find((m) => statusOf(m.id) === 'done')

  const { data: attemptsAktif = [] } = useQuizAttempts(topikAktif?.id ?? 0)
  const { data: preAttempts = [] } = useQuery({
    queryKey: ['attempts-by-kind', 'pre'],
    queryFn: () => fetchAttemptsByKind('pre'),
  })

  const bestAktif = attemptsAktif.length ? Math.max(...attemptsAktif.map((a) => a.score)) : null
  const preSkor = preAttempts.length ? preAttempts[preAttempts.length - 1].score : null

  const chipAktif = !topikAktif
    ? null
    : statusOf(topikAktif.id) === 'done'
      ? 'Lulus'
      : statusOf(topikAktif.id) === 'locked'
        ? 'Terkunci'
        : bestAktif != null
          ? 'Remedial'
          : 'Siap'

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="font-display text-2xl font-bold text-brown mb-1">Asesmen</h1>
        <p className="text-brown-3 mb-4">Pre-test, VARK, tes formatif tiap topik, dan post-test.</p>
        <PertemuanStepper
          current={topikAktif?.id ?? sorted[0]?.id ?? 0}
          basePath="/asesmen/formatif"
          statusOf={statusOf}
        />

        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 mt-6">
          <div>
            {topikAktif ? (
              <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <h2 className="font-semibold text-brown">Tes formatif · {topikAktif.title}</h2>
                  {chipAktif && <StatusChip label={chipAktif} />}
                </div>
                <p className="text-sm text-brown-3 mb-1">Syarat lulus: skor ≥ {PASS_SCORE}</p>
                <p className="text-sm text-brown-3 mb-4">Skor terbaik: {bestAktif != null ? bestAktif : '—'}</p>
                <Link to={`/asesmen/formatif/${topikAktif.id}`} className="btn btn-primary">
                  Kerjakan
                </Link>
              </div>
            ) : (
              <p className="text-brown-3">Memuat topik…</p>
            )}

            <div className="mt-5">
              <h3 className="text-xs font-semibold text-brown-3 uppercase tracking-wide mb-2.5">9 topik</h3>
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
                        Pertemuan {i + 1} · {m.title}
                      </span>
                      <StatusChip label={label} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <PanelCard title="Pre-test" value={preSkor != null ? `Skor ${preSkor}` : 'Belum'} />
            <PanelCard
              title="VARK"
              value={profile?.learning_style ?? undefined}
              linkTo={profile?.learning_style ? undefined : '/asesmen/vark'}
              linkLabel={profile?.learning_style ? undefined : 'Kerjakan VARK'}
            />
            {/* /asesmen/tes diisi WP6b (spec §9); untuk sekarang tautan saja. */}
            <PanelCard
              title="Post-test"
              value="Dibuka dosen lewat tes khusus"
              linkTo="/asesmen/tes"
              linkLabel="Masukkan kode"
            />
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
function PreTest() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: soal = [], isLoading: soalLoading } = useQuery({
    queryKey: ['bank-soal', 'pre'],
    queryFn: () => fetchBankSoal('pre'),
  })
  const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['attempts-by-kind', 'pre'],
    queryFn: () => fetchAttemptsByKind('pre'),
  })

  const [acak, setAcak] = useState<AcakSoalResult | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [hasilBaru, setHasilBaru] = useState<number | null>(null)

  if (soalLoading || attemptsLoading) {
    return (
      <Layout>
        <div className="p-6 text-brown-3">Memuat…</div>
      </Layout>
    )
  }

  const skorTersimpan = attempts.length ? attempts[attempts.length - 1].score : null
  const skorFinal = hasilBaru ?? skorTersimpan

  function mulai() {
    setAcak(acakSoal(soal))
    setCurrentQ(0)
    setJawaban({})
    setSubmitted({})
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
      })
      markPretestDone()
      await queryClient.invalidateQueries({ queryKey: ['pretest-done'] })
      await queryClient.invalidateQueries({ queryKey: ['attempts-by-kind', 'pre'] })
    } catch (e) {
      console.warn('[asesmen-pre] saveQuizAttempt gagal:', e)
    }
    setSaving(false)
    setAcak(null)
    setHasilBaru(hasil.score)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="font-display text-xl font-bold text-brown mb-4">Pre-test</h1>

        {acak ? (
          <SoalRunner
            total={acak.tampil.length}
            q={acak.tampil[currentQ]}
            currentQ={currentQ}
            selected={jawaban[currentQ] ?? -1}
            isSubmitted={submitted[currentQ] ?? false}
            saving={saving}
            finishLabel="Kirim ✓"
            onSelect={(i) => {
              if (submitted[currentQ]) return
              setJawaban((a) => ({ ...a, [currentQ]: i }))
              setSubmitted((s) => ({ ...s, [currentQ]: true }))
            }}
            onPrev={() => setCurrentQ((c) => Math.max(0, c - 1))}
            onNext={() => setCurrentQ((c) => Math.min(acak.tampil.length - 1, c + 1))}
            onFinish={handleFinish}
          />
        ) : skorFinal != null ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-5">Skor pre-test {skorFinal} tersimpan.</p>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
              Mulai belajar
            </button>
          </div>
        ) : soal.length === 0 ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-5">Dosen belum menyiapkan pre-test.</p>
            <button onClick={lanjutTanpaPreTest} className="btn btn-primary">
              Lanjut tanpa pre-test
            </button>
          </div>
        ) : (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-1">Kerjakan pre-test dulu.</p>
            <p className="text-sm text-brown-3 mb-5">{soal.length} soal · tanpa kode, tanpa ambang lulus</p>
            <button onClick={mulai} className="btn btn-primary">
              Mulai
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

// §5c — /asesmen/post: hanya lewat sesi tes khusus (WP6b), jadi di sini cuma
// membaca hasil kalau sudah ada. "Peningkatan skor" pakai rumus computeNGain
// (lib/ngain.ts) — istilah teknisnya sendiri tidak boleh tampil di antarmuka
// (spec §1.1).
function PostTest() {
  const { data: postAttempts = [], isLoading: postLoading } = useQuery({
    queryKey: ['attempts-by-kind', 'post'],
    queryFn: () => fetchAttemptsByKind('post'),
  })
  const { data: preAttempts = [], isLoading: preLoading } = useQuery({
    queryKey: ['attempts-by-kind', 'pre'],
    queryFn: () => fetchAttemptsByKind('pre'),
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
            <p className="text-brown-2">Post-test dibuka dosen lewat tes khusus.</p>
          </div>
        ) : (
          <div className="bg-ivory border rounded-xl p-7" style={BORDER}>
            <p className="text-brown-2 mb-1">
              Skor post-test: <strong>{post.score}</strong>
            </p>
            {!pre ? (
              <p className="text-sm text-brown-3">Belum ada skor pre-test, peningkatan skor belum bisa dihitung.</p>
            ) : pre.score >= 100 ? (
              <p className="text-sm text-brown-3">Peningkatan skor dari pre-test: —</p>
            ) : (
              (() => {
                const { gain, category } = computeNGain(pre.score, post.score, 100)
                return (
                  <p className="text-sm text-brown-3">
                    Peningkatan skor dari pre-test: {gain.toFixed(2)} ({category})
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
