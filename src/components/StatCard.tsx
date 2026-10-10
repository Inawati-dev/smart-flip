import type { ComponentType } from 'react'
import { Link } from 'react-router'

const BORDER = { borderColor: 'var(--border)' } as const

// Kartu angka ringkas (antrean #116), dipakai Dashboard, Kelas, dan Akun.
// Tanpa `icon` = bentuk Kelas/Akun; dengan `icon` = bentuk Dashboard.
// `to` -> Link, `onClick` -> button; keduanya kosong -> div biasa.
export interface StatCardProps {
  bar: string
  val: string
  label: string
  icon?: ComponentType<{ size?: number }>
  to?: string
  onClick?: () => void
}

const DASAR = 'bg-ivory rounded-2xl border p-3.5 relative overflow-hidden'
// Hover dan fokus meniru ShortcutCard (hover:border-terra) dan .btn:focus-visible
// (cincin --accent-soft). Warna garis pakai kelas, bukan style inline, supaya
// hover:border-terra tidak tertimpa.
const KLIK =
  'block w-full text-left cursor-pointer border-[color:var(--border)] transition-colors hover:shadow-sm hover:border-terra focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]'

export function StatCard({ bar, val, label, icon: Icon, to, onClick }: StatCardProps) {
  const isi = (
    <>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      {Icon ? (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-terra" style={{ background: 'var(--accent-soft)' }}>
            <Icon size={16} />
          </div>
          <div className="text-xl font-bold text-brown">{val}</div>
        </div>
      ) : (
        <div className="text-xl font-bold text-brown">{val}</div>
      )}
      <div className="text-[11px] text-brown-3 mt-1.5">{label}</div>
    </>
  )
  const aria = `${label}: ${val}`
  if (to) {
    return (
      <Link to={to} className={`${DASAR} ${KLIK}`} aria-label={aria}>
        {isi}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${DASAR} ${KLIK}`} aria-label={aria}>
        {isi}
      </button>
    )
  }
  return (
    <div className={DASAR} style={BORDER}>
      {isi}
    </div>
  )
}
