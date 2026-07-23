# Shared Layout Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one shared `Layout` component (topbar, mobile nav-drawer, logout confirmation modal) used by every authenticated page, so future page ports don't each reinvent this chrome — the exact mistake the dark-mode-duplication cleanup (earlier this project) fixed for theming. Retrofit the two already-ported pages (`Dashboard`, `Modul`) to use it, which also closes a real compliance gap: neither currently has a logout button, and `CLAUDE.md`'s Mobile Support Rules require every page with logout to show a confirmation modal first.

**Architecture:** `LogoutModal` (dumb confirm dialog) + `Layout` (topbar + hamburger + drawer, owns open/close state and wires `LogoutModal` in) as two small, independently-testable components. Nav links to not-yet-ported pages (`Profil`, `Changelog`) go straight to `/legacy/*.html`, matching the CTA-link pattern already established in the Modul page port (avoids the param-dropping `LegacyStub` dead-end).

**Tech Stack:** Same as the rest of this codebase — React 19, TypeScript, Tailwind v4, `react-router`, `@supabase/supabase-js`.

## Global Constraints

- Per `CLAUDE.md`'s Mobile Support Rules: every page with a logout control MUST show a confirmation modal ("Yakin ingin keluar?" / Batal + Keluar) before calling sign-out — never sign out directly on click.
- Nav-drawer must be responsive: hidden topbar links replaced by a hamburger + drawer at ≤768px (matches the existing pattern already used across every `legacy/*.html` page, e.g. `legacy/modul.html:40-59`).
- Links to pages not yet ported (`Profil`, `Changelog`) go directly to `/legacy/profil.html` / `/legacy/changelog.html` — not through the internal `/profil`/`/changelog` `LegacyStub` routes.
- Working directory: `C:\1-Johan\10. Pengembangan\Smart Flipbook\.claude\worktrees\audit-demo-fields` (git branch `claude/audit-demo-fields`).

---

### Task 1: `LogoutModal` component

**Files:**
- Create: `src/components/LogoutModal.tsx`
- Test: `src/components/LogoutModal.test.tsx`

**Interfaces:**
- Produces: `LogoutModal({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void })` — a controlled dialog, renders nothing when `open` is false.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LogoutModal } from './LogoutModal'

describe('LogoutModal', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <LogoutModal open={false} onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(html).toBe('')
  })

  it('renders the confirmation copy and both buttons when open', () => {
    const html = renderToStaticMarkup(
      <LogoutModal open={true} onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(html).toContain('Yakin ingin keluar?')
    expect(html).toContain('Batal')
    expect(html).toContain('Keluar')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test LogoutModal`
Expected: FAIL — `Cannot find module './LogoutModal'`

- [ ] **Step 3: Write `src/components/LogoutModal.tsx`**

Styling ports `legacy/modul.html:254-266`'s logout-modal CSS exactly (warm overlay tint, brand border/shadow tokens) rather than generic Tailwind gray/black defaults — this project's whole visual identity (see `CLAUDE.md` Design Tokens) is a warm parchment/editorial palette, and reaching for default `border-gray-300`/`bg-black/50`/`shadow-lg` would read as off-brand, generic-AI styling next to every hand-tuned legacy page.

```typescript
export function LogoutModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'rgba(62,54,46,.52)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full text-center"
        style={{ background: 'var(--ivory)', boxShadow: '0 8px 40px rgba(62,54,46,.22)' }}
      >
        <h3 className="font-['Playfair_Display',serif] text-lg font-bold text-brown mb-2">
          Yakin ingin keluar?
        </h3>
        <p className="text-sm text-brown-2 mb-6 opacity-75">
          Progres belajar kamu tersimpan otomatis.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 min-h-11 rounded-lg font-medium text-sm"
            style={{ border: '1.5px solid var(--border)', background: 'transparent' }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 min-h-11 rounded-lg bg-terra text-white font-semibold text-sm"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test LogoutModal`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/LogoutModal.tsx src/components/LogoutModal.test.tsx
git commit -m "feat: LogoutModal component, ports legacy logout-confirmation dialog (CLAUDE.md Mobile Support Rules requirement)"
```

---

### Task 2: `Layout` component — topbar, hamburger, nav drawer

**Files:**
- Create: `src/components/Layout.tsx`
- Test: `src/components/Layout.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`src/contexts/AuthContext.tsx`), `supabase` (`src/lib/supabase.ts`), `LogoutModal` (Task 1).
- Produces: `Layout({ children }: { children: ReactNode })` — renders topbar + mobile nav-drawer + `LogoutModal`, then `children` inside a `<main>`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Layout } from './Layout'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('Layout', () => {
  it('renders the topbar nav links and its children', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider>
          <Layout>
            <p>page content</p>
          </Layout>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(html).toContain('page content')
    expect(html).toContain('/legacy/profil.html')
    expect(html).toContain('/legacy/changelog.html')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- Layout.test`
Expected: FAIL — `Cannot find module './Layout'`

- [ ] **Step 3: Write `src/components/Layout.tsx`**

Ports the topbar + hamburger + nav-drawer structure from `legacy/modul.html:271-300` (JSX/React-ified: `useState` for drawer open/close instead of classList toggling, `useState` for the logout modal instead of a separate DOM modal toggled by global functions).

Border/backdrop colors use Tailwind v4 arbitrary-value syntax (`border-[color:var(--border)]`) to pull directly from this project's own warm hairline-border token instead of default Tailwind gray — same reasoning as `LogoutModal` above: default `border-gray-200`/`gray-300` would look off-brand next to every hand-tuned legacy page.

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- Layout.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx src/components/Layout.test.tsx
git commit -m "feat: Layout component (topbar, mobile nav-drawer, logout modal wiring), built once for reuse across all authenticated pages"
```

---

### Task 3: Retrofit `Dashboard` and `Modul` to use `Layout`

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Modul.tsx`
- Modify: `src/pages/Dashboard.test.tsx`
- Modify: `src/pages/Modul.test.tsx`

**Interfaces:**
- Consumes: `Layout` (Task 2).

- [ ] **Step 1: Update `src/pages/Dashboard.tsx`** — wrap the existing content in `Layout`, drop the now-redundant outer `min-h-screen bg-cream` (Layout owns that), keep the inner padding:

```typescript
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { ModuleCard } from '../components/ModuleCard'
import { moduleIdToPath } from '../lib/progress'
import { Layout } from '../components/Layout'

export function Dashboard() {
  const { profile } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-brown mb-1">
          Halo, {profile?.full_name || 'Pengguna'}
        </h1>
        <p className="text-brown-3 mb-6">
          {profile?.role === 'dosen' ? 'Dashboard Dosen' : 'Dashboard Mahasiswa'}
        </p>

        <div className="flex flex-col gap-3">
          {modules.map((m) => (
            <ModuleCard key={m.id} module={m} progress={progress[moduleIdToPath(m.id)]} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Update `src/pages/Modul.tsx`** — same wrapping pattern: import `Layout`, wrap the existing root `<div className="min-h-screen bg-cream p-6 max-w-3xl mx-auto">...</div>` content in `<Layout>`, changing that root div's classes to just `p-6 max-w-3xl mx-auto` (drop `min-h-screen bg-cream`, Layout supplies it). Also update the two early-return states (`isLoading`, `!modul`) to render inside `<Layout>` too, not as bare unwrapped divs — so a user who navigates to a bad module id still sees the topbar/nav, not a blank chromeless page:

```typescript
  if (isLoading) return <Layout><div className="p-8 text-brown-3">Memuat…</div></Layout>
  if (!modul) return <Layout><div className="p-8 text-brown">Modul tidak ditemukan</div></Layout>
```

(Everything else in `Modul.tsx` stays the same — just the import added, the two early returns wrapped, and the root return's outer `<div>` wrapped in `<Layout>...</Layout>` with its className trimmed as described.)

- [ ] **Step 3: Update `src/pages/Dashboard.test.tsx` and `src/pages/Modul.test.tsx`'s mocks**

Both tests currently mock `../lib/supabase` for their own data hooks. `Layout` also calls `supabase.auth.signOut` (only on click, not on render, so the existing mocks likely already satisfy `Layout`'s render-time needs — `getSession`/`onAuthStateChange` from `AuthProvider`) — but `Layout`'s render doesn't call `supabase.auth.getUser()` or anything new at mount time beyond what `AuthProvider` already needs. Run the existing tests first; if either fails because the mock object is missing a method `Layout`/`LogoutModal` needs (unlikely, since `LogoutModal` only renders when `open` is true and starts `false`), add the missing mock method matching the shape already used elsewhere in this codebase (e.g. `signOut: async () => ({ error: null })`, matching Task 2's own test mock).

- [ ] **Step 4: Run the full suite**

Run: `pnpm test`
Expected: PASS — all suites.

- [ ] **Step 5: Run a full build**

Run: `pnpm build`
Expected: succeeds, zero type errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Modul.tsx src/pages/Dashboard.test.tsx src/pages/Modul.test.tsx
git commit -m "feat: retrofit Dashboard and Modul pages to use shared Layout (adds logout button + confirmation modal, closes CLAUDE.md compliance gap)"
```

---

## Self-Review Notes (completed during plan authoring)

- **Spec coverage:** `LogoutModal` (Task 1), `Layout` (Task 2), and retrofitting both existing pages (Task 3) are all covered — nothing in scope is left unaddressed.
- **CLAUDE.md compliance:** this plan directly closes a real gap (neither `Dashboard` nor `Modul` currently has a logout button or confirmation modal, violating the project's own Mobile Support Rules) rather than just being architectural nice-to-have.
- **No placeholders:** every step has complete code.
- **Type consistency:** `Layout`'s single prop (`children: ReactNode`) is a stable, minimal interface — Task 3's retrofit doesn't need to pass anything else in, keeping the two page components' own logic completely unchanged aside from the wrapping.
