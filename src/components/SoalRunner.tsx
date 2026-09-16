import type { AcakSoalResult } from '../lib/acak'

// Layar pengerjaan satu-soal-per-layar, dipakai Formatif.tsx (formatif) dan
// AsesmenMhs.tsx (pre-test) — sama-sama: soal dari acakSoal(), progres "Soal
// i dari n", feedback langsung sesudah opsi dipilih. Diekstrak dari
// Kuis.tsx/Formatif.tsx (spec §9 WP6 poin 5b: "boleh membuat berkas itu").
const LETTERS = ['A', 'B', 'C', 'D']

export function SoalRunner({
  total,
  q,
  currentQ,
  selected,
  isSubmitted,
  saving,
  finishLabel = 'Lihat Hasil ✓',
  onSelect,
  onPrev,
  onNext,
  onFinish,
}: {
  total: number
  q: AcakSoalResult['tampil'][number]
  currentQ: number
  selected: number
  isSubmitted: boolean
  saving: boolean
  finishLabel?: string
  onSelect: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onFinish: () => void
}) {
  const isLastQ = currentQ === total - 1
  const pct = Math.round(((currentQ + 1) / total) * 100)
  const isCorrect = selected === q.kunciTampil

  return (
    <div>
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
        <div className="text-[11px] font-bold text-brown-3 uppercase tracking-wide mb-3">Soal {currentQ + 1}</div>
        <div className="text-base font-semibold leading-relaxed text-brown mb-5">{q.question}</div>

        <div className="flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            let cls = 'border-[color:var(--border)] bg-bg3 hover:border-terra cursor-pointer'
            if (isSubmitted) {
              if (i === q.kunciTampil) cls = 'border-sage-d bg-sage/10 pointer-events-none'
              else if (i === selected) cls = 'border-red bg-red/10 pointer-events-none'
              else cls = 'border-[color:var(--border)] bg-bg3 opacity-60 pointer-events-none'
            } else if (selected === i) {
              cls = 'border-terra bg-terra/10 cursor-pointer'
            }
            const letterCls = isSubmitted
              ? i === q.kunciTampil
                ? 'bg-sage-d text-white'
                : i === selected
                  ? 'bg-red text-white'
                  : 'bg-[color:var(--border)] text-brown-2'
              : selected === i
                ? 'bg-terra text-btn-text'
                : 'bg-[color:var(--border)] text-brown-2'

            return (
              <div
                key={i}
                onClick={() => onSelect(i)}
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

        {isSubmitted && q.kunciTampil != null && (
          <div
            className={`mt-3.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold ${
              isCorrect ? 'bg-sage/15 text-sage-d' : 'bg-red/10 text-red'
            }`}
          >
            {isCorrect ? '✓ Jawaban kamu benar!' : '✗ Jawaban kamu kurang tepat.'}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center gap-3 flex-wrap">
        <button
          onClick={onPrev}
          style={{ visibility: currentQ > 0 ? 'visible' : 'hidden' }}
          className="btn btn-secondary flex-1 min-w-[120px]"
        >
          ← Sebelumnya
        </button>
        <button
          onClick={isLastQ ? onFinish : onNext}
          disabled={!isSubmitted || saving}
          className="btn btn-primary flex-1 min-w-[120px]"
        >
          {isLastQ ? (saving ? 'Menyimpan…' : finishLabel) : 'Selanjutnya →'}
        </button>
      </div>
    </div>
  )
}
