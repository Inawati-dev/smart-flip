import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  fetchDiagnosticQuestions,
  computeJalur,
  saveJalur,
  type Jalur,
} from '../lib/diagnostic'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { IconCompass, IconClipboard, IconClock, IconLock, IconCheck } from '../components/icons'

// Diagnostic placement test — see
// docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md.
// One-time, single-pass, no remedial retry loop (this is a placement test,
// not a formative quiz). UX pattern mirrors src/pages/Vark.tsx: select an
// answer per question, no immediate right/wrong feedback (that would leak
// answers for a placement test), then compute the whole result at the end.

const BORDER = { borderColor: 'var(--border)' } as const
const LETTERS = ['A', 'B', 'C', 'D'] as const

type Phase = 'intro' | 'quiz' | 'loading' | 'result'

const JALUR_COPY: Record<Jalur, { title: string; desc: string }> = {
  cepat: {
    title: 'Jalur Cepat',
    desc:
      'Skor tes diagnostikmu di atas 80. Tiap modul akan menampilkan ringkasan materi dan studi kasus terlebih dahulu, sementara materi lengkap tetap tersedia lewat tombol "Lihat Detail" kapan pun kamu butuh pendalaman lebih jauh.',
  },
  mendalam: {
    title: 'Jalur Mendalam',
    desc:
      'Skor tes diagnostikmu 80 atau kurang. Kamu akan mempelajari materi tiap modul secara lengkap dan bertahap, sesi demi sesi, agar pemahaman dasarmu makin kokoh sebelum lanjut ke bab berikutnya.',
  },
}

export function Diagnostik() {
  const { refreshProfile } = useAuth()
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['diagnostic-questions'],
    queryFn: fetchDiagnosticQuestions,
  })

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Array<number | null>>([])
  const [result, setResult] = useState<{ score: number; jalur: Jalur } | null>(null)

  // Seed the answers array once questions arrive — fetchDiagnosticQuestions
  // always resolves with at least the bundled starter bank, never empty.
  useEffect(() => {
    if (questions.length && answers.length !== questions.length) {
      setAnswers(new Array(questions.length).fill(null))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length])

  const total = questions.length
  const q = questions[currentQ]
  const pct = total ? Math.round((currentQ / total) * 100) : 0
  const hasAnswer = answers[currentQ] != null
  const isLast = currentQ === total - 1

  function startQuiz() {
    setPhase('quiz')
  }

  function selectAnswer(idx: number) {
    setAnswers((a) => {
      const next = [...a]
      next[currentQ] = idx
      return next
    })
  }

  function goBack() {
    if (currentQ > 0) setCurrentQ((c) => c - 1)
  }

  async function finishQuiz() {
    setPhase('loading')
    const computed = computeJalur(questions, answers)
    try {
      await saveJalur(computed.jalur)
      // AuthContext only re-syncs profile on login/logout/token-refresh —
      // saveJalur is a direct Supabase UPDATE, so without this refetch the
      // context keeps serving jalur: null and Dashboard's redirect guard
      // bounces the student straight back here in an infinite loop.
      await refreshProfile()
    } catch (e) {
      // save failures shouldn't trap the student on a placement test they
      // already finished — mirrors src/pages/Vark.tsx's finishQuiz() pattern
      console.warn('[diagnostik] saveJalur gagal:', e)
    }
    await new Promise((r) => setTimeout(r, 1000))
    setResult(computed)
    setPhase('result')
  }

  function goNext() {
    if (!hasAnswer) return
    if (isLast) {
      void finishQuiz()
    } else {
      setCurrentQ((c) => c + 1)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
       <div>
        {phase === 'intro' && (
          <div>
            <div
              className="rounded-2xl md:rounded-[18px] p-6 md:p-8 pb-6 text-center mb-4 relative overflow-hidden"
              style={{ background: 'var(--brown)' }}
            >
              <div className="flex justify-center mb-3 text-terra">
                <IconCompass size={40} />
              </div>
              <h1 className="font-['Playfair_Display',serif] text-xl md:text-2xl font-bold text-white mb-2">
                Tes Diagnostik Awal
              </h1>
              <p className="text-sm text-white/55 leading-relaxed max-w-[400px] mx-auto mb-3">
                Sebelum mulai Bab 1, kerjakan tes penempatan singkat ini. Hasilnya menentukan jalur belajarmu —
                Jalur Cepat atau Jalur Mendalam — untuk seluruh mata kuliah ini.
              </p>
              <div className="inline-flex flex-wrap items-center justify-center gap-3 md:gap-4 bg-white/[.06] rounded-lg px-4 py-2 text-xs text-white/45 mb-5">
                <span className="inline-flex items-center gap-1">
                  <IconClipboard size={13} /> {total || 15} pertanyaan
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconClock size={13} /> ± 5 menit
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconLock size={13} /> Hanya 1x, tidak bisa diulang
                </span>
              </div>
              <div>
                <button
                  onClick={startQuiz}
                  disabled={isLoading || total === 0}
                  className="inline-flex items-center gap-1.5 bg-terra text-white rounded-[10px] text-sm font-semibold px-7 min-h-11 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Mulai Tes →
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-brown-3 opacity-70">
              Jawab sesuai kemampuanmu saat ini. Hasil tes ini bersifat permanen untuk mata kuliah ini dan
              digunakan untuk menyesuaikan tampilan materi, bukan untuk penilaian akhir.
            </p>
          </div>
        )}

        {phase === 'quiz' && q && (
          <div>
            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-brown-3">
                  Pertanyaan {currentQ + 1} dari {total}
                </span>
                <span className="text-xs font-semibold text-terra">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full bg-terra rounded-full transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Question card */}
            <div className="bg-ivory rounded-2xl border p-5 md:p-6 mb-4" style={BORDER}>
              <div className="text-xs font-bold uppercase tracking-wider text-brown-3 mb-3">
                {currentQ + 1} / {total}
              </div>
              <div className="font-['Playfair_Display',serif] text-base md:text-lg font-semibold text-brown leading-relaxed mb-4">
                {q.pertanyaan}
              </div>
              <div className="flex flex-col gap-2">
                {q.opsi.map((opt, i) => {
                  const selected = answers[currentQ] === i
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectAnswer(i)}
                      className={`flex items-start gap-3 p-3 rounded-[11px] border-[1.5px] text-left w-full min-h-11 cursor-pointer transition-colors ${
                        selected ? 'bg-[rgba(212,163,115,.07)]' : 'bg-[color:var(--bg3)]'
                      }`}
                      style={{ borderColor: selected ? 'var(--terra)' : 'var(--border)' }}
                    >
                      <span
                        className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                          selected ? 'text-white' : 'text-brown-3'
                        }`}
                        style={{ background: selected ? 'var(--terra)' : 'var(--border2)' }}
                      >
                        {LETTERS[i]}
                      </span>
                      <span className="text-sm text-brown-2 leading-snug">{opt}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nav */}
            <div className="flex gap-2.5">
              <button
                onClick={goBack}
                disabled={currentQ === 0}
                className="h-11 px-4 rounded-[10px] border-[1.5px] text-sm font-semibold text-brown-2 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={BORDER}
              >
                ← Sebelumnya
              </button>
              <button
                onClick={goNext}
                disabled={!hasAnswer}
                className="flex-1 h-11 rounded-[10px] border-none text-white text-sm font-semibold disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: 'var(--brown)' }}
              >
                {isLast ? 'Selesai ✓' : 'Berikutnya →'}
              </button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: '4px solid var(--border)', borderTopColor: 'var(--terra)' }}
            />
            <div className="text-sm text-brown-3">Menghitung jalur belajarmu…</div>
          </div>
        )}

        {phase === 'result' && result && (
          <div>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3 text-terra">
                <IconCheck size={40} />
              </div>
              <div className="font-['Playfair_Display',serif] text-xl md:text-2xl font-bold text-brown mb-2">
                Tes Diagnostik Selesai
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2 mb-3 font-['Playfair_Display',serif] text-base md:text-lg font-semibold"
                style={{ background: 'var(--brown)', color: 'var(--terra)' }}
              >
                Kamu masuk {JALUR_COPY[result.jalur].title}
              </div>
              <p className="text-sm text-brown-3 leading-relaxed">Skor kamu: {result.score}%</p>
            </div>

            <div className="bg-ivory rounded-2xl border p-5 md:p-6 mb-5" style={BORDER}>
              <div className="text-sm font-semibold text-brown mb-2">{JALUR_COPY[result.jalur].title}</div>
              <p className="text-[13px] text-brown-3 leading-relaxed">{JALUR_COPY[result.jalur].desc}</p>
            </div>

            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-1.5 w-full h-[50px] rounded-xl text-white text-[15px] font-semibold no-underline"
              style={{ background: 'var(--brown)', boxShadow: '0 4px 16px rgba(44,36,32,.18)' }}
            >
              Lanjut ke Dashboard →
            </Link>
          </div>
        )}
       </div>
      </div>
    </Layout>
  )
}

export default Diagnostik
