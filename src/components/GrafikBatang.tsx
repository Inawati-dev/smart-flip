// Grafik batang mendatar, HTML + CSS tanpa pustaka (antrean #379, 8 Nov 2026).
// Nama topik tampil penuh di atas tiap batang, skala tetap 0..max (bawaan 100) supaya
// batang 25 tidak tampak penuh, dan garis ambang selalu di dalam jalur. Tinggi mengikuti
// jumlah topik; susunan sama di laptop dan telepon.
export interface GrafikBatangData {
  label: string
  value: number
  sub?: string
}

interface GrafikBatangProps {
  data: GrafikBatangData[]
  max?: number
  ambang?: number
  ambangLabel?: string
  warna?: (value: number) => string
  format?: (v: number) => string
  ariaLabel: string
}

const pct = (v: number, max: number) => (max <= 0 ? 0 : Math.min(100, Math.max(0, (v / max) * 100)))

export function GrafikBatang({
  data,
  max = 100,
  ambang,
  ambangLabel,
  warna = () => 'var(--terra)',
  format = (v) => String(v),
  ariaLabel,
}: GrafikBatangProps) {
  if (data.length === 0) {
    return (
      <div role="img" aria-label={ariaLabel} className="text-center py-8 text-sm text-brown-3">
        Belum ada data
      </div>
    )
  }

  return (
    <div role="img" aria-label={ariaLabel} className="flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.label} title={`${d.label}: ${format(d.value)}${d.sub ? ` (${d.sub})` : ''}`}>
          <div className="text-xs text-brown-2 mb-1 leading-snug break-words">{d.label}</div>
          <div className="flex items-center gap-3">
            <div className="relative h-5 flex-1 rounded-md overflow-hidden" style={{ background: 'var(--border)' }}>
              <div data-batang className="h-full rounded-md" style={{ width: `${pct(d.value, max)}%`, minWidth: d.value > 0 ? 4 : 0, background: warna(d.value) }} />
              {ambang != null && (
                <div data-ambang className="absolute inset-y-0 w-px" style={{ left: `${pct(ambang, max)}%`, background: 'var(--brown)' }} />
              )}
            </div>
            <div className="w-11 shrink-0 text-right text-xs font-semibold text-brown tabular-nums">{format(d.value)}</div>
          </div>
        </div>
      ))}
      <div className="flex justify-between text-[10px] text-brown-3 tabular-nums pr-14">
        <span>0</span>
        {ambang != null && ambangLabel && <span>Garis tegak = {ambangLabel}</span>}
        <span>{max}</span>
      </div>
    </div>
  )
}
