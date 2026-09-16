import { useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resetOnboarding } from '../lib/onboarding'
import { LogoutModal } from './LogoutModal'
import { BrandMark } from './AuthShell'
import { IconHome, IconBook, IconPlay, IconChart, IconUser, IconLogout, IconDocument } from './icons'

interface NavItem {
  to: string
  icon: ComponentType<{ size?: number }>
  label: string
  desc: string
  dosenOnly?: boolean
}

// Tata letak C "Jalur Pertemuan" (spec 2026-09-15 §8.0): lima menu datar, SAMA
// untuk semua peran (dosen melihat isi kelola di halaman yang sama). Menu
// lama (Forum, Draf, Validasi, dst.) disembunyikan dari navigasi di sini,
// TAPI route-nya tetap terdaftar di App.tsx (keputusan #2 — bukan dihapus).
// `desc` = keterangan satu baris di flyout rel (WP-B, permintaan 16 Sep 2026).
// PDF (dosenOnly) ditambahkan 16 Sep 2026 — dipindah keluar dari Akun ke rel
// navigasi sendiri, cuma dirender untuk role dosen (lihat filter di bawah).
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: IconHome, label: 'Dashboard', desc: 'Ringkasan dan langkah berikutnya' },
  { to: '/modul', icon: IconBook, label: 'Modul', desc: 'PDF tiap pertemuan' },
  { to: '/video', icon: IconPlay, label: 'Video', desc: 'Video tiap pertemuan' },
  { to: '/asesmen', icon: IconChart, label: 'Asesmen', desc: 'Pre-test, formatif, post-test' },
  { to: '/akun/pdf', icon: IconDocument, label: 'PDF', desc: 'Kelola berkas PDF modul', dosenOnly: true },
  { to: '/akun', icon: IconUser, label: 'Akun', desc: 'Profil, kelas, pengaturan' },
]

// Satu item aktif pada satu waktu: item dengan awalan path terpanjang yang
// cocok. Tanpa ini, /akun/pdf menyalakan "PDF" DAN "Akun" bersamaan
// (temuan Johan 16 Sep 2026).
export function activeTo(pathname: string, items: ReadonlyArray<{ to: string }>): string | null {
  let best: string | null = null
  for (const { to } of items) {
    if (pathname === to || pathname.startsWith(`${to}/`)) {
      if (best === null || to.length > best.length) best = to
    }
  }
  return best
}

function initialsOf(name: string | undefined): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}

function roleLabel(role: 'mahasiswa' | 'dosen' | null): string {
  return role === 'dosen' ? 'Dosen' : role === 'mahasiswa' ? 'Mahasiswa' : 'Memuat…'
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, profile } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const navItems = NAV_ITEMS.filter((item) => !item.dosenOnly || role === 'dosen')
  const currentActive = activeTo(location.pathname, navItems)

  async function doLogout() {
    // Onboarding is "seen" per-browser (localStorage), not per-session — reset
    // it on logout so the next login (even the same person, same browser)
    // shows WelcomeModal again, instead of only ever once per browser forever.
    if (role) resetOnboarding(role)
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches legacy/modul.html:940 behavior
    }
    navigate('/')
  }

  // Anonymous visitor on a real (Supabase-configured) deploy — e.g. /changelog
  // reached from the logged-out AuthShell footer, before ProtectedRoute would
  // otherwise gate it: render a minimal standalone header instead of the full
  // authenticated nav, since the real rail exposes the app's menu structure to
  // outside visitors. Demo mode (isSupabaseConfigured === false) never has a
  // real `user` by design, so it's excluded here — that mode intentionally
  // browses the full app locally without auth.
  if (isSupabaseConfigured && !user) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="sticky top-0 z-40 h-[58px] bg-cream/90 backdrop-blur-lg border-b border-[color:var(--border)]">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4 max-w-[900px] mx-auto">
            <Link to="/" className="flex items-center gap-2 no-underline text-brown">
              <BrandMark size={26} />
              <span className="font-display font-bold text-brown">Smart Flip</span>
            </Link>
            <Link to="/" className="btn btn-secondary btn-sm">
              Masuk
            </Link>
          </div>
        </header>
        <main className="page-fadein">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream sm:pl-[80px]">
      {/* ── Rel ikon kiri (desktop/tablet, >=640px) ── */}
      <aside
        className="hidden sm:flex fixed inset-y-0 left-0 z-40 flex-col items-center w-[80px] bg-ivory border-r border-[color:var(--border)] py-4"
      >
        <Link to="/dashboard" className="mb-4 flex items-center justify-center" aria-label="Dashboard">
          <BrandMark size={30} />
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-2">
          {navItems.map((item) => {
            const active = item.to === currentActive
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className="group relative flex w-[68px] flex-col items-center gap-1 rounded-xl p-[6px]"
              >
                <span className={active ? 'nav-tile nav-tile-active' : 'nav-tile'}>
                  <Icon size={19} />
                </span>
                <span
                  className={`max-w-full text-center text-[10px] leading-tight tracking-tight font-semibold ${
                    active ? 'text-brown' : 'text-brown-2'
                  }`}
                >
                  {item.label}
                </span>
                {/* Flyout hover/fokus — hanya efektif di >=640px karena aside
                    ini sendiri hidden di bawah itu. group-hover + group-focus-
                    within saja (tanpa state React) supaya ringan. pointer-events
                    -none supaya flyout tidak pernah menghalangi klik pada item. */}
                <span className="nav-flyout pointer-events-none absolute left-full top-1/2 z-50 ml-2 w-max max-w-[190px] -translate-y-1/2 rounded-[10px] border border-[color:var(--border)] bg-ivory px-3 py-2 text-[13px] opacity-0 shadow-[0_4px_16px_color-mix(in_srgb,var(--shadow-color)_14%,transparent)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <span className="block font-semibold text-brown">{item.label}</span>
                  <span className="block text-brown-2">{item.desc}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Identitas + Keluar — dipertahankan sesuai aturan proyek (logout
            wajib modal konfirmasi). Rel sempit (80px) jadi hanya avatar +
            title tooltip native, bukan nama penuh. */}
        <Link
          to="/akun"
          title={`${profile?.full_name || 'Pengguna'} · ${roleLabel(role)}`}
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold overflow-hidden mb-2"
          style={{ background: 'var(--terra-d)', color: '#fff' }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            initialsOf(profile?.full_name)
          )}
        </Link>
        <button
          onClick={() => setLogoutOpen(true)}
          title="Keluar"
          aria-label="Keluar"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-red hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] transition-colors"
        >
          <IconLogout size={18} />
        </button>
      </aside>

      {/* ── Topbar mobile (<640px) ── */}
      <header className="sm:hidden sticky top-0 z-40 h-[58px] bg-cream/90 backdrop-blur-lg border-b border-[color:var(--border)]">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline text-brown">
            <BrandMark size={26} />
            <span className="font-display font-bold text-brown">Smart Flip</span>
          </Link>
          <button
            onClick={() => setLogoutOpen(true)}
            aria-label="Keluar"
            className="w-11 h-11 rounded-full border border-[color:var(--border)] flex items-center justify-center text-red"
          >
            <IconLogout size={18} />
          </button>
        </div>
      </header>

      <main className="page-fadein pb-[68px] sm:pb-0">{children}</main>

      {/* ── Bilah bawah mobile (<640px) — pengganti rel ikon ── */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 h-[52px] bg-ivory border-t border-[color:var(--border)] flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map((item) => {
          const active = item.to === currentActive
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-11 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                active ? 'text-brown' : 'text-brown-3'
              }`}
            >
              <span className={active ? 'nav-tile nav-tile-active' : 'nav-tile'}>
                <Icon size={19} />
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <LogoutModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); doLogout() }}
      />
    </div>
  )
}
