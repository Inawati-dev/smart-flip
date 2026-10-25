import type { ComponentType } from 'react'
import { Link } from 'react-router'

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
  /** Kartu yang sedang jadi saringan daftar di bawahnya (hanya bentuk tombol). */
  aktif?: boolean
}

// Bentuk seragam semua kartu angka (antrean #337), acuannya kartu ringkas
// Dashboard dosen: label kapital kecil di atas, angka besar di bawah. `bar`
// jadi titik warna di depan label. KARTU_DASAR dan KARTU_KLIK juga dipakai
// KartuRingkas (Dashboard) dan kartu angka Asesmen.
export const KARTU_DASAR = 'bg-ivory rounded-2xl border border-[color:var(--border)] p-4 flex flex-col gap-2 min-w-0'
// Hover: garis terra, bayangan, naik 2 px; tekan: turun dan mengecil sedikit.
// Fokus meniru .btn:focus-visible (cincin --accent-soft). Garis pakai kelas,
// bukan style inline, supaya hover:border-terra tidak tertimpa.
export const KARTU_KLIK =
  'w-full text-left cursor-pointer transition-[border-color,box-shadow,transform] duration-200 hover:border-terra hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] active:shadow-sm focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100'

export function StatCard({ bar, val, label, icon: Icon, to, onClick, aktif }: StatCardProps) {
  const isi = (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 flex items-center gap-1.5">
        {Icon ? (
          <span className="shrink-0" style={{ color: bar }}><Icon size={13} /></span>
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: bar }} aria-hidden />
        )}
        <span>{label}</span>
      </span>
      <span className="text-3xl font-bold text-brown tabular-nums">{val}</span>
    </>
  )
  const aria = `${label}: ${val}`
  if (to) {
    return (
      <Link to={to} className={`${KARTU_DASAR} ${KARTU_KLIK}`} aria-label={aria}>
        {isi}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${KARTU_DASAR} ${KARTU_KLIK}`}
        aria-label={aria}
        aria-pressed={aktif}
        style={aktif ? { borderColor: 'var(--terra)', boxShadow: '0 0 0 3px var(--accent-soft)' } : undefined}
      >
        {isi}
      </button>
    )
  }
  return <div className={KARTU_DASAR}>{isi}</div>
}
