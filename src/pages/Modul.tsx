import { Link, useParams } from 'react-router'
import { useModule } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { useAuth } from '../contexts/AuthContext'
import { moduleIdToPath } from '../lib/progress'
import { useTopikStatus } from '../lib/topik'
import { Layout } from '../components/Layout'
import { PertemuanStepper } from '../components/PertemuanStepper'
import { DosenModulTable } from './ModulList'
import { IconBook, IconDocument, IconChart, IconPlay, IconEdit } from '../components/icons'

// progress.lastOpened is stored as a raw ISO string (new Date().toISOString())
// -- was rendering as-is ("2026-07-24T04:04:55.479+00:00") instead of a
// readable date.
export function formatLastOpened(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// /modul/:id (spec §8.0, §9 WP5). Mahasiswa: satu pertemuan tampil penuh
// (tata letak C) — stepper, kartu modul + tombol baca, panel posisi baca +
// langkah berikutnya. Dosen: tabel kelola modul, sama seperti /modul
// (ModulList.tsx) — dosen tidak "membaca" satu pertemuan, jadi tidak
// memakai tata letak dua kolom di bawah.
export default function Modul() {
  const { id } = useParams()
  const moduleId = parseInt(id ?? '1', 10) || 1
  const { role } = useAuth()
  const { data: modul, isLoading } = useModule(moduleId)
  const { data: progress = {} } = useAllProgress()
  const { data: attempts = [] } = useQuizAttempts(moduleId)
  const { statusOf } = useTopikStatus()

  if (role === 'dosen') {
    return (
      <Layout>
        <div className="p-4 md:p-6">
          <h1 className="text-2xl font-bold text-brown mb-4">Modul</h1>
          <DosenModulTable />
        </div>
      </Layout>
    )
  }

  if (isLoading) return <Layout><div className="p-8 text-brown-3">Memuat…</div></Layout>
  if (!modul) return <Layout><div className="p-8 text-brown">Modul tidak ditemukan</div></Layout>

  const status = statusOf(modul.id)
  if (status === 'locked') {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-brown mb-3">Selesaikan topik {modul.order_num - 1} dulu.</p>
          <Link to="/modul" className="text-terra text-sm font-semibold">
            ← Kembali
          </Link>
        </div>
      </Layout>
    )
  }

  const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null
  const prog = progress[moduleIdToPath(modul.id)]
  const pct = prog?.pct ?? 0
  const hasPdf = !!(modul.pdf_path || modul.path)

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold text-brown mb-4">
          Pertemuan {modul.order_num} · {modul.title}
        </h1>
        <PertemuanStepper current={modul.id} basePath="/modul" statusOf={statusOf} />

        <div className="grid md:grid-cols-[1fr_320px] gap-5 mt-6">
          <div className="bg-ivory border rounded-xl p-5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-5 flex-col sm:flex-row">
              <div
                className="w-full sm:w-[140px] h-[140px] sm:h-[186px] rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${modul.color} 0%, var(--bg3) 100%)` }}
              >
                <IconDocument size={36} />
              </div>
              <div className="flex flex-col gap-2">
                {modul.sub && <p className="text-sm text-brown-3">{modul.sub}</p>}
                {modul.description && <p className="text-sm text-brown-2 leading-relaxed">{modul.description}</p>}
                {hasPdf ? (
                  <Link to={`/ebook?book=${modul.id}`} className="btn btn-primary mt-2 w-fit">
                    <IconBook size={16} /> Baca modul
                  </Link>
                ) : (
                  <p className="text-sm text-brown-3 mt-2">Dosen belum mengunggah PDF.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-ivory border rounded-xl p-5 flex flex-col gap-4 h-fit" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="font-bold text-brown mb-2 flex items-center gap-2 text-sm">
                <IconChart size={16} /> Posisi baca
              </h2>
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--sage)' : 'var(--terra)' }}
                  />
                </div>
                <span className="text-xs font-semibold text-brown-3 flex-shrink-0">{pct}%</span>
              </div>
              <p className="text-xs text-brown-3 mt-1.5">
                {prog?.currentPage ? `Halaman terakhir: ${prog.currentPage}` : 'Belum mulai membaca'}
              </p>
            </div>
            <div>
              <h2 className="font-bold text-brown mb-2 text-sm">Langkah berikutnya</h2>
              <div className="flex flex-col gap-2">
                <Link to={`/video/${modul.id}`} className="btn btn-secondary">
                  <IconPlay size={14} /> Tonton video {modul.order_num}
                </Link>
                <Link to={`/asesmen/formatif/${modul.id}`} className="btn btn-secondary">
                  <IconEdit size={14} /> Kerjakan tes formatif
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-ivory border rounded-xl p-4 mt-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-brown mb-3 text-sm">Riwayat belajar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-bg3 rounded-lg p-3">
              <div className="text-lg font-bold text-brown">{pct}%</div>
              <div className="text-xs text-brown-3 mt-0.5">Progress baca</div>
            </div>
            <div className="bg-bg3 rounded-lg p-3">
              <div className="text-lg font-bold text-brown">{bestScore !== null ? `${bestScore}%` : '—'}</div>
              <div className="text-xs text-brown-3 mt-0.5">Skor kuis terbaik</div>
            </div>
            <div className="bg-bg3 rounded-lg p-3">
              <div className="text-lg font-bold text-brown">{formatLastOpened(prog?.lastOpened)}</div>
              <div className="text-xs text-brown-3 mt-0.5">Terakhir dibuka</div>
            </div>
            <div className="bg-bg3 rounded-lg p-3">
              <div className="text-lg font-bold text-brown">—</div>
              <div className="text-xs text-brown-3 mt-0.5">Waktu belajar</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
