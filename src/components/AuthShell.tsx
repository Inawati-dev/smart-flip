import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconClipboard } from './icons'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-fadein min-h-screen bg-cream grid lg:grid-cols-[1.2fr_420px] gap-10 lg:gap-16 px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-20 items-center">
      <div className="max-w-[52ch]">
        <p className="text-[11px] tracking-[.12em] uppercase font-semibold text-terra-d mb-6">
          SMART-FLIP 5.0
        </p>
        <h1 className="font-display font-light text-[clamp(3.5rem,9vw,6.5rem)] leading-[0.98] tracking-tight text-brown mb-6">
          Smart
          <br />
          Flip.
        </h1>
        <p className="text-[0.95rem] leading-relaxed text-brown-2 max-w-[38ch] mb-7">
          E-Modul Adaptif Metode Penelitian &amp; Pengembangan — Fakultas Vokasi, Universitas
          Negeri Malang.
        </p>
        <div className="flex flex-col gap-1.5 text-[0.8rem] text-brown-3 border-t border-[color:var(--border)] pt-5 max-w-[34ch]">
          <span>Fakultas Vokasi</span>
          <span>Universitas Negeri Malang</span>
          <span>Dana Internal UM 2026</span>
        </div>
        <Link
          to="/changelog"
          className="inline-flex items-center gap-1.5 mt-5 text-xs font-medium text-brown-3 hover:text-terra-d"
        >
          <IconClipboard size={14} /> Changelog
        </Link>
      </div>

      <div
        className="rounded-2xl p-6 sm:p-8 flex flex-col gap-5"
        style={{ background: 'var(--ivory)', boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 8px 28px rgba(62,54,46,.09)' }}
      >
        {children}
      </div>
    </div>
  )
}

export const authInputClass =
  'w-full h-[46px] rounded-[10px] border px-3.5 bg-transparent text-[0.9rem] outline-none transition-colors'

export const authInputStyle = {
  borderColor: 'var(--border)',
  background: 'var(--bg3)',
  color: 'var(--brown)',
} as const
