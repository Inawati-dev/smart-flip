import { Link } from 'react-router'
import { usePaketMhs } from '../hooks/usePaketMhs'

// Kabar Paket Rancangan Proposal untuk mahasiswa (antrean #189, pilihan Johan
// 11 Okt 2026: kartu Kabar Terbaru di Dashboard tanpa lonceng, ditambah titik
// di menu dan pita di halaman Mini Projek). Datanya dari usePaketMhs.
const BORDER = { borderColor: 'var(--border)' } as const

/** Titik kecil di butir menu Mini Projek selama ada kabar yang belum dilihat. */
export function TitikKabarPaket() {
  const { baru } = usePaketMhs()
  if (baru.length === 0) return null
  return (
    <span
      role="img"
      aria-label="Ada kabar baru"
      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
      style={{ background: 'var(--danger)', boxShadow: '0 0 0 2px var(--ivory)' }}
    />
  )
}

/** Kartu Dashboard: tiga kabar terbaru. Tidak tampil bila mata kuliah belum punya paket atau belum ada kabar. */
export function KabarTerbaruCard() {
  const { kabar, baru } = usePaketMhs()
  if (kabar.length === 0) return null
  const waktuBaru = new Set(baru.map((k) => `${k.jenis}-${k.urutan}`))
  return (
    <section aria-label="Kabar Terbaru" className="bg-ivory rounded-2xl border p-4 mb-4" style={BORDER}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="font-display text-lg font-semibold text-brown">Kabar Terbaru</h2>
        {baru.length > 0 && (
          <span className="text-[13px] font-bold px-2.5 py-1 rounded-full tabular-nums" style={{ background: 'var(--danger)', color: 'var(--btn-text)' }}>
            {baru.length} Baru
          </span>
        )}
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 list-none m-0 p-0">
        {kabar.slice(0, 3).map((k) => {
          const isBaru = waktuBaru.has(`${k.jenis}-${k.urutan}`)
          return (
            <li key={`${k.jenis}-${k.urutan}`} className="rounded-xl border px-3.5 py-3 flex flex-col gap-1" style={{ ...BORDER, background: isBaru ? 'var(--ivory)' : 'var(--bg3)' }}>
              <span className="text-sm font-semibold text-brown">{k.judul}</span>
              <span className="text-[13px] text-brown-2 tabular-nums">{k.ket}</span>
              <Link to="/mini-projek" className="self-start inline-flex items-center min-h-11 text-sm font-semibold no-underline" style={{ color: 'var(--btn-bg)' }}>
                {k.jenis === 'dinilai' ? 'Lihat Rincian Nilai' : 'Buka Mini Projek'}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
