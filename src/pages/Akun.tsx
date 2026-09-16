import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useAllQuizAttempts } from '../hooks/useQuizAttempts'
import { useStudentStats } from '../hooks/useAnalitik'
import { computeStatSummary } from '../lib/analitik'
import { saveProfilExtra } from '../lib/profil'
import { PASS_SCORE } from '../lib/quizAttempts'
import { TOTAL_MODULES } from '../lib/progress'
import { Layout } from '../components/Layout'
import { PengaturanSections } from './Pengaturan'
import { IconUser, IconGraduationCap, IconTarget, IconUsers, IconEdit, IconBook } from '../components/icons'

// /akun (WP-C) — Profil.tsx dilebur ke sini: kartu identitas dengan modal
// Ubah (nama, NIM/NIDN, avatar — logika dari Profil.tsx/lib/profil.ts),
// kartu Kelas, kartu Progres singkat, lalu seluruh bagian Pengaturan
// (koreksi Johan 16 Sep 2026). Kelola PDF pindah ke rel navigasi
// (Layout.tsx, dosen saja); tombol keluar dari akun sudah ada di rel/bilah
// bawah, jadi tidak diulang di sini. Rute lama yang menuju halaman pengaturan
// terpisah sudah dilebur, /akun/profil dihapus dari App.tsx; Profil.tsx
// dibiarkan ada (tidak ber-route) sesuai keputusan Johan #2.
const BORDER = { borderColor: 'var(--border)' } as const
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function initialsOf(name: string | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}

export function Akun() {
  const queryClient = useQueryClient()
  const { user, profile, role, refreshProfile } = useAuth()
  const isDosen = role === 'dosen'

  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { data: allAttempts = [] } = useAllQuizAttempts()
  const { data: dosenStudents } = useStudentStats()

  const totalModules = modules.length || TOTAL_MODULES
  const modulSelesai = Object.values(progress).filter((p) => p.pct >= 100).length
  const bestByModule = new Map<number, number>()
  allAttempts.forEach((a) => {
    if (a.score > (bestByModule.get(a.moduleId) ?? 0)) bestByModule.set(a.moduleId, a.score)
  })
  const formatifLulus = [...bestByModule.values()].filter((s) => s >= PASS_SCORE).length
  const dosenSummary = computeStatSummary(dosenStudents ?? [], totalModules)

  const [editOpen, setEditOpen] = useState(false)
  const [formNama, setFormNama] = useState('')
  const [formNidn, setFormNidn] = useState('')
  const [formAvatar, setFormAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  function openEdit() {
    setFormNama(profile?.full_name || '')
    setFormNidn(profile?.nim_nidn || '')
    setFormAvatar(profile?.avatar_url || '')
    setEditOpen(true)
  }

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
        nim: isDosen ? formNidn.trim() : profile?.nim_nidn || undefined,
        avatarUrl: formAvatar,
      })
      await queryClient.invalidateQueries({ queryKey: ['profil'] })
      await refreshProfile()
      setEditOpen(false)
      showToast('Profil berhasil disimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <h1 className="font-display text-2xl font-bold text-brown mb-5">Akun</h1>

        <div className="bg-ivory rounded-2xl border p-5 mb-4 flex items-center gap-4" style={BORDER}>
          <div className="w-16 h-16 rounded-full bg-terra text-btn-text flex items-center justify-center font-display text-2xl font-bold flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initialsOf(profile?.full_name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg font-bold text-brown truncate">
              {profile?.full_name || 'Pengguna'}
            </div>
            <div className="text-sm text-brown-3 truncate">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={
                  isDosen
                    ? { background: 'var(--accent-soft)', color: 'var(--terra-d)' }
                    : { background: 'color-mix(in srgb, var(--sage) 15%, transparent)', color: 'var(--sage-d)' }
                }
              >
                {isDosen ? (
                  <span className="inline-flex items-center gap-1"><IconUser size={12} /> Dosen</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><IconGraduationCap size={12} /> Mahasiswa</span>
                )}
              </span>
              {profile?.nim_nidn && (
                <span className="text-xs text-brown-3">{isDosen ? 'NIDN' : 'NIM'} {profile.nim_nidn}</span>
              )}
            </div>
          </div>
          <button onClick={openEdit} className="btn btn-secondary flex-shrink-0">
            <IconEdit size={15} /> Ubah
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {isDosen ? (
            <Link to="/kelas" className="bg-ivory rounded-2xl border p-4 hover:shadow-sm transition-shadow" style={BORDER}>
              <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
                <IconUsers size={15} /> Kelas
              </div>
              <div className="text-xs text-brown-3 mt-1">Daftar kelas yang Anda kelola</div>
              <div className="text-xs text-sage-d mt-2">Kelola kelas →</div>
            </Link>
          ) : (
            <div className="bg-ivory rounded-2xl border p-4" style={BORDER}>
              <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
                <IconUsers size={15} /> Kelas
              </div>
              {/* Belum ada hook baca class_id -> nama kelas (di luar berkas
                  yang boleh disentuh WP-C) — "—" sampai ada. */}
              <div className="text-xs text-brown-3 mt-1">—</div>
            </div>
          )}

          <div className="bg-ivory rounded-2xl border p-4" style={BORDER}>
            <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
              <IconTarget size={15} /> Progres {isDosen ? 'Mengajar' : 'Belajar'}
            </div>
            {isDosen ? (
              <div className="text-xs text-brown-3 mt-1.5 flex flex-col gap-0.5">
                <div>{dosenSummary.totalStudents} mahasiswa terdaftar</div>
                <div>{dosenSummary.avgModulPct}% rata-rata completeness</div>
                <div>{dosenSummary.avgKuis}% rata-rata skor kuis</div>
              </div>
            ) : (
              <div className="text-xs text-brown-3 mt-1.5 flex flex-col gap-0.5">
                <div className="inline-flex items-center gap-1.5"><IconBook size={12} /> {modulSelesai}/{totalModules} topik selesai</div>
                <div>{formatifLulus} formatif lulus</div>
              </div>
            )}
          </div>
        </div>

        <PengaturanSections />
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl border-2 p-5 max-w-md w-full max-h-[90vh] overflow-y-auto"
            style={{ borderColor: 'var(--terra)', boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="text-sm font-semibold text-brown mb-4 pb-2 border-b" style={BORDER}>
              Ubah profil
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-terra text-btn-text flex items-center justify-center font-display text-2xl font-bold flex-shrink-0 overflow-hidden">
                {formAvatar ? <img src={formAvatar} alt={formNama} className="w-full h-full object-cover" /> : initialsOf(formNama)}
              </div>
              <label className="inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-lg border text-xs font-semibold text-brown-2 cursor-pointer" style={BORDER}>
                <IconEdit size={14} /> Ganti foto
                <input type="file" accept="image/*" onChange={handleAvatarPick} className="hidden text-base" />
              </label>
              {formAvatar && (
                <button type="button" onClick={() => setFormAvatar('')} className="text-xs text-brown-3 underline">
                  Hapus
                </button>
              )}
            </div>

            <div className="flex flex-col gap-3 mb-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                Nama lengkap
                <input
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="h-11 rounded-lg border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                {isDosen ? 'NIDN' : 'NIM'}
                <input
                  value={formNidn}
                  onChange={(e) => setFormNidn(e.target.value)}
                  readOnly={!isDosen}
                  className="h-11 rounded-lg border px-3 text-base text-brown read-only:opacity-65"
                  style={BORDER}
                />
              </label>
            </div>

            <div className="flex gap-2.5">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary min-w-[7.5rem]">
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
              <button onClick={() => setEditOpen(false)} className="btn btn-secondary">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 6px 24px color-mix(in srgb, var(--shadow-color) 25%, transparent)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default Akun
