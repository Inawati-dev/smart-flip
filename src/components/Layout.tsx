import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { resetOnboarding } from '../lib/onboarding'
import { LogoutModal } from './LogoutModal'
import { BrandMark } from './AuthShell'
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
  IconTarget,
} from './icons'

interface NavItem {
  to: string
  icon: ComponentType<{ size?: number }>
  label: string
  dosenOnly?: boolean
  mahasiswaOnly?: boolean
}

interface NavSection {
  key: string
  label: string
  // Shown as the SINGLE icon representing this whole section in the
  // collapsed rail (matches SAKTI IconRailV2: one icon per section, not one
  // per item — items only surface in the hover flyout).
  icon: ComponentType<{ size?: number }>
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
    icon: IconHome,
    items: [
      { to: '/dashboard', icon: IconHome, label: 'Dashboard' },
      { to: '/ebook', icon: IconBook, label: 'Katalog Modul' },
      { to: '/diagnostik', icon: IconTarget, label: 'Diagnostik', mahasiswaOnly: true },
    ],
  },
  {
    key: 'kolaborasi',
    label: 'Kolaborasi',
    icon: IconChat,
    items: [
      { to: '/forum', icon: IconChat, label: 'Forum' },
      { to: '/draf', icon: IconEdit, label: 'Draf' },
    ],
  },
  {
    key: 'belajar',
    label: 'Belajar',
    icon: IconCompass,
    items: [
      { to: '/feedback', icon: IconStar, label: 'Feedback' },
      { to: '/vark', icon: IconCompass, label: 'Gaya Belajar' },
    ],
  },
  {
    key: 'kelola-kelas',
    label: 'Kelola Kelas',
    icon: IconUsers,
    // Alfabetis by label -- gampang di-scan sekarang isinya 5 item.
    items: [
      { to: '/analitik', icon: IconTrendingUp, label: 'Analitik Kelas', dosenOnly: true },
      { to: '/kelas', icon: IconUsers, label: 'Kelas', dosenOnly: true },
      { to: '/manajemen', icon: IconFolder, label: 'Kelola Modul', dosenOnly: true },
      { to: '/ngain', icon: IconChart, label: 'N-Gain', dosenOnly: true },
      { to: '/validasi', icon: IconCheck, label: 'Validasi Ahli', dosenOnly: true },
    ],
  },
  {
    key: 'akun',
    label: 'Akun',
    icon: IconUser,
    items: [
      { to: '/profil', icon: IconUser, label: 'Profil' },
      { to: '/pengaturan', icon: IconGear, label: 'Pengaturan' },
      { to: '/changelog', icon: IconClipboard, label: 'Changelog', dosenOnly: true },
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
  const { user, role } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [flyout, setFlyout] = useState<string | null>(null)
  // Screen-space Y for the currently-hovered collapsed-rail item's flyout
  // label. Computed from the hovered element's own getBoundingClientRect()
  // and rendered via position:fixed (viewport-relative) instead of
  // position:absolute (ancestor-relative) — absolute positioning let the
  // label get clipped by any ancestor's overflow/stacking quirks; fixed
  // positioning against the real viewport can't be "submerged" by anything.
  // NOT switched to SAKTI's plain absolute+overflow:visible even after
  // matching its close-delay below and its 1-icon-per-section rail (which
  // shrank collapsed height from ~15 stacked item-icons down to 5
  // section-icons, matching SAKTI): fixed positioning's anti-clipping
  // guarantee is still strictly safer than absolute+overflow:visible with
  // no real cost now that height isn't the concern it used to be, so it's
  // kept rather than re-introducing a clipping risk for no benefit.
  const [flyoutTop, setFlyoutTop] = useState(0)
  // Collapsed-rail group flyout (ala SAKTI's IconRailV2): hovering any icon
  // in a section pops a small card listing that WHOLE section's items with
  // labels, instead of a single-item tooltip -- lets the ciut rail stay
  // navigable by section without needing to expand.
  const [groupFlyout, setGroupFlyout] = useState<string | null>(null)
  const [groupFlyoutTop, setGroupFlyoutTop] = useState(0)
  // 250ms close-grace-period — matches SAKTI IconRailV2's
  // scheduleCloseFlyout/cancelCloseFlyout exactly, so moving the mouse
  // across the small gap to the flyout card (or briefly off it) doesn't
  // slam it shut. Two independent timers since groupFlyout (section
  // submenu, closes on <nav> leave) and flyout (logout tooltip, closes on
  // <aside> leave) have different closing triggers and can't share one.
  const groupFlyoutCloseTimer = useRef<number | null>(null)
  const cancelCloseGroupFlyout = () => {
    if (groupFlyoutCloseTimer.current != null) {
      window.clearTimeout(groupFlyoutCloseTimer.current)
      groupFlyoutCloseTimer.current = null
    }
  }
  const scheduleCloseGroupFlyout = () => {
    cancelCloseGroupFlyout()
    groupFlyoutCloseTimer.current = window.setTimeout(() => setGroupFlyout(null), 250)
  }
  const flyoutCloseTimer = useRef<number | null>(null)
  const cancelCloseFlyout = () => {
    if (flyoutCloseTimer.current != null) {
      window.clearTimeout(flyoutCloseTimer.current)
      flyoutCloseTimer.current = null
    }
  }
  const scheduleCloseFlyout = () => {
    cancelCloseFlyout()
    flyoutCloseTimer.current = window.setTimeout(() => setFlyout(null), 250)
  }
  useEffect(() => () => {
    cancelCloseGroupFlyout()
    cancelCloseFlyout()
  }, [])
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
    items: section.items.filter(
      (item) => (!item.dosenOnly || role === 'dosen') && (!item.mahasiswaOnly || role !== 'dosen'),
    ),
  })).filter((section) => section.items.length > 0)

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

  // Only used for the expanded desktop accordion now — the collapsed rail
  // renders its own icon-only Links inline (see the group-flyout block
  // below), since it needs per-SECTION hover state, not per-item.
  function renderNavItem(item: NavItem) {
    const active = location.pathname === item.to
    const Icon = item.icon
    return (
      <div key={item.to} className="relative">
        <Link
          to={item.to}
          className={`cursor-pointer transition-colors h-9 px-3 rounded-lg flex items-center gap-2.5 text-sm font-semibold ${
            active ? 'bg-brown text-btn-text' : 'text-brown-2 hover:bg-brown/[0.06] hover:text-brown'
          }`}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
        >
          <Icon size={17} />
          <span className="truncate">{item.label}</span>
        </Link>
      </div>
    )
  }

  // Anonymous visitor on a real (Supabase-configured) deploy — e.g. /changelog
  // reached from the logged-out AuthShell footer, before ProtectedRoute would
  // otherwise gate it: render a minimal standalone header instead of the full
  // authenticated nav, since the real sidebar/drawer expose the whole app's
  // menu structure (Dashboard, Forum, Draf, Profil, etc.) to outside visitors.
  // Demo mode (isSupabaseConfigured === false) never has a real `user` by
  // design, so it's excluded here — that mode intentionally browses the full
  // app locally without auth.
  if (isSupabaseConfigured && !user) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="sticky top-0 z-40 h-[58px] bg-cream/90 backdrop-blur-lg border-b border-[color:var(--border)]">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4 max-w-[900px] mx-auto">
            <Link to="/" className="flex items-center gap-2 no-underline text-brown">
              <BrandMark size={26} />
              <span className="font-display font-bold text-brown">Smart Flip</span>
            </Link>
            <Link
              to="/"
              className="h-9 px-4 rounded-lg flex items-center text-sm font-semibold text-brown-2 hover:bg-brown/[0.06] hover:text-brown transition-colors"
            >
              Masuk
            </Link>
          </div>
        </header>
        <main className="page-fadein">{children}</main>
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
        onMouseLeave={scheduleCloseFlyout}
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
            className="cursor-pointer flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-80"
          >
            <BrandMark size={32} />
            {!collapsed && (
              <span className="font-display font-semibold text-brown truncate">
                Smart Flip <span className="text-terra-d text-sm">5.0</span>
              </span>
            )}
          </button>
        </div>

        {collapsed ? (
          // Ciut: ONE icon per SECTION (not per item) — matches SAKTI
          // IconRailV2 exactly. Clicking navigates to that section's first
          // item; hovering opens the flyout with all of the section's items.
          // A hairline divider separates each section's single icon.
          <nav
            className="flex-1 flex flex-col items-center w-full overflow-y-auto"
            onMouseLeave={scheduleCloseGroupFlyout}
          >
            {sections.map((section, i) => {
              const SectionIcon = section.icon
              const sectionActive = section.items.some((item) => location.pathname === item.to)
              return (
              <div
                key={section.key}
                className={`relative flex items-center justify-center w-full ${
                  i > 0 ? 'mt-2 pt-2 border-t border-[color:var(--border)]' : ''
                }`}
                onMouseEnter={(e) => {
                  cancelCloseGroupFlyout()
                  setGroupFlyout(section.key)
                  setGroupFlyoutTop(e.currentTarget.getBoundingClientRect().top)
                }}
              >
                <Link
                  to={section.items[0].to}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                    sectionActive ? 'bg-brown text-btn-text' : 'text-brown-2 hover:text-brown'
                  }`}
                  aria-label={section.label}
                  aria-current={sectionActive ? 'page' : undefined}
                >
                  <SectionIcon size={17} />
                </Link>

                {groupFlyout === section.key && (
                  <div
                    className="fixed left-[80px] z-[999] rounded-[4px] overflow-hidden bg-ivory border border-[color:var(--border)] shadow-[0_8px_24px_rgba(62,54,46,.18)] min-w-[180px]"
                    style={{ top: groupFlyoutTop, animation: 'fadeInBg 0.12s ease' }}
                  >
                    <div className="px-3.5 pt-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-brown-3">
                      {section.label}
                    </div>
                    <div className="flex flex-col pb-1.5">
                      {section.items.map((item) => {
                        const active = location.pathname === item.to
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            className={`flex items-center gap-2.5 px-3.5 h-9 text-sm font-medium transition-colors ${
                              active ? 'bg-brown/[0.06] text-brown font-semibold' : 'text-brown-2 hover:bg-brown/[0.06] hover:text-brown'
                            }`}
                            aria-current={active ? 'page' : undefined}
                          >
                            <Icon size={16} />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              )
            })}
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
                    className="w-full flex items-center justify-between px-3 py-1 rounded-lg cursor-pointer text-[12px] font-bold uppercase tracking-wide text-brown-3 hover:bg-brown/[0.06] hover:text-brown transition-colors"
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
            cancelCloseFlyout()
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
            <BrandMark size={26} />
            <span className="font-display font-bold text-brown">E-Modul Adaptif</span>
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
          <span className="font-display font-bold text-brown">Menu</span>
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
                      active ? 'bg-brown text-btn-text' : 'text-brown-2 hover:bg-brown/[0.06] hover:text-brown'
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
