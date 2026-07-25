import { useState, type ReactElement } from 'react'
import { useRecentActivity } from '../hooks/useAnalitik'
import { timeAgo } from '../lib/forum'
import { IconDocument, IconTarget, IconChat, IconBook } from './icons'

const BORDER = { borderColor: 'var(--border)' } as const

type IconComp = (props: { size?: number }) => ReactElement

const ACTIVITY_BADGE: Record<string, { bg: string; color: string }> = {
  draf: { bg: '#FAE8A0', color: '#705010' },
  kuis: { bg: '#C0DD97', color: '#27500A' },
  forum: { bg: 'rgba(143,162,135,.2)', color: 'var(--sage-d)' },
  modul: { bg: 'rgba(74,126,160,.15)', color: '#2E5A78' },
}

const ACTIVITY_ICON: Record<string, IconComp> = {
  draf: IconDocument,
  kuis: IconTarget,
  forum: IconChat,
  modul: IconBook,
}

const PREVIEW_LIMIT = 5
const ALL_LIMIT = 200

// Shared by Dashboard.tsx (DosenHome) and Profil.tsx's dosen view -- was
// previously only on Profil, capped at 5 rows with no way to see more.
// "Lihat Semua" just re-queries useRecentActivity with a much larger limit
// (fetchRecentActivity already accepts one) rather than paginating client-side.
export function RecentActivityCard() {
  const [showAll, setShowAll] = useState(false)
  const { data: recentActivity } = useRecentActivity(showAll ? ALL_LIMIT : PREVIEW_LIMIT)

  return (
    <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b flex-wrap" style={BORDER}>
        <span className="text-sm font-semibold text-brown">Aktivitas Kelas Terkini</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brown-3">
            {recentActivity?.length ? (showAll ? `${recentActivity.length} aktivitas` : `${recentActivity.length} aktivitas terakhir`) : ''}
          </span>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-semibold text-terra-d hover:underline"
          >
            {showAll ? 'Tampilkan 5 Terakhir' : 'Lihat Semua'}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-bg3">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Aktivitas</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Detail</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {!recentActivity?.length ? (
              <tr>
                <td colSpan={3} className="text-center text-brown-3 py-6 text-sm">
                  Belum ada aktivitas mahasiswa
                </td>
              </tr>
            ) : (
              recentActivity.map((a, i) => {
                const ActivityIconComp = ACTIVITY_ICON[a.kind] || IconDocument
                const badge = ACTIVITY_BADGE[a.kind] || { bg: 'var(--bg3)', color: 'var(--brown-2)' }
                return (
                  <tr key={i} className="border-t" style={BORDER}>
                    <td className="px-4 py-2.5 text-brown-2">
                      <span className="inline-flex items-center gap-1.5">
                        <ActivityIconComp size={14} /> {a.who}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {a.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-brown-3">{timeAgo(a.iso)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
