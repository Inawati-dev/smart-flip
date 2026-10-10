import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { aktivitasTopik, babPaket } from '../lib/paketProposal'

// Panel Aktivitas Mandiri di halaman topik (antrean #179). Tidak merender apa
// pun untuk topik tanpa aktivitas. Dibuka lewat #aktivitas-mandiri: panel
// digulir ke tampilan setelah ter-render.
export function AktivitasMandiriPanel({
  nomorTopik,
  judulTopik,
  peran,
}: {
  nomorTopik: number
  judulTopik?: string
  peran?: string | null
}) {
  const ref = useRef<HTMLElement>(null)
  const { hash } = useLocation()
  const am = aktivitasTopik(nomorTopik)
  const bab = am ? babPaket(am.bab) : null

  useEffect(() => {
    if (hash !== '#aktivitas-mandiri') return
    ref.current?.scrollIntoView?.({ behavior: 'auto', block: 'start' }) // 'auto' = tanpa animasi, aman untuk prefers-reduced-motion
  }, [hash])

  if (!am || !bab) return null

  return (
    <section
      ref={ref}
      id="aktivitas-mandiri"
      className="bg-ivory border rounded-xl p-4 md:p-5 mt-5 scroll-mt-4"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
        <h2 className="font-display text-lg font-bold text-brown">Aktivitas Mandiri · Topik {am.topik}</h2>
        {judulTopik && <p className="text-[13px] text-brown-2">{judulTopik}</p>}
      </div>

      <div className="grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5">
        <ol className="list-decimal pl-5 m-0 text-sm leading-relaxed text-brown flex flex-col gap-2 break-words">
          {am.langkah.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ol>

        <div className="flex flex-col gap-3 min-w-0">
          <div className="bg-bg3 rounded-xl p-4 flex flex-col gap-2">
            <div className="text-[13px] font-bold uppercase tracking-wide text-brown-2">Hasilnya Dipakai untuk</div>
            <div className="text-base font-bold text-brown">Mini Projek {bab.judul}</div>
            <div className="flex flex-wrap gap-1.5">
              {am.dipakai.map((d) => (
                <span key={d} className="text-[13px] px-3 py-1 rounded-full bg-ivory border" style={{ borderColor: 'var(--border)' }}>
                  {d}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-brown-2">
            Aktivitas ini tidak diunggah sendiri. Simpan hasilnya, lalu lampirkan di akhir berkas Bab {am.bab} saat mengirim Mini Projek.
          </p>
          {peran === 'mahasiswa' && (
            <Link to="/mini-projek" className="btn btn-primary min-h-11 justify-center mt-auto">
              Buka Mini Projek Bab {am.bab}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
