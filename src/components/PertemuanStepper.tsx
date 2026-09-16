import { useNavigate } from 'react-router'
import { useModules } from '../hooks/useModules'

export type PertemuanStatus = 'done' | 'open' | 'locked'

// Deret P1..Pn dipakai di /modul, /video, /asesmen (spec §8.0). n = jumlah
// modul, urut order_num. WP1: statusOf default semua 'open' — kunci
// sebenarnya (topik n>1 terkunci sampai formatif n-1 lulus) dibuat WP6
// (src/lib/topik.ts, lihat spec §4.2).
export function PertemuanStepper({
  current,
  basePath,
  statusOf = () => 'open',
}: {
  current: number
  basePath: string
  statusOf?: (moduleId: number) => PertemuanStatus
}) {
  const { data: modules = [] } = useModules()
  const navigate = useNavigate()
  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pertemuan">
      {sorted.map((m, i) => {
        const status = statusOf(m.id)
        const active = m.id === current
        const locked = status === 'locked'
        return (
          <button
            key={m.id}
            type="button"
            disabled={locked}
            title={locked ? 'Selesaikan topik n-1 dulu' : `Pertemuan ${i + 1}`}
            onClick={() => navigate(`${basePath}/${m.id}`)}
            aria-current={active ? 'page' : undefined}
            className="step-pill shrink-0 w-11 h-11 rounded-full border flex items-center justify-center text-sm font-semibold"
            style={{
              background: active ? 'var(--brown)' : status === 'done' ? 'var(--sage)' : 'var(--ivory)',
              color: active || status === 'done' ? 'var(--cream)' : 'var(--brown)',
              borderColor: 'var(--border)',
              opacity: locked ? 0.5 : 1,
            }}
          >
            P{i + 1}
          </button>
        )
      })}
    </div>
  )
}
