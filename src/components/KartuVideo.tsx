import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { thumbnailUrl } from '../lib/video'
import { urlSampulVideo, buatSampulVideo } from '../lib/sampulVideo'
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
  /** Rentang pertemuan menurut jadwal, mis. "Pertemuan 9-10" (antrean #273); kosong = nomor topik. */
  pertemuan?: string
  /** Dosen: buatkan gambar kecil video unggahan bila belum ada (antrean #275). */
  buatSampul?: boolean
  /** Kartu di dalam kelompok topik (antrean #279): judul topik sudah di kepala kelompok, kartu hanya menulis `pertemuan`. */
  ringkas?: boolean
}

export function KartuVideo({ nomor, judul, url, durasi, chip, terkunci, judulKunci, to, onClick, aksi, warna, pertemuan, buatSampul, ringkas }: KartuVideoProps) {
  // YouTube: gambar dari YouTube. Unggahan: <video>.sampul.jpg di bucket (antrean #275); gagal dimuat = gradasi warna.
  const yt = url ? thumbnailUrl(url) : null
  const unggah = url && !yt ? urlSampulVideo(url) : null
  const [sampul, setSampul] = useState<{ url: string; tahap: 'coba' | 'membuat' | 'gagal'; versi: number }>({ url: '', tahap: 'coba', versi: 0 })
  const s = sampul.url === url ? sampul : { url: url ?? '', tahap: 'coba' as const, versi: 0 }
  const thumb = yt ?? (unggah && s.tahap === 'coba' ? (s.versi ? `${unggah}?v=${s.versi}` : unggah) : null)
  function sampulGagal() {
    if (yt || !url) return
    if (!buatSampul || s.versi) return setSampul({ ...s, tahap: 'gagal' })
    setSampul({ ...s, tahap: 'membuat' })
    void buatSampulVideo(url).then((ok) => setSampul({ url, tahap: ok ? 'coba' : 'gagal', versi: ok ? Date.now() : 0 }))
  }
  const dasar = warna ?? 'var(--cover-1)'
  const kotak = (
    <div
      className="relative w-full aspect-video rounded-[10px] overflow-hidden grid place-items-center"
      style={{ background: `linear-gradient(140deg, ${dasar}, color-mix(in srgb, ${dasar} 70%, black))`, color: 'var(--cover-ink)' }}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" onError={sampulGagal} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className="absolute left-3 top-2.5 text-[11px] tracking-[.08em] uppercase opacity-80">
          {pertemuan ?? `Pertemuan ${String(nomor).padStart(2, '0')}`}
        </span>
      )}
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
  const label = `Putar video topik ${nomor}${pertemuan ? `, ${pertemuan.toLowerCase()}` : ''}: ${judul}`
  return (
    <div className={`@container flex flex-col gap-2 h-full ${terkunci ? 'opacity-55' : ''}`} title={terkunci ? judulKunci : undefined} aria-disabled={terkunci || undefined}>
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
      {ringkas ? (
        <b className="text-sm font-semibold text-brown leading-snug">{pertemuan}</b>
      ) : (
        <>
          <span className="text-xs text-brown-3">{pertemuan ? `Topik ${nomor} · ${pertemuan}` : `Pertemuan ${nomor}`}</span>
          <b className="text-sm font-semibold text-brown leading-snug -mt-1 line-clamp-2 min-h-[2.5rem]" title={judul}>{judul}</b>
        </>
      )}
      {chip && <div className="flex items-center justify-between gap-2">{chip}</div>}
      {aksi && <div className="grid grid-cols-2 gap-1.5 mt-auto">{aksi}</div>}
    </div>
  )
}
