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
  IconUsers,
  IconUser,
  IconClipboard,
  IconLogout,
  IconMenu,
  IconX,
  IconGear,
  IconChevronRight,
} from './icons'

interface NavItem {
  to: string
  icon: ComponentType<{ size?: number }>
  label: string
  dosenOnly?: boolean
}

interface NavSection {
  key: string
  label: string
  items: NavItem[]
}

// Neutral icon+label everywhere, distinguished only by hover/active state —
// per-item accent colors were tried and explicitly reverted (felt noisy at
// this density). Grouped into sections so the expanded sidebar can render as
// a collapsible accordion (same rail/accordion/flyout split as SAKTI's
// IconRailV2). Shared by every role — fixing hover/spacing here covers both
// mahasiswa and dosen at once.
const NAV_SECTIONS: NavSection[] = [
  {
    key: 'utama',
    label: 'Utama',
    items: [
      { to: '/dashboard', icon: IconHome, label: 'Dashboard' },
      { to: '/ebook', icon: IconBook, label: 'Katalog Modul' },
    ],
  },
  {
    key: 'kolaborasi',
    label: 'Kolaborasi',
    items: [
      { to: '/forum', icon: IconChat, label: 'Forum' },
      { to: '/draf', icon: IconEdit, label: 'Draf' },
    ],
  },
  {
    key: 'belajar',
    label: 'Belajar',
    items: [
      { to: '/feedback', icon: IconStar, label: 'Feedback' },
      { to: '/vark', icon: IconCompass, label: 'Gaya Belajar' },
    ],
  },
  {
    key: 'kelola-kelas',
    label: 'Kelola Kelas',
    items: [
      { to: '/kelas', icon: IconUsers, label: 'Kelas', dosenOnly: true },
      { to: '/ngain', icon: IconChart, label: 'N-Gain', dosenOnly: true },
      { to: '/validasi', icon: IconCheck, label: 'Validasi Ahli', dosenOnly: true },
      { to: '/analitik', icon: IconTrendingUp, label: 'Analitik Kelas', dosenOnly: true },
      { to: '/manajemen', icon: IconFolder, label: 'Kelola Modul', dosenOnly: true },
      { to: '/changelog', icon: IconClipboard, label: 'Changelog', dosenOnly: true },
    ],
  },
  {
    key: 'akun',
    label: 'Akun',
    items: [
      { to: '/profil', icon: IconUser, label: 'Profil' },
      { to: '/pengaturan', icon: IconGear, label: 'Pengaturan' },
    ],
  },
]

const COLLAPSE_KEY = 'sfp_sidebar_collapsed'
const SECTIONS_KEY = 'sfp_sidebar_sections_open'
const DEFAULT_OPEN_SECTIONS: Record<string, boolean> = Object.fromEntries(
  NAV_SECTIONS.map((s) => [s.key, true]),
)

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [flyout, setFlyout] = useState<string | null>(null)
  // Screen-space Y for the currently-hovered collapsed-rail item's flyout
  // label. Computed from the hovered element's own getBoundingClientRect()
  // and rendered via position:fixed (viewport-relative) instead of
  // position:absolute (ancestor-relative) — absolute positioning let the
  // label get clipped by any ancestor's overflow/stacking quirks; fixed
  // positioning against the real viewport can't be "submerged" by anything.
  const [flyoutTop, setFlyoutTop] = useState(0)
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(COLLAPSE_KEY) === '1',
  )
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return DEFAULT_OPEN_SECTIONS
    try {
      const raw = window.localStorage.getItem(SECTIONS_KEY)
      return raw ? { ...DEFAULT_OPEN_SECTIONS, ...JSON.parse(raw) } : DEFAULT_OPEN_SECTIONS
    } catch {
      return DEFAULT_OPEN_SECTIONS
    }
  })

  // Sections filtered by role first (so an all-dosenOnly section disappears
  // entirely for mahasiswa instead of rendering an empty accordion header),
  // then flattened for the collapsed icon-rail and mobile drawer, which
  // don't use section grouping.
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.dosenOnly || role === 'dosen'),
  })).filter((section) => section.items.length > 0)
  const items = sections.flatMap((section) => section.items)

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        // ignore — storage unavailable, collapsed state just won't persist
      }
      return next
    })
    setFlyout(null)
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      } catch {
        // ignore — storage unavailable, accordion state just won't persist
      }
      return next
    })
  }

  async function doLogout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore — navigate away regardless, matches legacy/modul.html:940 behavior
    }
    navigate('/')
  }

  function renderNavItem(item: NavItem) {
    const active = location.pathname === item.to
    const Icon = item.icon
    return (
      <div
        key={item.to}
        className={collapsed ? 'relative w-full flex justify-center' : 'relative'}
        onMouseEnter={(e) => {
          if (!collapsed) return
          setFlyout(item.to)
          setFlyoutTop(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)
        }}
      >
        <Link
          to={item.to}
          className={`cursor-pointer transition-colors ${
            collapsed ? 'w-10 h-10 rounded-xl flex items-center justify-center' : 'h-9 px-3 rounded-lg flex items-center gap-2.5 text-sm font-semibold'
          } ${
            active
              ? 'bg-brown text-terra'
              : collapsed
                // Collapsed rail already shows a flyout label on hover (below) —
                // a second background-box highlight on the bare icon reads as a
                // stray floating rectangle with no label to anchor it. Just
                // shift the icon color instead.
                ? 'text-brown-2 hover:text-brown'
                : 'text-brown-2 hover:bg-[rgba(62,54,46,.06)] hover:text-brown'
          }`}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
        >
          <Icon size={17} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
        {collapsed && flyout === item.to && (
          <div
            className="fixed left-[80px] z-[999] whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-[0_8px_24px_rgba(62,54,46,.18)]"
            style={{ top: flyoutTop, transform: 'translateY(-50%)', background: 'var(--brown)', color: 'var(--ivory)', animation: 'fadeInBg 0.12s ease' }}
          >
            {item.label}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-cream ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[220px]'}`}>
      {/* ── Desktop sidebar: full-expanded labels by default, collapsible to icon-rail+flyout ── */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-ivory border-r border-[color:var(--border)] py-4 transition-[width] duration-200 ${
          collapsed ? 'w-[72px] items-center' : 'w-[220px] items-stretch px-3'
        }`}
        onMouseLeave={() => setFlyout(null)}
      >
        <div className={`flex items-center mb-3 ${collapsed ? 'justify-center' : 'px-1'}`}>
          {/* Logo doubles as the collapse toggle — no separate icon button.
              Dashboard is still one click away via the "Dashboard" nav item
              in the Utama section below, so nothing is lost by repurposing
              this instead of linking it. */}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            className="cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center text-brown flex-shrink-0 hover:bg-[rgba(62,54,46,.06)] transition-colors"
          >
            <IconBook size={20} />
          </button>
        </div>

        {collapsed ? (
          // Ciut: flat icon rail, hover flyout carries the label — no room
          // for section headers at 72px, so sections collapse into one list.
          <nav className="flex-1 flex flex-col gap-0.5 items-center w-full overflow-y-auto">
            {items.map(renderNavItem)}
          </nav>
        ) : (
          // Expanded: section headers double as accordion triggers, matching
          // SAKTI IconRailV2's expanded-mode grouping. Tight vertical rhythm
          // (36px rows, minimal gaps) so the full dosen list (5 sections/13
          // items) fits without an internal scrollbar on a typical laptop
          // viewport.
          <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
            {sections.map((section) => {
              const open = openSections[section.key] ?? true
              return (
                <div key={section.key}>
                  <button
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between px-3 py-1 rounded-lg cursor-pointer text-[12px] font-bold uppercase tracking-wide text-brown-3 hover:bg-[rgba(62,54,46,.06)] hover:text-brown transition-colors"
                    aria-expanded={open}
                  >
                    <span>{section.label}</span>
                    <IconChevronRight
                      size={13}
                      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                    />
                  </button>
                  {open && (
                    <div className="flex flex-col gap-0.5">
                      {section.items.map(renderNavItem)}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        )}

        <button
          onClick={() => setLogoutOpen(true)}
          onMouseEnter={(e) => {
            if (!collapsed) return
            setFlyout('logout')
            setFlyoutTop(e.currentTarget.getBoundingClientRect().top + e.currentTarget.getBoundingClientRect().height / 2)
          }}
          className={`cursor-pointer transition-colors hover:bg-[rgba(192,64,32,.08)] ${
            collapsed
              ? 'relative w-10 h-10 rounded-xl flex items-center justify-center text-red'
              : 'relative h-9 px-3 rounded-lg flex items-center gap-2.5 text-red text-sm font-semibold'
          }`}
        >
          <IconLogout size={17} />
          {!collapsed && <span>Keluar</span>}
          {collapsed && flyout === 'logout' && (
            <div
              className="fixed left-[80px] z-[999] whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-[0_8px_24px_rgba(62,54,46,.18)]"
              style={{ top: flyoutTop, transform: 'translateY(-50%)', background: 'var(--brown)', color: 'var(--ivory)', animation: 'fadeInBg 0.12s ease' }}
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
        <nav className="flex flex-col p-2 gap-1.5">
          {sections.map((section) => (
            <div key={section.key} className="flex flex-col gap-0.5">
              <span className="px-3.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-brown-3">{section.label}</span>
              {section.items.map((item) => {
                const active = location.pathname === item.to
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className={`min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm cursor-pointer transition-colors ${
                      active ? 'bg-brown text-terra' : 'text-brown-2 hover:bg-[rgba(62,54,46,.06)] hover:text-brown'
                    }`}
                  >
                    <Icon size={17} /> {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
          <button
            onClick={() => { setDrawerOpen(false); setLogoutOpen(true) }}
            className="min-h-11 flex items-center gap-2.5 px-3.5 rounded-lg font-semibold text-sm text-red text-left"
          >
            <IconLogout size={17} /> Keluar
          </button>
        </nav>
      </aside>

      <main className="page-fadein">{children}</main>

      <LogoutModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); doLogout() }}
      />
    </div>
  )
}
