import { Link } from 'react-router'
import type { ModuleRow } from '../lib/modules'
import type { ProgressEntry } from '../lib/progress'

export function ModuleCard({
  module,
  progress,
}: {
  module: ModuleRow
  progress?: ProgressEntry
}) {
  const pct = progress?.pct ?? 0
  const status = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'
  const badgeText = status === 'completed' ? 'Selesai' : status === 'in_progress' ? 'Sedang' : 'Belum Mulai'
  const btnLabel = pct >= 100 ? '📖 Baca Ulang' : pct > 0 ? '▶ Lanjut Belajar' : '▶ Mulai Belajar'
  const sub = module.sub || (module.description ? module.description.slice(0, 60) : '')

  return (
    <div className="flex items-center gap-4 bg-ivory rounded-xl p-4 shadow-sm">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
        style={{ background: module.color }}
      >
        {module.order_num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-brown truncate">
          {module.order_num}. {module.title}
        </div>
        <div className="text-sm text-brown-3 truncate">{sub}</div>
        {status !== 'not_started' && (
          <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: status === 'completed' ? 'var(--sage)' : 'var(--terra)' }}
            />
          </div>
        )}
        <Link to={`/modul/${module.id}`} className="text-sm text-terra font-semibold">
          {btnLabel}
        </Link>
      </div>
      <span className="text-xs font-semibold text-brown-3">{badgeText}</span>
    </div>
  )
}
