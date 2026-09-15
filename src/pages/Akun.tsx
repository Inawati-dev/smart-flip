import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'
import { LogoutModal } from '../components/LogoutModal'
import { supabase } from '../lib/supabase'
import { IconUser, IconGraduationCap, IconTarget, IconGear, IconUsers, IconEdit } from '../components/icons'

// /akun (spec §3, §9 WP8) — menggantikan render mentah <Profil/> WP1 dengan
// kartu ringkas (avatar, nama, email, peran, NIM/NIDN) + dua kartu info per
// peran + tombol Ubah profil/Pengaturan/Keluar.
const BORDER = { borderColor: 'var(--border)' } as const

function initialsOf(name: string | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}

export function Akun() {
  const navigate = useNavigate()
  const { user, profile, role } = useAuth()
  const isDosen = role === 'dosen'
  // "Ubah profil" membuka halaman Profil lama di route /akun/profil (App.tsx).
  // /profil sendiri dialihkan ke /akun, jadi form nama/avatar/NIM hanya bisa
  // dicapai lewat route ini.
  const [logoutOpen, setLogoutOpen] = useState(false)

  async function doLogout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches Layout.tsx's doLogout
    }
    navigate('/')
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <h1 className="font-display text-2xl font-bold text-brown mb-5">Akun</h1>

        <div className="bg-ivory rounded-2xl border p-5 mb-4 flex items-center gap-4" style={BORDER}>
          <div className="w-16 h-16 rounded-full bg-terra text-white flex items-center justify-center font-display text-2xl font-bold flex-shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initialsOf(profile?.full_name)
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg font-bold text-brown truncate">
              {profile?.full_name || 'Pengguna'}
            </div>
            <div className="text-sm text-brown-3 truncate">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={
                  isDosen
                    ? { background: 'rgba(212,163,115,.15)', color: 'var(--terra-d)' }
                    : { background: 'rgba(143,162,135,.15)', color: 'var(--sage-d)' }
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {isDosen ? (
            <>
              <Link to="/kelas" className="bg-ivory rounded-2xl border p-4 hover:shadow-sm transition-shadow" style={BORDER}>
                <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
                  <IconUsers size={15} /> Kelas dikelola
                </div>
                <div className="text-xs text-brown-3 mt-1">Lihat & kelola kelas Anda</div>
              </Link>
              <Link to="/pengaturan" className="bg-ivory rounded-2xl border p-4 hover:shadow-sm transition-shadow" style={BORDER}>
                <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
                  <IconGear size={15} /> Kode undangan dosen
                </div>
                <div className="text-xs text-brown-3 mt-1">Lihat & ubah kode undangan di Pengaturan</div>
              </Link>
            </>
          ) : (
            <>
              {/* Kelas mahasiswa: belum ada hook baca class_id -> nama kelas
                  (di luar berkas yang boleh disentuh WP8) — "—" sampai ada. */}
              <div className="bg-ivory rounded-2xl border p-4" style={BORDER}>
                <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
                  <IconUsers size={15} /> Kelas
                </div>
                <div className="text-xs text-brown-3 mt-1">—</div>
              </div>
              <div className="bg-ivory rounded-2xl border p-4" style={BORDER}>
                <div className="text-sm font-semibold text-brown flex items-center gap-1.5">
                  <IconTarget size={15} /> Gaya belajar VARK
                </div>
                {profile?.learning_style ? (
                  <div className="text-xs text-brown-3 mt-1">{profile.learning_style}</div>
                ) : (
                  <Link to="/asesmen/vark" className="text-xs text-sage-d mt-1 inline-flex items-center min-h-11">
                    Kerjakan VARK →
                  </Link>
                )}
                <div className="text-xs text-brown-3 mt-2">Pre-test: —</div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <Link
            to="/akun/profil"
            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2"
            style={BORDER}
          >
            <IconEdit size={15} /> Ubah profil
          </Link>
          <Link
            to="/pengaturan"
            className="inline-flex items-center min-h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2"
            style={BORDER}
          >
            Pengaturan
          </Link>
          <button
            onClick={() => setLogoutOpen(true)}
            className="inline-flex items-center min-h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2"
            style={BORDER}
          >
            Keluar
          </button>
        </div>
      </div>

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

export default Akun
