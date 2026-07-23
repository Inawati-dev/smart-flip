import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { ModuleCard } from '../components/ModuleCard'
import { moduleIdToPath } from '../lib/progress'
import { Layout } from '../components/Layout'

export function Dashboard() {
  const { profile } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-brown mb-1">
          Halo, {profile?.full_name || 'Pengguna'}
        </h1>
        <p className="text-brown-3 mb-6">
          {profile?.role === 'dosen' ? 'Dashboard Dosen' : 'Dashboard Mahasiswa'}
        </p>

        <div className="flex flex-col gap-3">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} progress={progress[moduleIdToPath(m.id)]} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
