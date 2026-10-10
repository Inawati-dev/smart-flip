import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronRight } from './icons'

interface TanggalInputProps {
  /** 'YYYY-MM-DD', atau 'YYYY-MM-DDTHH:mm' bila denganJam. '' = kosong. Sama persis dengan input bawaan. */
  value: string
  onChange: (value: string) => void
  denganJam?: boolean
  /** Batas dalam format sama dengan value; yang dibandingkan hanya bagian tanggalnya. */
  min?: string
  max?: string
  id?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
  placeholder?: string
}

// Pengganti input tanggal dan tanggal+jam bawaan peramban: kalendernya
// berbahasa peramban, tidak bisa diberi tema, dan tidak bisa dipasang di atas
// modal bergulir. Gaya panel dan sel hari ada di index.css (.tgl-*).
const GAP = 8
const TINGGI_PERKIRAAN = 380
const JAM_BAWAAN = 8
const p2 = (n: number) => String(n).padStart(2, '0')
const kunci = (y: number, m: number, d: number) => `${y}-${p2(m + 1)}-${p2(d)}`
// setFullYear supaya tahun < 100 tidak dibaca sebagai 19xx.
const tgl = (y: number, m: number, d: number) => {
  const t = new Date(2000, 0, 1)
  t.setFullYear(y, m, d)
  return t
}
const PANJANG = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const
// 1 Jan 2024 jatuh pada hari Senin, jadi tujuh hari dari situ = kop Senin..Minggu.
const KOP_HARI = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString('id-ID', { weekday: 'short' }))

function urai(v: string) {
  const r = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v)
  if (!r) return null
  return { y: +r[1], m: +r[2] - 1, d: +r[3], jam: r[4] != null ? +r[4] : JAM_BAWAAN, mnt: r[5] != null ? +r[5] : 0 }
}
function hariIni() {
  const t = new Date()
  return kunci(t.getFullYear(), t.getMonth(), t.getDate())
}

interface Pos {
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

export function TanggalInput({ value, onChange, denganJam, min, max, id, ariaLabel, className, disabled, placeholder = 'Pilih tanggal' }: TanggalInputProps) {
  const dialogId = useId()
  const [open, setOpen] = useState(false)
  const [tampil, setTampil] = useState({ y: 2000, m: 0 })
  const [fokus, setFokus] = useState('')
  const [pos, setPos] = useState<Pos>({ left: 0, width: 0, maxHeight: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const perluFokus = useRef(false)

  const cur = urai(value)
  const minT = min?.slice(0, 10)
  const maxT = max?.slice(0, 10)
  const luar = (k: string) => (!!minT && k < minT) || (!!maxT && k > maxT)
  const kurValue = cur ? kunci(cur.y, cur.m, cur.d) : ''

  function hitungPos() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.min(320, window.innerWidth - 16)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    const bawah = window.innerHeight - r.bottom - GAP - 8
    const atas = r.top - GAP - 8
    const keAtas = bawah < TINGGI_PERKIRAAN && atas > bawah
    setPos(
      keAtas
        ? { left, width, bottom: window.innerHeight - r.top + GAP, maxHeight: Math.max(atas, 160) }
        : { left, width, top: r.bottom + GAP, maxHeight: Math.max(bawah, 160) },
    )
  }

  function buka() {
    if (disabled) return
    let k = kurValue || hariIni()
    if (!kurValue) {
      if (minT && k < minT) k = minT
      else if (maxT && k > maxT) k = maxT
    }
    const f = urai(k)!
    setFokus(k)
    setTampil({ y: f.y, m: f.m })
    hitungPos()
    perluFokus.current = true
    setOpen(true)
  }

  function tutup(fokusKePemicu: boolean) {
    setOpen(false)
    if (fokusKePemicu) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    function klikLuar(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function tombol(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', klikLuar)
    document.addEventListener('keydown', tombol)
    window.addEventListener('scroll', hitungPos, true)
    window.addEventListener('resize', hitungPos)
    return () => {
      document.removeEventListener('mousedown', klikLuar)
      document.removeEventListener('keydown', tombol)
      window.removeEventListener('scroll', hitungPos, true)
      window.removeEventListener('resize', hitungPos)
    }
  }, [open])

  // Fokus pindah ke sel hari hanya saat panel baru dibuka atau panah ditekan,
  // bukan tiap ganti bulan lewat tombol (supaya klik berulang tetap di tombol).
  useEffect(() => {
    if (!open || !perluFokus.current) return
    perluFokus.current = false
    panelRef.current?.querySelector<HTMLElement>(`[data-tgl="${fokus}"]`)?.focus()
  }, [open, fokus, tampil])

  function pilih(k: string) {
    if (luar(k)) return
    if (denganJam) {
      onChange(`${k}T${p2(cur?.jam ?? JAM_BAWAAN)}:${p2(cur?.mnt ?? 0)}`)
      setFokus(k)
    } else {
      onChange(k)
      tutup(true)
    }
  }

  function ubahJam(jam: number, mnt: number) {
    onChange(`${kurValue || fokus}T${p2(jam)}:${p2(mnt)}`)
  }

  function geserBulan(n: number) {
    const t = tgl(tampil.y, tampil.m + n, 1)
    setTampil({ y: t.getFullYear(), m: t.getMonth() })
  }

  function panah(e: React.KeyboardEvent) {
    const langkah = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[e.key]
    if (!langkah) return
    e.preventDefault()
    const f = urai(fokus)!
    const t = tgl(f.y, f.m, f.d + langkah)
    perluFokus.current = true
    setFokus(kunci(t.getFullYear(), t.getMonth(), t.getDate()))
    setTampil({ y: t.getFullYear(), m: t.getMonth() })
  }

  const teks = cur
    ? denganJam
      ? `${tgl(cur.y, cur.m, cur.d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${p2(cur.jam)}.${p2(cur.mnt)}`
      : tgl(cur.y, cur.m, cur.d).toLocaleDateString('id-ID', PANJANG)
    : ''

  const awalBulan = (tgl(tampil.y, tampil.m, 1).getDay() + 6) % 7
  const jumlahHari = tgl(tampil.y, tampil.m + 1, 0).getDate()
  const sekarang = hariIni()
  const kunciPertama = kunci(tampil.y, tampil.m, 1)
  const fokusTampak = fokus.slice(0, 7) === kunciPertama.slice(0, 7)
  const kunciTab = fokusTampak ? fokus : kunciPertama

  const panel = open && (
    <div
      ref={panelRef}
      id={dialogId}
      role="dialog"
      aria-label={ariaLabel ?? (denganJam ? 'Pilih tanggal dan jam' : 'Pilih tanggal')}
      className="tgl-panel fixed overflow-y-auto p-2.5"
      style={{ ...pos, zIndex: 710, animation: 'selectPopIn 0.14s ease' }}
    >
      <div className="flex items-center justify-between mb-1">
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Bulan sebelumnya" onClick={() => geserBulan(-1)}>
          <IconChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div aria-live="polite" className="text-sm font-semibold text-brown">
          {tgl(tampil.y, tampil.m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </div>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Bulan berikutnya" onClick={() => geserBulan(1)}>
          <IconChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[11px] font-bold uppercase tracking-wide text-brown-3">
        {KOP_HARI.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5" onKeyDown={panah}>
        {Array.from({ length: awalBulan }, (_, i) => (
          <span key={`k${i}`} />
        ))}
        {Array.from({ length: jumlahHari }, (_, i) => {
          const k = kunci(tampil.y, tampil.m, i + 1)
          const terpilih = k === kurValue
          return (
            <button
              key={k}
              type="button"
              data-tgl={k}
              tabIndex={k === kunciTab ? 0 : -1}
              disabled={luar(k)}
              aria-pressed={terpilih}
              aria-label={tgl(tampil.y, tampil.m, i + 1).toLocaleDateString('id-ID', PANJANG)}
              className={`tgl-hari${terpilih ? ' pilih' : ''}${k === sekarang ? ' ini' : ''}`}
              onClick={() => pilih(k)}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      {denganJam && (
        <div className="flex items-center justify-center gap-2 mt-2 text-brown">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={23}
            aria-label="Jam"
            value={p2(cur?.jam ?? JAM_BAWAAN)}
            onChange={(e) => ubahJam(Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)), cur?.mnt ?? 0)}
            className="tgl-jam"
          />
          <span aria-hidden="true" className="font-semibold">
            :
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            aria-label="Menit"
            value={p2(cur?.mnt ?? 0)}
            onChange={(e) => ubahJam(cur?.jam ?? JAM_BAWAAN, Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="tgl-jam"
          />
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          className="btn btn-secondary flex-1"
          disabled={luar(sekarang)}
          onClick={() => {
            const f = urai(sekarang)!
            setTampil({ y: f.y, m: f.m })
            pilih(sekarang)
          }}
        >
          Hari ini
        </button>
        <button
          type="button"
          className="btn btn-secondary flex-1"
          onClick={() => {
            onChange('')
            tutup(true)
          }}
        >
          Kosongkan
        </button>
        {denganJam && (
          <button type="button" className="btn btn-primary flex-1" onClick={() => tutup(true)}>
            Selesai
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel ? (teks ? `${ariaLabel}: ${teks}` : ariaLabel) : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        disabled={disabled}
        onClick={() => (open ? tutup(false) : buka())}
        className={`tgl-pemicu flex w-full items-center justify-between gap-2 h-11 rounded-[var(--radius-control)] border px-3 text-left text-base tabular-nums ${teks ? 'text-brown' : 'text-brown-3'}${className ? ` ${className}` : ''}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="truncate">{teks || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0 text-brown-3">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  )
}
