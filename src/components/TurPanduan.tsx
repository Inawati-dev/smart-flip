import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LangkahTur } from '../lib/turPanduan'

// Tur panduan (antrean #331, pola sesi Ndaru #88): kotak sorot berbayang di
// sekitar elemen [data-tur] yang terlihat + kartu langkah. Elemen yang tidak
// ada atau tidak terlihat dilewati; kalau tidak satu pun terlihat, kartu di tengah.

function terlihat(sasaran: string): DOMRect | null {
  for (const el of document.querySelectorAll(`[data-tur="${sasaran}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight) return r
  }
  return null
}

export function TurPanduan({ langkah, onSelesai }: { langkah: LangkahTur[]; onSelesai: () => void }) {
  // Layout sudah membuang langkah untuk menu yang tidak tampil bagi peran ini.
  const daftar = langkah
  const [i, setI] = useState(0)
  const [kotak, setKotak] = useState<DOMRect | null>(null)
  const [posisi, setPosisi] = useState<{ left: number; top: number } | null>(null)
  const kartu = useRef<HTMLDivElement>(null)
  const L = daftar[i]

  useLayoutEffect(() => {
    function ukur() {
      const r = L ? terlihat(L.sasaran) : null
      setKotak(r)
      const k = kartu.current
      if (!r || !k) return setPosisi(null)
      const kw = k.offsetWidth
      const kh = k.offsetHeight
      let x = r.right + 16
      let y = Math.max(12, r.top)
      if (x + kw > innerWidth - 12) {
        // tidak muat di kanan (bilah bawah telepon): di atas atau bawah elemen
        x = Math.max(12, Math.min(innerWidth - kw - 12, r.left + r.width / 2 - kw / 2))
        y = r.top - kh - 12 >= 12 ? r.top - kh - 12 : r.bottom + 12
      }
      if (y + kh > innerHeight - 12) y = Math.max(12, innerHeight - kh - 12)
      setPosisi({ left: x, top: y })
    }
    ukur()
    addEventListener('resize', ukur)
    return () => removeEventListener('resize', ukur)
  }, [L])

  useEffect(() => {
    kartu.current?.focus({ preventScroll: true })
  }, [i])

  // Esc dan Tab ditangkap di window: fokus bisa lepas dari kartu (klik area gelap), dan Tab tidak boleh
  // pindah ke halaman di belakang lapisan tur.
  useEffect(() => {
    function tombol(e: KeyboardEvent) {
      const k = kartu.current
      if (e.key === 'Escape') {
        e.preventDefault()
        onSelesai()
      } else if (e.key === 'Tab' && k) {
        const bisa = [...k.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        if (!bisa.length) return
        const pertama = bisa[0]
        const akhir = bisa[bisa.length - 1]
        const di = document.activeElement
        if (!k.contains(di) || (e.shiftKey ? di === pertama || di === k : di === akhir)) {
          e.preventDefault()
          ;(e.shiftKey ? akhir : pertama).focus()
        }
      }
    }
    addEventListener('keydown', tombol)
    return () => removeEventListener('keydown', tombol)
  }, [onSelesai])

  if (!L) return null
  const akhir = i === daftar.length - 1

  return (
    <div className="fixed inset-0 z-[700]" style={{ animation: 'fadeInBg 0.2s ease' }}>
      {kotak ? (
        <div
          aria-hidden="true"
          className="fixed rounded-xl pointer-events-none transition-all duration-200 motion-reduce:transition-none"
          style={{
            left: kotak.left - 6,
            top: kotak.top - 6,
            width: kotak.width + 12,
            height: kotak.height + 12,
            boxShadow: '0 0 0 9999px color-mix(in srgb, #000 55%, transparent)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0" style={{ background: 'color-mix(in srgb, #000 55%, transparent)' }} />
      )}
      <div
        ref={kartu}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tur-judul"
        tabIndex={-1}
        className="fixed bg-ivory rounded-xl p-4 outline-none flex flex-col gap-2"
        style={{
          width: 'min(360px, calc(100vw - 24px))',
          boxShadow: '0 16px 40px color-mix(in srgb, #000 30%, transparent)',
          animation: 'slideUpModal 0.22s ease',
          ...(posisi ?? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }),
        }}
      >
        <b id="tur-judul" className="text-[15px] text-brown">
          {L.judul}
        </b>
        <p className="text-[13px] leading-relaxed text-brown-2">{L.teks}</p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-xs text-brown-3 mr-auto">
            {i + 1} / {daftar.length}
          </span>
          <button type="button" onClick={onSelesai} className="btn btn-secondary btn-sm">
            Lewati
          </button>
          <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} className="btn btn-secondary btn-sm">
            Sebelumnya
          </button>
          <button type="button" onClick={() => (akhir ? onSelesai() : setI(i + 1))} className="btn btn-primary btn-sm">
            {akhir ? 'Selesai' : 'Berikutnya'}
          </button>
        </div>
      </div>
    </div>
  )
}
