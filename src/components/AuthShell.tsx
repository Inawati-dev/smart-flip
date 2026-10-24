import type { ReactNode } from 'react'

// Brand badge — rounded square (echoes SAKTI's IconRailV2 sidebar badge)
// with the SMART-FLIP logo (antrean #300, A1 "Halaman Terbang ke Bintang").
// Copy of public/assets/favicon.svg, the single source of every app icon
// (scripts/buat_ikon.py): change both together. Exported for reuse in
// Layout.tsx's sidebar toggle badge so the mark reads as one consistent
// logo everywhere, not just here (mobile-only compact header).
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="flex-shrink-0">
      <rect width="64" height="64" rx="15" fill="#1D5FA8" />
      <g transform="translate(8 7) scale(0.75)">
        <path d="M32 26C25 21 15 20 7 22v30c8-2 18-1 25 4z" fill="#FFFFFF" />
        <path d="M32 26c7-5 17-6 25-4v30c-8-2-18-1-25 4z" fill="#BFE2FB" />
        <path d="M32 26c5-9 14-14 25-13-6 4-14 11-25 25z" fill="#7CC4F6" />
        <path d="M32 54c0-9-8-12-8-21M32 54c0-9 8-12 8-21" fill="none" stroke="#1D5FA8" strokeWidth="4.8" strokeLinecap="round" />
        <path d="M32 0.5l2.9 5.9 6.5 1-4.7 4.6 1.1 6.4L32 15.3l-5.8 3.1 1.1-6.4-4.7-4.6 6.5-1z" fill="#F2B544" />
      </g>
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
        style={{
          background: 'var(--ivory)',
          boxShadow:
            '0 0.5px 2px color-mix(in srgb, var(--shadow-color) 6%, transparent), 0 8px 28px color-mix(in srgb, var(--shadow-color) 9%, transparent)',
        }}
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
  'w-full h-[46px] rounded-[var(--radius-control)] border px-3.5 bg-transparent text-base outline-none transition-colors'

export const authInputStyle = {
  borderColor: 'var(--border)',
  background: 'var(--bg3)',
  color: 'var(--brown)',
} as const
