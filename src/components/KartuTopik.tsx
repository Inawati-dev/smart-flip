import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { buatSampul, urlSampul } from '../lib/sampulPdf'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

// Kartu buku di rak sampul (antrean #85, opsi B "Rak Sampul"). Dipakai Modul
// mahasiswa (klik membuka pembaca, kartu terkunci pudar) dan Modul dosen
// (baris aksi lewat `aksi`). Warna sampul bergilir dari tiga token tema
// (--cover-1/2/3) supaya rak tidak seragam; tinta di atas sampul --cover-ink.
export interface KartuTopikProps {
  nomor: number
  judul: string
  /** Teks kecil di kaki sampul, mis. "40 hal" atau "PDF". */
  keterangan?: string
  /** Alamat PDF topik; bila ada di bucket modul-pdf, halaman pertamanya jadi sampul (antrean #192). */
  pdf?: string | null
  /** Dosen: buatkan gambar sampul dari PDF bila belum ada. */
  buatSampul?: boolean
  /** Sudah punya PDF atau belum (antrean #162); bila diisi, keterangan tampil sebagai lencana dan sampul tanpa PDF dipudarkan. */
  adaPdf?: boolean
  /** 0..100; bar progres di bawah sampul. Tidak ditampilkan bila undefined. */
  persen?: number
  /** Teks kiri di kaki kartu, mis. "12/30 hal". */
  kaki?: string
  chip?: ReactNode
  terkunci?: boolean
  judulKunci?: string
  /** Tujuan klik sampul; tanpa `to` dan `onClick` sampul tidak bisa diklik. */
  to?: string
  onClick?: () => void
  /** Baris aksi dosen di bawah kartu. */
  aksi?: ReactNode
  /** Rentang pertemuan menurut jadwal, mis. "Pertemuan 9-10" (antrean #273). */
  pertemuan?: string
  /** Pengganti "Topik 01", mis. "Bagian I" untuk Pendahuluan (antrean #321). */
  labelNomor?: string
  /** Kartu di dalam kelompok topik (antrean #285): keterangan di bawah sampul hanya pertemuan dan keterangan. */
  ringkas?: boolean
  /** Rak dosen (antrean #298): sampul membuka pratinjau, menu ⋯ memuat aksi lain, satu tombol Ganti/Unggah PDF di dasar kartu. Menggantikan `aksi`. */
  dosen?: { onPratinjau: () => void; onUbah: () => void; onHapus: () => void; onGantiPdf: () => void }
}

const WARNA = ['var(--cover-1)', 'var(--cover-2)', 'var(--cover-3)'] as const

export function warnaSampul(nomor: number): string {
  return WARNA[(Math.max(1, nomor) - 1) % WARNA.length]
}

// Sampul buku satu topik. Satu-satunya bentuk sampul PDF di aplikasi (antrean
// #147): rak Modul, halaman topik, dan katalog Ebook memakai komponen ini.
// Sejak antrean #192 sampulnya halaman pertama PDF, polos tanpa tulisan di
// atasnya; nomor topik, judul, dan keterangan pindah ke bawah gambar. Topik
// tanpa PDF, atau yang gambar sampulnya belum ada, memakai sampul rancangan.
export function SampulTopik(props: { nomor: number; judul: string; keterangan?: string; adaPdf?: boolean; pdf?: string | null; buat?: boolean; pertemuan?: string; ringkas?: boolean; tanpaKeterangan?: boolean; labelNomor?: string }) {
  const src = urlSampul(props.pdf)
  // key: ganti PDF berarti mulai lagi dari mencoba memuat gambarnya.
  return src ? <SampulGambar key={src} src={src} {...props} /> : <SampulRancangan {...props} />
}

function SampulGambar({ src, nomor, judul, keterangan, adaPdf, pdf, buat, pertemuan, ringkas, tanpaKeterangan, labelNomor }: { src: string; nomor: number; judul: string; keterangan?: string; adaPdf?: boolean; pdf?: string | null; buat?: boolean; pertemuan?: string; ringkas?: boolean; tanpaKeterangan?: boolean; labelNomor?: string }) {
  // coba: memuat gambar. membuat: gambar belum ada dan dosen sedang membuatnya. gagal: pakai sampul rancangan.
  const [tahap, setTahap] = useState<'coba' | 'membuat' | 'gagal'>('coba')
  const [versi, setVersi] = useState(0)
  if (tahap !== 'coba') return <SampulRancangan nomor={nomor} judul={judul} keterangan={keterangan} adaPdf={adaPdf} pertemuan={pertemuan} ringkas={ringkas} labelNomor={labelNomor} />
  return (
    <div className="flex flex-col gap-1.5">
      <img
        src={versi ? `${src}?v=${versi}` : src}
        alt=""
        loading="lazy"
        className="block w-full aspect-[3/4] object-contain rounded-[4px_10px_10px_4px]"
        // object-contain: halaman pertama tampil utuh, juga untuk PDF mendatar; sisa bingkai 3:4 diisi warna latar.
        style={{ background: 'var(--bg3)', boxShadow: '0 6px 14px -8px color-mix(in srgb, var(--shadow-color) 35%, transparent), 0 0 0 1px var(--border)' }}
        onError={() => {
          // Gambar belum ada: dosen membuatkannya sekali dari PDF, mahasiswa melihat sampul rancangan.
          if (!buat || versi || !pdf) return setTahap('gagal')
          setTahap('membuat')
          void buatSampul(pdf).then((ok) => {
            if (ok) setVersi(Date.now())
            setTahap(ok ? 'coba' : 'gagal')
          })
        }}
      />
      {tanpaKeterangan ? null : ringkas ? (
        <span className="block text-[13px] leading-snug">
          <span className="block font-semibold text-brown">{pertemuan}</span>
          {keterangan && <span className="block text-brown-3 tabular-nums">{keterangan}</span>}
        </span>
      ) : (
        <span className="block text-[13px] leading-snug">
          <span className="block font-semibold text-brown line-clamp-2">{judul}</span>
          <span className="block text-brown-3 tabular-nums">
            {labelNomor ?? `Topik ${String(nomor).padStart(2, '0')}`}
            {pertemuan ? ` · ${pertemuan}` : ''}
            {keterangan ? ` · ${keterangan}` : ''}
          </span>
        </span>
      )}
    </div>
  )
}

function SampulRancangan({ nomor, judul, keterangan, adaPdf, pertemuan, ringkas, labelNomor }: { nomor: number; judul: string; keterangan?: string; adaPdf?: boolean; pertemuan?: string; ringkas?: boolean; labelNomor?: string }) {
  return (
    <div
      className="w-full aspect-[3/4] flex flex-col justify-between p-3.5 pl-5 rounded-[4px_10px_10px_4px]"
      style={{
        background: warnaSampul(nomor),
        color: 'var(--cover-ink)',
        boxShadow: 'inset 8px 0 0 color-mix(in srgb, black 22%, transparent), 0 6px 14px -8px color-mix(in srgb, var(--shadow-color) 35%, transparent)',
        filter: adaPdf === false ? 'grayscale(.75) brightness(1.08)' : undefined,
      }}
    >
      <span className="text-[11px] tracking-[.08em] uppercase opacity-80">
        {labelNomor ?? `Topik ${String(nomor).padStart(2, '0')}`}
        {pertemuan && !ringkas && <span className="block">{pertemuan}</span>}
      </span>
      <div>
        <div className="w-7 h-0.5 mb-2" style={{ background: 'var(--gold)' }} />
        {/* dalam kelompok topik (antrean #285) judul sudah di kepala kelompok; sampul menulis pertemuannya */}
        <h3 className="font-display text-[17px] leading-tight font-semibold" style={{ color: 'var(--cover-ink)' }}>
          {ringkas && pertemuan ? pertemuan : judul}
        </h3>
      </div>
      {adaPdf == null ? (
        <span className="text-[11px] tracking-[.08em] uppercase opacity-80 tabular-nums">{keterangan ?? ''}</span>
      ) : (
        <span
          className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[.06em] uppercase tabular-nums"
          style={adaPdf ? { background: 'var(--success)', color: 'var(--ivory)' } : { border: '1px dashed currentColor', opacity: 0.85 }}
        >
          {adaPdf && <span aria-hidden="true">✓</span>}
          <span>{keterangan ?? (adaPdf ? 'PDF' : 'Belum Ada PDF')}</span>
        </span>
      )}
    </div>
  )
}

export function KartuTopik({ nomor, judul, keterangan, adaPdf, pdf, buatSampul, persen, kaki, chip, terkunci, judulKunci, to, onClick, aksi, pertemuan, ringkas, dosen, labelNomor }: KartuTopikProps) {
  const sampul = <SampulTopik nomor={nomor} judul={judul} keterangan={keterangan} adaPdf={adaPdf} pdf={pdf} buat={buatSampul} pertemuan={pertemuan} ringkas={ringkas} tanpaKeterangan={!!dosen} labelNomor={labelNomor} />
  if (dosen) return <KartuDosen nomor={nomor} judul={judul} pdf={pdf} adaPdf={adaPdf} kaki={kaki} pertemuan={pertemuan} dosen={dosen} sampul={sampul} labelNomor={labelNomor} />
  const bisaKlik = !terkunci && (to || onClick)
  const label = ringkas && pertemuan ? `Buka ${pertemuan.toLowerCase()} topik ${nomor}: ${judul}` : `Buka topik ${nomor}: ${judul}`
  return (
    <div className={`@container flex flex-col gap-2 h-full ${terkunci ? 'opacity-55' : ''}`} title={terkunci ? judulKunci : undefined} aria-disabled={terkunci || undefined}>
      {bisaKlik && to ? (
        <Link to={to} className="block rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5" aria-label={label}>
          {sampul}
        </Link>
      ) : bisaKlik && onClick ? (
        <button type="button" onClick={onClick} className="block w-full text-left rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5" aria-label={label}>
          {sampul}
        </button>
      ) : (
        sampul
      )}
      {persen != null && (
        <div className="h-[5px] rounded-[3px] overflow-hidden" style={{ background: 'var(--bg3)' }} aria-hidden="true">
          <div className="h-full" style={{ width: `${Math.min(100, Math.max(0, persen))}%`, background: 'var(--success)' }} />
        </div>
      )}
      {(kaki || chip) && (
        <div className="flex items-center justify-between gap-2 text-xs text-brown-3 tabular-nums">
          <span>{kaki ?? ''}</span>
          {chip}
        </div>
      )}
      {aksi && <div className="grid grid-cols-2 gap-1.5 mt-auto">{aksi}</div>}
    </div>
  )
}

// Kartu rak dosen (antrean #298, opsi B). Tinggi kartu mengikuti baris kisi dan
// tombol PDF didorong ke dasar (mt-auto), jadi tombol sejajar walau judul beda panjang.
function KartuDosen({ nomor, judul, pdf, adaPdf, kaki, pertemuan, dosen, sampul, labelNomor }: { nomor: number; judul: string; pdf?: string | null; adaPdf?: boolean; kaki?: string; pertemuan?: string; dosen: NonNullable<KartuTopikProps['dosen']>; sampul: ReactNode; labelNomor?: string }) {
  const bisaPratinjau = !!pdf
  return (
    <div className="@container flex flex-col gap-2 h-full">
      {bisaPratinjau ? (
        <button type="button" onClick={dosen.onPratinjau} className="block w-full text-left rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5" aria-label={`Pratinjau PDF ${judul}`}>
          {sampul}
        </button>
      ) : (
        sampul
      )}
      <p className="text-[13px] leading-snug font-semibold text-brown line-clamp-3 break-words" title={judul}>
        {judul}
      </p>
      <div className="flex items-center justify-between gap-1 text-xs text-brown-3">
        <span className="tabular-nums min-w-0">
          {labelNomor ?? `Topik ${String(nomor).padStart(2, '0')}`}
          {pertemuan ? ` · ${pertemuan}` : ''}
        </span>
        <MenuAksi
          ariaLabel={`Aksi lain untuk ${judul}`}
          tombol="⋯"
          kelasTombol="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-ivory text-lg leading-none text-brown hover:bg-[var(--bg3)]"
          rata="kanan"
        >
          <ItemMenu onPilih={dosen.onPratinjau} nonaktif={!bisaPratinjau}>
            Pratinjau
          </ItemMenu>
          <ItemMenu onPilih={dosen.onUbah}>Ubah topik</ItemMenu>
          <div role="separator" className="my-1 h-px" style={{ background: 'var(--border)' }} />
          <ItemMenu onPilih={dosen.onHapus} bahaya>
            Hapus topik
          </ItemMenu>
        </MenuAksi>
      </div>
      {kaki && <div className="text-xs text-brown-3 tabular-nums">{kaki}</div>}
      <button
        type="button"
        onClick={dosen.onGantiPdf}
        className="btn btn-secondary w-full mt-auto whitespace-nowrap"
        style={{ color: 'var(--terra-d)', borderColor: 'var(--terra)' }}
      >
        {adaPdf ? 'Ganti PDF' : 'Unggah PDF'}
      </button>
    </div>
  )
}

const KonteksMenu = createContext<() => void>(() => {})

/**
 * Menu kecil: tombol dengan aria-haspopup="menu", tutup lewat Escape, klik di luar, atau setelah memilih.
 * Dipakai kepala rak dosen ("Atur") dan kartu topik ("⋯").
 */
export function MenuAksi({ tombol, ariaLabel, kelasTombol, rata = 'kiri', children }: { tombol: ReactNode; ariaLabel?: string; kelasTombol: string; rata?: 'kiri' | 'kanan'; children: ReactNode }) {
  const [buka, setBuka] = useState(false)
  const wadah = useRef<HTMLDivElement>(null)
  const pemicu = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  // Dibuka lewat papan ketik (Enter/Spasi: klik dengan detail 0): fokus langsung ke item pertama.
  const lewatPapanKetik = useRef(false)
  useEffect(() => {
    if (!buka) return
    const item = () => [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])]
    if (lewatPapanKetik.current) item()[0]?.focus()
    const luar = (e: MouseEvent | TouchEvent | FocusEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false)
    }
    // Antrean temuan pemeriksa #292-#301: Escape mengembalikan fokus ke tombol
    // pemicu, panah atas/bawah berpindah item, dan fokus yang pindah ke luar
    // (Tab ke kartu lain) menutup menu sehingga tidak ada dua menu terbuka.
    const tombol = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBuka(false)
        pemicu.current?.focus()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const daftar = item()
      if (!daftar.length) return
      e.preventDefault()
      const i = daftar.indexOf(document.activeElement as HTMLButtonElement)
      const arah = e.key === 'ArrowDown' ? 1 : -1
      // Fokus belum di item (mis. masih di tombol): panah bawah ke item pertama, panah atas ke item terakhir.
      const tuju = i < 0 ? (arah > 0 ? 0 : daftar.length - 1) : (i + arah + daftar.length) % daftar.length
      daftar[tuju]?.focus()
    }
    document.addEventListener('mousedown', luar)
    document.addEventListener('touchstart', luar)
    document.addEventListener('focusin', luar)
    document.addEventListener('keydown', tombol)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('touchstart', luar)
      document.removeEventListener('focusin', luar)
      document.removeEventListener('keydown', tombol)
    }
  }, [buka])
  return (
    <div ref={wadah} className="relative inline-block">
      <button
        ref={pemicu}
        type="button"
        aria-haspopup="menu"
        aria-expanded={buka}
        aria-label={ariaLabel}
        onClick={(e) => {
          lewatPapanKetik.current = e.detail === 0
          setBuka((b) => !b)
        }}
        className={kelasTombol}
      >
        {tombol}
      </button>
      {buka && (
        <KonteksMenu.Provider value={() => setBuka(false)}>
          <div
            ref={menu}
            role="menu"
            className={`absolute z-[50] top-full mt-1 min-w-[12rem] rounded-xl border p-1 ${rata === 'kanan' ? 'right-0' : 'left-0'}`}
            style={{ background: 'var(--ivory)', borderColor: 'var(--border)', boxShadow: '0 10px 28px -10px color-mix(in srgb, var(--shadow-color) 45%, transparent)' }}
          >
            {children}
          </div>
        </KonteksMenu.Provider>
      )}
    </div>
  )
}

export function ItemMenu({ onPilih, nonaktif, bahaya, children }: { onPilih: () => void; nonaktif?: boolean; bahaya?: boolean; children: ReactNode }) {
  const tutup = useContext(KonteksMenu)
  return (
    <button
      type="button"
      role="menuitem"
      disabled={nonaktif}
      onClick={() => {
        tutup()
        onPilih()
      }}
      className="w-full min-h-[44px] sm:min-h-[40px] px-3 text-left text-sm rounded-lg hover:bg-[var(--bg3)] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ color: bahaya ? 'var(--danger)' : 'var(--brown)' }}
    >
      {children}
    </button>
  )
}

/** Chip status baku rak: Selesai (ok), Sedang dibaca (now), Terkunci (todo), peringatan (warn). */
export function ChipRak({ jenis, label }: { jenis: 'ok' | 'now' | 'todo' | 'warn'; label: string }) {
  const gaya =
    jenis === 'ok'
      ? { background: 'var(--success-soft)', color: 'var(--success)' }
      : jenis === 'now'
        ? { background: 'var(--accent-soft)', color: 'var(--terra-d)' }
        : jenis === 'warn'
          ? { background: 'var(--warning-soft)', color: 'var(--warning)' }
          : { background: 'transparent', color: 'var(--brown3)', border: '1px solid var(--border)' }
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={gaya}>
      {label}
    </span>
  )
}

/** Kisi rak (antrean #312): 2 kolom di telepon dan tablet, 4 kolom di laptop ke atas, jadi 8 modul = 2 baris x 4. */
export function Rak({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">{children}</div>
}
