import { useEffect, useState } from 'react'
import { signedFileUrl } from '../lib/tugasAkhir'
import { PembacaPdf, useCapAir } from './PembacaPdf'

// Pratinjau berkas kiriman Mini Projek sebelum diunduh (angket butir 9, antrean #367, 8 Nov 2026).
// Dulu tombol "Lihat Berkas" dan "Unduh" langsung membuka alamat bertanda tangan di tab baru, yang
// untuk .docx berarti unduhan langsung. Sekarang berkas dibuka dulu di sini:
//   - .pdf  : pembaca flipbook yang sama dengan halaman Ebook (PembacaPdf);
//   - .docx : diubah ke HTML di peramban (mammoth, dimuat saat dibutuhkan) dan ditampilkan di iframe
//             sandbox tanpa skrip, jadi isi berkas tidak bisa menjalankan kode;
//   - lain / gagal diubah: keterangan dan tombol Unduh saja.
// Tombol Unduh membuka alamat bertanda tangan yang sama di tab baru.
export type JenisBerkas = 'pdf' | 'docx' | 'lain'

export function jenisBerkas(nama: string): JenisBerkas {
  const ekstensi = nama.split('?')[0].split('.').pop()?.toLowerCase()
  return ekstensi === 'pdf' ? 'pdf' : ekstensi === 'docx' ? 'docx' : 'lain'
}

const GAYA_ISI =
  'body{font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#222;padding:20px 24px;max-width:760px;margin:0 auto}' +
  'table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #ccc;padding:4px 8px}img{max-width:100%;height:auto}h1,h2,h3{line-height:1.25}'

/** Bungkus HTML hasil mammoth jadi dokumen utuh untuk srcdoc; sandbox iframe yang menjamin tanpa skrip. */
export function dokumenPratinjau(isi: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${GAYA_ISI}</style></head><body>${isi}</body></html>`
}

type Tahap = 'memuat' | 'siap' | 'gagal'

export function PratinjauBerkas({ path, onTutup }: { path: string; onTutup: () => void }) {
  const nama = path.split('/').pop() || path
  const jenis = jenisBerkas(nama)
  const cap = useCapAir()
  const [tahap, setTahap] = useState<Tahap>('memuat')
  const [url, setUrl] = useState<string | null>(null)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let batal = false
    ;(async () => {
      try {
        const u = await signedFileUrl(path)
        if (batal) return
        setUrl(u)
        if (jenis === 'docx') {
          const buf = await (await fetch(u)).arrayBuffer()
          const mammoth = await import('mammoth')
          const hasil = await mammoth.convertToHtml({ arrayBuffer: buf })
          if (batal) return
          setHtml(hasil.value)
        }
        setTahap('siap')
      } catch (e) {
        console.warn('[PratinjauBerkas] gagal membuka berkas:', e)
        if (!batal) setTahap(url ? 'siap' : 'gagal')
      }
    })()
    return () => {
      batal = true
    }
    // url sengaja bukan dependensi: hanya dipakai untuk memilih keadaan akhir saat galat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, jenis])

  useEffect(() => {
    if (jenis === 'pdf' && tahap === 'siap') return // PembacaPdf menangani Escape sendiri
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onTutup()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [jenis, tahap, onTutup])

  if (jenis === 'pdf' && tahap === 'siap' && url) {
    return (
      <PembacaPdf
        src={url}
        judul={nama}
        cap={cap}
        diAtasModal
        onEscape={onTutup}
        kiri={
          <span className="text-sm font-semibold truncate" title={nama}>
            {nama}
          </span>
        }
        aksi={
          <>
            <a href={url} target="_blank" rel="noopener noreferrer" className="pembaca-tb">
              Unduh
            </a>
            <button type="button" onClick={onTutup} className="pembaca-tb on">
              Tutup
            </button>
          </>
        }
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
      onClick={onTutup}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pratinjau ${nama}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl bg-ivory border border-[color:var(--border)]"
        style={{ boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)', animation: 'slideUpModal 0.22s ease' }}
      >
        <div className="px-5 pt-4 pb-3 border-b border-[color:var(--border)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brown-3">Pratinjau berkas</p>
          <p className="text-sm font-semibold text-brown break-all">{nama}</p>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {tahap === 'memuat' && <p className="p-6 text-sm text-brown-3">Membuka berkas…</p>}
          {tahap === 'gagal' && <p className="p-6 text-sm text-danger">Berkas tidak bisa dibuka. Periksa koneksi lalu coba lagi.</p>}
          {tahap === 'siap' && jenis === 'docx' && html != null && (
            <iframe title={`Isi ${nama}`} sandbox="" srcDoc={dokumenPratinjau(html)} className="w-full h-[60dvh] border-0 bg-white" />
          )}
          {tahap === 'siap' && !(jenis === 'docx' && html != null) && jenis !== 'pdf' && (
            <p className="p-6 text-sm text-brown-2">Pratinjau tidak tersedia untuk jenis berkas ini. Unduh untuk membukanya.</p>
          )}
        </div>
        <div className="flex gap-2.5 justify-end px-5 py-3 border-t border-[color:var(--border)]">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary no-underline">
              Unduh
            </a>
          )}
          <button type="button" onClick={onTutup} className="btn btn-primary">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
