import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { fetchMyKelas, labelKelas } from '../lib/kelas'
import { useAllProgress } from '../hooks/useProgress'
import { useAllQuizAttempts } from '../hooks/useQuizAttempts'
import { useStudentStats } from '../hooks/useAnalitik'
import { computeStatSummary } from '../lib/analitik'
import { saveProfilExtra } from '../lib/profil'
import { usePreTestDone } from '../lib/topik'
import { PASS_SCORE } from '../lib/quizAttempts'
import { TOTAL_MODULES } from '../lib/progress'
import { Layout } from '../components/Layout'
import { FileInput } from '../components/FileInput'
import { PengaturanSections } from './Pengaturan'
import { IconUser, IconGraduationCap, IconEdit } from '../components/icons'

// /akun (WP-C) — Profil.tsx dilebur ke sini: kartu identitas dengan modal
// Ubah (nama, NIM/NIDN, avatar — logika dari Profil.tsx/lib/profil.ts),
// baris kartu angka ringkas, lalu seluruh bagian Pengaturan langsung di
// bawahnya (tanpa tab). Kelola PDF dan Kelas pindah ke rel navigasi sendiri
// (Layout.tsx, dosen saja); tombol keluar dari akun sudah ada di rel/bilah
// bawah, jadi tidak diulang di sini. Rute lama yang menuju halaman
// pengaturan terpisah sudah dilebur, /akun/profil dihapus dari App.tsx;
// Profil.tsx dibiarkan ada (tidak ber-route) sesuai keputusan Johan #2.
//
// Koreksi Johan 16 Sep 2026 "isi pengaturan di lebur jadi 1 dengan profil":
// tab Kelas dan Pengaturan (percobaan sebelumnya di hari yang sama) dibuang,
// ?tab=kelas dialihkan ke halaman /kelas yang baru (lihat Kelas.tsx).
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

  // ?tab=kelas lama (percobaan tab sebelumnya) dialihkan ke halaman /kelas.
  // ?tab=pengaturan diabaikan -- halaman ini sudah memuat semuanya sekaligus.
  const [searchParams] = useSearchParams()

  const { data: modules = [] } = useModules()
  const { data: kelasSaya = null } = useQuery({ queryKey: ['kelas-saya'], queryFn: fetchMyKelas, enabled: !isDosen })
  const { data: progress = {} } = useAllProgress()
  const { data: allAttempts = [] } = useAllQuizAttempts()
  const { data: dosenStudents } = useStudentStats()
  const { data: preTestDone } = usePreTestDone()

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

  // FileInput mengganti input polos (antrean #54): ia sudah menyaring ukuran
  // sendiri lewat maxSizeMb, jadi di sini cukup terima File langsung — dan
  // karena alurnya langsung baca ke dataURL (bukan disimpan sebagai draft),
  // file yang dikirim balik ke <FileInput> selalu null.
  function handleAvatarPick(file: File | null) {
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

  if (searchParams.get('tab') === 'kelas') {
    return <Navigate to="/kelas" replace />
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <h1 className="font-display text-2xl font-bold text-brown mb-4">Akun</h1>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {isDosen ? (
            <>
              <StatCard bar="var(--terra)" val={String(dosenSummary.totalStudents)} label="Mahasiswa terdaftar" />
              <StatCard bar="var(--sage)" val={`${dosenSummary.avgModulPct}%`} label="Rata-rata progres" />
              <StatCard bar="var(--info)" val={`${dosenSummary.avgKuis}%`} label="Rata-rata skor kuis" />
            </>
          ) : (
            <>
              <StatCard bar="var(--terra)" val={`${modulSelesai}/${totalModules}`} label="Topik selesai" />
              <StatCard bar="var(--sage)" val={String(formatifLulus)} label="Formatif lulus" />
              <StatCard bar="var(--info)" val={preTestDone ? 'Sudah' : 'Belum'} label="Pre-test" />
            </>
          )}
        </div>

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
                  {!isDosen && (
                    <span className="text-xs text-brown-3">{kelasSaya ? labelKelas(kelasSaya) : 'Belum bergabung kelas'}</span>
                  )}
                </div>
              </div>
          <button onClick={openEdit} className="btn btn-secondary flex-shrink-0">
            <IconEdit size={15} /> Ubah
          </button>
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
              <FileInput accept="image/*" label="Pilih foto" maxSizeMb={5} file={null} onChange={handleAvatarPick} />
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
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                  style={BORDER}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
                {isDosen ? 'NIDN' : 'NIM'}
                <input
                  value={formNidn}
                  onChange={(e) => setFormNidn(e.target.value)}
                  readOnly={!isDosen}
                  className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown read-only:opacity-65"
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

// Bentuk disamakan dengan StatCard di Dashboard.tsx (garis warna 3px, angka
// text-xl font-bold, label text-[11px]) -- tanpa slot ikon, sama seperti
// StatCard lokal Kelas.tsx (pemanggil di sini juga tidak mengirim ikon).
function StatCard({ bar, val, label }: { bar: string; val: string; label: string }) {
  return (
    <div className="bg-ivory rounded-2xl border p-3.5 relative overflow-hidden" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <div className="text-xl font-bold text-brown">{val}</div>
      <div className="text-[11px] text-brown-3 mt-1.5">{label}</div>
    </div>
  )
}

export default Akun
