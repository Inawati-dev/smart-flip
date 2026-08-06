import type { ReactNode } from 'react'

// Brand badge — rounded square (echoes SAKTI's IconRailV2 sidebar badge)
// with an open-book glyph, white on terra-d. Exported for reuse in
// Layout.tsx's sidebar toggle badge so the mark reads as one consistent
// logo everywhere, not just here (mobile-only compact header).
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="rounded-[8px] flex-shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--terra-d)" />
      <path
        d="M16 11C13.5 9.3 10.5 9 8 9.6V22.4C10.5 21.8 13.5 22.1 16 23.8"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 11C18.5 9.3 21.5 9 24 9.6V22.4C21.5 21.8 18.5 22.1 16 23.8"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 11V23.8" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
    </svg>
  )
}

// Both the desktop wordmark column and the mobile compact-header + footer
// block render the SAME tagline/meta content, just laid out differently —
// simpler than reordering one shared block with CSS `order` across a
// breakpoint-dependent grid.
//
// Tautan Changelog sengaja TIDAK ada di sini: riwayat rilis cuma untuk dosen
// (lihat rute /changelog di App.tsx), jadi menampilkannya di halaman
// login/daftar yang bisa diakses siapa saja cuma mengarah ke halaman yang
// akan menolak pengunjungnya.
function IntroDetails() {
  return (
    <>
      <p className="text-[0.95rem] leading-relaxed text-brown-2 mb-4">
        E-Modul Adaptif Metode Penelitian &amp; Pengembangan.
      </p>
      <div className="flex flex-col gap-1.5 text-[0.8rem] text-brown-3 border-t border-[color:var(--border)] pt-3">
        <span>Fakultas Vokasi</span>
        <span>Universitas Negeri Malang</span>
        <span>Dana Internal UM 2026</span>
      </div>
    </>
  )
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-fadein min-h-screen bg-cream flex items-center justify-center px-5 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      <div
        className="w-full max-w-[860px] rounded-2xl p-5 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-9"
        style={{ background: 'var(--ivory)', boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 8px 28px rgba(62,54,46,.09)' }}
      >
        {/* Mobile-only compact header — icon mark + wordmark, replaces the
            big serif column (hidden below lg) so the login card can come
            first without an oversized heading pushing it down the page. */}
        <div className="lg:hidden order-1 flex items-center gap-2.5">
          <BrandMark size={30} />
          <span className="font-display text-lg font-semibold text-brown">Smart Flip 5.0</span>
        </div>

        <div className="order-2 lg:order-2 flex flex-col gap-4">{children}</div>

        {/* Desktop wordmark column — hidden on mobile, shown as the left
            half of the card with a thin divider (border-r) instead of a
            separate floating column far from the form. */}
        <div
          className="hidden lg:flex lg:order-1 flex-col justify-center lg:pr-9 lg:border-r"
          style={{ borderColor: 'var(--border)' }}
        >
          <h1 className="font-display font-light text-[2.9rem] leading-[0.98] tracking-tight text-brown mb-4">
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
