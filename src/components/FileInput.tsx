import { useId, useRef, useState, type ChangeEvent } from 'react'
import { IconX } from './icons'

// Pengganti <input type="file"> bawaan peramban yang tampil polos dan
// berbahasa Inggris ("Choose File / No file chosen"). Satu komponen dipakai
// semua tempat unggah (PDF topik, video topik, foto profil) supaya bentuknya
// sama (antrean #54). Input aslinya tetap ada, hanya disembunyikan, jadi
// perilaku pilih berkas dan aksesibilitas keyboard tidak berubah.
export interface FileInputProps {
  accept: string
  /** Teks tombol, mis. "Pilih PDF". */
  label?: string
  /** Petunjuk kecil di bawah, mis. "PDF, maks 20 MB". */
  hint?: string
  maxSizeMb?: number
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  id?: string
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export function FileInput({ accept, label = 'Pilih berkas', hint, maxSizeMb, file, onChange, disabled, id }: FileInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const ref = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    if (picked && maxSizeMb && picked.size > maxSizeMb * 1024 * 1024) {
      setError(`Berkas ${formatSize(picked.size)}, melebihi batas ${maxSizeMb} MB.`)
      onChange(null)
      e.target.value = ''
      return
    }
    setError(null)
    onChange(picked)
  }

  function clear() {
    if (ref.current) ref.current.value = ''
    setError(null)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input ref={ref} id={inputId} type="file" accept={accept} onChange={handlePick} disabled={disabled} className="sr-only" />
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor={inputId} className={`btn btn-secondary btn-sm cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {label}
        </label>
        {file ? (
          <span className="inline-flex items-center gap-2 max-w-full text-sm text-brown">
            <span className="truncate max-w-[220px]" title={file.name}>{file.name}</span>
            <span className="text-xs text-brown-3 whitespace-nowrap">{formatSize(file.size)}</span>
            <button type="button" onClick={clear} aria-label="Batalkan pilihan berkas" className="btn btn-ghost btn-icon btn-sm">
              <IconX size={14} />
            </button>
          </span>
        ) : (
          <span className="text-sm text-brown-3">Belum ada berkas dipilih</span>
        )}
      </div>
      {(error || hint) && <span className={`text-xs ${error ? 'text-danger' : 'text-brown-3'}`}>{error ?? hint}</span>}
    </div>
  )
}
