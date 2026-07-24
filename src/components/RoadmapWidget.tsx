import type { CSSProperties, ComponentType } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { moduleIdToPath } from '../lib/progress'
import type { Jalur } from '../lib/diagnostic'
import { IconCompass, IconCheck, IconLock, IconBook, IconClipboard, IconTrophy } from './icons'

// Visual roadmap mirroring the manuscript's "ALUR BELAJAR ADAPTIF" diagram —
// see docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md
// ("Roadmap widget" section). Purely a read-only supplementary strip above
// the existing module list on /dashboard — not a replacement for it.

type NodeState = 'done' | 'current' | 'locked'

interface RoadmapNode {
  key: string
  label: string
  state: NodeState
  href?: string
  Icon: ComponentType<{ size?: number; className?: string }>
}

const JALUR_LABEL: Record<Jalur, string> = { cepat: 'Jalur Cepat', mendalam: 'Jalur Mendalam' }

export function RoadmapWidget() {
  const { profile } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()

  // modules is already ordered by order_num (see fetchModules) — index order
  // here is the sequential curriculum order, matching the seq-lock behavior
  // already implied by legacy/modul.html.
  const moduleDone = modules.map((m) => (progress[moduleIdToPath(m.id)]?.pct ?? 0) >= 100)
  const firstNotDone = moduleDone.findIndex((done) => !done)

  const jalurSet = Boolean(profile?.jalur)

  const nodes: RoadmapNode[] = [
    {
      key: 'diagnostik',
      label: 'Diagnostik',
      state: jalurSet ? 'done' : 'current',
      // No retake UI is in scope (spec's "Out of scope") — once jalur is set
      // the node is informational only, not a link back into the test.
      href: jalurSet ? undefined : '/diagnostik',
      Icon: IconCompass,
    },
    ...modules.map((m, i) => ({
      key: `modul-${m.id}`,
      label: `Bab ${m.order_num}`,
      state: (moduleDone[i] ? 'done' : i === firstNotDone ? 'current' : 'locked') as NodeState,
      href: `/modul/${m.id}`,
      Icon: IconBook,
    })),
    // "Rangkuman & Refleksi" and "UAS" mirror the diagram's final two stages
    // but have no implemented route yet (Laporan Akhir / UAS are explicitly
    // deferred in CLAUDE.md's "Fitur DIABAIKAN DULU") — rendered as
    // always-locked placeholders, never a Link, until those pages exist.
    { key: 'rangkuman', label: 'Rangkuman & Refleksi', state: 'locked', Icon: IconClipboard },
    { key: 'uas', label: 'UAS', state: 'locked', Icon: IconTrophy },
  ]

  return (
    <div className="mb-6 bg-ivory rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="text-xs font-bold uppercase tracking-wide text-brown-3 mb-3">Peta Belajar</div>
      <div className="flex items-center overflow-x-auto pb-1 -mx-1 px-1">
        {nodes.map((node, i) => (
          <div key={node.key} className="flex items-center">
            {i > 0 && (
              <div
                className="h-0.5 w-5 md:w-7 flex-shrink-0"
                style={{ background: nodes[i - 1].state === 'done' ? 'var(--sage)' : 'var(--border)' }}
              />
            )}
            <RoadmapPill node={node} />
          </div>
        ))}
      </div>
      {profile?.jalur && (
        <div className="mt-2 text-[11px] text-brown-3">
          Jalur belajarmu: <span className="font-semibold text-terra">{JALUR_LABEL[profile.jalur]}</span>
        </div>
      )}
    </div>
  )
}

function RoadmapPill({ node }: { node: RoadmapNode }) {
  let circleStyle: CSSProperties
  let Icon = node.Icon
  if (node.state === 'done') {
    circleStyle = { background: 'var(--sage)', borderColor: 'var(--sage)', color: '#fff' }
    Icon = IconCheck
  } else if (node.state === 'current') {
    circleStyle = { background: 'var(--terra)', borderColor: 'var(--terra)', color: '#fff' }
  } else {
    circleStyle = { background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--brown-3)' }
    Icon = IconLock
  }

  const content = (
    <div className="flex flex-col items-center gap-1 flex-shrink-0 w-[74px]">
      <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0" style={circleStyle}>
        <Icon size={15} />
      </div>
      <span
        className={`text-[10px] text-center leading-tight ${
          node.state === 'locked' ? 'text-brown-3' : 'text-brown font-semibold'
        }`}
      >
        {node.label}
      </span>
    </div>
  )

  if (node.href && node.state !== 'locked') {
    return (
      <Link to={node.href} className="no-underline">
        {content}
      </Link>
    )
  }
  return <div aria-disabled="true">{content}</div>
}

export default RoadmapWidget
