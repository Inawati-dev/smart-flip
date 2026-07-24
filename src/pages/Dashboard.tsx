import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useKelasByDosen } from '../hooks/useKelas'
import { summarizeKelas } from '../lib/kelas'
import { ModuleCard } from '../components/ModuleCard'
import { RoadmapWidget } from '../components/RoadmapWidget'
import { WelcomeModal } from '../components/WelcomeModal'
import { moduleIdToPath } from '../lib/progress'
import { hasSeenOnboarding, markOnboardingSeen } from '../lib/onboarding'
import { Layout } from '../components/Layout'
import { IconTrendingUp, IconUsers, IconFolder, IconCheck, IconBook } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

function StatCard({ icon: Icon, val, label, bar }: { icon: typeof IconUsers; val: string; label: string; bar: string }) {
  return (
    <div className="bg-ivory rounded-2xl border p-4 relative overflow-hidden" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <Icon size={18} />
      <div className="text-2xl font-bold text-brown mt-2">{val}</div>
      <div className="text-xs text-brown-3 mt-0.5">{label}</div>
    </div>
  )
}

function ShortcutCard({ to, icon: Icon, label, desc }: { to: string; icon: typeof IconUsers; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="bg-ivory rounded-2xl border p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
      style={BORDER}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-terra" style={{ background: 'var(--accent-soft)' }}>
        <Icon size={19} />
      </div>
      <div>
        <div className="text-sm font-semibold text-brown">{label}</div>
        <div className="text-xs text-brown-3">{desc}</div>
      </div>
    </Link>
  )
}

function DosenHome({ dosenId, totalModules }: { dosenId?: string; totalModules: number }) {
  const { data: kelas = [] } = useKelasByDosen(dosenId)
  const { totalStudents } = summarizeKelas(kelas)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={IconUsers} val={String(kelas.length)} label="Kelas Dikelola" bar="var(--terra)" />
        <StatCard icon={IconBook} val={String(totalStudents)} label="Mahasiswa Terdaftar" bar="var(--sage)" />
        <StatCard icon={IconFolder} val={String(totalModules)} label="Modul Tersedia" bar="#4A7EA0" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-brown-3 uppercase tracking-wide mb-2.5">Kelola Kelas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ShortcutCard to="/manajemen" icon={IconFolder} label="Kelola Modul" desc="Edit metadata, urutan & status modul" />
          <ShortcutCard to="/analitik" icon={IconTrendingUp} label="Analitik Kelas" desc="Progress, skor kuis & keaktifan mahasiswa" />
          <ShortcutCard to="/kelas" icon={IconUsers} label="Kelas" desc="Buat kelas, kode gabung & import CSV mahasiswa" />
          <ShortcutCard to="/validasi" icon={IconCheck} label="Validasi Ahli" desc="Nilai kelayakan media & materi modul" />
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user, profile, role, loading } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()
  const [showWelcome, setShowWelcome] = useState(false)

  // Diagnostic gate — see docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md
  // ("Diagnostic flow"): on first authenticated visit to /dashboard, a
  // mahasiswa with no jalur yet gets redirected to the one-time placement
  // test. Guarded on `loading` + `profile` so it never fires before the
  // profile has actually loaded, and never applies to dosen (no jalur concept).
  useEffect(() => {
    if (!loading && role === 'mahasiswa' && profile && profile.jalur == null) {
      navigate('/diagnostik', { replace: true })
    }
  }, [loading, role, profile, navigate])

  // First-visit onboarding — same trigger point as the legacy dashboard,
  // ported to React (see Changelog v0.9.4). Re-triggerable from Profil,
  // which just clears the localStorage flag and navigates back here.
  useEffect(() => {
    if (!loading && role && !hasSeenOnboarding(role)) setShowWelcome(true)
  }, [loading, role])

  return (
    <Layout>
      {showWelcome && role && (
        <WelcomeModal
          role={role}
          userName={profile?.full_name}
          onClose={() => {
            markOnboardingSeen(role)
            setShowWelcome(false)
          }}
        />
      )}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-brown mb-1">
          Halo, {profile?.full_name || 'Pengguna'}
        </h1>
        <p className="text-brown-3 mb-6">
          {profile?.role === 'dosen' ? 'Dashboard Dosen' : 'Dashboard Mahasiswa'}
        </p>

        {role === 'dosen' ? (
          <DosenHome dosenId={user?.id} totalModules={modules.length} />
        ) : (
          <>
            <RoadmapWidget />
            <div className="flex flex-col gap-3">
              {modules.map((m) => (
                <ModuleCard key={m.id} module={m} progress={progress[moduleIdToPath(m.id)]} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
