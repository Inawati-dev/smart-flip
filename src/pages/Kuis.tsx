import { useState, type ReactElement } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { useModule } from '../hooks/useModules'
import { saveQuizAttempt } from '../lib/quizAttempts'
import { Layout } from '../components/Layout'
import { IconTrophy, IconCheck, IconBook, IconRefresh, IconClipboard } from '../components/icons'

// modul.kuis is typed `unknown[]` on ModuleRow (untyped JSON column) — narrow
// to the shape this page actually consumes, same pattern src/pages/Modul.tsx
// used for jurnal/studiKasus.
interface QuizQuestion {
  q: string
  options: string[]
  answer: number
}

const LETTERS = ['A', 'B', 'C', 'D']

type Verdict = 'excellent' | 'pass' | 'fail'

// Same ≥60%/≥80% thresholds used by src/pages/Modul.tsx's riwayat-kuis display
// and legacy/kuis.html's showResult().
function verdictFor(score: number): Verdict {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'pass'
  return 'fail'
}

const VERDICT_COPY: Record<
  Verdict,
  { Icon: (p: { size?: number; className?: string }) => ReactElement; title: string; msg: (score: number) => string }
> = {
  excellent: {
    Icon: IconTrophy,
    title: 'Sangat Baik!',
    msg: (score) =>
      `Selamat! Kamu mendapatkan skor ${score}%. Pemahaman kamu terhadap materi modul ini sangat baik.`,
  },
  pass: {
    Icon: IconCheck,
    title: 'Lulus!',
    msg: (score) =>
      `Kamu mendapatkan skor ${score}%. Kamu telah memenuhi batas kelulusan. Tingkatkan lagi untuk hasil lebih baik!`,
  },
  fail: {
    Icon: IconBook,
    title: 'Perlu Mengulang',
    msg: (score) =>
      `Skor kamu ${score}% — di bawah batas kelulusan 60%. Disarankan untuk membaca kembali modul dan mencoba kuis ulang.`,
  },
}

const CIRCLE_CLASS: Record<Verdict, string> = {
  excellent: 'border-sage-d bg-sage/10',
  pass: 'border-terra bg-terra/10',
  fail: 'border-red bg-red/10',
}
const SCORE_TEXT_CLASS: Record<Verdict, string> = {
  excellent: 'text-sage-d',
  pass: 'text-terra-d',
  fail: 'text-red',
}

export default function Kuis() {
  const { id } = useParams()
  const moduleId = parseInt(id ?? '1', 10) || 1
  const navigate = useNavigate()
  const { data: modul, isLoading } = useModule(moduleId)

  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [saving, setSaving] = useState(false)

  if (isLoading) return <Layout><div className="p-8 text-brown-3">Memuat…</div></Layout>
  if (!modul) return <Layout><div className="p-8 text-brown">Modul tidak ditemukan</div></Layout>

  const qs = (modul.kuis as QuizQuestion[]) || []
  const backHref = `/modul/${moduleId}`

  if (!Array.isArray(qs) || qs.length === 0) {
    return (
      <Layout>
        <div className="p-6">
         <div>
          <Link to={backHref} className="text-brown-3 text-sm mb-6 inline-block">
            ← Kembali
          </Link>
          <p className="text-brown-3 text-center py-12">
            Soal kuis untuk modul ini belum tersedia.
          </p>
         </div>
        </div>
      </Layout>
    )
  }

  const total = qs.length
  const q = qs[currentQ]
  const selected = answers[currentQ] ?? -1
  const isSubmitted = submitted[currentQ] ?? false
  const isLastQ = currentQ === total - 1
  const pct = Math.round(((currentQ + 1) / total) * 100)

  function selectOpt(i: number) {
    if (isSubmitted) return
    setAnswers((a) => ({ ...a, [currentQ]: i }))
    setSubmitted((s) => ({ ...s, [currentQ]: true }))
  }

  function nextQ() {
    if (currentQ < total - 1) setCurrentQ((c) => c + 1)
  }
  function prevQ() {
    if (currentQ > 0) setCurrentQ((c) => c - 1)
  }

  async function handleFinish() {
    const benar = qs.filter((qq, i) => answers[i] === qq.answer).length
    const finalScore = Math.round((benar / total) * 100)
    setScore(finalScore)
    setSaving(true)
    try {
      await saveQuizAttempt(moduleId, {
        score: finalScore,
        answers: qs.map((_, i) => answers[i] ?? -1),
      })
    } catch (e) {
      console.warn('[kuis] saveQuizAttempt gagal:', e)
    }
    setSaving(false)
    setShowResult(true)
  }

  function retryKuis() {
    setAnswers({})
    setSubmitted({})
    setCurrentQ(0)
    setShowResult(false)
    setScore(0)
  }

  if (showResult) {
    const benar = qs.filter((qq, i) => answers[i] === qq.answer).length
    const salah = total - benar
    const verdict = verdictFor(score)
    const copy = VERDICT_COPY[verdict]

    return (
      <Layout>
        <div className="p-6">
         <div>
          <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-8 text-center mb-5">
            <div
              className={`w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center mx-auto mb-5 border-[5px] ${CIRCLE_CLASS[verdict]}`}
            >
              <div className={`font-['Playfair_Display',serif] text-3xl font-bold ${SCORE_TEXT_CLASS[verdict]}`}>
                {score}%
              </div>
              <div className="text-[11px] font-semibold text-brown-3">Skor</div>
            </div>

            <div className={`flex justify-center mb-2.5 ${SCORE_TEXT_CLASS[verdict]}`}>
              <copy.Icon size={40} />
            </div>
            <div className="font-['Playfair_Display',serif] text-xl font-bold text-brown mb-2">
              {copy.title}
            </div>
            <p className="text-sm text-brown-3 mb-6 leading-relaxed">{copy.msg(score)}</p>

            <div className="flex gap-3 justify-center flex-wrap mb-6">
              <div className="bg-bg3 rounded-lg px-4 py-2.5 text-center min-w-20">
                <div className="text-xl font-bold text-sage-d">{benar}</div>
                <div className="text-[11px] text-brown-3 mt-0.5">Benar</div>
              </div>
              <div className="bg-bg3 rounded-lg px-4 py-2.5 text-center min-w-20">
                <div className="text-xl font-bold text-red">{salah}</div>
                <div className="text-[11px] text-brown-3 mt-0.5">Salah</div>
              </div>
              <div className="bg-bg3 rounded-lg px-4 py-2.5 text-center min-w-20">
                <div className="text-xl font-bold text-brown">{total}</div>
                <div className="text-[11px] text-brown-3 mt-0.5">Total soal</div>
              </div>
            </div>

            <div className="flex gap-2.5 justify-center flex-wrap">
              <button
                onClick={retryKuis}
                className="inline-flex items-center gap-1.5 min-h-11 px-6 py-2.5 rounded-full border-[1.5px] border-[color:var(--border)] text-brown-2 text-sm font-semibold"
              >
                <IconRefresh size={15} /> Coba Lagi
              </button>
              <button
                onClick={() => navigate(backHref)}
                className="min-h-11 px-6 py-2.5 rounded-full bg-terra text-white text-sm font-semibold"
              >
                ← Kembali ke Modul
              </button>
            </div>
          </div>

          <div className="mb-2">
            <h2 className="flex items-center gap-1.5 font-['Playfair_Display',serif] text-base font-bold text-brown mb-3.5">
              <IconClipboard size={16} /> Pembahasan Soal
            </h2>
            {qs.map((qq, i) => {
              const userAns = answers[i] ?? -1
              const isOk = userAns === qq.answer
              return (
                <div
                  key={i}
                  className="bg-ivory border border-[color:var(--border)] rounded-xl p-5 mb-2.5"
                >
                  <div className="text-sm font-semibold text-brown mb-2.5">
                    {i + 1}. {qq.q}
                  </div>
                  {qq.options.map((opt, j) => {
                    let cls = 'text-brown-3'
                    let icon = '·'
                    if (j === qq.answer) {
                      cls = 'bg-sage/15 text-sage-d font-semibold'
                      icon = '✓'
                    }
                    if (j === userAns && !isOk) {
                      cls = 'bg-red/10 text-red'
                      icon = '✗'
                    }
                    return (
                      <div
                        key={j}
                        className={`flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg text-[13px] mb-1 ${cls}`}
                      >
                        <span className="flex-shrink-0 text-sm">{icon}</span>
                        <span>
                          {LETTERS[j]}. {opt}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
         </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
       <div>
        <Link to={backHref} className="text-brown-3 text-sm mb-6 inline-block">
          ← Kembali
        </Link>

        <div className="mb-7">
          <span className="inline-flex bg-terra text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2">
            Modul {modul.order_num}
          </span>
          <h1 className="font-['Playfair_Display',serif] text-xl font-bold text-brown mb-1">
            {modul.title}
          </h1>
          <p className="text-[13px] text-brown-3">
            {total} soal pilihan ganda · Jawab dengan teliti
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-brown-3 mb-1.5">
            <span>
              Soal {currentQ + 1} dari {total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-[color:var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-terra rounded-full transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-7 mb-5">
          <div className="text-[11px] font-bold text-brown-3 uppercase tracking-wide mb-3">
            Soal {currentQ + 1}
          </div>
          <div className="text-base font-semibold leading-relaxed text-brown mb-5">{q.q}</div>

          <div className="flex flex-col gap-2.5">
            {q.options.map((opt, i) => {
              let cls =
                'border-[color:var(--border)] bg-bg3 hover:border-terra cursor-pointer'
              if (isSubmitted) {
                if (i === q.answer) cls = 'border-sage-d bg-sage/10 pointer-events-none'
                else if (i === selected) cls = 'border-red bg-red/10 pointer-events-none'
                else cls = 'border-[color:var(--border)] bg-bg3 opacity-60 pointer-events-none'
              } else if (selected === i) {
                cls = 'border-terra bg-terra/10 cursor-pointer'
              }
              const letterCls = isSubmitted
                ? i === q.answer
                  ? 'bg-sage-d text-white'
                  : i === selected
                    ? 'bg-red text-white'
                    : 'bg-[color:var(--border)] text-brown-2'
                : selected === i
                  ? 'bg-terra text-white'
                  : 'bg-[color:var(--border)] text-brown-2'

              return (
                <div
                  key={i}
                  onClick={() => selectOpt(i)}
                  className={`flex items-center gap-3 px-4 py-3 border-[1.5px] rounded-lg select-none transition-colors ${cls}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${letterCls}`}
                  >
                    {LETTERS[i]}
                  </div>
                  <div className="text-sm leading-relaxed text-brown-2 flex-1">{opt}</div>
                </div>
              )
            })}
          </div>

          {isSubmitted && (
            <div
              className={`mt-3.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold ${
                selected === q.answer
                  ? 'bg-sage/15 text-sage-d'
                  : 'bg-red/10 text-red'
              }`}
            >
              {selected === q.answer
                ? '✓ Jawaban kamu benar!'
                : `✗ Jawaban benar: ${LETTERS[q.answer]}. ${q.options[q.answer]}`}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3 flex-wrap">
          <button
            onClick={prevQ}
            style={{ visibility: currentQ > 0 ? 'visible' : 'hidden' }}
            className="min-h-11 flex-1 min-w-[120px] px-6 py-2.5 rounded-full border-[1.5px] border-[color:var(--border)] text-brown-2 text-sm font-semibold"
          >
            ← Sebelumnya
          </button>
          <button
            onClick={isLastQ ? handleFinish : nextQ}
            disabled={!isSubmitted || saving}
            className="min-h-11 flex-1 min-w-[120px] px-6 py-2.5 rounded-full bg-terra text-white text-sm font-semibold disabled:opacity-45 disabled:pointer-events-none"
          >
            {isLastQ ? (saving ? 'Menyimpan…' : 'Lihat Hasil ✓') : 'Selanjutnya →'}
          </button>
        </div>
       </div>
      </div>
    </Layout>
  )
}
