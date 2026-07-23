import { useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useVarkResult } from '../hooks/useVarkResult'
import { saveVarkResult, clearVarkResult, computeVarkDominant, VARK_KEYS, type VarkKey, type VarkScores } from '../lib/vark'
import { Layout } from '../components/Layout'

const BORDER = { borderColor: 'var(--border)' } as const

// ── QUESTIONS — ported verbatim from legacy/vark.html ──
// Each question has 4 options; option index maps 1:1 to a VARK dimension via
// VARK_KEYS (index 0 → V, 1 → A, 2 → R, 3 → K), consistently across all 12.
const QUESTIONS: Array<{ text: string; opts: [string, string, string, string] }> = [
  {
    text: 'Ketika mempelajari konsep penelitian baru, saya lebih suka…',
    opts: [
      'Melihat diagram, grafik, atau ilustrasi yang menjelaskan konsep tersebut',
      'Mendengarkan penjelasan dosen atau menonton video podcast',
      'Membaca buku teks, artikel ilmiah, atau catatan kuliah',
      'Langsung mencoba dengan studi kasus atau eksperimen nyata',
    ],
  },
  {
    text: 'Saat perlu mengingat materi kuliah, cara terbaik bagi saya adalah…',
    opts: [
      'Membuat mind map berwarna atau poster visual',
      'Mendiskusikan materi dengan teman atau menjelaskannya secara lisan',
      'Merangkum dalam catatan tertulis atau membuat daftar poin penting',
      'Mempraktikkan langsung atau membuat simulasi dari materi tersebut',
    ],
  },
  {
    text: 'Ketika belajar mandiri di luar kelas, saya biasanya…',
    opts: [
      'Mencari video tutorial atau infografis yang relevan dengan topik',
      'Memutar rekaman kuliah atau berdiskusi lewat voice note dengan teman',
      'Membaca ulang catatan dan merangkum bab per bab secara tertulis',
      'Mengerjakan latihan soal atau membuat proyek kecil terkait materi',
    ],
  },
  {
    text: 'Saat mengerjakan tugas kuliah, langkah pertama yang saya lakukan adalah…',
    opts: [
      'Membuat kerangka visual atau sketsa alur pengerjaan tugas',
      'Mendiskusikan tugas dengan teman untuk mendapat gambaran awal',
      'Membaca instruksi tugas dengan teliti dan mencatat poin-poin utama',
      'Langsung mulai mengerjakan dan belajar dari hasil yang sudah dibuat',
    ],
  },
  {
    text: 'Ketika memahami instruksi dari dosen, saya merasa paling jelas jika…',
    opts: [
      'Instruksi disertai diagram alur, tabel, atau contoh visual',
      'Dosen menjelaskan secara lisan dan saya dapat bertanya langsung',
      'Instruksi diberikan secara tertulis, rinci, dan terstruktur',
      'Ada demonstrasi langkah demi langkah yang bisa saya ikuti',
    ],
  },
  {
    text: 'Ketika memilih media belajar untuk mempersiapkan ujian, saya lebih memilih…',
    opts: [
      'Slide presentasi dengan banyak gambar, bagan, dan warna',
      'Rekaman audio penjelasan materi atau podcast akademik',
      'Buku teks, modul PDF, atau ringkasan teks yang detail',
      'Kuis latihan interaktif atau flashcard yang bisa langsung dicoba',
    ],
  },
  {
    text: 'Saat harus mempresentasikan hasil penelitian, cara saya yang paling nyaman adalah…',
    opts: [
      'Membuat slide visual menarik dengan grafik dan ilustrasi',
      'Berbicara langsung kepada audiens dengan gaya natural dan interaktif',
      'Menyiapkan naskah atau poin presentasi yang tertulis lengkap',
      'Menampilkan demo produk atau simulasi langsung kepada audiens',
    ],
  },
  {
    text: 'Ketika menghadapi kuis atau tes, saya biasanya…',
    opts: [
      'Mengingat kembali diagram, tabel, atau gambar yang pernah saya lihat',
      'Mendengar kembali penjelasan dosen di kepala saya saat menjawab',
      'Membayangkan catatan atau teks yang pernah saya tulis',
      'Mempraktikkan cara penyelesaian masalah seperti yang pernah saya coba',
    ],
  },
  {
    text: 'Ketika mencari sumber referensi untuk penelitian, saya lebih suka…',
    opts: [
      'Mencari jurnal atau artikel yang memiliki banyak gambar, grafik, dan visualisasi data',
      'Mencari rekaman seminar, podcast akademik, atau diskusi panel',
      'Membaca artikel jurnal lengkap dengan teks yang komprehensif',
      'Mencari laporan studi kasus atau hasil penelitian terapan',
    ],
  },
  {
    text: 'Ketika membuat laporan penelitian, bagian yang paling mudah bagi saya adalah…',
    opts: [
      'Membuat visualisasi data seperti grafik, diagram, dan infografis',
      'Menyusun bagian diskusi yang berisi narasi dan argumen lisan',
      'Menulis deskripsi metodologi dan kajian pustaka secara rinci',
      'Mendeskripsikan prosedur praktik dan hasil uji coba lapangan',
    ],
  },
  {
    text: 'Ketika belajar dari kesalahan dalam tugas atau kuis, saya lebih mudah berkembang jika…',
    opts: [
      'Melihat perbandingan jawaban saya vs. jawaban benar dalam format visual',
      'Mendapat penjelasan lisan langsung dari dosen atau teman',
      'Membaca umpan balik tertulis yang menjelaskan letak kesalahan secara rinci',
      'Mencoba mengerjakan ulang soal yang sama atau soal serupa secara langsung',
    ],
  },
  {
    text: 'Dalam mempersiapkan ujian akhir, strategi belajar yang paling efektif bagi saya adalah…',
    opts: [
      'Membuat poster ringkasan, mind map berwarna, atau diagram konsep',
      'Berdiskusi intensif bersama kelompok belajar atau mendengarkan rekaman kuliah',
      'Membaca ulang semua catatan dan modul serta merangkumnya kembali',
      'Mengerjakan sebanyak mungkin soal latihan dan simulasi ujian',
    ],
  },
]

const LETTERS = ['A', 'B', 'C', 'D'] as const

const VARK_LABELS: Record<VarkKey, string> = {
  V: 'Visual Learner',
  A: 'Auditory Learner',
  R: 'Read/Write Learner',
  K: 'Kinesthetic Learner',
}
const VARK_ICONS: Record<VarkKey, string> = { V: '📊', A: '🎧', R: '📝', K: '⚙️' }
const VARK_COLORS: Record<VarkKey, string> = { V: '#8FA287', A: '#D4A373', R: '#4A7EA0', K: '#8B6BA0' }
const VARK_NAMES: Record<VarkKey, string> = { V: 'Visual', A: 'Auditory', R: 'Read/Write', K: 'Kinestetik' }
const VARK_DESCS: Record<VarkKey, string> = {
  V: 'Kamu belajar paling baik melalui visual — diagram, grafik, warna, dan ilustrasi membantu kamu memahami dan mengingat informasi. Konten berupa slide visual dan infografis sangat cocok untukmu.',
  A: 'Kamu belajar paling baik melalui pendengaran dan diskusi. Mendengarkan penjelasan, berdiskusi dengan teman, dan memanfaatkan rekaman audio sangat membantu proses belajarmu.',
  R: 'Kamu belajar paling baik melalui teks — membaca dan menulis adalah kekuatanmu. Membuat catatan, merangkum, dan membaca buku teks adalah cara belajar yang paling efektif bagimu.',
  K: 'Kamu belajar paling baik melalui praktik langsung. Mengerjakan soal latihan, simulasi, dan studi kasus nyata membuat pemahaman konsep jauh lebih mudah dan bertahan lama.',
}

// Guards against legacy/corrupt `dominant` values, same as legacy/vark.html's
// checkExisting() (`VARK_KEYS.includes(r.dominant) ? r.dominant : ...`).
function safeDomKey(dominant: string | null | undefined): VarkKey | null {
  if (!dominant) return null
  const upper = dominant.toUpperCase()
  return (VARK_KEYS as readonly string[]).includes(upper) ? (upper as VarkKey) : null
}

type Phase = 'intro' | 'quiz' | 'loading' | 'result'

export function Vark() {
  const queryClient = useQueryClient()
  const { data: existing } = useVarkResult()

  const [phase, setPhase] = useState<Phase>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Array<number | null>>(() => new Array(QUESTIONS.length).fill(null))
  const [result, setResult] = useState<{ scores: VarkScores; dominant: VarkKey } | null>(null)

  const total = QUESTIONS.length
  const q = QUESTIONS[currentQ]
  const pct = Math.round((currentQ / total) * 100)
  const hasAnswer = answers[currentQ] !== null
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
    const computed = computeVarkDominant(answers)
    const completedAt = new Date().toISOString()
    try {
      await saveVarkResult({ ...computed.scores, dominant: computed.dominant, completedAt })
    } catch {
      // ported from legacy/vark.html: save failures only console.warn, quiz still completes
    }
    // Simulate brief loading, matches legacy/vark.html's finishQuiz()
    await new Promise((r) => setTimeout(r, 1200))
    setResult(computed)
    setPhase('result')
    await queryClient.invalidateQueries({ queryKey: ['vark'] })
  }

  function goNext() {
    if (!hasAnswer) return
    if (isLast) {
      void finishQuiz()
    } else {
      setCurrentQ((c) => c + 1)
    }
  }

  async function handleRetake() {
    try {
      await clearVarkResult()
    } catch {
      // ported from legacy/vark.html: clear failures are swallowed, page still reloads to intro
    }
    setAnswers(new Array(QUESTIONS.length).fill(null))
    setCurrentQ(0)
    setResult(null)
    setPhase('intro')
    await queryClient.invalidateQueries({ queryKey: ['vark'] })
  }

  const existingDom = safeDomKey(existing?.dominant)

  return (
    <Layout>
      <div className="max-w-[580px] mx-auto p-4 md:p-6">
        {phase === 'intro' && (
          <div>
            <div
              className="rounded-2xl md:rounded-[18px] p-6 md:p-8 pb-6 text-center mb-4 relative overflow-hidden"
              style={{ background: 'var(--brown)' }}
            >
              <div className="text-4xl mb-3">🎯</div>
              <h1 className="font-['Playfair_Display',serif] text-xl md:text-2xl font-bold text-white mb-2">
                Asesmen Gaya Belajar VARK
              </h1>
              <p className="text-sm text-white/55 leading-relaxed max-w-[400px] mx-auto mb-3">
                Temukan cara belajar yang paling cocok untukmu — Visual, Auditory, Read/Write, atau Kinesthetic — agar
                pengalaman belajar di SMART-FLIP lebih personal dan efektif.
              </p>
              <div className="inline-flex flex-wrap items-center justify-center gap-3 md:gap-4 bg-white/[.06] rounded-lg px-4 py-2 text-xs text-white/45 mb-5">
                <span>📝 12 pertanyaan</span>
                <span>⏱ ± 3 menit</span>
                <span>🔒 Tersimpan lokal</span>
              </div>
              <div>
                <button
                  onClick={startQuiz}
                  className="inline-flex items-center gap-1.5 bg-terra text-white rounded-[10px] text-sm font-semibold px-7 min-h-11 cursor-pointer"
                >
                  Mulai Asesmen →
                </button>
              </div>

              {existing && (
                <p className="text-xs text-white/40 mt-3">
                  Kamu sudah mengisi asesmen ini.{' '}
                  <button onClick={() => void handleRetake()} className="text-terra underline cursor-pointer">
                    Isi ulang
                  </button>
                </p>
              )}
              {existingDom && (
                <div className="mt-2 inline-block bg-[rgba(212,163,115,.15)] rounded-lg px-3 py-1.5 text-xs text-terra">
                  Gaya belajarmu saat ini: {VARK_ICONS[existingDom]} {VARK_LABELS[existingDom]}
                </div>
              )}
            </div>
            <p className="text-center text-xs text-brown-3 opacity-70">
              Hasil asesmen hanya digunakan untuk menyesuaikan urutan konten belajar. Tidak ada jawaban benar atau
              salah.
            </p>
          </div>
        )}

        {phase === 'quiz' && (
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
                {q.text}
              </div>
              <div className="flex flex-col gap-2">
                {q.opts.map((opt, i) => {
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
            <div className="text-sm text-brown-3">Menganalisis gaya belajarmu…</div>
          </div>
        )}

        {phase === 'result' && result && (
          <div>
            <div className="text-center mb-6">
              <div className="font-['Playfair_Display',serif] text-xl md:text-2xl font-bold text-brown mb-2">
                Hasil Asesmen VARK
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-[10px] px-5 py-2 mb-3 font-['Playfair_Display',serif] text-base md:text-lg font-semibold"
                style={{ background: 'var(--brown)', color: 'var(--terra)' }}
              >
                {VARK_ICONS[result.dominant]} Gaya Belajar Kamu: {VARK_LABELS[result.dominant]}
              </div>
              <p className="text-sm text-brown-3 leading-relaxed">
                Berikut adalah profil lengkap gaya belajarmu berdasarkan 12 pertanyaan yang telah kamu jawab.
              </p>
            </div>

            {/* Bar chart */}
            <div className="bg-ivory rounded-2xl border p-5 md:p-6 mb-4" style={BORDER}>
              <div className="text-sm font-semibold text-brown mb-5">Skor per Dimensi Belajar</div>
              {(() => {
                const maxVal = Math.max(...Object.values(result.scores), 1)
                return (
                  <div className="flex items-end justify-center gap-3 md:gap-4 h-[120px]">
                    {VARK_KEYS.map((k) => {
                      const val = result.scores[k]
                      const heightPct = Math.round((val / maxVal) * 100)
                      const color = VARK_COLORS[k]
                      const isDom = k === result.dominant
                      return (
                        <div key={k} className="flex flex-col items-center gap-1.5 flex-1 max-w-[90px]">
                          <div className="w-full flex items-end justify-center h-[100px]">
                            <div
                              className="w-full rounded-t-md flex items-start justify-center pt-1.5 relative"
                              style={{
                                height: `${heightPct}%`,
                                minHeight: 6,
                                background: color,
                                boxShadow: isDom ? '0 4px 16px rgba(0,0,0,.15)' : undefined,
                              }}
                            >
                              <span
                                className="text-xs font-bold text-white"
                                style={heightPct < 25 ? { color, position: 'absolute', marginTop: '-1.2rem' } : undefined}
                              >
                                {val}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-center" style={{ color, fontWeight: isDom ? 700 : 500 }}>
                            {k}
                          </div>
                          <div className="text-[11px] text-brown-3 text-center">{VARK_NAMES[k]}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Style descriptions — dominant first */}
            <div className="flex flex-col gap-2.5 mb-5">
              {[result.dominant, ...VARK_KEYS.filter((k) => k !== result.dominant)].map((k) => {
                const isDom = k === result.dominant
                return (
                  <div
                    key={k}
                    className="bg-ivory rounded-[11px] border p-3.5 flex gap-3 items-start"
                    style={{
                      borderColor: isDom ? 'var(--terra)' : 'var(--border)',
                      background: isDom ? 'rgba(212,163,115,.04)' : 'var(--ivory)',
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                      style={{ background: VARK_COLORS[k] }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-brown mb-0.5">
                        {VARK_ICONS[k]} {VARK_LABELS[k]} — skor: {result.scores[k]}/{total}
                        {isDom ? ' ⭐' : ''}
                      </div>
                      <div className="text-[13px] text-brown-3 leading-relaxed">{VARK_DESCS[k]}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-1.5 w-full h-[50px] rounded-xl text-white text-[15px] font-semibold no-underline"
              style={{ background: 'var(--brown)', boxShadow: '0 4px 16px rgba(44,36,32,.18)' }}
            >
              Mulai Belajar →
            </Link>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Vark
