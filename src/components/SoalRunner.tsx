import type { AcakSoalResult, SoalTampil } from '../lib/acak'

// Layar pengerjaan satu-soal-per-layar, dipakai Formatif.tsx (formatif),
// AsesmenMhs.tsx (tes diagnostik awal), TesKhusus.tsx, dan TesKelompok.tsx:
// soal dari acakSoal(), progres "Soal i dari n". Bawaannya umpan balik muncul
// langsung sesudah opsi dipilih; dengan `tunda` benar/salah baru ditunjukkan
// di akhir lewat TinjauanJawaban (antrean #138). Diekstrak dari
// Kuis.tsx/Formatif.tsx (spec §9 WP6 poin 5b: "boleh membuat berkas itu").
const LETTERS = ['A', 'B', 'C', 'D']

type StatusOpsi = 'benar' | 'salah' | 'redup' | 'pilih' | 'netral'

// Token status (bukan bg-sage-d/bg-red mentah, antrean sapuan mahasiswa 16
// Sep 2026), kontras dihitung rumus WCAG relative-luminance: bg-success +
// text-btn-text = 9,38:1 (Light) / 10,76:1 (Dark); bg-danger + text-btn-text
// = 5,26:1 (Light) / 6,77:1 (Dark). Semua di atas ambang 4,5:1.
const KELAS_OPSI: Record<StatusOpsi, { baris: string; huruf: string }> = {
  benar: { baris: 'border-success bg-success-soft pointer-events-none', huruf: 'bg-success text-btn-text' },
  salah: { baris: 'border-danger bg-danger-soft pointer-events-none', huruf: 'bg-danger text-btn-text' },
  redup: { baris: 'border-[color:var(--border)] bg-bg3 opacity-60 pointer-events-none', huruf: 'bg-[color:var(--border)] text-brown-2' },
  pilih: { baris: 'border-terra bg-terra/10 cursor-pointer', huruf: 'bg-terra text-btn-text' },
  netral: { baris: 'border-[color:var(--border)] bg-bg3 hover:border-terra cursor-pointer', huruf: 'bg-[color:var(--border)] text-brown-2' },
}

function OpsiBaris({ huruf, teks, status, catatan, onClick }: { huruf: string; teks: string; status: StatusOpsi; catatan?: string; onClick?: () => void }) {
  const k = KELAS_OPSI[status]
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 border-[1.5px] rounded-[var(--radius-control)] select-none transition-colors ${k.baris}`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${k.huruf}`}>{huruf}</div>
      <div className="text-sm leading-relaxed text-brown-2 flex-1 min-w-0">{teks}</div>
      {catatan && <div className="text-[11px] font-semibold text-brown-2 flex-shrink-0">{catatan}</div>}
    </div>
  )
}

export function SoalRunner({
  total,
  q,
  currentQ,
  selected,
  isSubmitted,
  saving,
  tunda = false,
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
  /** true = benar/salah tidak ditunjukkan saat mengerjakan; pilihan boleh diganti sampai dikirim. */
  tunda?: boolean
  finishLabel?: string
  onSelect: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onFinish: () => void
}) {
  const isLastQ = currentQ === total - 1
  const pct = Math.round(((currentQ + 1) / total) * 100)
  const isCorrect = selected === q.kunciTampil
  const tampilUmpan = isSubmitted && !tunda
  const bolehLanjut = tunda ? selected >= 0 : isSubmitted

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
          {q.options.map((opt, i) => (
            <OpsiBaris
              key={i}
              huruf={LETTERS[i]}
              teks={opt}
              status={tampilUmpan ? (i === q.kunciTampil ? 'benar' : i === selected ? 'salah' : 'redup') : selected === i ? 'pilih' : 'netral'}
              onClick={() => onSelect(i)}
            />
          ))}
        </div>

        {tampilUmpan && q.kunciTampil != null && (
          <div
            className={`mt-3.5 px-3.5 py-2.5 rounded-lg text-[13px] font-semibold ${
              isCorrect ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            }`}
          >
            {isCorrect ? '✓ Jawaban kamu benar!' : '✗ Jawaban kamu kurang tepat.'}
          </div>
        )}
      </div>

      {/* Lebar tombol mengikuti isi (antrean #138): Sebelumnya di kiri, lanjut di kanan. */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <button
          onClick={onPrev}
          style={{ visibility: currentQ > 0 ? 'visible' : 'hidden' }}
          className="btn btn-secondary min-w-[140px]"
        >
          ← Sebelumnya
        </button>
        <button
          onClick={isLastQ ? onFinish : onNext}
          disabled={!bolehLanjut || saving}
          className="btn btn-primary min-w-[140px]"
        >
          {isLastQ ? (saving ? 'Menyimpan…' : finishLabel) : 'Selanjutnya →'}
        </button>
      </div>
    </div>
  )
}

// Tinjauan sesudah tes selesai untuk mode `tunda`: tiap soal dengan jawaban
// benar dan pilihan mahasiswa. Label teks menyertai warna.
export function TinjauanJawaban({ soal, jawaban }: { soal: SoalTampil[]; jawaban: number[] }) {
  const benar = soal.filter((q, n) => q.kunciTampil != null && jawaban[n] === q.kunciTampil).length
  return (
    <div className="mt-5">
      <div className="text-sm font-semibold text-brown mb-3">
        Tinjauan jawaban · benar {benar} dari {soal.length}
      </div>
      <div className="flex flex-col gap-3">
        {soal.map((q, n) => (
          <div key={q.id} className="bg-ivory border border-[color:var(--border)] rounded-xl p-5">
            <div className="text-[11px] font-bold text-brown-3 uppercase tracking-wide mb-2">Soal {n + 1}</div>
            <div className="text-sm font-semibold leading-relaxed text-brown mb-3">{q.question}</div>
            <div className="flex flex-col gap-2">
              {q.options.map((opt, i) => (
                <OpsiBaris
                  key={i}
                  huruf={LETTERS[i]}
                  teks={opt}
                  status={i === q.kunciTampil ? 'benar' : i === jawaban[n] && q.kunciTampil != null ? 'salah' : 'redup'}
                  catatan={
                    i === q.kunciTampil
                      ? i === jawaban[n]
                        ? 'Pilihanmu, benar'
                        : 'Jawaban benar'
                      : i === jawaban[n]
                        ? 'Pilihanmu'
                        : undefined
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
