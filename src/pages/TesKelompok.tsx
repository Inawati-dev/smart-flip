import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchBankSoal, type KuisSoal } from '../lib/kuisSoal'
import { acakSoal, nilai, type AcakSoalResult, type AcakUrutSoal, type SoalTampil } from '../lib/acak'
import { downloadCsv } from '../lib/analitik'
import {
  fetchGroupSessions,
  createGroupSession,
  setGroupSessionOpen,
  deleteGroupSession,
  fetchGroupResults,
  verifyGroupCode,
  joinGroup,
  fetchTeamView,
  submitGroupAttempt,
  kelompokkanHasil,
  rataKelompok,
  UKURAN_KELOMPOK_BAWAAN,
  type GroupSessionWithTeams,
  type VerifiedGroup,
} from '../lib/tesKelompok'
import { Layout } from '../components/Layout'
import { SoalRunner } from '../components/SoalRunner'
import { IconUsers, IconChart, IconLock, IconTrash, IconLink } from '../components/icons'

// Tes kelompok (antrean #65 opsi A, keputusan Johan 16 Sep 2026). Dosen buat
// sesi berisi N kelompok berkode; mahasiswa masuk kelompok lewat kode, tiap
// anggota mengerjakan soal kind='kelompok' sendiri, skor per orang +
// rata-rata kelompok. Pola halaman ditiru dari TesKhusus.tsx.
const BORDER = { borderColor: 'var(--border)' } as const

export function TesKelompok() {
  const { role } = useAuth()
  if (role === 'dosen') return <Navigate to="/asesmen/bank?tab=kelompok" replace />
  return <MahasiswaTesKelompok />
}

export default TesKelompok

// ════════════════════════════════════════════
//  Dosen - kelola sesi
// ════════════════════════════════════════════

function formatTanggal(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DosenTesKelompokPanel() {
  const { user } = useAuth()
  const { courseId } = useCourse()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['group-sessions', courseId],
    queryFn: () => fetchGroupSessions(courseId),
    enabled: isSupabaseConfigured,
  })
  const { data: soalKelompok = [] } = useQuery({
    queryKey: ['bank-soal', 'kelompok', null, courseId],
    queryFn: () => fetchBankSoal('kelompok', undefined, courseId),
    enabled: isSupabaseConfigured,
  })

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function invalidateSessions() {
    await queryClient.invalidateQueries({ queryKey: ['group-sessions', courseId] })
  }

  // == Modal buat sesi ==
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [groupCount, setGroupCount] = useState(5)
  const [groupSize, setGroupSize] = useState(UKURAN_KELOMPOK_BAWAAN)
  const [shuffle, setShuffle] = useState(true)
  const [saving, setSaving] = useState(false)

  function openCreateModal() {
    setName('')
    setGroupCount(5)
    setGroupSize(UKURAN_KELOMPOK_BAWAAN)
    setShuffle(true)
    setModalOpen(true)
  }

  async function submitCreate() {
    if (!user?.id || !name.trim() || soalKelompok.length === 0) return
    setSaving(true)
    try {
      await createGroupSession({ name: name.trim(), groupCount, groupSize, shuffle, dosenId: user.id, courseId })
      await invalidateSessions()
      showToast('Sesi tes kelompok dibuat')
      setModalOpen(false)
    } catch (e) {
      console.warn('[TesKelompok] createGroupSession gagal:', e)
      showToast('Gagal membuat sesi')
    } finally {
      setSaving(false)
    }
  }

  async function toggleOpen(s: GroupSessionWithTeams) {
    try {
      await setGroupSessionOpen(s.id, !s.is_open)
      await invalidateSessions()
      showToast(s.is_open ? 'Sesi ditutup' : 'Sesi dibuka lagi')
    } catch {
      showToast('Gagal mengubah status sesi')
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast('Kode disalin')
    } catch {
      showToast('Gagal menyalin: salin manual dari layar.')
    }
  }

  // == Hapus sesi ==
  const [deleteTarget, setDeleteTarget] = useState<GroupSessionWithTeams | null>(null)
  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteGroupSession(deleteTarget.id)
      await invalidateSessions()
      showToast('Sesi dihapus')
    } catch {
      showToast('Gagal menghapus sesi')
    } finally {
      setDeleteTarget(null)
    }
  }

  // == Panel hasil (?sesi=<id>) ==
  const hasilSessionId = searchParams.get('sesi')
  const hasilSession = sessions.find((s) => s.id === hasilSessionId) ?? null
  const { data: hasilRows = [], isLoading: hasilLoading } = useQuery({
    queryKey: ['group-results', hasilSessionId],
    queryFn: () => fetchGroupResults(hasilSessionId as string),
    enabled: hasilSessionId != null,
  })
  const kelompokHasil = useMemo(() => kelompokkanHasil(hasilRows), [hasilRows])

  function bukaHasil(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set('sesi', id)
    setSearchParams(next)
  }
  function tutupHasil() {
    const next = new URLSearchParams(searchParams)
    next.delete('sesi')
    setSearchParams(next)
  }

  function unduhCsv() {
    if (!hasilSession) return
    let csv = 'Kelompok,Kode,Nama,Skor\n'
    kelompokHasil.forEach((g) => {
      if (g.anggota.length === 0) {
        csv += `${g.number},"${g.code}","",\n`
      } else {
        g.anggota.forEach((a) => {
          csv += `${g.number},"${g.code}","${(a.full_name ?? '').replace(/"/g, '""')}",${a.score ?? ''}\n`
        })
      }
    })
    downloadCsv(`hasil-kelompok-${hasilSession.name}.csv`, csv)
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <p className="text-brown-3 text-sm">
          Buat sesi, bagikan kode tiap kelompok, lihat skor per orang dan rata-rata kelompok.
        </p>
        <button onClick={openCreateModal} className="btn btn-primary btn-sm">
          + Buat sesi
        </button>
      </div>
      <Link to="/asesmen/bank?tab=soal&jenis=kelompok" className="text-xs inline-block mb-5" style={{ color: 'var(--terra-d)' }}>
        Kelola soal
      </Link>

        {!isSupabaseConfigured ? (
          <div className="bg-ivory rounded-2xl border p-5 text-sm text-brown-3" style={BORDER}>
            Butuh Supabase untuk mengelola tes kelompok.
          </div>
        ) : isLoading ? (
          <p className="text-center py-8 text-brown-3 text-sm">Memuat…</p>
        ) : sessions.length === 0 ? (
          <div className="bg-ivory rounded-2xl border p-8 text-center text-brown-3 text-sm" style={BORDER}>
            Belum ada sesi tes kelompok. Buat sesi pertama.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sessions.map((s) => (
              <div key={s.id} className="bg-ivory rounded-2xl border p-4 md:p-5" style={BORDER}>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <h3 className="font-display text-base font-semibold text-brown">{s.name}</h3>
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
                </div>
                <p className="text-xs text-brown-3 mb-3">
                  {s.teams.length} kelompok · maks {s.group_size} orang · dibuat {formatTanggal(s.created_at)}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                  {s.teams.map((t) => (
                    <div key={t.id} className="rounded-xl border p-2.5 text-center" style={BORDER}>
                      <div className="text-[11px] font-semibold text-brown-3 mb-1.5">Kelompok {t.number}</div>
                      <button
                        onClick={() => void copyCode(t.code)}
                        title="Salin kode kelompok"
                        aria-label={`Salin kode kelompok ${t.number}: ${t.code}`}
                        className="btn btn-secondary w-full font-mono justify-center"
                      >
                        {t.code} <IconLink size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-3 border-t" style={BORDER}>
                  <button onClick={() => bukaHasil(s.id)} title="Lihat hasil" className="btn btn-secondary whitespace-nowrap">
                    <IconChart size={13} /> <span className="hidden sm:inline">Lihat hasil</span>
                  </button>
                  <button
                    onClick={() => void toggleOpen(s)}
                    title={s.is_open ? 'Tutup sesi' : 'Buka lagi'}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    <IconLock size={13} /> <span className="hidden sm:inline">{s.is_open ? 'Tutup sesi' : 'Buka lagi'}</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    aria-label={`Hapus sesi ${s.name}`}
                    title="Hapus sesi"
                    className="btn btn-danger btn-icon flex-shrink-0"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Modal buat sesi */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[440px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="font-display text-lg font-semibold text-brown mb-4">Buat sesi tes kelompok</h3>

            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Nama sesi
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Tes kelompok - Topik 3"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Jumlah kelompok
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={groupCount}
                  onChange={(e) => setGroupCount(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Ukuran kelompok
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Math.min(20, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-brown-2 min-h-11 mb-2">
              <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="w-4 h-4 accent-terra" />
              Acak urutan soal
            </label>

            <p className="text-xs text-brown-3 mb-4">
              {soalKelompok.length} soal tes kelompok tersedia di bank soal.
              {soalKelompok.length === 0 && (
                <span className="block mt-1" style={{ color: 'var(--danger)' }}>
                  Belum ada soal tes kelompok di bank soal.
                </span>
              )}
            </p>

            <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
              <button onClick={() => setModalOpen(false)} className="btn btn-secondary">
                Batal
              </button>
              <button
                onClick={() => void submitCreate()}
                disabled={saving || !name.trim() || soalKelompok.length === 0}
                className="btn btn-primary min-w-[7.5rem]"
              >
                {saving ? 'Menyimpan…' : 'Buat sesi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus sesi */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[384px] max-h-[90vh] overflow-y-auto text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus sesi "{deleteTarget.name}"?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">Sesi dan semua kelompoknya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} className="btn btn-danger flex-1">
                Ya, Hapus
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
            if (e.target === e.currentTarget) tutupHasil()
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[600px] max-h-[90vh] overflow-y-auto my-8"
            style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-brown">Hasil - {hasilSession.name}</h3>
              <button onClick={tutupHasil} aria-label="Tutup" className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-3">
                ×
              </button>
            </div>

            {hasilLoading ? (
              <p className="text-center py-6 text-brown-3 text-sm">Memuat…</p>
            ) : (
              <>
                {kelompokHasil.map((g) => (
                  <div key={g.number} className="mb-4">
                    <h4 className="text-sm font-semibold text-brown mb-2">
                      Kelompok {g.number} · {g.code} · {g.rata != null ? `rata-rata ${g.rata}` : 'belum ada skor'}
                    </h4>
                    {g.anggota.length === 0 ? (
                      <p className="text-sm text-brown-3">Belum ada yang gabung.</p>
                    ) : (
                      <div className="border rounded-xl overflow-hidden" style={BORDER}>
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-bg3">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3">Nama</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3">Skor</th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3">Waktu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.anggota.map((a) => (
                              <tr key={a.user_id} className="row-divider">
                                <td className="px-3 py-2 text-brown">{a.full_name}</td>
                                {a.score != null && a.attempted_at ? (
                                  <>
                                    <td className="px-3 py-2 font-semibold text-brown">{a.score}</td>
                                    <td className="px-3 py-2 text-brown-3 text-xs">{new Date(a.attempted_at).toLocaleString('id-ID')}</td>
                                  </>
                                ) : (
                                  <td colSpan={2} className="px-3 py-2 text-brown-3 text-xs">
                                    Belum mengerjakan
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}

                <button onClick={unduhCsv} disabled={hasilRows.length === 0} className="btn btn-secondary mt-2">
                  Unduh CSV
                </button>
              </>
            )}
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
    </>
  )
}

// ════════════════════════════════════════════
//  Mahasiswa - masukkan kode, gabung, kerjakan
// ════════════════════════════════════════════

// shuffle=false: susun AcakSoalResult tanpa mengacak, sama seperti
// urutanTanpaAcak di TesKhusus.tsx (SoalRunner hanya menerima bentuk
// sudah-diacak, jadi urutan asli tetap dibungkus bentuk yang sama).
function urutanTanpaAcak(soal: KuisSoal[]): AcakSoalResult {
  const urut: AcakUrutSoal[] = []
  const tampil: SoalTampil[] = []
  for (const s of soal) {
    urut.push({ question_id: s.id, option_order: s.options.map((_, i) => i) })
    tampil.push({ id: s.id, question: s.question, options: s.options, kunciTampil: s.answer_idx })
  }
  return { urut, tampil }
}

function MahasiswaTesKelompok() {
  const { user } = useAuth()
  const { courseId } = useCourse()
  const queryClient = useQueryClient()
  const { code: codeParam } = useParams()
  const [kodeInput, setKodeInput] = useState(codeParam ?? '')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [group, setGroup] = useState<VerifiedGroup | null>(null)
  const [joined, setJoined] = useState(false)
  const [done, setDone] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [justScore, setJustScore] = useState<number | null>(null)

  const [acak, setAcak] = useState<AcakSoalResult | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [jawaban, setJawaban] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({})
  const [saving, setSaving] = useState(false)

  const { data: soal = [] } = useQuery({
    queryKey: ['group-soal', group?.team_id, courseId],
    queryFn: () => fetchBankSoal('kelompok', undefined, courseId),
    enabled: group != null && joined && !done,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['group-team-view', group?.team_id],
    queryFn: () => fetchTeamView(group!.team_id),
    enabled: group != null && (joined || done),
  })

  async function doVerify(kode: string) {
    const trimmed = kode.trim()
    if (!trimmed) return
    setVerifying(true)
    setVerifyError(null)
    try {
      const result = await verifyGroupCode(trimmed)
      if (!result) {
        setVerifyError('Kode tidak dikenal atau sesi sudah ditutup')
        return
      }
      setGroup(result)
      setJoined(result.already_member)
      setDone(result.already_done)
    } catch {
      setVerifyError('Kode tidak dikenal atau sesi sudah ditutup')
    } finally {
      setVerifying(false)
    }
  }

  // Route /asesmen/kelompok/:code mengisi kode otomatis dan langsung verifikasi
  // (sama seperti TesKhusus - kode di URL dibagikan lewat tautan langsung).
  useEffect(() => {
    if (codeParam) void doVerify(codeParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam])

  function doJoin() {
    setJoining(true)
    setJoinError(null)
    joinGroup(kodeInput || codeParam || '')
      .then(() => setJoined(true))
      .catch((e: unknown) => setJoinError(e instanceof Error ? e.message : 'Gagal gabung kelompok'))
      .finally(() => setJoining(false))
  }

  function mulai() {
    setAcak(group?.shuffle ? acakSoal(soal) : urutanTanpaAcak(soal))
    setCurrentQ(0)
    setJawaban({})
    setSubmitted({})
  }

  async function handleFinish() {
    if (!acak || !group) return
    const jawabanTampil = acak.tampil.map((_, i) => jawaban[i] ?? -1)
    const hasilNilai = nilai(acak.tampil, jawabanTampil)
    setSaving(true)
    try {
      await submitGroupAttempt(group.team_id, hasilNilai.score, jawabanTampil)
      await queryClient.invalidateQueries({ queryKey: ['group-team-view', group.team_id] })
    } catch (e) {
      console.warn('[tes-kelompok] submitGroupAttempt gagal:', e)
    }
    setSaving(false)
    setAcak(null)
    setJustScore(hasilNilai.score)
    setDone(true)
  }

  const myMember = members.find((m) => m.user_id === user?.id)
  const skorTampil = justScore ?? myMember?.score ?? null
  const rata = rataKelompok(members)

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-xl mx-auto">
        <h1 className="font-display text-xl font-bold text-brown mb-4">Tes kelompok</h1>

        {!isSupabaseConfigured ? (
          <div className="bg-ivory border rounded-2xl p-6 text-sm text-brown-3 text-center" style={BORDER}>
            Tes kelompok butuh koneksi Supabase.
          </div>
        ) : !group ? (
          <div className="bg-ivory border rounded-2xl p-6" style={BORDER}>
            <div className="flex items-center gap-2 mb-3 text-brown-2">
              <IconUsers size={18} />
              <h2 className="font-semibold">Masukkan kode kelompok</h2>
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
        ) : done ? (
          <div className="bg-ivory border rounded-xl p-7 text-center" style={BORDER}>
            <p className="text-brown-2 mb-1">
              Skor kamu: <strong>{skorTampil ?? '-'}</strong>
            </p>
            <div className="text-left mt-4 flex flex-col gap-1.5">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between text-sm text-brown-2 py-1 row-divider">
                  <span>{m.full_name}</span>
                  <span className="font-semibold text-brown">{m.score ?? 'Belum'}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-brown-3 mt-3">Rata-rata kelompok: {rata ?? '-'}</p>
            <Link to="/asesmen" className="btn btn-secondary mt-4 inline-block">
              Kembali ke Asesmen
            </Link>
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
          <div className="bg-ivory border rounded-xl p-7" style={BORDER}>
            <h2 className="font-display text-lg font-bold text-brown mb-1 text-center">{group.name}</h2>
            <p className="text-sm text-brown-3 mb-5 text-center">
              Kelompok {group.team_number} · {joined ? members.length : group.member_count}/{group.group_size} anggota
            </p>

            {!joined ? (
              <>
                <button onClick={doJoin} disabled={joining} className="btn btn-primary w-full">
                  {joining ? 'Menggabungkan…' : 'Gabung kelompok'}
                </button>
                {joinError && <p className="text-sm text-red mt-3">{joinError}</p>}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5 mb-5">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between text-sm text-brown-2 py-1.5 row-divider">
                      <span>{m.full_name}</span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={
                          m.score != null
                            ? { background: 'var(--success-soft)', color: 'var(--success)' }
                            : { background: 'var(--border2)', color: 'var(--brown2)' }
                        }
                      >
                        {m.score != null ? 'Sudah' : 'Belum'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-brown-3 mb-4 text-center">{soal.length} soal pilihan ganda</p>
                <button onClick={mulai} disabled={soal.length === 0} className="btn btn-primary w-full">
                  Mulai
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
