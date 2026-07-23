import { useParams, Link } from 'react-router'
import { useModule } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { moduleIdToPath } from '../lib/progress'

export default function Modul() {
  const { id } = useParams()
  const moduleId = parseInt(id ?? '1', 10) || 1
  const { data: modul, isLoading } = useModule(moduleId)
  const { data: progress = {} } = useAllProgress()
  const { data: attempts = [] } = useQuizAttempts(moduleId)

  if (isLoading) return <div className="p-8 text-brown-3">Memuat…</div>
  if (!modul) return <div className="p-8 text-brown">Modul tidak ditemukan</div>

  const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null
  const prog = progress[moduleIdToPath(modul.id)]
  const pct = prog?.pct ?? 0
  const bacaLabel = pct >= 100 ? '📖 Baca Ulang' : pct > 0 ? '▶ Lanjut Belajar' : '▶ Mulai Belajar'

  return (
    <div className="min-h-screen bg-cream p-6 max-w-3xl mx-auto">
      <Link to="/dashboard" className="text-brown-3 text-sm mb-6 inline-block">
        ← Kembali ke Dashboard
      </Link>

      <div className="flex gap-7 mb-8">
        <div
          className="w-[140px] h-[186px] rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${modul.color} 0%, var(--bg3) 100%)` }}
        >
          📄
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <span className="inline-flex bg-terra text-white text-xs font-bold px-2.5 py-0.5 rounded-full w-fit">
            Modul {modul.order_num}
          </span>
          <h1 className="text-2xl font-bold text-brown">{modul.title}</h1>
          {modul.sub && <p className="text-sm text-brown-3">{modul.sub}</p>}
          {modul.description && <p className="text-sm text-brown-2 leading-relaxed">{modul.description}</p>}

          {pct > 0 && (
            <div className="flex items-center gap-2.5 mt-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--sage)' : 'var(--terra)' }}
                />
              </div>
              <span className="text-xs font-semibold text-brown-3 flex-shrink-0">{pct}%</span>
            </div>
          )}

          <div className="flex gap-2.5 flex-wrap mt-3">
            <a
              href={`/legacy/ebook.html?book=${encodeURIComponent(modul.path)}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-terra text-white text-sm font-semibold"
            >
              {bacaLabel}
            </a>
            <a
              href={`/legacy/kuis.html?modul=${modul.id}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-gray-300 text-brown-2 text-sm font-semibold"
            >
              ✏️ Mulai Kuis
            </a>
            <a
              href={`/legacy/workshop.html?id=${modul.id}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-gray-300 text-brown-2 text-sm font-semibold"
            >
              🗂️ Panduan Workshop
            </a>
          </div>
        </div>
      </div>

      <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2">🎯 Capaian Pembelajaran</h2>
        <div className="flex flex-col gap-2">
          {modul.capaian.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-brown-2">
              <span className="w-4.5 h-4.5 rounded-full bg-sage flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs">✓</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2">📚 Materi per Sesi</h2>
        <div className="flex flex-col">
          {modul.materi.map((m, i) => (
            <div key={i} className="flex items-center gap-3.5 py-2.5 border-b border-gray-100 last:border-0 text-sm text-brown-2">
              <span className="w-7 h-7 rounded-full bg-bg3 border border-gray-200 flex items-center justify-center text-xs font-bold text-brown-3 flex-shrink-0">
                {m.sesi}
              </span>
              <span>{m.topik}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2">📊 Riwayat Belajar</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-bg3 rounded-lg p-3.5">
            <div className="text-xl font-bold text-brown">{pct}%</div>
            <div className="text-xs text-brown-3 mt-0.5">Progress baca</div>
          </div>
          <div className="bg-bg3 rounded-lg p-3.5">
            <div className="text-xl font-bold text-brown">{bestScore !== null ? `${bestScore}%` : '—'}</div>
            <div className="text-xs text-brown-3 mt-0.5">Skor kuis terbaik</div>
          </div>
          <div className="bg-bg3 rounded-lg p-3.5">
            <div className="text-xl font-bold text-brown">{prog?.lastOpened ?? '—'}</div>
            <div className="text-xs text-brown-3 mt-0.5">Terakhir dibuka</div>
          </div>
          <div className="bg-bg3 rounded-lg p-3.5">
            <div className="text-xl font-bold text-brown">—</div>
            <div className="text-xs text-brown-3 mt-0.5">Waktu Belajar</div>
          </div>
        </div>
      </div>

      <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2">📝 Riwayat Kuis</h2>
        {attempts.length ? (
          <div className="flex flex-col gap-2">
            {attempts.slice().reverse().map((a, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-bg3 rounded-lg text-sm">
                <span>{a.date}</span>
                <span className={`font-bold ${a.score >= 60 ? 'text-sage-d' : 'text-red'}`}>
                  {a.score}% — {a.score >= 80 ? 'Sangat Baik' : a.score >= 60 ? 'Lulus' : 'Perlu Ulang'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brown-3 text-center py-4">Belum pernah mengerjakan kuis</p>
        )}
      </div>

      <div id="modul-sections-placeholder" />
    </div>
  )
}
