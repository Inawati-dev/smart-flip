import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LogoutModal } from './LogoutModal'

interface NavItem {
  to: string
  icon: string
  label: string
  dosenOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/ebook', icon: '📖', label: 'Katalog Modul' },
  { to: '/forum', icon: '💬', label: 'Forum' },
  { to: '/draf', icon: '📝', label: 'Draf' },
  { to: '/feedback', icon: '⭐', label: 'Feedback' },
  { to: '/vark', icon: '🧭', label: 'Gaya Belajar' },
  { to: '/ngain', icon: '📊', label: 'N-Gain', dosenOnly: true },
  { to: '/validasi', icon: '✅', label: 'Validasi Ahli', dosenOnly: true },
  { to: '/analitik', icon: '📈', label: 'Analitik Kelas', dosenOnly: true },
  { to: '/manajemen', icon: '🗂️', label: 'Kelola Modul', dosenOnly: true },
  { to: '/profil', icon: '👤', label: 'Profil' },
  { to: '/changelog', icon: '📋', label: 'Changelog' },
]

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [flyout, setFlyout] = useState<string | null>(null)

  const items = NAV_ITEMS.filter((item) => !item.dosenOnly || role === 'dosen')

  async function doLogout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches legacy/modul.html:940 behavior
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream lg:pl-[72px]">
      {/* ── Desktop icon-rail sidebar with hover flyout ── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[72px] flex-col items-center bg-ivory border-r border-[color:var(--border)] py-4"
        onMouseLeave={() => setFlyout(null)}
      >
        <Link to="/dashboard" className="mb-5 w-11 h-11 rounded-xl flex items-center justify-center text-xl" aria-label="Beranda">
          📖
        </Link>

        <nav className="flex-1 flex flex-col items-center gap-1 w-full">
          {items.map((item) => {
            const active = location.pathname === item.to
            return (
              <div key={item.to} className="relative w-full flex justify-center" onMouseEnter={() => setFlyout(item.to)}>
                <Link
                  to={item.to}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-colors"
                  style={active ? { background: 'var(--brown)', color: 'var(--terra)' } : { color: 'var(--brown-2)' }}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.icon}
                </Link>
                {flyout === item.to && (
                  <div
                    className="absolute left-[64px] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-[0_8px_24px_rgba(62,54,46,.18)]"
                    style={{ background: 'var(--brown)', color: 'var(--ivory)', animation: 'fadeInBg 0.12s ease' }}
                  >
                    {item.label}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <button
          onClick={() => setLogoutOpen(true)}
          onMouseEnter={() => setFlyout('logout')}
          className="relative w-11 h-11 rounded-xl flex items-center justify-center text-lg text-red"
          aria-label="Keluar"
        >
          🚪
          {flyout === 'logout' && (
            <div
              className="absolute left-[64px] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-[0_8px_24px_rgba(62,54,46,.18)]"
              style={{ background: 'var(--brown)', color: 'var(--ivory)', animation: 'fadeInBg 0.12s ease' }}
            >
              Keluar
            </div>
          )}
        </button>
      </aside>

      {/* ── Mobile topbar ── */}
      <header className="lg:hidden sticky top-0 z-40 h-[58px] bg-cream/90 backdrop-blur-lg border-b border-[color:var(--border)]">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline">
            <span className="text-xl">📖</span>
            <span className="font-['Playfair_Display',serif] font-bold text-brown">E-Modul Adaptif</span>
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="w-11 h-11 rounded-full border border-[color:var(--border)] flex items-center justify-center text-brown-2"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-[495] lg:hidden"
          style={{ animation: 'fadeInBg 0.2s ease' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className={`lg:hidden fixed top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-ivory z-[500] shadow-[0_4px_16px_rgba(62,54,46,.10)] flex flex-col overflow-y-auto transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--border)]">
          <span className="font-['Playfair_Display',serif] font-bold text-brown">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup menu"
            className="w-11 h-11 rounded-full border border-[color:var(--border)] flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col p-2 gap-0.5">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setDrawerOpen(false)}
              className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-brown-2"
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
          <button
            onClick={() => { setDrawerOpen(false); setLogoutOpen(true) }}
            className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-red text-left"
          >
            🚪 Keluar
          </button>
        </nav>
      </aside>

      <main>{children}</main>

      <LogoutModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); doLogout() }}
      />
    </div>
  )
}
