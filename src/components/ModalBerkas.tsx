import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { IconCheck, IconDocument, IconUpload, IconX } from './icons'

// Kerangka bersama modal unggah berkas (antrean #303 opsi A, sapuan #304):
// kepala berikon + subjudul, badan dua kolom (kiri pratinjau, kanan langkah
// bertahap), kaki tetap berisi status dan tombol aksi. Dipakai modal Ganti
// PDF, Tambah Topik, Ubah Video, dan kirim berkas mini projek supaya semua
// modal unggah tampil dan berperilaku sama. Di telepon kolom kiri pindah ke
// atas, kaki tetap terlihat di bawah.

const BORDER = { borderColor: 'var(--border)' } as const

export function ukuranBerkas(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function ModalBerkas({
  judul,
  subjudul,
  ikon,
  kiri,
  children,
  status,
  aksi,
  onTutup,
  sibuk = false,
  lebar = 1020,
  labelId,
}: {
  judul: string
  subjudul?: ReactNode
  ikon?: ReactNode
  /** Kolom kiri (pratinjau). Tanpa ini badan satu kolom. */
  kiri?: ReactNode
  /** Kolom kanan: biasanya beberapa <LangkahBerkas>. */
  children: ReactNode
  /** Kiri kaki, mis. lencana "Siap diunggah" atau <BilahUnggah>. */
  status?: ReactNode
  /** Kanan kaki: tombol Batal dan tombol utama. */
  aksi: ReactNode
  onTutup: () => void
  /** Saat mengunggah: Escape dan tombol silang tidak menutup modal. */
  sibuk?: boolean
  lebar?: number
  labelId?: string
}) {
  const autoId = useId()
  const idJudul = labelId ?? `${autoId}-judul`
  useEffect(() => {
    function tekan(e: KeyboardEvent) {
      if (e.key === 'Escape' && !sibuk) onTutup()
    }
    document.addEventListener('keydown', tekan)
    return () => document.removeEventListener('keydown', tekan)
  }, [onTutup, sibuk])

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="bg-ivory rounded-2xl w-full flex flex-col overflow-hidden max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]"
        style={{ maxWidth: lebar, boxShadow: '0 24px 64px color-mix(in srgb, var(--shadow-color) 28%, transparent)', animation: 'slideUpModal 0.22s ease' }}
      >
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b" style={BORDER}>
          <div
            className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0 text-brown"
            style={{ background: 'color-mix(in srgb, var(--terra) 14%, transparent)' }}
          >
            {ikon ?? <IconDocument size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 id={idJudul} className="font-display text-lg font-semibold text-brown leading-tight">{judul}</h3>
            {subjudul && <p className="text-[13px] text-brown-3 mt-0.5 break-words">{subjudul}</p>}
          </div>
          <button type="button" onClick={onTutup} disabled={sibuk} aria-label="Tutup" className="btn btn-ghost btn-icon flex-shrink-0">
            <IconX size={18} />
          </button>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto ${kiri ? 'md:grid md:grid-cols-[340px_minmax(0,1fr)]' : ''}`}>
          {kiri && (
            <div className="bg-bg3 border-b md:border-b-0 md:border-r p-4 sm:p-6 flex flex-col items-center gap-4" style={BORDER}>
              {kiri}
            </div>
          )}
          <div className="p-4 sm:p-6 flex flex-col min-w-0">{children}</div>
        </div>

        <div className="flex items-center gap-3 flex-wrap px-4 sm:px-6 py-3 border-t" style={BORDER}>
          <div className="flex-1 min-w-[160px]">{status}</div>
          <div className="flex gap-2 flex-wrap justify-end">{aksi}</div>
        </div>
      </div>
    </div>
  )
}

/** Satu langkah bernomor dengan garis penghubung ke langkah berikutnya. */
export function LangkahBerkas({
  nomor,
  judul,
  aktif = false,
  akhir = false,
  children,
}: {
  nomor: number
  judul: string
  aktif?: boolean
  akhir?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex flex-col items-center">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 tabular-nums"
          style={aktif ? { background: 'var(--terra)', color: 'var(--btn-text)' } : { background: 'var(--bg3)', color: 'var(--brown3)' }}
        >
          {nomor}
        </span>
        {!akhir && <span className="flex-1 w-0.5 my-1" style={{ background: 'var(--border)' }} aria-hidden="true" />}
      </div>
      <div className={`flex-1 min-w-0 flex flex-col gap-2 ${akhir ? '' : 'pb-5'}`}>
        <span className="text-[15px] font-semibold text-brown leading-7">{judul}</span>
        {children}
      </div>
    </div>
  )
}

/**
 * Zona seret-lepas + tombol pilih. Belum ada berkas: kotak bergaris putus.
 * Sudah dipilih: kartu berkas bertanda centang, tombol ganti pilihan, dan silang.
 */
/** Cocokkan berkas dengan atribut accept: ekstensi (.pdf), MIME persis, atau MIME berbintang (video/*). */
export function cocokAccept(f: File, accept: string): boolean {
  const pola = accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!pola.length) return true
  const nama = f.name.toLowerCase()
  const tipe = (f.type || '').toLowerCase()
  return pola.some((p) =>
    p.startsWith('.') ? nama.endsWith(p) : p.endsWith('/*') ? tipe.startsWith(p.slice(0, -1)) : tipe === p,
  )
}

export function ZonaBerkas({
  accept,
  maxSizeMb,
  file,
  onChange,
  label = 'Pilih Berkas',
  petunjuk,
  meta,
  disabled = false,
  cekBerkas,
}: {
  accept: string
  maxSizeMb?: number
  file: File | null
  onChange: (f: File | null) => void
  label?: string
  /** Mis. "PDF, maks 20 MB". */
  petunjuk?: string
  /** Keterangan tambahan berkas terpilih, mis. "32 halaman". */
  meta?: string
  disabled?: boolean
  /** Validasi tambahan; kembalikan pesan galat atau '' bila sah. */
  cekBerkas?: (f: File) => string
}) {
  const inputId = useId()
  const ref = useRef<HTMLInputElement>(null)
  const [galat, setGalat] = useState('')
  const [seret, setSeret] = useState(false)

  function terima(f: File | null) {
    // accept hanya menyaring dialog pilih berkas; berkas yang diseret dicek di sini.
    if (f && !cocokAccept(f, accept)) {
      setGalat(`Jenis berkas ${f.name} tidak sesuai. ${petunjuk ?? ''}`.trim())
      onChange(null)
      return
    }
    if (f && maxSizeMb && f.size > maxSizeMb * 1024 * 1024) {
      setGalat(`Berkas ${ukuranBerkas(f.size)}, melebihi batas ${maxSizeMb} MB.`)
      onChange(null)
      return
    }
    const pesan = f && cekBerkas ? cekBerkas(f) : ''
    if (pesan) {
      setGalat(pesan)
      onChange(null)
      return
    }
    setGalat('')
    onChange(f)
  }
  function lepas(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setSeret(false)
    if (disabled) return
    terima(e.dataTransfer.files?.[0] ?? null)
  }
  function hapus() {
    if (ref.current) ref.current.value = ''
    setGalat('')
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={ref}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          terima(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setSeret(true)
        }}
        onDragLeave={() => setSeret(false)}
        onDrop={lepas}
        className="rounded-xl border-[1.5px] border-dashed p-3 sm:p-4 flex flex-col gap-3 transition-colors"
        style={{
          borderColor: 'var(--terra)',
          background: seret ? 'color-mix(in srgb, var(--terra) 14%, transparent)' : 'color-mix(in srgb, var(--terra) 5%, transparent)',
        }}
      >
        {file ? (
          <div className="flex items-center gap-3 p-3 rounded-[10px] border bg-ivory" style={BORDER}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
              <IconCheck size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brown truncate" title={file.name}>{file.name}</p>
              <p className="text-xs text-brown-3">
                {ukuranBerkas(file.size)}
                {meta ? ` · ${meta}` : ''} · siap diunggah
              </p>
            </div>
            <button type="button" onClick={hapus} disabled={disabled} aria-label="Batalkan pilihan berkas" className="btn btn-ghost btn-icon flex-shrink-0">
              <IconX size={16} />
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-3 flex-wrap">
          <IconUpload size={18} className="text-terra flex-shrink-0" />
          <span className="flex-1 min-w-[140px] text-[13px] text-brown-3">
            {file ? 'Seret berkas lain ke sini untuk mengganti pilihan.' : 'Seret berkas ke sini, atau pilih dari komputer.'}
            {petunjuk ? ` ${petunjuk}` : ''}
          </span>
          <label htmlFor={inputId} className={`btn btn-secondary btn-sm cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {file ? `${label} Lain` : label}
          </label>
        </div>
      </div>
      {galat && <p className="text-xs text-danger" role="alert">{galat}</p>}
    </div>
  )
}

/** Bilah progres unggah di dalam modal. persen null = sedang menyiapkan. */
export function BilahUnggah({ persen, keterangan }: { persen: number | null; keterangan?: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-brown">
        <span>Mengunggah…</span>
        <span className="tabular-nums">{persen == null ? '' : `${persen}%`}</span>
      </div>
      <progress max={100} value={persen ?? undefined} aria-label="Kemajuan unggah" className="w-full h-2 rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-[color-mix(in_srgb,var(--terra)_14%,transparent)] [&::-webkit-progress-value]:bg-[var(--terra)] [&::-moz-progress-bar]:bg-[var(--terra)]" />
      {keterangan && <span className="text-xs text-brown-3">{keterangan}</span>}
    </div>
  )
}

/** Lencana kecil status di kaki modal. */
export function LencanaSiap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
      {children}
    </span>
  )
}
