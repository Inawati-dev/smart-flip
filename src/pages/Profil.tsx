import { useEffect, useState, type ReactElement, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress, useTotalTimeSpent } from '../hooks/useProgress'
import { useAllQuizAttempts } from '../hooks/useQuizAttempts'
import { useVarkResult } from '../hooks/useVarkResult'
import { useProfilExtra } from '../hooks/useProfil'
import { useStudentStats, useRecentActivity } from '../hooks/useAnalitik'
import { computeStatSummary } from '../lib/analitik'
import { timeAgo } from '../lib/forum'
import { saveProfilExtra } from '../lib/profil'
import { resetOnboarding } from '../lib/onboarding'
import { printLaporanPdf } from '../lib/reportPdf'
import { TOTAL_MODULES } from '../lib/progress'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { LogoutModal } from '../components/LogoutModal'
import { Select } from '../components/Select'
import {
  IconChart,
  IconHeadphones,
  IconEdit,
  IconGear,
  IconTarget,
  IconDocument,
  IconChat,
  IconUser,
  IconGraduationCap,
  IconPrinter,
  IconBook,
  IconUsers,
  IconCheck,
  IconClock,
  IconTrophy,
  IconTrash,
} from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

type IconComp = (props: { size?: number }) => ReactElement

// ── VARK reference data — ported verbatim from legacy/profil.html ──
const VARK_LABELS: Record<string, string> = {
  V: 'Visual Learner',
  A: 'Auditory Learner',
  R: 'Read/Write Learner',
  K: 'Kinesthetic Learner',
}
const VARK_ICONS: Record<string, IconComp> = { V: IconChart, A: IconHeadphones, R: IconEdit, K: IconGear }
const VARK_COLORS: Record<string, string> = {
  V: '#8FA287',
  A: '#D4A373',
  R: '#4A7EA0',
  K: '#8B6BA0',
}
const VARK_NAMES: Record<string, string> = {
  V: 'Visual',
  A: 'Auditory',
  R: 'Read/Write',
  K: 'Kinestetik',
}
const VARK_DESCS: Record<string, string> = {
  V: 'Kamu belajar paling efektif melalui visual — diagram, grafik, warna, dan ilustrasi sangat membantumu memahami dan mengingat informasi baru.',
  A: 'Kamu belajar paling efektif melalui pendengaran dan diskusi. Mendengarkan penjelasan langsung dan berdiskusi dengan teman mempercepat pemahamanmu.',
  R: 'Kamu belajar paling efektif melalui teks. Membaca dan menulis adalah kekuatanmu — merangkum materi dan membaca modul secara mendalam sangat cocok bagimu.',
  K: 'Kamu belajar paling efektif melalui praktik langsung. Mengerjakan soal latihan, simulasi, dan studi kasus nyata membuat pemahaman bertahan jauh lebih lama.',
}

const JABATAN_OPTIONS = ['Asisten Ahli', 'Lektor', 'Lektor Kepala', 'Profesor']

const ACTIVITY_BADGE: Record<string, { bg: string; color: string }> = {
  draf: { bg: '#FAE8A0', color: '#705010' },
  kuis: { bg: '#C0DD97', color: '#27500A' },
  forum: { bg: 'rgba(143,162,135,.2)', color: 'var(--sage-d)' },
  modul: { bg: 'rgba(74,126,160,.15)', color: '#2E5A78' },
}

const ACTIVITY_ICON: Record<string, IconComp> = {
  draf: IconDocument,
  kuis: IconTarget,
  forum: IconChat,
  modul: IconBook,
}

function initialsOf(name: string): string {
  return (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatWaktu(totalSec: number): string {
  const jam = Math.floor(totalSec / 3600)
  const mnt = Math.floor((totalSec % 3600) / 60)
  return jam > 0 ? `${jam} jam ${mnt} mnt` : `${mnt} mnt`
}

function scorePillStyle(pct: number): { bg: string; color: string } {
  if (pct >= 80) return { bg: '#C0DD97', color: '#27500A' }
  if (pct >= 60) return { bg: '#FAE8A0', color: '#705010' }
  return { bg: '#F7C6C0', color: '#B03020' }
}

export function Profil() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, profile, role, loading: authLoading, refreshProfile } = useAuth()
  const isDosen = role === 'dosen'

  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { data: allAttempts = [] } = useAllQuizAttempts()
  const { data: totalTimeSpent = 0 } = useTotalTimeSpent()
  const { data: vark } = useVarkResult()
  const { data: extra } = useProfilExtra()
  const { data: dosenStudents } = useStudentStats()
  const { data: recentActivity } = useRecentActivity(5)

  // Local overrides so the hero card reflects a save immediately, without
  // waiting on AuthContext's own session-driven refresh — mirrors legacy's
  // `currentProfil` variable mutation in profil.html/profil-dos.html.
  const [namaOverride, setNamaOverride] = useState<string | null>(null)
  const [nimOverride, setNimOverride] = useState<string | null>(null)
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null)
  const avatarUrl = avatarOverride ?? profile?.avatar_url ?? null

  const nama = namaOverride ?? profile?.full_name ?? extra?.nama ?? (isDosen ? 'Dosen' : 'Mahasiswa')
  const nimNidn = nimOverride ?? profile?.nim_nidn ?? extra?.nim ?? ''
  const email = user?.email ?? ''
  const prodi = extra?.prodi ?? ''
  const angkatan = extra?.angkatan ?? ''
  const jabatan = extra?.jabatan ?? 'Lektor Kepala'
  const fakultas = extra?.fakultas ?? ''

  const [editOpen, setEditOpen] = useState(false)
  const [formNama, setFormNama] = useState('')
  const [formNidn, setFormNidn] = useState('')
  const [formProdi, setFormProdi] = useState('')
  const [formAngkatan, setFormAngkatan] = useState('')
  const [formJabatan, setFormJabatan] = useState('Lektor Kepala')
  const [formFakultas, setFormFakultas] = useState('')
  const [formAvatar, setFormAvatar] = useState('')
  const [saving, setSaving] = useState(false)

  const MAX_AVATAR_BYTES = 2 * 1024 * 1024

  function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast('Ukuran gambar maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setFormAvatar(String(reader.result))
    reader.readAsDataURL(file)
  }

  const [toast, setToast] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [showProgress, setShowProgress] = useState(true)
  const [notifDraf, setNotifDraf] = useState(true)
  const [notifForum, setNotifForum] = useState(true)

  useEffect(() => {
    const pref = localStorage.getItem('sfp_pref_showprogress')
    setShowProgress(pref !== 'false')
    const draf = localStorage.getItem('sfp_dos_notif_draf')
    const forum = localStorage.getItem('sfp_dos_notif_forum')
    if (draf !== null) setNotifDraf(draf === 'true')
    if (forum !== null) setNotifForum(forum === 'true')
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function openEdit() {
    setFormNama(nama)
    setFormNidn(nimNidn)
    setFormProdi(prodi)
    setFormAngkatan(angkatan)
    setFormJabatan(jabatan)
    setFormFakultas(fakultas)
    setFormAvatar(avatarUrl ?? '')
    setEditOpen(true)
  }

  async function handleSave() {
    const trimmedNama = formNama.trim()
    if (!trimmedNama) {
      showToast('Nama tidak boleh kosong')
      return
    }
    setSaving(true)
    try {
      await saveProfilExtra({
        nama: trimmedNama,
        nim: isDosen ? formNidn.trim() : nimNidn,
        prodi: formProdi.trim(),
        angkatan: formAngkatan.trim(),
        jabatan: isDosen ? formJabatan : undefined,
        fakultas: isDosen ? formFakultas.trim() : undefined,
        avatarUrl: formAvatar,
      })
      setNamaOverride(trimmedNama)
      setAvatarOverride(formAvatar || null)
      if (isDosen) setNimOverride(formNidn.trim())
      await queryClient.invalidateQueries({ queryKey: ['profil'] })
      await refreshProfile()
      setEditOpen(false)
      showToast('Profil berhasil disimpan ✓')
    } finally {
      setSaving(false)
    }
  }

  function toggleShowProgress() {
    const next = !showProgress
    setShowProgress(next)
    localStorage.setItem('sfp_pref_showprogress', String(next))
    showToast(next ? 'Progress ditampilkan di dashboard' : 'Progress disembunyikan dari dashboard')
  }

  function toggleNotif(key: 'draf' | 'forum') {
    if (key === 'draf') {
      const next = !notifDraf
      setNotifDraf(next)
      localStorage.setItem('sfp_dos_notif_draf', String(next))
      showToast(next ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan')
    } else {
      const next = !notifForum
      setNotifForum(next)
      localStorage.setItem('sfp_dos_notif_forum', String(next))
      showToast(next ? 'Notifikasi diaktifkan' : 'Notifikasi dinonaktifkan')
    }
  }

  function resetDemoData() {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sfp_')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    setResetOpen(false)
    showToast('Data demo direset. Memuat ulang…')
    setTimeout(() => window.location.reload(), 1200)
  }

  async function doLogout() {
    if (role) resetOnboarding(role)
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches Layout.tsx's doLogout
    }
    navigate('/')
  }

  if (authLoading) {
    return (
      <Layout>
        <div className="p-8 text-brown-3">Memuat…</div>
      </Layout>
    )
  }

  // ── Mahasiswa stats (ported from legacy/profil.html renderStats/renderQuizHistory) ──
  const totalModules = modules.length || TOTAL_MODULES
  let modulSelesai = Object.values(progress).filter((p) => p.pct >= 100).length
  let totalSec = totalTimeSpent
  let totalKuis = allAttempts.length
  let avgScore = totalKuis
    ? Math.round(allAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / totalKuis)
    : 0
  let bestScore = 0
  let bestMod = 0
  allAttempts.forEach((a) => {
    if (a.score > bestScore) {
      bestScore = a.score
      bestMod = a.moduleId
    }
  })
  // Forum post count integration is deferred (no useForum-style aggregate exists
  // yet for "posts by this user across all modules") — see report.
  let forumCount = 0
  // Legacy demo fallback: when every real stat is still zero, show illustrative
  // numbers instead of an all-empty dashboard (ported from profil.html:1094-1103).
  if (modulSelesai === 0 && totalSec === 0 && totalKuis === 0) {
    modulSelesai = 3
    totalSec = 4320
    avgScore = 73
    bestScore = 100
    bestMod = 2
    totalKuis = 3
    forumCount = 2
  }

  const recentQuiz = allAttempts
    .slice()
    .sort((a, b) => {
      const at = a.completedAt ? new Date(a.completedAt).getTime() : 0
      const bt = b.completedAt ? new Date(b.completedAt).getTime() : 0
      return bt - at
    })
    .slice(0, 5)

  // ── Dosen stats (real Supabase aggregate, see lib/analitik.ts) ──
  const modulAktif = modules.filter((m) => m.is_active).length || totalModules
  const dosenSummary = computeStatSummary(dosenStudents ?? [], totalModules)

  function handleDownloadLaporan() {
    printLaporanPdf({
      nama,
      nimNidn,
      email,
      prodi,
      angkatan,
      totalModules,
      modulSelesai,
      waktuBelajar: formatWaktu(totalSec),
      totalKuis,
      avgScore,
      bestScore,
      bestModTitle: bestMod ? `Modul ${bestMod}` : '',
      varkDominant: vark?.dominant ? VARK_LABELS[vark.dominant] || vark.dominant : null,
      recentQuiz: recentQuiz.map((r) => ({
        moduleTitle: `Modul ${r.moduleId}`,
        score: r.score,
        completedAt: r.completedAt,
      })),
    })
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold text-brown">
            {isDosen ? 'Profil Dosen' : 'Profil Saya'}
          </h1>
          <p className="text-sm text-brown-3 mt-1">
            {isDosen
              ? 'Kelola data diri, statistik mengajar, dan pengaturan akun'
              : 'Kelola data diri, lihat gaya belajar VARK, dan statistik belajarmu'}
          </p>
        </div>

        {/* ── HERO CARD ── */}
        <div className="bg-ivory rounded-2xl border p-5 md:p-6 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={BORDER}>
          <div className="w-20 h-20 rounded-full bg-terra text-white flex items-center justify-center font-display text-3xl font-bold flex-shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={nama} className="w-full h-full object-cover" />
            ) : (
              initialsOf(nama)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-xl font-bold text-brown mb-1.5">{nama}</div>
            {/* Satu baris meta, bukan dua -- field yang belum diisi (mis. NIDN
                kosong) disembunyikan sepenuhnya, bukan tampil sebagai "—"
                yang kesannya belum selesai/rusak. */}
            <div className="text-sm text-brown-3 mb-3 leading-relaxed truncate">
              {nimNidn && <span>{isDosen ? 'NIDN' : 'NIM'} {nimNidn}</span>}
              {nimNidn && email && <span className="mx-1.5 opacity-40">·</span>}
              {email && <span>{email}</span>}
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 min-h-11 px-3.5 rounded-full text-xs font-semibold"
                style={
                  isDosen
                    ? { background: 'rgba(212,163,115,.15)', color: 'var(--terra-d)' }
                    : { background: 'rgba(143,162,135,.15)', color: 'var(--sage-d)' }
                }
              >
                {isDosen ? (
                  <span className="inline-flex items-center gap-1"><IconUser size={13} /> Dosen</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><IconGraduationCap size={13} /> Mahasiswa</span>
                )}
              </span>
              <button
                onClick={openEdit}
                className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2"
                style={BORDER}
              >
                <IconEdit size={16} /> Edit Profil
              </button>
            </div>
          </div>
        </div>

        {/* ── EDIT FORM (modal) ── */}
        {editOpen && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center p-4"
            style={{ background: 'rgba(62,54,46,.52)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditOpen(false)
            }}
          >
          <div
            className="bg-ivory rounded-2xl border-2 p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--terra)', boxShadow: '0 8px 40px rgba(62,54,46,.22)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="text-sm font-semibold text-brown mb-4 pb-2 border-b" style={BORDER}>
              {isDosen ? 'Edit Data Diri Dosen' : 'Edit Profil'}
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-terra text-white flex items-center justify-center font-display text-2xl font-bold flex-shrink-0 overflow-hidden">
                {formAvatar ? <img src={formAvatar} alt={formNama} className="w-full h-full object-cover" /> : initialsOf(formNama)}
              </div>
              <label className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-lg border text-xs font-semibold text-brown-2 cursor-pointer" style={BORDER}>
                <IconEdit size={14} /> Ganti Foto
                <input type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
              </label>
              {formAvatar && (
                <button
                  type="button"
                  onClick={() => setFormAvatar('')}
                  className="text-xs text-brown-3 underline"
                >
                  Hapus
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Nama Lengkap
                <input
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-10 rounded-lg border px-3 text-sm text-brown"
                  style={BORDER}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                {isDosen ? 'NIDN' : 'NIM / NIDN'}
                <input
                  value={formNidn}
                  onChange={(e) => setFormNidn(e.target.value)}
                  readOnly={!isDosen}
                  className="h-10 rounded-lg border px-3 text-sm text-brown disabled:opacity-50 read-only:opacity-65"
                  style={BORDER}
                />
              </label>
              {isDosen && (
                <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                  Jabatan Fungsional
                  <Select
                    value={formJabatan}
                    onChange={setFormJabatan}
                    className="h-10 rounded-lg border px-3 text-sm text-brown"
                    style={BORDER}
                    options={JABATAN_OPTIONS.map((j) => ({ value: j, label: j }))}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Program Studi
                <input
                  value={formProdi}
                  onChange={(e) => setFormProdi(e.target.value)}
                  className="h-10 rounded-lg border px-3 text-sm text-brown"
                  style={BORDER}
                />
              </label>
              {isDosen ? (
                <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                  Fakultas
                  <input
                    value={formFakultas}
                    onChange={(e) => setFormFakultas(e.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm text-brown"
                    style={BORDER}
                  />
                </label>
              ) : (
                <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                  Angkatan / Tahun
                  <input
                    value={formAngkatan}
                    onChange={(e) => setFormAngkatan(e.target.value)}
                    placeholder="Contoh: 2022"
                    className="h-10 rounded-lg border px-3 text-sm text-brown"
                    style={BORDER}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Email
                <input value={email} readOnly disabled className="h-10 rounded-lg border px-3 text-sm text-brown opacity-50" style={BORDER} />
              </label>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="min-h-11 px-5 rounded-lg bg-terra text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button
                onClick={() => setEditOpen(false)}
                className="min-h-11 px-4 rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
                Batal
              </button>
            </div>
          </div>
          </div>
        )}

        {/* ── VARK (mahasiswa only) ── */}
        {!isDosen && (
          <div className="bg-ivory rounded-2xl border overflow-hidden mb-4" style={BORDER}>
            <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={BORDER}>
              <IconTarget size={16} />
              <span className="text-sm font-semibold text-brown">Gaya Belajar VARK</span>
            </div>
            <div className="p-5">
              {!vark || !vark.dominant ? (
                <div className="flex flex-col items-center gap-2 text-center py-2">
                  <p className="text-sm text-brown-3">Kamu belum mengisi asesmen gaya belajar VARK.</p>
                  <Link
                    to="/vark"
                    className="inline-flex items-center justify-center gap-1.5 px-4 min-h-11 rounded-lg bg-terra text-white text-sm font-semibold"
                  >
                    Isi Sekarang →
                  </Link>
                </div>
              ) : (
                (() => {
                  const dom = (vark.dominant || 'V').toUpperCase()
                  const scores = { V: vark.V || 0, A: vark.A || 0, R: vark.R || 0, K: vark.K || 0 }
                  const maxVal = Math.max(...Object.values(scores), 1)
                  const dateStr = vark.completedAt
                    ? new Date(vark.completedAt).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''
                  return (
                    <>
                      <div className="flex items-center gap-3 flex-wrap mb-4">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brown text-terra font-display text-sm font-semibold">
                          {(() => {
                            const VarkIconComp = VARK_ICONS[dom] || IconTarget
                            return <VarkIconComp size={15} />
                          })()}{' '}
                          {VARK_LABELS[dom] || vark.dominant}
                        </span>
                        {dateStr && <span className="text-xs text-brown-3">Diisi: {dateStr}</span>}
                      </div>
                      <p className="text-sm text-brown-2 leading-relaxed mb-4">{VARK_DESCS[dom] || ''}</p>
                      <div className="flex items-end gap-2.5 h-[90px] mb-2">
                        {(['V', 'A', 'R', 'K'] as const).map((k) => {
                          const val = scores[k]
                          const hPct = Math.round((val / maxVal) * 100)
                          const color = VARK_COLORS[k]
                          const isDom = k === dom
                          return (
                            <div key={k} className="flex flex-col items-center gap-1 flex-1">
                              <div className="w-full flex items-end justify-center h-[70px]">
                                <div
                                  className="w-full rounded-t flex items-start justify-center pt-1"
                                  style={{
                                    height: `${hPct}%`,
                                    minHeight: 5,
                                    background: color,
                                    boxShadow: isDom ? '0 3px 12px rgba(0,0,0,.15)' : undefined,
                                  }}
                                >
                                  <span className="text-xs font-bold text-white">{val}</span>
                                </div>
                              </div>
                              <div className="text-xs font-bold text-center" style={{ color, fontWeight: isDom ? 700 : 500 }}>
                                {k}
                              </div>
                              <div className="text-[10px] text-brown-3 text-center">{VARK_NAMES[k]}</div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="text-right mt-2">
                        <Link to="/vark" className="text-xs text-sage-d">
                          Isi ulang asesmen →
                        </Link>
                      </div>
                    </>
                  )
                })()
              )}
            </div>
          </div>
        )}

        {/* ── STATISTIK ── */}
        <div className="bg-ivory rounded-2xl border overflow-hidden mb-4" style={BORDER}>
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={BORDER}>
            <IconChart size={16} />
            <span className="text-sm font-semibold text-brown">
              {isDosen ? 'Statistik Mengajar' : 'Statistik Belajar'}
            </span>
            {!isDosen && (
              <button
                onClick={handleDownloadLaporan}
                className="ml-auto min-h-11 px-3.5 rounded-lg border text-xs font-semibold text-terra flex items-center gap-1.5"
                style={{ borderColor: 'var(--terra)' }}
                title="Unduh laporan sebagai PDF"
              >
                <IconPrinter size={15} /> Unduh Laporan PDF
              </button>
            )}
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            {isDosen ? (
              <>
                <StatCard icon={IconBook} val={String(modulAktif)} label="Modul Aktif" sub={`dari ${totalModules} modul`} bar="var(--sage)" />
                <StatCard icon={IconUsers} val={String(dosenSummary.totalStudents)} label="Mahasiswa Terdaftar" bar="var(--terra)" />
                <StatCard icon={IconCheck} val={`${dosenSummary.avgModulPct}%`} label="Rata-rata Completeness" sub="mahasiswa selesai" bar="#B9A88A" />
                <StatCard icon={IconTarget} val={`${dosenSummary.avgKuis}%`} label="Rata-rata Skor Kuis" sub="semua modul" bar="#4A7EA0" />
              </>
            ) : (
              <>
                <StatCard icon={IconBook} val={`${modulSelesai}/${totalModules}`} label="Modul selesai" bar="var(--sage)" />
                <StatCard icon={IconClock} val={formatWaktu(totalSec)} label="Total waktu belajar" bar="var(--terra)" />
                <StatCard icon={IconTarget} val={`${avgScore}%`} label="Rata-rata skor kuis" bar="#B9A88A" />
                <StatCard icon={IconTrophy} val={`${bestScore}%`} label="Kuis terbaik" sub={bestMod ? `Modul ${bestMod}` : ''} bar="#4A7EA0" />
                <StatCard icon={IconChat} val={String(forumCount)} label="Postingan forum" bar="#8B6BA0" />
                <StatCard icon={IconEdit} val={String(totalKuis)} label="Total percobaan kuis" bar="var(--sage-d)" />
              </>
            )}
          </div>
        </div>

        {/* ── TABLE: riwayat kuis (mahasiswa) / aktivitas kelas (dosen) ── */}
        <div className="bg-ivory rounded-2xl border overflow-hidden mb-4" style={BORDER}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={BORDER}>
            <span className="text-sm font-semibold text-brown">
              {isDosen ? 'Aktivitas Kelas Terkini' : 'Riwayat Kuis (5 Terakhir)'}
            </span>
            <span className="text-xs text-brown-3">
              {isDosen ? (recentActivity?.length ? `${recentActivity.length} aktivitas terakhir` : '') : allAttempts.length ? `${allAttempts.length} percobaan total` : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  {isDosen ? (
                    <>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Aktivitas</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Detail</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Waktu</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Modul</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Percobaan</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Skor</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-brown-3">Tanggal</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isDosen
                  ? !recentActivity?.length
                    ? (
                      <tr>
                        <td colSpan={3} className="text-center text-brown-3 py-6 text-sm">
                          Belum ada aktivitas mahasiswa
                        </td>
                      </tr>
                    )
                    : recentActivity.map((a, i) => {
                      const ActivityIconComp = ACTIVITY_ICON[a.kind] || IconDocument
                      const badge = ACTIVITY_BADGE[a.kind] || { bg: 'var(--bg3)', color: 'var(--brown-2)' }
                      return (
                      <tr key={i} className="border-t" style={BORDER}>
                        <td className="px-4 py-2.5 text-brown-2">
                          <span className="inline-flex items-center gap-1.5">
                            <ActivityIconComp size={14} /> {a.who}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {a.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-brown-3">{timeAgo(a.iso)}</td>
                      </tr>
                      )
                    })
                  : recentQuiz.length === 0
                    ? (
                      <tr>
                        <td colSpan={4} className="text-center text-brown-3 py-6 text-sm">
                          Belum ada riwayat kuis
                        </td>
                      </tr>
                    )
                    : recentQuiz.map((r, i) => {
                        const pill = scorePillStyle(r.score || 0)
                        return (
                          <tr key={i} className="border-t" style={BORDER}>
                            <td className="px-4 py-2.5 text-brown-2">Modul {r.moduleId}</td>
                            <td className="px-4 py-2.5 text-brown-2">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className="inline-flex items-center justify-center min-w-[38px] px-2 py-0.5 rounded-md font-semibold text-xs"
                                style={{ background: pill.bg, color: pill.color }}
                              >
                                {r.score || 0}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-brown-2">{r.date}</td>
                          </tr>
                        )
                      })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PENGATURAN ── */}
        <div className="bg-ivory rounded-2xl border overflow-hidden mb-4" style={BORDER}>
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={BORDER}>
            <IconGear size={16} />
            <span className="text-sm font-semibold text-brown">Pengaturan</span>
          </div>
          <div className="p-5">
            {isDosen ? (
              <>
                <ToggleRow
                  label="Notifikasi draf masuk"
                  sub="Terima notifikasi saat mahasiswa mengumpulkan draf baru"
                  checked={notifDraf}
                  onChange={() => toggleNotif('draf')}
                />
                <ToggleRow
                  label="Notifikasi forum baru"
                  sub="Terima notifikasi saat ada postingan forum baru dari mahasiswa"
                  checked={notifForum}
                  onChange={() => toggleNotif('forum')}
                />
              </>
            ) : (
              <ToggleRow
                label="Tampilkan progress di dashboard"
                sub="Tampilkan kartu progress di beranda dashboard"
                checked={showProgress}
                onChange={toggleShowProgress}
              />
            )}
            <div className="flex gap-2.5 flex-wrap mt-4 pt-4 border-t" style={BORDER}>
              {role && (
                <button
                  onClick={() => {
                    resetOnboarding(role)
                    navigate('/dashboard')
                  }}
                  className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border text-xs font-semibold text-brown-2"
                  style={BORDER}
                >
                  <IconTarget size={14} /> Lihat Panduan Lagi
                </button>
              )}
              {!isDosen && (
                <button
                  onClick={() => setResetOpen(true)}
                  className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border text-xs font-semibold text-red"
                  style={{ borderColor: 'rgba(176,48,32,.35)' }}
                >
                  <IconTrash size={14} /> Reset Data Demo
                </button>
              )}
              <button
                onClick={() => setLogoutOpen(true)}
                className="min-h-11 px-4 rounded-lg border text-xs font-semibold text-brown-2"
                style={BORDER}
              >
                Keluar dari Akun
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--terra)', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}
        >
          {toast}
        </div>
      )}

      {resetOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetOpen(false)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Reset semua data demo?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Semua data belajar, kuis, dan progress yang tersimpan di perangkat ini akan dihapus
              permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setResetOpen(false)}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={resetDemoData}
                className="flex-1 min-h-11 rounded-lg bg-red text-white text-sm font-semibold"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <LogoutModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          doLogout()
        }}
      />
    </Layout>
  )
}

function StatCard({
  icon: IconComponent,
  val,
  label,
  sub,
  bar,
}: {
  icon: IconComp
  val: string
  label: string
  sub?: string
  bar: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-bg3 px-4 py-3.5" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <div className="text-brown-2 mb-1.5">
        <IconComponent size={22} />
      </div>
      <div className="text-xl font-bold text-brown leading-none">{val}</div>
      <div className="text-[11px] text-brown-3 mt-1">{label}</div>
      {sub && <div className="text-[10px] text-brown-3 mt-0.5 opacity-80">{sub}</div>}
    </div>
  )
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string
  sub: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border2, var(--border))' }}>
      <div>
        <div className="text-sm text-brown-2">{label}</div>
        <div className="text-xs text-brown-3 mt-0.5">{sub}</div>
      </div>
      <label className="relative inline-flex items-center justify-center min-w-11 min-h-11 w-11 h-11 flex-shrink-0 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="opacity-0 w-0 h-0 peer absolute" />
        <span
          className="relative inline-block w-10 h-[22px] rounded-full transition-colors peer-checked:bg-sage pointer-events-none"
          style={{ background: checked ? 'var(--sage)' : 'var(--border)' }}
        >
          <span
            className="absolute left-[3px] bottom-[3px] w-4 h-4 rounded-full bg-white transition-transform"
            style={{ transform: checked ? 'translateX(18px)' : 'translateX(0)' }}
          />
        </span>
      </label>
    </div>
  )
}

export default Profil
