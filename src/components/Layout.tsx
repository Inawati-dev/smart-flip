import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { LogoutModal } from './LogoutModal'

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  async function doLogout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches legacy/modul.html:940 behavior
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 h-[58px] bg-cream/90 backdrop-blur-lg border-b border-[color:var(--border)]">
        <div className="h-full px-6 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline">
            <span className="text-xl">📖</span>
            <span className="font-['Playfair_Display',serif] font-bold text-brown">E-Modul Adaptif</span>
          </Link>

          <div className="hidden md:flex items-center gap-2.5">
            <Link to="/dashboard" className="text-xs font-semibold text-brown-3 px-2.5 py-1 rounded-full border border-[color:var(--border)]">
              ← Dashboard
            </Link>
            <a href="/legacy/profil.html" className="text-xs font-semibold text-brown-3 px-2.5 py-1 rounded-full border border-[color:var(--border)]">
              👤 Profil
            </a>
            <a href="/legacy/changelog.html" className="text-xs font-semibold text-brown-3 px-2.5 py-1 rounded-full border border-[color:var(--border)]">
              📋 Changelog
            </a>
            <button
              onClick={() => setLogoutOpen(true)}
              className="text-xs font-semibold text-red px-2.5 py-1 rounded-full border border-red/30"
            >
              Keluar
            </button>
          </div>

          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="md:hidden w-11 h-11 rounded-full border border-[color:var(--border)] flex items-center justify-center text-brown-2"
          >
            ☰
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-[495]"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className={`fixed top-0 right-0 bottom-0 w-[300px] max-w-[85vw] bg-ivory z-[500] shadow-[0_4px_16px_rgba(62,54,46,.10)] flex flex-col overflow-y-auto transition-transform duration-300 ${
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
          <Link to="/dashboard" className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-brown-2">
            🏠 Dashboard
          </Link>
          <a href="/legacy/profil.html" className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-brown-2">
            👤 Profil
          </a>
          <a href="/legacy/changelog.html" className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-brown-2">
            📋 Changelog
          </a>
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
