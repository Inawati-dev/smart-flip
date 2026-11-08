import { useEffect, useState } from 'react'
import type { FinalSubmission } from '../lib/tugasAkhir'

// Kartu umpan balik dosen di Mini Projek mahasiswa (angket butir 8, antrean #369, 8 Nov 2026).
// Dulu hanya satu baris teks "Umpan balik dosen. ..." di kotak abu-abu. Kini kartu tersendiri: judul,
// lencana "Baru" sampai dilihat, nilai, catatan dosen (baris baru dipertahankan), dan waktu dinilai.
// Status "sudah dilihat" disimpan di perangkat per kiriman (tanpa kolom baru): kartu dianggap
// dilihat setelah tampil JEDA_BACA_MS.
const JEDA_BACA_MS = 4000

export const kunciUmpanDilihat = (idKiriman: string) => `sfp_umpan_dilihat:${idKiriman}`

function tglJam(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function KartuUmpanBalik({ kiriman }: { kiriman: Pick<FinalSubmission, 'id' | 'feedback' | 'total' | 'graded_at'> }) {
  const kunci = kunciUmpanDilihat(kiriman.id)
  const [baru] = useState(() => {
    try {
      return localStorage.getItem(kunci) !== '1'
    } catch {
      return true
    }
  })
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(kunci, '1')
      } catch {
        /* penyimpanan dimatikan: lencana muncul lagi di kunjungan berikutnya */
      }
    }, JEDA_BACA_MS)
    return () => clearTimeout(t)
  }, [kunci])
  const catatan = kiriman.feedback?.trim()
  return (
    <section aria-label="Umpan balik dosen" className="rounded-xl border p-3.5" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <h3 className="text-sm font-semibold text-brown m-0">Umpan balik dosen</h3>
        {baru && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            Baru
          </span>
        )}
        {kiriman.total != null && <span className="ml-auto text-sm font-semibold tabular-nums text-brown">Nilai {kiriman.total}</span>}
      </div>
      <p className={`text-sm leading-relaxed whitespace-pre-line m-0 ${catatan ? 'text-brown-2' : 'text-brown-3 italic'}`}>
        {catatan || 'Dosen belum menulis catatan untuk kiriman ini.'}
      </p>
      {kiriman.graded_at && <p className="text-xs text-brown-3 mt-2 mb-0">Dinilai {tglJam(kiriman.graded_at)}</p>}
    </section>
  )
}
