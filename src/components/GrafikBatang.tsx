// Grafik batang SVG murni, tanpa pustaka baru (spec asesmen §B). Dipakai di
// halaman Asesmen dosen untuk rata-rata formatif dan persentase lulus per
// topik. Lebar responsif lewat viewBox + width 100%, dibungkus overflow-x-auto
// oleh pemanggil untuk layar sempit.
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
  tinggi?: number
  format?: (v: number) => string
  ariaLabel: string
}

const LABAR_BATANG = 56
const CELAH = 24
const PADDING_X = 16
const PADDING_ATAS = 28
const TINGGI_LABEL = 34

function potongLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 14)}…` : label
}

export function GrafikBatang({
  data,
  max,
  ambang,
  ambangLabel,
  warna = () => 'var(--terra)',
  tinggi = 180,
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

  const nilaiMax = max ?? Math.max(...data.map((d) => d.value), 1)
  const tinggiBatangArea = tinggi
  const H = tinggiBatangArea + PADDING_ATAS + TINGGI_LABEL
  const W = Math.max(320, PADDING_X * 2 + data.length * (LABAR_BATANG + CELAH))

  const skalaY = (v: number) => (nilaiMax === 0 ? 0 : (v / nilaiMax) * tinggiBatangArea)
  const yAmbang = ambang != null ? PADDING_ATAS + (tinggiBatangArea - skalaY(ambang)) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={ariaLabel}>
      {yAmbang != null && (
        <>
          <line x1={PADDING_X} y1={yAmbang} x2={W - PADDING_X} y2={yAmbang} stroke="var(--brown3)" strokeWidth={1} strokeDasharray="4 4" />
          {ambangLabel && (
            <text x={W - PADDING_X} y={yAmbang - 4} textAnchor="end" fontSize={10} fill="var(--brown3)">
              {ambangLabel}
            </text>
          )}
        </>
      )}
      {data.map((d, i) => {
        const x = PADDING_X + i * (LABAR_BATANG + CELAH)
        const h = skalaY(d.value)
        const y = PADDING_ATAS + (tinggiBatangArea - h)
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${format(d.value)}${d.sub ? ` (${d.sub})` : ''}`}</title>
            <rect x={x} y={y} width={LABAR_BATANG} height={Math.max(h, 1)} rx={4} fill={warna(d.value)} />
            <text x={x + LABAR_BATANG / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--brown)">
              {format(d.value)}
            </text>
            <text x={x + LABAR_BATANG / 2} y={PADDING_ATAS + tinggiBatangArea + 16} textAnchor="middle" fontSize={10} fill="var(--brown2)">
              {potongLabel(d.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
