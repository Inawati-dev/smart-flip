import { useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LogoutModal } from './LogoutModal'
import {
  IconHome,
  IconBook,
  IconChat,
  IconEdit,
  IconStar,
  IconCompass,
  IconChart,
  IconCheck,
  IconTrendingUp,
  IconFolder,
  IconUser,
  IconClipboard,
  IconLogout,
  IconMenu,
  IconX,
  IconChevronRight,
} from './icons'

interface NavItem {
  to: string
  icon: ComponentType<{ size?: number }>
  label: string
  color: string
  dosenOnly?: boolean
}

// Each item gets its own accent (reuses hues already established elsewhere in
// the app, e.g. Profil.tsx's VARK_COLORS) so the rail reads as a set of
// distinct destinations, not one flat monochrome column.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: IconHome, label: 'Dashboard', color: '#B8855A' },
  { to: '/ebook', icon: IconBook, label: 'Katalog Modul', color: '#6B7EAF' },
  { to: '/forum', icon: IconChat, label: 'Forum', color: '#8FA287' },
  { to: '/draf', icon: IconEdit, label: 'Draf', color: '#B07A3E' },
  { to: '/feedback', icon: IconStar, label: 'Feedback', color: '#D4A373' },
  { to: '/vark', icon: IconCompass, label: 'Gaya Belajar', color: '#8B6BA0' },
  { to: '/ngain', icon: IconChart, label: 'N-Gain', color: '#6B7EAF', dosenOnly: true },
  { to: '/validasi', icon: IconCheck, label: 'Validasi Ahli', color: '#6B9B7E', dosenOnly: true },
  { to: '/analitik', icon: IconTrendingUp, label: 'Analitik Kelas', color: '#C0704A', dosenOnly: true },
  { to: '/manajemen', icon: IconFolder, label: 'Kelola Modul', color: '#8B6BA0', dosenOnly: true },
  { to: '/profil', icon: IconUser, label: 'Profil', color: '#6B5D4F' },
  { to: '/changelog', icon: IconClipboard, label: 'Changelog', color: '#9B8B7A' },
]

const COLLAPSE_KEY = 'sfp_sidebar_collapsed'

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [flyout, setFlyout] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(COLLAPSE_KEY) === '1',
  )

  const items = NAV_ITEMS.filter((item) => !item.dosenOnly || role === 'dosen')

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
    setFlyout(null)
  }

  async function doLogout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches legacy/modul.html:940 behavior
    }
    navigate('/')
  }

  return (
    <div className={`page-fadein min-h-screen bg-cream ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[220px]'}`}>
      {/* ── Desktop sidebar: full-expanded labels by default, collapsible to icon-rail+flyout ── */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-ivory border-r border-[color:var(--border)] py-4 transition-[width] duration-200 ${
          collapsed ? 'w-[72px] items-center' : 'w-[220px] items-stretch px-3'
        }`}
        onMouseLeave={() => setFlyout(null)}
      >
        <div className={`flex items-center mb-5 ${collapsed ? 'flex-col gap-2' : 'justify-between px-1'}`}>
          <Link to="/dashboard" className="w-11 h-11 rounded-xl flex items-center justify-center text-brown flex-shrink-0" aria-label="Beranda">
            <IconBook size={22} />
          </Link>
          {/* Always visible (both states) so there's always an obvious click target
              to expand back out — not just discoverable from one state. */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brown-3 hover:text-brown hover:bg-[rgba(62,54,46,.05)] transition-colors"
          >
            <IconChevronRight size={15} style={{ transform: collapsed ? undefined : 'rotate(180deg)', transition: 'transform .2s ease' }} />
          </button>
        </div>

        <nav className={`flex-1 flex flex-col gap-1 ${collapsed ? 'items-center w-full' : ''}`}>
          {items.map((item) => {
            const active = location.pathname === item.to
            const Icon = item.icon
            return (
              <div
                key={item.to}
                className={collapsed ? 'relative w-full flex justify-center' : 'relative'}
                onMouseEnter={() => collapsed && setFlyout(item.to)}
              >
                <Link
                  to={item.to}
                  className={
                    collapsed
                      ? 'w-11 h-11 rounded-xl flex items-center justify-center transition-colors'
                      : 'h-11 px-3 rounded-xl flex items-center gap-2.5 transition-colors text-sm font-semibold'
                  }
                  style={
                    active
                      ? { background: 'var(--brown)', color: item.color }
                      : { color: item.color }
                  }
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={19} />
                  {!collapsed && <span className="truncate" style={{ color: active ? item.color : 'var(--brown-2)' }}>{item.label}</span>}
                </Link>
                {collapsed && flyout === item.to && (
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
          onMouseEnter={() => collapsed && setFlyout('logout')}
          className={
            collapsed
              ? 'relative w-11 h-11 rounded-xl flex items-center justify-center text-red'
              : 'relative h-11 px-3 rounded-xl flex items-center gap-2.5 text-red text-sm font-semibold'
          }
        >
          <IconLogout size={19} />
          {!collapsed && <span>Keluar</span>}
          {collapsed && flyout === 'logout' && (
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
          <Link to="/dashboard" className="flex items-center gap-2 no-underline text-brown">
            <IconBook size={20} />
            <span className="font-['Playfair_Display',serif] font-bold text-brown">E-Modul Adaptif</span>
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="w-11 h-11 rounded-full border border-[color:var(--border)] flex items-center justify-center text-brown-2"
          >
            <IconMenu size={19} />
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
            <IconX size={17} />
          </button>
        </div>
        <nav className="flex flex-col p-2 gap-0.5">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-brown-2"
              >
                <span style={{ color: item.color }} className="inline-flex"><Icon size={17} /></span> {item.label}
              </Link>
            )
          })}
          <button
            onClick={() => { setDrawerOpen(false); setLogoutOpen(true) }}
            className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-red text-left"
          >
            <IconLogout size={17} /> Keluar
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
