import type { ReactNode } from 'react'

// Kelompok satu topik di rak Video dan Modul (antrean #279, #285): judul topik
// sekali, di bawahnya kotak tiap pertemuan, lalu aksi tingkat topik (bila ada).
export function KelompokTopik({ nomor, label, judul, aksi, children }: { nomor: number; label: string; judul: string; aksi?: ReactNode; children: ReactNode }) {
  return (
    <section className="h-full rounded-xl border bg-ivory p-3 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }} aria-label={`Topik ${nomor}: ${judul}`}>
      <div className="min-w-0">
        <span className="block text-xs text-brown-3">
          Topik {nomor} · {label}
        </span>
        <h2 className="text-sm font-semibold text-brown leading-snug line-clamp-2" title={judul}>
          {judul}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">{children}</div>
      {aksi && <div className="grid grid-cols-2 gap-1.5">{aksi}</div>}
    </section>
  )
}

/** Kisi kelompok topik: 1 kolom telepon, 2 kolom tablet, 3 kolom layar lebar. */
export const KISI_TOPIK = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
