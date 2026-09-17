import { useEffect, useState, type DragEvent } from 'react'
import type { ModuleRow } from '../lib/modules'
import { IconChevronDown } from './icons'

// Urutan topik dosen (antrean #104, opsi A + C). Dipakai rak Modul dan rak
// Video: keduanya membaca baris `modules` yang sama, jadi satu urutan berlaku
// untuk dua halaman. A = seret kartu langsung di rak (laptop). C = modal daftar
// tegak dengan panah naik/turun + seret (telepon dan urutan presisi).

const BORDER = { borderColor: 'var(--border)' }

/** Pindahkan `fromId` ke posisi `toId` dalam daftar id. */
export function pindahUrutan(ids: number[], fromId: number, toId: number): number[] {
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return ids
  const next = ids.slice()
  next.splice(from, 1)
  next.splice(to, 0, fromId)
  return next
}

/** Seret kartu di rak. `onSimpan` menerima urutan id baru sesudah jatuh. */
export function useSeretTopik(sorted: ModuleRow[], onSimpan: (ids: number[]) => Promise<void>) {
  const [dragId, setDragId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  function reset() {
    setDragId(null)
    setOverId(null)
  }
  function seretProps(id: number) {
    const target = overId === id && dragId != null && dragId !== id
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(id))
        setDragId(id)
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault()
        if (overId !== id) setOverId(id)
      },
      onDragEnd: reset,
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        const from = dragId
        reset()
        if (from == null || from === id) return
        void onSimpan(pindahUrutan(sorted.map((m) => m.id), from, id))
      },
      className: `h-full rounded-[10px] cursor-grab active:cursor-grabbing ${target ? 'ring-2 ring-offset-2' : ''}`,
      style: target ? ({ '--tw-ring-color': 'var(--terra)', '--tw-ring-offset-color': 'var(--cream)' } as React.CSSProperties) : undefined,
      'aria-grabbed': dragId === id ? true : undefined,
    }
  }
  return { seretProps, dragId }
}

interface UrutkanTopikModalProps {
  open: boolean
  modules: ModuleRow[]
  onClose: () => void
  onSimpan: (ids: number[]) => Promise<void>
}

export function UrutkanTopikModal({ open, modules, onClose, onSimpan }: UrutkanTopikModalProps) {
  const [ids, setIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)
  useEffect(() => {
    if (open) setIds([...modules].sort((a, b) => a.order_num - b.order_num).map((m) => m.id))
  }, [open, modules])
  if (!open) return null

  const byId = new Map(modules.map((m) => [m.id, m]))
  function geser(i: number, arah: -1 | 1) {
    const j = i + arah
    if (j < 0 || j >= ids.length) return
    const next = ids.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    setIds(next)
  }
  async function simpan() {
    setSaving(true)
    try {
      await onSimpan(ids)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-labelledby="urutkan-topik-judul"
        className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-[520px] my-8 max-h-[90vh] overflow-y-auto overflow-x-hidden"
        style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
      >
        <h3 id="urutkan-topik-judul" className="font-display text-lg font-bold text-brown mb-1">
          Urutkan topik
        </h3>
        <p className="text-xs text-brown-3 mb-4">Seret baris atau pakai panah. Urutan berlaku untuk Modul dan Video.</p>
        <ol className="flex flex-col gap-1.5 mb-4">
          {ids.map((id, i) => {
            const m = byId.get(id)
            if (!m) return null
            return (
              <li
                key={id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setDragId(id)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => setDragId(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragId != null) setIds(pindahUrutan(ids, dragId, id))
                  setDragId(null)
                }}
                className={`flex items-center gap-2 rounded-[var(--radius-control)] border px-2 py-1.5 bg-cream cursor-grab active:cursor-grabbing ${dragId === id ? 'opacity-50' : ''}`}
                style={BORDER}
              >
                <span className="text-brown-3 select-none" aria-hidden="true">
                  ⠿
                </span>
                <span className="w-6 text-xs text-brown-3 tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0 text-sm text-brown truncate">{m.title}</span>
                <button
                  type="button"
                  onClick={() => geser(i, -1)}
                  disabled={i === 0}
                  aria-label={`Naikkan ${m.title}`}
                  className="btn btn-secondary btn-sm btn-icon"
                >
                  <IconChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <button
                  type="button"
                  onClick={() => geser(i, 1)}
                  disabled={i === ids.length - 1}
                  aria-label={`Turunkan ${m.title}`}
                  className="btn btn-secondary btn-sm btn-icon"
                >
                  <IconChevronDown size={14} />
                </button>
              </li>
            )
          })}
        </ol>
        <div className="flex gap-2.5 justify-end pt-4 border-t" style={BORDER}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button type="button" onClick={() => void simpan()} disabled={saving} className="btn btn-primary min-w-[7.5rem]">
            {saving ? 'Menyimpan…' : 'Simpan urutan'}
          </button>
        </div>
      </div>
    </div>
  )
}
