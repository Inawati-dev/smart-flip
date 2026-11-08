import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { PageFlip } from 'page-flip/dist/js/page-flip.module.js'

// Balikan halaman melengkung (antrean #374, ⏸️ #354 B: angket butir 5 dan 7, "lebih elastis, tidak kaku").
// Membungkus StPageFlip: halaman dibuat sebagai elemen DOM biasa (gambar halaman yang sudah dirender PembacaPdf),
// lalu mesin menggambar lengkungan, bayangan, dan seretan sudut. Sampul dan sampul belakang dibuat keras.
// Dua halaman berdampingan bila lebar wadah dua kali lebar halaman (`dua`), selain itu satu halaman (potret).
// Kendali luar (panah, penggeser, tombol keyboard) memakai pegangan: berikut, sebelum, ke.
export interface FlipLengkungHandle {
  berikut(): void
  sebelum(): void
  /** Lompat tanpa animasi ke halaman (mulai dari 1). */
  ke(halaman: number): void
}

interface Props {
  total: number
  /** Lebar dan tinggi satu halaman (px, sudah dikali zoom). */
  lebar: number
  tinggi: number
  dua: boolean
  /** Halaman (mulai dari 1) saat mesin dibangun ulang, mis. sesudah zoom atau ganti ukuran. */
  awal: number
  gambar: Record<number, string>
  cap: string | null
  /** Dipanggil tiap halaman berganti; nilai = halaman kiri yang terlihat (mulai dari 1). */
  onHalaman: (halaman: number) => void
  /** Lama satu balikan (md); 1 bila pengguna meminta gerak berkurang. */
  durasi?: number
}

function pasangGambar(el: HTMLElement | undefined, src: string | undefined) {
  if (!el || !src) return
  const img = el.querySelector('img')
  if (img && img.getAttribute('src') !== src) img.setAttribute('src', src)
  el.setAttribute('data-siap', '1')
}

export const FlipLengkung = forwardRef<FlipLengkungHandle, Props>(function FlipLengkung(
  { total, lebar, tinggi, dua, awal, gambar, cap, onHalaman, durasi = 900 },
  ref,
) {
  const wadah = useRef<HTMLDivElement>(null)
  const mesin = useRef<PageFlip | null>(null)
  const elemen = useRef<HTMLDivElement[]>([])
  const terakhir = useRef(awal)
  const gambarRef = useRef(gambar)
  const awalRef = useRef(awal)
  const callbackRef = useRef(onHalaman)
  useEffect(() => {
    gambarRef.current = gambar
    awalRef.current = awal
    callbackRef.current = onHalaman
  })

  // disableFlipByClick mematikan balik-dengan-klik di badan halaman (zona tepi PembacaPdf yang mengurusnya), tetapi flip()
  // memeriksanya juga untuk balikan lewat kode: di mode satu halaman (potret) titik "sebelum" bukan sudut panas, jadi
  // balikan mundur ditolak diam-diam. Nilainya dimatikan hanya selama satu panggilan.
  const balik = (arah: 'flipNext' | 'flipPrev') => {
    const pf = mesin.current
    if (!pf) return
    const setelan = pf.getSettings()
    const lama = setelan.disableFlipByClick
    setelan.disableFlipByClick = false
    try {
      pf[arah]()
    } finally {
      setelan.disableFlipByClick = lama
    }
  }
  useImperativeHandle(ref, () => ({
    berikut: () => balik('flipNext'),
    sebelum: () => balik('flipPrev'),
    ke: (h) => {
      terakhir.current = h
      mesin.current?.turnToPage(Math.max(0, Math.min(total - 1, h - 1)))
    },
  }))

  // Bangun mesin; dibangun ulang bila jumlah halaman, mode, atau ukuran berubah.
  // Ukuran dibulatkan ke kelipatan 8 px: bilah gulir panggung muncul dan hilang saat mesin menata ulang buku, dan selisih 1 px
  // antara dua ukuran sempat membangun ulang mesin tiap balikan (balikan ketiga terhenti). Kelipatan 8 meredam selisih itu.
  const L = Math.max(8, Math.floor(lebar / 8) * 8)
  const T = Math.max(8, Math.round((L * tinggi) / Math.max(1, lebar)))
  useEffect(() => {
    const host = wadah.current
    if (!host || total <= 0 || L <= 0 || T <= 0) return
    const blok = document.createElement('div')
    host.appendChild(blok)
    const daftar: HTMLDivElement[] = []
    for (let i = 0; i < total; i++) {
      const el = document.createElement('div')
      el.className = 'lembar-lengkung'
      el.setAttribute('data-density', i === 0 || i === total - 1 ? 'hard' : 'soft')
      const img = document.createElement('img')
      img.alt = `Halaman ${i + 1}`
      img.draggable = false
      el.appendChild(img)
      if (cap) {
        const c = document.createElement('div')
        c.className = 'pembaca-cap'
        c.setAttribute('aria-hidden', 'true')
        c.style.backgroundImage = cap
        el.appendChild(c)
      }
      daftar.push(el)
    }
    elemen.current = daftar
    const mulai = Math.max(0, Math.min(total - 1, (terakhir.current || awalRef.current) - 1))
    const pf = new PageFlip(blok, {
      width: L,
      height: T,
      size: 'stretch',
      minWidth: L,
      maxWidth: L,
      minHeight: T,
      maxHeight: T,
      startPage: mulai,
      showCover: true,
      usePortrait: true,
      drawShadow: true,
      maxShadowOpacity: 0.45,
      flippingTime: durasi,
      mobileScrollSupport: false,
      useMouseEvents: true,
      disableFlipByClick: true,
      showPageCorners: false,
      autoSize: true,
    })
    pf.loadFromHTML(daftar)
    pf.on('flip', (e) => {
      const idx = Number(e.data)
      terakhir.current = idx + 1
      callbackRef.current(idx + 1)
    })
    mesin.current = pf
    for (const [n, src] of Object.entries(gambarRef.current)) pasangGambar(daftar[Number(n) - 1], src)
    return () => {
      try {
        pf.destroy()
      } catch {
        /* mesin sudah terlepas dari DOM */
      }
      mesin.current = null
      host.replaceChildren()
    }
    // `cap` ikut membangun ulang supaya lapisan watermark selalu sesuai; awal dan gambar dibaca lewat ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, dua, L, T, cap, durasi])

  // Gambar halaman datang bertahap dari PembacaPdf: pasang ke elemen yang sudah ada tanpa membangun ulang mesin.
  useEffect(() => {
    for (const [n, src] of Object.entries(gambar)) pasangGambar(elemen.current[Number(n) - 1], src)
  }, [gambar])

  return <div ref={wadah} className="pembaca-lengkung-wadah" style={{ width: dua ? L * 2 : L, height: T }} />
})
