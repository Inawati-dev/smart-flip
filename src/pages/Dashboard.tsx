import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { ModuleCard } from '../components/ModuleCard'
import { RoadmapWidget } from '../components/RoadmapWidget'
import { WelcomeModal } from '../components/WelcomeModal'
import { moduleIdToPath } from '../lib/progress'
import { hasSeenOnboarding, markOnboardingSeen } from '../lib/onboarding'
import { Layout } from '../components/Layout'

export function Dashboard() {
  const navigate = useNavigate()
  const { profile, role, loading } = useAuth()
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

        {role === 'mahasiswa' && <RoadmapWidget />}

        <div className="flex flex-col gap-3">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} progress={progress[moduleIdToPath(m.id)]} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
