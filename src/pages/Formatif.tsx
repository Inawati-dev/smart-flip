import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModule, useModules, useIkutiMataKuliah } from '../hooks/useModules'
import { useAuth } from '../contexts/AuthContext'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { useCourse } from '../contexts/CourseContext'
import { saveQuizAttempt } from '../lib/quizAttempts'
import { useAmbang } from '../lib/ambang'
import { fetchBankSoal } from '../lib/kuisSoal'
import { acakSoal, nilai, type AcakSoalResult } from '../lib/acak'
import { useTopikStatus } from '../lib/topik'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { SoalRunner } from '../components/SoalRunner'
import { IconLock } from '../components/icons'
import { formatTanggal } from '../lib/jadwal'
import { ChipRak } from '../components/KartuTopik'

// Tes formatif per topik (spec §4.3, §4.4, §9 WP6) — menggantikan Kuis.tsx:
// bank soal diambil dari quiz_questions kind='formatif' (bukan modules.kuis),
// urutan soal & opsi diacak tiap pengerjaan (src/lib/acak.ts), dan hasilnya
// modal apresiasi/remedial alih-alih layar hasil inline. Layar pengerjaan
// (satu soal per layar) dipakai bersama AsesmenMhs.tsx pre-test lewat
// components/SoalRunner.tsx.

const BORDER = { borderColor: 'var(--border)' } as const

export default function Formatif() {
  const { id } = useParams()
  const moduleId = parseInt(id ?? '1', 10) || 1
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { courseId } = useCourse()
  const ambang = useAmbang()
  const { data: modul, isLoading: modulLoading } = useModule(moduleId)
  const { data: modules = [] } = useModules()
  const { statusOf, bukaPada, formatifPada, loading: topikLoading } = useTopikStatus()
  const { role } = useAuth()
  // Dosen tidak dipindah mata kuliahnya (temuan pemeriksa #106).
  const menyesuaikan = useIkutiMataKuliah(role === 'dosen' ? null : moduleId)
  const { data: soal = [], isLoading: soalLoading } = useQuery({
    queryKey: ['bank-soal', 'formatif', moduleId],
    queryFn: () => fetchBankSoal('formatif', moduleId),
  })
  const { data: attempts = [] } = useQuizAttempts(moduleId)

  const [acak, setAcak] = useState<AcakSoalResult | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<{ kind: 'apresiasi' | 'remedial'; score: number } | null>(null)

  if (modulLoading || topikLoading || soalLoading || menyesuaikan) {
    return (
      <Layout>
        <div className="p-6 text-brown-3">Memuat…</div>
      </Layout>
    )
  }
  if (!modul) {
    return (
      <Layout>
        <div className="p-6 text-brown">Topik tidak ditemukan</div>
      </Layout>
    )
  }

  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)
  const idx = sorted.findIndex((m) => m.id === moduleId)
  const status = statusOf(moduleId)
  const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null
  const nextModul = idx >= 0 ? sorted[idx + 1] : undefined

  function mulai() {
    setAcak(acakSoal(soal))
    setCurrentQ(0)
    setJawaban({})
    setSubmitted({})
    setModal(null)
  }

  async function handleFinish() {
    if (!acak) return
    const jawabanTampil = acak.tampil.map((_, i) => jawaban[i] ?? -1)
    const hasil = nilai(acak.tampil, jawabanTampil)
    setSaving(true)
    try {
      await saveQuizAttempt(moduleId, {
        score: hasil.score,
        answers: jawabanTampil,
        kind: 'formatif',
        questionOrder: acak.urut,
        courseId,
      })
      await queryClient.invalidateQueries({ queryKey: ['quizAttempts', moduleId] })
      await queryClient.invalidateQueries({ queryKey: ['quizAttempts', 'all'] })
    } catch (e) {
      console.warn('[formatif] saveQuizAttempt gagal:', e)
    }
    setSaving(false)
    setModal({ kind: hasil.score >= ambang.formatif ? 'apresiasi' : 'remedial', score: hasil.score })
    setAcak(null)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="font-display text-xl font-bold text-brown mb-4">
          Tes Formatif · Pertemuan {modul.order_num} · {modul.title}
        </h1>
        <PertemuanStepper current={moduleId} basePath="/asesmen/formatif" statusOf={statusOf} />

        <div className="mt-6">
          {status === 'locked' ? (
            <div className="p-6 rounded-xl bg-ivory border text-center" style={BORDER}>
              <IconLock size={28} className="mx-auto mb-3 text-brown-3" />
              <p className="text-brown-2 mb-3 text-sm">
                {bukaPada(moduleId) ? `Topik ini dibuka ${formatTanggal(bukaPada(moduleId)!)}.` : `Selesaikan topik ${modul.order_num - 1} dulu.`}
              </p>
              <Link to="/asesmen" className="inline-flex items-center min-h-11 text-terra font-semibold text-sm">
                ← Kembali
              </Link>
            </div>
          ) : status === 'done' && !acak && !modal ? (
            // Sudah lulus: tes tertutup (antrean #153), skor terbaik tetap terlihat.
            <div className="p-7 rounded-xl bg-ivory border text-center" style={BORDER}>
              <div className="flex justify-center mb-3">
                <ChipRak jenis="ok" label="Sudah Lulus" />
              </div>
              <p className="text-brown-2 text-sm mb-1">
                Skor terbaik kamu: <strong>{bestScore}</strong>. Batas lulus {ambang.formatif}.
              </p>
              <p className="text-sm text-brown-3 mb-5">Tes formatif topik ini sudah tertutup untukmu.</p>
              {nextModul && (
                <Link to={`/modul/${nextModul.id}`} className="btn btn-primary">
                  Lanjut ke Topik {idx + 2}
                </Link>
              )}
            </div>
          ) : formatifPada(moduleId) && !acak ? (
            <div className="p-6 rounded-xl bg-ivory border text-center" style={BORDER}>
              <IconLock size={28} className="mx-auto mb-3 text-brown-3" />
              <p className="text-brown-2 mb-1 text-sm">Tes formatif topik ini dibuka {formatTanggal(formatifPada(moduleId)!)}.</p>
              <p className="text-brown-3 mb-3 text-xs">Tes dibuka di pertemuan kedua topik. Baca modul dan tonton videonya dulu.</p>
              <Link to={`/modul/${moduleId}`} className="btn btn-secondary">
                Baca Topik {modul.order_num}
              </Link>
            </div>
          ) : soal.length === 0 ? (
            <div className="p-6 rounded-xl bg-ivory border text-center" style={BORDER}>
              <p className="text-brown-2 text-sm">Dosen belum menyiapkan soal untuk topik ini.</p>
            </div>
          ) : acak ? (
            <SoalRunner
              total={acak.tampil.length}
              q={acak.tampil[currentQ]}
              currentQ={currentQ}
              selected={jawaban[currentQ] ?? -1}
              isSubmitted={submitted[currentQ] ?? false}
              saving={saving}
              onSelect={(i) => {
                if (submitted[currentQ]) return
                setJawaban((a) => ({ ...a, [currentQ]: i }))
                setSubmitted((s) => ({ ...s, [currentQ]: true }))
              }}
              onPrev={() => setCurrentQ((c) => Math.max(0, c - 1))}
              onNext={() => setCurrentQ((c) => Math.min(acak.tampil.length - 1, c + 1))}
              onFinish={handleFinish}
            />
          ) : (
            <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
              <p className="text-sm text-brown-3 mb-1">{soal.length} soal pilihan ganda</p>
              <p className="text-sm text-brown-3 mb-5">Syarat lulus: skor ≥ {ambang.formatif}</p>
              {bestScore != null && (
                <p className="text-sm text-brown-2 mb-5">
                  Skor terbaik kamu sebelumnya: <strong>{bestScore}</strong>
                </p>
              )}
              <button onClick={mulai} className="btn btn-primary min-w-[7.5rem]">
                {bestScore != null ? 'Kerjakan Ulang' : 'Mulai'}
              </button>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-8 max-w-sm w-full text-center"
            style={{ background: 'var(--ivory)', boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)' }}
          >
            {modal.kind === 'apresiasi' ? (
              <>
                <h3 className="font-display text-lg font-bold text-brown mb-2">Selamat, Skor {modal.score}</h3>
                <p className="text-sm text-brown-2 mb-6">
                  {nextModul
                    ? `Topik ${idx + 2} ${nextModul.title} sekarang terbuka.`
                    : 'Semua topik selesai. Post-test dibuka oleh dosen.'}
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button onClick={() => setModal(null)} className="btn btn-secondary flex-1">
                    Tutup
                  </button>
                  {nextModul && (
                    <button onClick={() => navigate(`/modul/${nextModul.id}`)} className="btn btn-primary flex-1">
                      Lanjut ke Topik {idx + 2}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-brown mb-2">Belum Lulus, Skor {modal.score}</h3>
                <p className="text-sm text-brown-2 mb-6">
                  Syarat lulus {ambang.formatif}. Kerjakan ulang; urutan soal dan opsi diacak lagi.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button onClick={() => navigate(`/modul/${moduleId}`)} className="btn btn-secondary flex-1">
                    Baca Topik Lagi
                  </button>
                  <button onClick={mulai} className="btn btn-primary flex-1">
                    Kerjakan Ulang
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
