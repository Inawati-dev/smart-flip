import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useModule } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useQuizAttempts } from '../hooks/useQuizAttempts'
import { useAuth } from '../contexts/AuthContext'
import { moduleIdToPath } from '../lib/progress'
import { Layout } from '../components/Layout'
import { IconBook, IconDocument, IconEdit, IconFolder, IconTarget, IconChart, IconClipboard, IconChat, IconLink, IconChevronRight } from '../components/icons'

// Only allow https:/http: DOI links — block javascript: and other dangerous
// protocols. Ported verbatim from legacy/modul.html:904-907.
export function safeDoi(doi: string | undefined): string {
  if (typeof doi === 'string' && /^https?:\/\//i.test(doi.trim())) return doi
  return '#'
}

// modul.jurnal/modul.studiKasus are typed `unknown[]` on ModuleRow (untyped JSON
// column) — narrow to the shape this page actually consumes.
interface JurnalItem {
  judul: string
  penulis: string
  tahun: number
  jurnal: string
  abstrak: string
  doi: string
}
interface StudiKasusItem {
  judul: string
  konteks: string
  pertanyaan: string
}

export default function Modul() {
  const { id } = useParams()
  const moduleId = parseInt(id ?? '1', 10) || 1
  const { data: modul, isLoading } = useModule(moduleId)
  const { data: progress = {} } = useAllProgress()
  const { data: attempts = [] } = useQuizAttempts(moduleId)
  const { profile } = useAuth()
  const [jTab, setJTab] = useState<'jurnal' | 'kasus'>('jurnal')
  // Jalur cepat collapses materi[] behind a disclosure by default; jalur mendalam
  // (and null/dosen, i.e. diagnostic not taken) keeps it open — current behavior.
  // `materiOverride` lets the student flip it manually without fighting the default.
  const [materiOverride, setMateriOverride] = useState<boolean | null>(null)
  const isJalurCepat = profile?.jalur === 'cepat'
  const materiOpen = materiOverride ?? !isJalurCepat

  if (isLoading) return <Layout><div className="p-8 text-brown-3">Memuat…</div></Layout>
  if (!modul) return <Layout><div className="p-8 text-brown">Modul tidak ditemukan</div></Layout>

  const bestScore = attempts.length ? Math.max(...attempts.map((a) => a.score)) : null
  const jurnalStudiKasusSection = (
    <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-bold text-brown flex items-center gap-2"><IconBook size={18} /> Jurnal &amp; Studi Kasus</h2>
        <span className="text-xs text-brown-3 bg-bg3 border border-gray-200 rounded-full px-2.5 py-0.5 ml-auto">
          {modul.jurnal.length} jurnal · {modul.studiKasus.length} kasus
        </span>
      </div>

      <div className="flex gap-2 mb-4 border-b-2 border-gray-200 pb-2">
        <button
          onClick={() => setJTab('jurnal')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold ${jTab === 'jurnal' ? 'text-terra bg-terra/10' : 'text-brown-3'}`}
        >
          Referensi Jurnal
        </button>
        <button
          onClick={() => setJTab('kasus')}
          className={`px-4 py-2 rounded-t-lg text-sm font-semibold ${jTab === 'kasus' ? 'text-terra bg-terra/10' : 'text-brown-3'}`}
        >
          Studi Kasus
        </button>
      </div>

      {jTab === 'jurnal' ? (
        modul.jurnal.length ? (
          (modul.jurnal as JurnalItem[]).map((j, i) => (
            <div key={i} className="bg-cream border border-gray-200 rounded-xl p-5 mb-3">
              <div className="font-semibold text-brown mb-1">{j.judul}</div>
              <div className="text-sm text-brown-3 mb-2">
                {j.penulis} · {j.tahun} · <em>{j.jurnal}</em>
              </div>
              <p className="text-sm text-brown-2 leading-relaxed mb-3">{j.abstrak}</p>
              <a href={safeDoi(j.doi)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-terra">
                <IconLink size={14} /> Buka DOI
              </a>
            </div>
          ))
        ) : (
          <p className="text-brown-3 text-center py-8">Belum ada referensi jurnal.</p>
        )
      ) : modul.studiKasus.length ? (
        (modul.studiKasus as StudiKasusItem[]).map((k, i) => (
          <div key={i} className="bg-cream border-l-4 border-sage rounded-r-xl p-5 mb-3">
            <div className="font-semibold text-brown mb-2">{k.judul}</div>
            <p className="text-sm text-brown-2 mb-3">{k.konteks}</p>
            <div className="bg-sage/10 rounded-lg p-3 text-sm text-brown">
              <span className="inline-flex items-center gap-1 font-bold"><IconChat size={14} /> Diskusi:</span> {k.pertanyaan}
            </div>
          </div>
        ))
      ) : (
        <p className="text-brown-3 text-center py-8">Belum ada studi kasus.</p>
      )}
    </div>
  )

  const materiSection = (
    <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
      {isJalurCepat ? (
        <button
          type="button"
          onClick={() => setMateriOverride(!materiOpen)}
          aria-expanded={materiOpen}
          className="font-bold text-brown mb-3 flex items-center gap-2 w-full text-left"
        >
          <IconBook size={18} /> Materi per Sesi
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brown-3">
            {materiOpen ? 'Sembunyikan Detail' : 'Lihat Detail Materi'}
            <IconChevronRight size={14} className={`transition-transform ${materiOpen ? 'rotate-90' : ''}`} />
          </span>
        </button>
      ) : (
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2"><IconBook size={18} /> Materi per Sesi</h2>
      )}
      {materiOpen && (
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
      )}
    </div>
  )
  const prog = progress[moduleIdToPath(modul.id)]
  const pct = prog?.pct ?? 0
  const bacaLabel = pct >= 100
    ? <><IconBook size={16} /> Baca Ulang</>
    : pct > 0 ? '▶ Lanjut Belajar' : '▶ Mulai Belajar'

  return (
    <Layout>
    <div className="page-fadein p-6">
      <Link to="/dashboard" className="text-brown-3 text-sm mb-6 inline-block">
        ← Kembali ke Dashboard
      </Link>

      <div className="flex gap-7 mb-8">
        <div
          className="w-[140px] h-[186px] rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${modul.color} 0%, var(--bg3) 100%)` }}
        >
          <IconDocument size={36} />
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
            <Link
              to={`/ebook?book=${modul.id}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-terra text-white text-sm font-semibold"
            >
              {bacaLabel}
            </Link>
            <Link
              to={`/modul/${modul.id}/kuis`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-gray-300 text-brown-2 text-sm font-semibold"
            >
              <IconEdit size={16} /> Mulai Kuis
            </Link>
            <Link
              to={`/modul/${modul.id}/workshop`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border-2 border-gray-300 text-brown-2 text-sm font-semibold"
            >
              <IconFolder size={16} /> Panduan Workshop
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2"><IconTarget size={18} /> Capaian Pembelajaran</h2>
        <div className="flex flex-col gap-2">
          {modul.capaian.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-brown-2">
              <span className="w-4.5 h-4.5 rounded-full bg-sage flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs">✓</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {isJalurCepat && jurnalStudiKasusSection}

      {materiSection}

      <div className="bg-ivory border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2"><IconChart size={18} /> Riwayat Belajar</h2>
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
        <h2 className="font-bold text-brown mb-3 flex items-center gap-2"><IconClipboard size={18} /> Riwayat Kuis</h2>
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

      {!isJalurCepat && jurnalStudiKasusSection}
    </div>
    </Layout>
  )
}
