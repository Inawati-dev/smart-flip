import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useKelasByDosen } from '../hooks/useKelas'
import { labelKelas, tahunUnik } from '../lib/kelas'
import { fetchBankSoal, type KuisSoal } from '../lib/kuisSoal'
import { fetchAttemptsByKind, saveQuizAttempt } from '../lib/quizAttempts'
import { acakSoal, nilai, type AcakSoalResult, type AcakUrutSoal, type SoalTampil } from '../lib/acak'
import { computeNGain } from '../lib/ngain'
import { downloadCsv } from '../lib/analitik'
import {
  fetchSessionsByDosen,
  createSession,
  setSessionOpen,
  verifyTestCode,
  fetchSessionResults,
  fetchMyAttemptForSession,
  generateCode,
  type TestSession,
  type SessionKind,
  type VerifiedSession,
} from '../lib/testSessions'
import { Layout } from '../components/Layout'
import { SoalRunner } from '../components/SoalRunner'
import { PillGroup } from '../components/PillGroup'
import { IconTarget, IconLock, IconChart } from '../components/icons'

// Tes khusus berkode (spec §4.6, §9 WP6b) - satu-satunya tes mahasiswa yang
// dijaga kode; pre-test dan formatif tidak. Dua tampilan dipilih dari peran
// (pola sama AsesmenMhs.tsx: satu komponen, cabang berdasarkan data
// pengguna, bukan dua komponen terpisah).
const BORDER = { borderColor: 'var(--border)' } as const

export function TesKhusus() {
  const { role } = useAuth()
  return role === 'dosen' ? <DosenTesKhusus /> : <MahasiswaTesKhusus />
}

export default TesKhusus

// ════════════════════════════════════════════
//  Dosen - kelola sesi
// ════════════════════════════════════════════

function formatWaktu(from: string | null, until: string | null): string {
  if (!from && !until) return 'Kapan saja'
  const fmt = (iso: string) => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  if (from && until) return `${fmt(from)} - ${fmt(until)}`
  if (from) return `Mulai ${fmt(from)}`
  return `Sampai ${fmt(until as string)}`
}

function DosenTesKhusus() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: modules = [] } = useModules()
  const { data: kelasList = [] } = useKelasByDosen(user?.id)
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['test-sessions', user?.id],
    queryFn: fetchSessionsByDosen,
    enabled: Boolean(user?.id),
  })

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['test-sessions', user?.id] })
  }

  // == Modal buat sesi ==
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SessionKind>('post')
  const [moduleIds, setModuleIds] = useState<number[]>([])
  const [semuaKelas, setSemuaKelas] = useState(true)
  const [classIds, setClassIds] = useState<string[]>([])
  const [openFrom, setOpenFrom] = useState('')
  const [openUntil, setOpenUntil] = useState('')
  const [shuffle, setShuffle] = useState(true)
  const [singleAttempt, setSingleAttempt] = useState(true)
  const [previewCode, setPreviewCode] = useState('')
  const [saving, setSaving] = useState(false)

  function openCreateModal() {
    setName('')
    setKind('post')
    setModuleIds([])
    setSemuaKelas(true)
    setClassIds([])
    setOpenFrom('')
    setOpenUntil('')
    setShuffle(true)
    setSingleAttempt(true)
    // Pratinjau saja - createSession membuat kode finalnya sendiri lewat
    // generateCode() yang sama, dan mencoba ulang otomatis kalau tabrakan
    // UNIQUE (lihat lib/testSessions.ts).
    setPreviewCode(generateCode())
    setModalOpen(true)
  }

  function toggleModule(id: number) {
    setModuleIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }
  function toggleKelas(id: string) {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))
  }

  async function submitCreate() {
    if (!user?.id || !name.trim()) return
    if (kind === 'campuran' && moduleIds.length === 0) return
    setSaving(true)
    try {
      await createSession({
        name: name.trim(),
        kind,
        moduleIds: kind === 'campuran' ? moduleIds : [],
        classIds: semuaKelas ? [] : classIds,
        openFrom: openFrom ? new Date(openFrom).toISOString() : null,
        openUntil: openUntil ? new Date(openUntil).toISOString() : null,
        shuffle,
        singleAttempt,
        dosenId: user.id,
      })
      await invalidate()
      showToast('Sesi tes dibuat')
      setModalOpen(false)
    } catch (e) {
      console.warn('[TesKhusus] createSession gagal:', e)
      showToast('Gagal membuat sesi')
    } finally {
      setSaving(false)
    }
  }

  async function toggleOpen(s: TestSession) {
    try {
      await setSessionOpen(s.id, !s.is_open)
      await invalidate()
      showToast(s.is_open ? 'Sesi ditutup' : 'Sesi dibuka lagi')
    } catch {
      showToast('Gagal mengubah status sesi')
    }
  }

  // == Panel hasil ==
  const [hasilSession, setHasilSession] = useState<TestSession | null>(null)
  const { data: hasil = [], isLoading: hasilLoading } = useQuery({
    queryKey: ['session-results', hasilSession?.id],
    queryFn: () => fetchSessionResults(hasilSession!.id),
    enabled: hasilSession != null,
  })
  const rataRata = hasil.length ? Math.round(hasil.reduce((s, h) => s + h.score, 0) / hasil.length) : null

  function unduhHasilCsv() {
    if (!hasilSession) return
    let csv = 'Nama,Skor,Waktu\n'
    hasil.forEach((h) => {
      csv += `"${h.full_name.replace(/"/g, '""')}",${h.score},${new Date(h.attempted_at).toLocaleString('id-ID')}\n`
    })
    downloadCsv(`hasil-${hasilSession.code}.csv`, csv)
  }

  function namaKelas(ids: string[]): string {
    if (ids.length === 0) return 'Semua kelas'
    return ids
      .map((id) => {
        const k = kelasList.find((k) => k.id === id)
        return k ? labelKelas(k, kelasList) : '-'
      })
      .join(', ')
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <Link to="/asesmen" className="text-brown-3 text-sm mb-4 inline-block inline-flex items-center min-h-11">
          ← Hasil asesmen
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h1 className="font-display text-2xl font-bold text-brown">Tes khusus</h1>
          <button onClick={openCreateModal} className="btn btn-primary">
            + Buat sesi tes
          </button>
        </div>
        <p className="text-brown-3 text-sm mb-5">
          Hanya tes khusus yang memakai kode. Pre-test dan tes formatif tanpa kode.
        </p>

        <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Nama</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Kode</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Kelas</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Waktu</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Status</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-brown-3 w-56">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-brown-3 text-sm">
                      Memuat…
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada sesi tes. Buat sesi pertama.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="row-divider">
                      <td className="px-3 py-2.5 text-brown font-medium">{s.name}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-brown tracking-wider">{s.code}</td>
                      <td className="px-3 py-2.5 text-brown-2">{namaKelas(s.class_ids)}</td>
                      <td className="px-3 py-2.5 text-brown-3 text-xs whitespace-nowrap">
                        {formatWaktu(s.open_from, s.open_until)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={
                            s.is_open
                              ? { background: 'var(--success-soft)', color: 'var(--success)' }
                              : { background: 'var(--border2)', color: 'var(--brown2)' }
                          }
                        >
                          {s.is_open ? 'Dibuka' : 'Ditutup'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => void toggleOpen(s)}
                            aria-label={s.is_open ? 'Tutup sesi' : 'Buka lagi'}
                            title={s.is_open ? 'Tutup sesi' : 'Buka lagi'}
                            className="btn btn-secondary whitespace-nowrap"
                          >
                            <IconLock size={13} /> <span className="hidden sm:inline">{s.is_open ? 'Tutup sesi' : 'Buka lagi'}</span>
                          </button>
                          <button
                            onClick={() => setHasilSession(s)}
                            aria-label="Lihat hasil"
                            title="Lihat hasil"
                            className="btn btn-secondary whitespace-nowrap"
                          >
                            <IconChart size={13} /> <span className="hidden sm:inline">Lihat hasil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal buat sesi tes */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[520px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">Buat sesi tes</h3>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Nama sesi
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Post-test Kelas A - 20 Sep"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>

            <div className="mb-3">
              <span className="text-xs font-semibold text-brown-2 block mb-1.5">Sumber soal</span>
              <div className="mb-2">
                <PillGroup
                  options={[
                    { value: 'post', label: 'Bank soal post-test' },
                    { value: 'campuran', label: 'Gabungan soal formatif' },
                  ]}
                  value={kind}
                  onChange={(v) => setKind(v as SessionKind)}
                  ariaLabel="Sumber soal"
                />
              </div>
              {kind === 'campuran' && (
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto border rounded-lg p-2" style={BORDER}>
                  {modules.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                      <input
                        type="checkbox"
                        checked={moduleIds.includes(m.id)}
                        onChange={() => toggleModule(m.id)}
                        className="w-4 h-4 accent-terra"
                      />
                      {m.title}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3">
              <span className="text-xs font-semibold text-brown-2 block mb-1.5">Kelas</span>
              <label className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                <input
                  type="checkbox"
                  checked={semuaKelas}
                  onChange={(e) => setSemuaKelas(e.target.checked)}
                  className="w-4 h-4 accent-terra"
                />
                Semua kelas
              </label>
              {!semuaKelas && (
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border rounded-lg p-2" style={BORDER}>
                  {tahunUnik(kelasList).map((tahun) => (
                    <div key={tahun}>
                      <div className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-1">{tahun}</div>
                      <div className="flex flex-col gap-1.5">
                        {kelasList
                          .filter((k) => k.angkatan === tahun)
                          .map((k) => (
                            <label key={k.id} className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                              <input
                                type="checkbox"
                                checked={classIds.includes(k.id)}
                                onChange={() => toggleKelas(k.id)}
                                className="w-4 h-4 accent-terra"
                              />
                              {labelKelas(k, kelasList)}
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Dari
                <input
                  type="datetime-local"
                  value={openFrom}
                  onChange={(e) => setOpenFrom(e.target.value)}
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Sampai
                <input
                  type="datetime-local"
                  value={openUntil}
                  onChange={(e) => setOpenUntil(e.target.value)}
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
            </div>

            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="w-4 h-4 accent-terra" />
                Acak soal
              </label>
              <label className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                <input
                  type="checkbox"
                  checked={singleAttempt}
                  onChange={(e) => setSingleAttempt(e.target.checked)}
                  className="w-4 h-4 accent-terra"
                />
                Sekali kerja
              </label>
            </div>

            <div className="mb-5 text-center p-4 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <div className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-1.5">Kode sesi</div>
              <div className="font-mono text-2xl font-bold text-brown tracking-[0.3em] mb-2">{previewCode}</div>
              <button
                onClick={() => setPreviewCode(generateCode())}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--terra-d)' }}
              >
                Buat ulang
              </button>
            </div>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Batal
              </button>
              <button
                onClick={() => void submitCreate()}
                disabled={saving || !name.trim() || (kind === 'campuran' && moduleIds.length === 0)}
                className="btn btn-primary min-w-[7.5rem]"
              >
                {saving ? 'Menyimpan…' : 'Buat sesi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel hasil per sesi */}
      {hasilSession && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHasilSession(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[560px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg font-semibold text-brown">Hasil - {hasilSession.name}</h3>
              <button onClick={() => setHasilSession(null)} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-3">
                ×
              </button>
            </div>
            <p className="text-sm text-brown-3 mb-4">
              {hasilLoading ? 'Memuat…' : `${hasil.length} pengerjaan · rata-rata ${rataRata ?? '-'}`}
            </p>

            <div className="border rounded-xl overflow-hidden mb-4" style={BORDER}>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-bg3">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3">Nama</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3">Skor</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {hasil.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-brown-3 text-sm">
                        Belum ada yang mengerjakan.
                      </td>
                    </tr>
                  ) : (
                    hasil.map((h) => (
                      <tr key={h.user_id} className="row-divider">
                        <td className="px-3 py-2 text-brown">{h.full_name}</td>
                        <td className="px-3 py-2 font-semibold text-brown">{h.score}</td>
                        <td className="px-3 py-2 text-brown-3 text-xs">{new Date(h.attempted_at).toLocaleString('id-ID')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={unduhHasilCsv} disabled={hasil.length === 0} className="btn btn-secondary">
              Unduh CSV
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[800] px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 8px 24px color-mix(in srgb, var(--shadow-color) 25%, transparent)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

// ════════════════════════════════════════════
//  Mahasiswa - masukkan kode, kerjakan
// ════════════════════════════════════════════

// shuffle=false: susun AcakSoalResult tanpa mengacak, supaya SoalRunner (yang
// hanya menerima bentuk sudah-diacak) tetap bisa dipakai apa adanya.
function urutanTanpaAcak(soal: KuisSoal[]): AcakSoalResult {
  const urut: AcakUrutSoal[] = []
  const tampil: SoalTampil[] = []
  for (const s of soal) {
    urut.push({ question_id: s.id, option_order: s.options.map((_, i) => i) })
    tampil.push({ id: s.id, question: s.question, options: s.options, kunciTampil: s.answer_idx })
  }
  return { urut, tampil }
}

function MahasiswaTesKhusus() {
  const { code: codeParam } = useParams()
  const [kodeInput, setKodeInput] = useState(codeParam ?? '')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [session, setSession] = useState<VerifiedSession | null>(null)
  const [existingScore, setExistingScore] = useState<number | null>(null)

  const [acak, setAcak] = useState<AcakSoalResult | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [hasilBaru, setHasilBaru] = useState<number | null>(null)

  const { data: soal = [] } = useQuery({
    queryKey: ['test-session-soal', session?.session_id],
    queryFn: async () => {
      if (!session) return []
      if (session.kind === 'post') return fetchBankSoal('post')
      const lists = await Promise.all(session.module_ids.map((id) => fetchBankSoal('formatif', id)))
      return lists.flat()
    },
    enabled: session != null,
  })

  const { data: preAttempts = [] } = useQuery({
    queryKey: ['attempts-by-kind', 'pre'],
    queryFn: () => fetchAttemptsByKind('pre'),
    enabled: session?.kind === 'post' && hasilBaru != null,
  })

  async function doVerify(kode: string) {
    const trimmed = kode.trim()
    if (!trimmed) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const result = await verifyTestCode(trimmed)
      if (!result) {
        setVerifyError('Kode tidak dikenal atau sesi sudah ditutup')
        return
      }
      setSession(result)
      if (result.single_attempt) {
        const existing = await fetchMyAttemptForSession(result.session_id)
        if (existing) setExistingScore(existing.score)
      }
    } finally {
      setVerifying(false)
    }
  }

  // Route /asesmen/tes/:code mengisi kode otomatis (spec §8) - sekalian
  // langsung diverifikasi, karena kode di URL biasanya dibagikan lewat
  // tautan yang dimaksud untuk langsung dibuka.
  useEffect(() => {
    if (codeParam) void doVerify(codeParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam])

  function mulai() {
    setAcak(session?.shuffle ? acakSoal(soal) : urutanTanpaAcak(soal))
    setCurrentQ(0)
    setJawaban({})
    setSubmitted({})
  }

  async function handleFinish() {
    if (!acak || !session) return
    const jawabanTampil = acak.tampil.map((_, i) => jawaban[i] ?? -1)
    const hasilNilai = nilai(acak.tampil, jawabanTampil)
    setSaving(true)
    try {
      await saveQuizAttempt(null, {
        score: hasilNilai.score,
        answers: jawabanTampil,
        kind: session.kind === 'post' ? 'post' : 'formatif',
        questionOrder: acak.urut,
        sessionId: session.session_id,
      })
    } catch (e) {
      console.warn('[tes-khusus] saveQuizAttempt gagal:', e)
    }
    setSaving(false)
    setAcak(null)
    setHasilBaru(hasilNilai.score)
  }

  const pre = preAttempts[preAttempts.length - 1]

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <h1 className="font-display text-xl font-bold text-brown mb-4">Tes khusus</h1>

        {!session ? (
          <div className="bg-ivory border rounded-2xl p-6" style={BORDER}>
            <div className="flex items-center gap-2 mb-3 text-brown-2">
              <IconTarget size={18} />
              <h2 className="font-semibold">Masukkan kode tes khusus</h2>
            </div>
            <input
              value={kodeInput}
              onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && void doVerify(kodeInput)}
              placeholder="mis. 7K3MQ2"
              maxLength={6}
              className="h-12 w-full rounded-[var(--radius-control)] border px-3 text-lg font-mono tracking-[0.3em] text-center text-brown mb-3"
              style={BORDER}
            />
            {verifyError && <p className="text-sm text-red mb-3">{verifyError}</p>}
            <button onClick={() => void doVerify(kodeInput)} disabled={verifying || !kodeInput.trim()} className="btn btn-primary w-full">
              {verifying ? 'Memeriksa…' : 'Masuk'}
            </button>
          </div>
        ) : existingScore != null ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-1">Kamu sudah mengerjakan sesi ini.</p>
            <p className="text-brown font-semibold text-lg">Skor {existingScore}</p>
          </div>
        ) : hasilBaru != null ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-1">Skor kamu: <strong>{hasilBaru}</strong></p>
            {session.kind === 'post' &&
              (!pre ? (
                <p className="text-sm text-brown-3">Belum ada skor pre-test, peningkatan skor belum bisa dihitung.</p>
              ) : pre.score >= 100 ? (
                <p className="text-sm text-brown-3">Peningkatan skor dari pre-test: -</p>
              ) : (
                (() => {
                  const { gain, category } = computeNGain(pre.score, hasilBaru, 100)
                  return (
                    <p className="text-sm text-brown-3">
                      Peningkatan skor dari pre-test: {gain.toFixed(2)} ({category})
                    </p>
                  )
                })()
              ))}
          </div>
        ) : acak ? (
          <SoalRunner
            total={acak.tampil.length}
            q={acak.tampil[currentQ]}
            currentQ={currentQ}
            selected={jawaban[currentQ] ?? -1}
            isSubmitted={submitted[currentQ] ?? false}
            saving={saving}
            finishLabel="Kirim ✓"
            onSelect={(i) => {
              if (submitted[currentQ]) return
              setJawaban((a) => ({ ...a, [currentQ]: i }))
              setSubmitted((s) => ({ ...s, [currentQ]: true }))
            }}
            onPrev={() => setCurrentQ((c) => Math.max(0, c - 1))}
            onNext={() => setCurrentQ((c) => Math.min(acak.tampil.length - 1, c + 1))}
            onFinish={handleFinish}
          />
        ) : (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <h2 className="font-display text-lg font-bold text-brown mb-2">{session.name}</h2>
            <p className="text-sm text-brown-3 mb-1">{soal.length} soal pilihan ganda</p>
            <p className="text-sm text-brown-3 mb-5">
              {session.shuffle ? 'Soal diacak' : 'Urutan soal tetap'} · {session.single_attempt ? 'Sekali kerja' : 'Boleh diulang'}
            </p>
            <button onClick={mulai} disabled={soal.length === 0} className="btn btn-primary">
              Mulai
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
