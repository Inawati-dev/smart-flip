import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Layout } from '../components/Layout'
import { useModule } from '../hooks/useModules'
import { TOTAL_MODULES } from '../lib/progress'
import {
  WORKSHOP_DATA,
  readChecklistState,
  writeChecklistState,
  readLkAnswer,
  writeLkAnswer,
  clearLkAnswers,
  type ChecklistState,
} from '../lib/workshop'

type TabId = 'tujuan' | 'aktivitas' | 'checklist' | 'lembarkerja'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'tujuan', label: 'Tujuan', icon: '🎯' },
  { id: 'aktivitas', label: 'Aktivitas', icon: '📋' },
  { id: 'checklist', label: 'Checklist', icon: '✅' },
  { id: 'lembarkerja', label: 'Lembar Kerja', icon: '📝' },
]

export default function Workshop() {
  const { id } = useParams()
  const moduleId = parseInt(id ?? '1', 10) || 1
  const { data: modul, isLoading } = useModule(moduleId)
  const workshop = WORKSHOP_DATA[moduleId]

  const [activeTab, setActiveTab] = useState<TabId>('tujuan')
  // Lazy initializers so the first render (including SSR/renderToStaticMarkup)
  // already reflects persisted state, not just after an effect runs.
  const [checklist, setChecklist] = useState<ChecklistState>(() => readChecklistState(moduleId))
  const [lkAnswers, setLkAnswers] = useState<Record<number, string>>(() => {
    const w = WORKSHOP_DATA[moduleId]
    if (!w) return {}
    const answers: Record<number, string> = {}
    w.lembarKerja.pertanyaan.forEach((_, i) => { answers[i] = readLkAnswer(moduleId, i) })
    return answers
  })
  const [confirmModal, setConfirmModal] = useState<'checklist' | 'lembarkerja' | null>(null)

  // Re-sync per-module state whenever the route's :id changes without an
  // unmount (prev/next links reuse this component) — mirrors legacy
  // workshop.html's init() re-running loadChecklist()/render() on navigation.
  useEffect(() => {
    setActiveTab('tujuan')
    setChecklist(readChecklistState(moduleId))
    const w = WORKSHOP_DATA[moduleId]
    if (w) {
      const answers: Record<number, string> = {}
      w.lembarKerja.pertanyaan.forEach((_, i) => {
        answers[i] = readLkAnswer(moduleId, i)
      })
      setLkAnswers(answers)
    }
  }, [moduleId])

  if (isLoading) return <Layout><div className="p-8 text-brown-3">Memuat…</div></Layout>
  if (!modul || !workshop) return <Layout><div className="p-8 text-brown">Panduan workshop tidak ditemukan</div></Layout>

  const total = workshop.checklist.length
  const done = workshop.checklist.filter((_, i) => checklist[i]).length
  const pct = total ? Math.round((done / total) * 100) : 0

  function toggleCheck(idx: number) {
    setChecklist((prev) => {
      const next = { ...prev, [idx]: !prev[idx] }
      writeChecklistState(moduleId, next)
      return next
    })
  }

  function performResetChecklist() {
    setChecklist({})
    writeChecklistState(moduleId, {})
    setConfirmModal(null)
  }

  function performClearLembarKerja() {
    clearLkAnswers(moduleId, workshop.lembarKerja.pertanyaan.length)
    const cleared: Record<number, string> = {}
    workshop.lembarKerja.pertanyaan.forEach((_, i) => { cleared[i] = '' })
    setLkAnswers(cleared)
    setConfirmModal(null)
  }

  function updateLkAnswer(idx: number, value: string) {
    setLkAnswers((prev) => ({ ...prev, [idx]: value }))
    writeLkAnswer(moduleId, idx, value)
  }

  const prevId = moduleId - 1
  const nextId = moduleId + 1
  const prevWorkshop = WORKSHOP_DATA[prevId]
  const nextWorkshop = WORKSHOP_DATA[nextId]

  return (
    <Layout>
      <div className="max-w-[860px] mx-auto p-6 pb-16">
        <Link to={`/modul/${moduleId}`} className="text-brown-3 text-sm mb-6 inline-block">
          ← Kembali ke Modul
        </Link>

        {/* HERO */}
        <section className="bg-brown rounded-xl p-8 pb-6 mb-6 relative overflow-hidden">
          <div className="inline-flex items-center gap-1.5 bg-sage/20 border border-sage/35 text-sage text-xs font-semibold tracking-wide rounded-full px-3 py-1 mb-4">
            <span>📋</span> Sesi Tatap Muka
          </div>
          <div className="text-xs font-semibold text-terra tracking-widest uppercase mb-1">
            MODUL {moduleId}
          </div>
          <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-white leading-tight mb-2">
            {workshop.judul}
          </h1>
          <div className="flex items-center gap-1.5 mt-3 text-white/55 text-sm">
            <span>🕐</span>
            <span>{workshop.durasi}</span>
          </div>
        </section>

        {/* TAB NAV */}
        <nav role="tablist" className="flex gap-1 bg-ivory border border-[color:var(--border)] rounded-xl p-1.5 mb-5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-11 flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-brown text-white font-semibold' : 'text-brown-3'
              }`}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB: TUJUAN */}
        {activeTab === 'tujuan' && (
          <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-7 mb-4">
            <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-5 pb-3 border-b border-[color:var(--border)]">
              Tujuan Pembelajaran Sesi
            </h2>
            <ul className="flex flex-col gap-2.5">
              {workshop.tujuan.map((t, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3 bg-cream rounded-lg border-l-[3px] border-sage">
                  <span className="w-[22px] h-[22px] rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-brown-2">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB: AKTIVITAS */}
        {activeTab === 'aktivitas' && (
          <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-7 mb-4">
            <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-5 pb-3 border-b border-[color:var(--border)]">
              Alur Aktivitas Sesi
            </h2>
            <div className="flex flex-col">
              {workshop.aktivitas.map((a, i) => (
                <div key={i} className="grid grid-cols-[90px_1fr] sm:grid-cols-[120px_1fr] gap-x-5 relative">
                  <div className="flex flex-col items-end pb-6 pt-0.5">
                    <span className="text-xs font-semibold text-terra-d tracking-wide text-right leading-tight whitespace-nowrap">
                      {a.waktu}
                    </span>
                  </div>
                  <div className="relative pb-6 pl-6">
                    {i < workshop.aktivitas.length - 1 && (
                      <div className="absolute left-[-1px] top-6 bottom-0 w-0.5 bg-[color:var(--border)]" />
                    )}
                    <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-ivory border-[2.5px] border-terra flex items-center justify-center -translate-x-1/2 z-[1]">
                      <div className="w-[7px] h-[7px] rounded-full bg-terra" />
                    </div>
                    <div className="font-semibold text-[0.92rem] text-brown mb-1.5">{a.nama}</div>
                    <div className="text-sm leading-relaxed text-brown-2 mb-1.5">{a.deskripsi}</div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-wide text-terra-d bg-terra/10 border border-terra/25 rounded-full px-2.5 py-1">
                      👥 {a.peran}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-7 mb-4">
            <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-5 pb-3 border-b border-[color:var(--border)]">
              Checklist Kesiapan Mahasiswa
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-1.5 bg-[color:var(--border)] rounded-full overflow-hidden">
                <div className="h-full bg-sage rounded-full transition-[width]" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs font-semibold text-sage whitespace-nowrap">{done} / {total}</div>
            </div>
            <ul className="flex flex-col gap-2">
              {workshop.checklist.map((item, i) => {
                const isDone = !!checklist[i]
                return (
                  <li
                    key={i}
                    role="checkbox"
                    aria-checked={isDone}
                    tabIndex={0}
                    onClick={() => toggleCheck(i)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCheck(i) } }}
                    className={`flex items-center gap-3.5 min-h-11 px-4 py-2.5 rounded-lg cursor-pointer border transition-colors ${
                      isDone ? 'bg-sage/10 border-sage/25' : 'bg-cream border-transparent'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isDone ? 'bg-sage border-sage' : 'bg-ivory border-[color:var(--border)]'
                      }`}
                      aria-hidden="true"
                    >
                      {isDone && (
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[11px] h-[11px] text-white">
                          <polyline points="1.5,6 4.5,9 10.5,3" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm leading-tight select-none ${isDone ? 'line-through text-brown-3' : 'text-brown-2'}`}>
                      {item}
                    </span>
                  </li>
                )
              })}
            </ul>
            <button
              onClick={() => setConfirmModal('checklist')}
              className="mt-4 border border-[color:var(--border)] text-brown-3 text-xs rounded-md px-3 py-1.5"
            >
              Reset Checklist
            </button>
          </div>
        )}

        {/* TAB: LEMBAR KERJA */}
        {activeTab === 'lembarkerja' && (
          <div className="bg-ivory border border-[color:var(--border)] rounded-xl p-7 mb-4">
            <h2 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-5 pb-3 border-b border-[color:var(--border)]">
              {workshop.lembarKerja.judul}
            </h2>
            <div className="text-sm leading-relaxed text-brown-2 bg-terra/10 border border-terra/20 border-l-[3px] border-l-terra rounded-r-lg px-4 py-3.5 mb-6">
              {workshop.lembarKerja.instruksi}
            </div>
            <div className="flex flex-col gap-4">
              {workshop.lembarKerja.pertanyaan.map((q, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="text-xs font-bold tracking-wide text-terra-d uppercase">
                    Pertanyaan {i + 1}
                  </div>
                  <div className="text-sm font-medium text-brown leading-snug">{q}</div>
                  <textarea
                    rows={3}
                    placeholder="Tulis jawaban Anda di sini…"
                    value={lkAnswers[i] ?? ''}
                    onChange={(e) => updateLkAnswer(i, e.target.value)}
                    className="w-full min-h-20 bg-cream border border-[color:var(--border)] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed text-brown resize-y outline-none focus:border-terra focus:bg-ivory"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 mt-6 flex-wrap">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 min-h-11 px-4 py-2 rounded-lg bg-brown text-white text-sm font-semibold"
              >
                🖨️ Cetak Lembar Kerja
              </button>
              <button
                onClick={() => setConfirmModal('lembarkerja')}
                className="flex items-center justify-center gap-1.5 min-h-11 px-4 py-2 rounded-lg bg-cream border border-[color:var(--border)] text-brown-2 text-sm font-semibold"
              >
                🗑️ Bersihkan Jawaban
              </button>
            </div>
          </div>
        )}

        {/* PREV / NEXT NAV */}
        <nav aria-label="Navigasi antar modul" className="flex flex-col sm:flex-row gap-3 mt-8">
          {prevWorkshop ? (
            <Link
              to={`/modul/${prevId}/workshop`}
              className="flex-1 flex items-center gap-2 px-4 py-3.5 rounded-xl bg-ivory border border-[color:var(--border)]"
            >
              <span className="text-terra text-lg flex-shrink-0">←</span>
              <div>
                <div className="text-[11px] text-brown-3 font-medium tracking-wide">MODUL SEBELUMNYA</div>
                <div className="text-sm text-brown font-semibold">{prevWorkshop.judul}</div>
              </div>
            </Link>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-4 py-3.5 rounded-xl bg-ivory border border-[color:var(--border)] opacity-35 pointer-events-none">
              <span className="text-terra text-lg flex-shrink-0">←</span>
              <div>
                <div className="text-[11px] text-brown-3 font-medium tracking-wide">MODUL SEBELUMNYA</div>
                <div className="text-sm text-brown font-semibold">—</div>
              </div>
            </div>
          )}

          {nextWorkshop ? (
            <Link
              to={`/modul/${nextId}/workshop`}
              className="flex-1 flex items-center justify-end gap-2 px-4 py-3.5 rounded-xl bg-ivory border border-[color:var(--border)] text-right"
            >
              <div>
                <div className="text-[11px] text-brown-3 font-medium tracking-wide">MODUL BERIKUTNYA</div>
                <div className="text-sm text-brown font-semibold">{nextWorkshop.judul}</div>
              </div>
              <span className="text-terra text-lg flex-shrink-0">→</span>
            </Link>
          ) : (
            <div className="flex-1 flex items-center justify-end gap-2 px-4 py-3.5 rounded-xl bg-ivory border border-[color:var(--border)] text-right opacity-35 pointer-events-none">
              <div>
                <div className="text-[11px] text-brown-3 font-medium tracking-wide">MODUL BERIKUTNYA</div>
                <div className="text-sm text-brown font-semibold">—</div>
              </div>
              <span className="text-terra text-lg flex-shrink-0">→</span>
            </div>
          )}
        </nav>

        {moduleId > TOTAL_MODULES && (
          <p className="text-xs text-brown-3 mt-4">
            Catatan: modul ini berada di luar kurikulum 9-modul standar.
          </p>
        )}
      </div>

      {/* CONFIRM MODAL — destructive actions (reset checklist / clear worksheet
          answers) always get an explicit confirm dialog per CLAUDE.md's Modal
          Wajib rule, mirroring the confirm()-guarded pattern already used for
          Profil's "Reset Data Demo". */}
      {confirmModal && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal(null) }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">
              {confirmModal === 'checklist' ? 'Reset checklist kesiapan modul ini?' : 'Hapus semua jawaban lembar kerja modul ini?'}
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {confirmModal === 'checklist'
                ? 'Semua tanda centang pada checklist ini akan dihapus. Tindakan ini tidak dapat dibatalkan.'
                : 'Semua jawaban yang sudah Anda tulis di lembar kerja ini akan dihapus. Tindakan ini tidak dapat dibatalkan.'}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 h-[38px] rounded-lg border border-[color:var(--border)] text-sm text-brown-2"
              >
                Batal
              </button>
              <button
                onClick={confirmModal === 'checklist' ? performResetChecklist : performClearLembarKerja}
                className="flex-1 h-[38px] rounded-lg bg-red text-white text-sm font-semibold"
              >
                {confirmModal === 'checklist' ? 'Ya, Reset' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
