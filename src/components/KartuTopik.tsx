import type { ReactNode } from 'react'
import { Link } from 'react-router'

// Kartu buku di rak sampul (antrean #85, opsi B "Rak Sampul"). Dipakai Modul
// mahasiswa (klik membuka pembaca, kartu terkunci pudar) dan Modul dosen
// (baris aksi lewat `aksi`). Warna sampul bergilir dari tiga token tema
// (--cover-1/2/3) supaya rak tidak seragam; tinta di atas sampul --cover-ink.
export interface KartuTopikProps {
  nomor: number
  judul: string
  /** Teks kecil di kaki sampul, mis. "40 hal" atau "PDF". */
  keterangan?: string
  /** 0..100; bar progres di bawah sampul. Tidak ditampilkan bila undefined. */
  persen?: number
  /** Teks kiri di kaki kartu, mis. "12/30 hal". */
  kaki?: string
  chip?: ReactNode
  terkunci?: boolean
  judulKunci?: string
  /** Tujuan klik sampul; tanpa `to` dan `onClick` sampul tidak bisa diklik. */
  to?: string
  onClick?: () => void
  /** Baris aksi dosen di bawah kartu. */
  aksi?: ReactNode
}

const WARNA = ['var(--cover-1)', 'var(--cover-2)', 'var(--cover-3)'] as const

export function warnaSampul(nomor: number): string {
  return WARNA[(Math.max(1, nomor) - 1) % WARNA.length]
}

export function KartuTopik({ nomor, judul, keterangan, persen, kaki, chip, terkunci, judulKunci, to, onClick, aksi }: KartuTopikProps) {
  const sampul = (
    <div
      className="w-full aspect-[3/4] flex flex-col justify-between p-3.5 pl-5 rounded-[4px_10px_10px_4px]"
      style={{
        background: warnaSampul(nomor),
        color: 'var(--cover-ink)',
        boxShadow: 'inset 8px 0 0 color-mix(in srgb, black 22%, transparent), 0 6px 14px -8px color-mix(in srgb, var(--shadow-color) 35%, transparent)',
      }}
    >
      <span className="text-[11px] tracking-[.08em] uppercase opacity-80">Topik {String(nomor).padStart(2, '0')}</span>
      <div>
        <div className="w-7 h-0.5 mb-2" style={{ background: 'var(--gold)' }} />
        <h3 className="font-display text-[17px] leading-tight font-semibold" style={{ color: 'var(--cover-ink)' }}>
          {judul}
        </h3>
      </div>
      <span className="text-[11px] tracking-[.08em] uppercase opacity-80 tabular-nums">{keterangan ?? ''}</span>
    </div>
  )
  const bisaKlik = !terkunci && (to || onClick)
  const label = `Buka topik ${nomor}: ${judul}`
  return (
    <div className={`flex flex-col gap-2 ${terkunci ? 'opacity-55' : ''}`} title={terkunci ? judulKunci : undefined} aria-disabled={terkunci || undefined}>
      {bisaKlik && to ? (
        <Link to={to} className="block rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5" aria-label={label}>
          {sampul}
        </Link>
      ) : bisaKlik && onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5" aria-label={label}>
          {sampul}
        </button>
      ) : (
        sampul
      )}
      {persen != null && (
        <div className="h-[5px] rounded-[3px] overflow-hidden" style={{ background: 'var(--bg3)' }} aria-hidden="true">
          <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, persen))}%`, background: 'var(--success)' }} />
        </div>
      )}
      {(kaki || chip) && (
        <div className="flex items-center justify-between gap-2 text-xs text-brown-3 tabular-nums">
          <span>{kaki ?? ''}</span>
          {chip}
        </div>
      )}
      {aksi && <div className="grid grid-cols-2 gap-1.5">{aksi}</div>}
    </div>
  )
}

/** Chip status baku rak: Selesai (ok), Sedang dibaca (now), Terkunci (todo), peringatan (warn). */
export function ChipRak({ jenis, label }: { jenis: 'ok' | 'now' | 'todo' | 'warn'; label: string }) {
  const gaya =
    jenis === 'ok'
      ? { background: 'var(--success-soft)', color: 'var(--success)' }
      : jenis === 'now'
        ? { background: 'var(--accent-soft)', color: 'var(--terra-d)' }
        : jenis === 'warn'
          ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
          : { background: 'transparent', color: 'var(--brown3)', border: '1px solid var(--border)' }
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={gaya}>
      {label}
    </span>
  )
}

/** Kisi rak: 2 kolom di telepon, isi otomatis dari 190 px ke atas. */
export function Rak({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 sm:gap-4">{children}</div>
}
