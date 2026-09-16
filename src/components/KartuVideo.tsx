import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { thumbnailUrl } from '../lib/video'
import { IconPlay } from './icons'

// Kartu video di rak (antrean #85). Thumbnail 16:9: gambar YouTube bila
// tautannya YouTube, gradasi warna sampul topik bila unggahan atau kosong.
export interface KartuVideoProps {
  nomor: number
  judul: string
  url?: string | null
  /** Durasi terformat, mis. "12:00". */
  durasi?: string
  chip?: ReactNode
  terkunci?: boolean
  judulKunci?: string
  to?: string
  onClick?: () => void
  aksi?: ReactNode
  /** Warna latar gradasi bila tanpa thumbnail; bawaan --cover-1. */
  warna?: string
}

export function KartuVideo({ nomor, judul, url, durasi, chip, terkunci, judulKunci, to, onClick, aksi, warna }: KartuVideoProps) {
  const thumb = url ? thumbnailUrl(url) : null
  const dasar = warna ?? 'var(--cover-1)'
  const kotak = (
    <div
      className="relative w-full aspect-video rounded-[10px] overflow-hidden grid place-items-center"
      style={{ background: `linear-gradient(140deg, ${dasar}, color-mix(in srgb, ${dasar} 70%, black))`, color: 'var(--cover-ink)' }}
    >
      {thumb && <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <span
        className="relative w-10 h-10 rounded-full grid place-items-center"
        style={{ background: 'color-mix(in srgb, var(--cover-ink) 16%, transparent)', backdropFilter: 'blur(2px)' }}
        aria-hidden="true"
      >
        <IconPlay size={18} />
      </span>
      {durasi && (
        <span
          className="absolute right-2 bottom-1.5 text-[11px] tabular-nums px-1.5 py-px rounded"
          style={{ background: 'color-mix(in srgb, black 35%, transparent)', color: 'var(--cover-ink)' }}
        >
          {durasi}
        </span>
      )}
    </div>
  )
  const bisaKlik = !terkunci && (to || onClick)
  const label = `Putar video pertemuan ${nomor}: ${judul}`
  return (
    <div className={`flex flex-col gap-2 ${terkunci ? 'opacity-55' : ''}`} title={terkunci ? judulKunci : undefined} aria-disabled={terkunci || undefined}>
      {bisaKlik && to ? (
        <Link to={to} className="block rounded-[10px] transition-transform hover:-translate-y-0.5" aria-label={label}>
          {kotak}
        </Link>
      ) : bisaKlik && onClick ? (
        <button type="button" onClick={onClick} className="block w-full rounded-[10px] transition-transform hover:-translate-y-0.5" aria-label={label}>
          {kotak}
        </button>
      ) : (
        kotak
      )}
      <span className="text-xs text-brown-3">Pertemuan {nomor}</span>
      <b className="text-sm font-semibold text-brown leading-snug -mt-1">{judul}</b>
      {chip && <div className="flex items-center justify-between gap-2">{chip}</div>}
      {aksi && <div className="grid grid-cols-2 gap-1.5">{aksi}</div>}
    </div>
  )
}
