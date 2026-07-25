import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconClipboard } from './icons'

// Brand mark — two overlapping "page-flip" shapes (brown base page + terra
// page mid-flip), same design approved separately as the app's logo. Only
// used here (mobile-only compact header) so it stays inline rather than in
// the shared icons.tsx set.
function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 52 L14 47.5 Q10 46.4 10 42.2 L10 20.6 Q10 16.6 14 17.9 L32 24 Z" fill="var(--brown)" />
      <path d="M32 52 L50 47.5 Q54 46.4 54 42.2 L54 25.5 Q54 15.5 45 19.3 Q37.5 22.4 32 24 Z" fill="var(--terra)" />
    </svg>
  )
}

// Both the desktop wordmark column and the mobile compact-header + footer
// block render the SAME tagline/meta/changelog content, just laid out
// differently — simpler than reordering one shared block with CSS `order`
// across a breakpoint-dependent grid.
function IntroDetails() {
  return (
    <>
      <p className="text-[0.95rem] leading-relaxed text-brown-2 mb-5">
        E-Modul Adaptif Metode Penelitian &amp; Pengembangan.
      </p>
      <div className="flex flex-col gap-1.5 text-[0.8rem] text-brown-3 border-t border-[color:var(--border)] pt-4 mb-4">
        <span>Fakultas Vokasi</span>
        <span>Universitas Negeri Malang</span>
        <span>Dana Internal UM 2026</span>
      </div>
      <Link
        to="/changelog"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brown-3 hover:text-terra-d"
      >
        <IconClipboard size={14} /> Changelog
      </Link>
    </>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-fadein min-h-screen bg-cream flex items-center justify-center px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
      <div
        className="w-full max-w-[860px] rounded-2xl p-6 sm:p-8 lg:p-11 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-11"
        style={{ background: 'var(--ivory)', boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 8px 28px rgba(62,54,46,.09)' }}
      >
        {/* Mobile-only compact header — icon mark + wordmark, replaces the
            big serif column (hidden below lg) so the login card can come
            first without an oversized heading pushing it down the page. */}
        <div className="lg:hidden order-1 flex items-center gap-2.5">
          <BrandMark size={30} />
          <span className="font-display text-lg font-semibold text-brown">Smart Flip 5.0</span>
        </div>

        <div className="order-2 lg:order-2 flex flex-col gap-5">{children}</div>

        {/* Desktop wordmark column — hidden on mobile, shown as the left
            half of the card with a thin divider (border-r) instead of a
            separate floating column far from the form. */}
        <div
          className="hidden lg:flex lg:order-1 flex-col justify-center lg:pr-11 lg:border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          <h1 className="font-display font-light text-[3.4rem] leading-[0.98] tracking-tight text-brown mb-5">
            Smart
            <br />
            Flip. <span className="text-[1.35rem] align-middle text-terra-d font-semibold">5.0</span>
          </h1>
          <IntroDetails />
        </div>

        {/* Mobile-only footer block — same details, placed under the login
            card instead of above it. */}
        <div className="lg:hidden order-3">
          <IntroDetails />
        </div>
      </div>
    </div>
  )
}

// text-base (16px) — anything smaller triggers iOS Safari's auto-zoom-on-focus
// on form inputs (CLAUDE.md mobile rules: 16px minimum for inputs).
export const authInputClass =
  'w-full h-[46px] rounded-[10px] border px-3.5 bg-transparent text-base outline-none transition-colors'

export const authInputStyle = {
  borderColor: 'var(--border)',
  background: 'var(--bg3)',
  color: 'var(--brown)',
} as const
