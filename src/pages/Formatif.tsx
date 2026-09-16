import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModule, useModules } from '../hooks/useModules'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { useCourse } from '../contexts/CourseContext'
import { saveQuizAttempt, PASS_SCORE } from '../lib/quizAttempts'
import { fetchBankSoal } from '../lib/kuisSoal'
import { acakSoal, nilai, type AcakSoalResult } from '../lib/acak'
import { useTopikStatus } from '../lib/topik'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { SoalRunner } from '../components/SoalRunner'
import { IconLock } from '../components/icons'

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
  const { data: modul, isLoading: modulLoading } = useModule(moduleId)
  const { data: modules = [] } = useModules()
  const { statusOf, loading: topikLoading } = useTopikStatus()
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

  if (modulLoading || topikLoading || soalLoading) {
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
    setModal({ kind: hasil.score >= PASS_SCORE ? 'apresiasi' : 'remedial', score: hasil.score })
    setAcak(null)
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="font-display text-xl font-bold text-brown mb-4">
          Tes formatif · Pertemuan {idx + 1} · {modul.title}
        </h1>
        <PertemuanStepper current={moduleId} basePath="/asesmen/formatif" statusOf={statusOf} />

        <div className="mt-6">
          {status === 'locked' ? (
            <div className="p-6 rounded-xl bg-ivory border text-center" style={BORDER}>
              <IconLock size={28} className="mx-auto mb-3 text-brown-3" />
              <p className="text-brown-2 mb-3 text-sm">Selesaikan topik {idx} dulu.</p>
              <Link to="/asesmen" className="text-terra font-semibold text-sm">
                ← Kembali
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
              <p className="text-sm text-brown-3 mb-5">Syarat lulus: skor ≥ {PASS_SCORE}</p>
              {bestScore != null && (
                <p className="text-sm text-brown-2 mb-5">
                  Skor terbaik kamu sebelumnya: <strong>{bestScore}</strong>
                </p>
              )}
              <button onClick={mulai} className="btn btn-primary min-w-[7.5rem]">
                {bestScore != null ? 'Kerjakan ulang' : 'Mulai'}
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
                <h3 className="font-display text-lg font-bold text-brown mb-2">Selamat, skor {modal.score}</h3>
                <p className="text-sm text-brown-2 mb-6">
                  {nextModul
                    ? `Topik ${idx + 2} ${nextModul.title} sekarang terbuka.`
                    : 'Semua topik selesai. Post-test dibuka dosen lewat tes khusus.'}
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button onClick={() => setModal(null)} className="btn btn-secondary flex-1">
                    Tutup
                  </button>
                  {nextModul && (
                    <button onClick={() => navigate(`/modul/${nextModul.id}`)} className="btn btn-primary flex-1">
                      Lanjut ke topik {idx + 2}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-brown mb-2">Belum lulus, skor {modal.score}</h3>
                <p className="text-sm text-brown-2 mb-6">
                  Syarat lulus {PASS_SCORE}. Kerjakan ulang; urutan soal dan opsi diacak lagi.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row">
                  <button onClick={() => navigate(`/modul/${moduleId}`)} className="btn btn-secondary flex-1">
                    Baca topik lagi
                  </button>
                  <button onClick={mulai} className="btn btn-primary flex-1">
                    Kerjakan ulang
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
