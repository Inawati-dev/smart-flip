import type { ReactNode } from 'react'

// Urutan anggota sama dengan panduan (antrean #323): Johan paling akhir.
const ANGGOTA = ['Dr. Deka Dyah Utami', 'Viola Malta Ramadhani', 'Aryadi', 'Natasya Adelia Ramadhanti', 'Johan Iriawan Akbar']

// "Sampul Berdiri 3D" (Opsi C) — buku berdiri agak miring dengan tepi
// halaman & punggung kelihatan; sampul depan berengsel di kiri dan membuka
// penuh ke "halaman pertama" yang berisi form login. Murni CSS transform,
// tanpa library. Dipakai Login.tsx saat LOGIN_VARIANT === 'book'; mekanik
// flip kartu lama (LoginFlipCard) tetap utuh sebagai jalur revert.
//
// Tinggi buku ditentukan konten `page` (normal flow); sampul absolute
// inset-0 jadi selalu setinggi halaman — form boleh tumbuh (error banner,
// mode lupa-sandi) tanpa bookkeeping tinggi manual, pola yang sama dengan
// grid-area trick di FlipPanel.
//
// `inert` (React 19) mematikan fokus/tab ke wajah yang sedang tidak
// terlihat: form tidak bisa di-Tab saat sampul menutup, tombol sampul tidak
// bisa di-Tab saat sudah terbuka.
export function LoginBook({
  open,
  onOpen,
  cover,
  page,
}: {
  open: boolean
  onOpen?: () => void
  cover: ReactNode
  page: ReactNode
}) {
  return (
    <div className="group w-full" style={{ perspective: 1600 }}>
      {/* Tilt statis saja — TANPA perubahan tilt saat hover. Di layar sentuh
          (termasuk HP yang pakai desktop mode), tap pertama men-trigger
          :hover; kalau hover menggeser tilt, tombol pindah dari bawah jari
          persis saat tap dan kliknya meleset. */}
      <div
        className={`relative w-full transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none ${
          open ? '' : 'sm:[transform:rotateY(14deg)_rotateX(2.5deg)]'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(.4,.1,.2,1)' }}
      >
        {/* Blok halaman — kertas ivory dengan tepi lembaran di kanan */}
        <div
          className="relative rounded-l-[6px] rounded-r-[14px]"
          style={{
            background: 'var(--ivory)',
            boxShadow: '0 0.5px 2px rgba(62,54,46,.06), 0 22px 44px -14px rgba(62,54,46,.32)',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute right-0 top-1 bottom-1 w-[8px] rounded-r-[10px]"
            style={{
              background:
                'repeating-linear-gradient(to bottom, rgba(62,54,46,.14) 0 2px, transparent 2px 4px)',
            }}
          />
          <div inert={!open} className="p-6 sm:p-8 pr-7 sm:pr-9 flex flex-col gap-5">
            {page}
          </div>
        </div>

        {/* Sampul depan — engsel kiri, membuka -165° */}
        <div
          inert={open}
          className={`absolute inset-0 origin-left transition-transform duration-[900ms] [transform-style:preserve-3d] motion-reduce:transition-none ${
            open ? '[transform:rotateY(-165deg)] pointer-events-none' : ''
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(.65,0,.3,1)' }}
        >
          {/* muka depan — SELURUH sampul bisa diklik/tap untuk membuka,
              bukan cuma tombol kecil (target sentuh jauh lebih luas) */}
          <div
            onClick={open ? undefined : onOpen}
            className="absolute inset-0 rounded-l-[6px] rounded-r-[14px] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] overflow-hidden select-none cursor-pointer"
            style={{
              // Coklat sampul modul --cover-3 + tinta --cover-ink, sama dengan rak modul (antrean #325)
              background:
                'linear-gradient(150deg, color-mix(in srgb, var(--cover-3) 78%, #000) 0%, var(--cover-3) 68%, color-mix(in srgb, var(--cover-3) 88%, #000) 100%)',
              color: 'var(--cover-ink)',
              boxShadow: '8px 12px 30px -12px rgba(62,54,46,.45)',
            }}
          >
            {/* garis punggung buku */}
            <div aria-hidden="true" className="absolute left-3.5 top-0 bottom-0 w-px bg-white/15" />
            <div className="h-full p-6 sm:p-8 pl-8 sm:pl-10 flex flex-col justify-between">{cover}</div>
          </div>
          {/* muka belakang sampul (kelihatan sekilas saat membuka).
              pointer-events-none WAJIB: dia absolute inset-0 SETELAH muka
              depan di DOM, jadi walau tak terlihat (backface-hidden) dia
              tetap menang hit-testing dan menyegat klik mouse ke tombol
              "Buka Buku" — bug yang tidak ketahuan lewat .click()
              programatik karena itu melewati hit-testing. */}
          <div
            className="absolute inset-0 rounded-l-[6px] rounded-r-[14px] [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between gap-4 p-5 sm:p-8 pointer-events-none"
            // Sisi dalam sampul ikut coklat sampul (koreksi #325); teks tinta penuh supaya kontras >= 4,5:1
            style={{
              background: 'linear-gradient(210deg, color-mix(in srgb, var(--cover-3) 78%, #000) 0%, color-mix(in srgb, var(--cover-3) 90%, #000) 100%)',
              color: 'var(--cover-ink)',
            }}
          >
            {/* Tim pengembang, sama dengan panduan Edisi 3 (antrean #324) */}
            <div className="flex flex-col gap-3 text-[13px] leading-snug">
              <p className="text-xs font-semibold uppercase tracking-wide">Tim Pengembang</p>
              <div>
                <p className="text-xs">Ketua</p>
                <p className="font-semibold">Inawati, S.IP., M.M.</p>
              </div>
              <div>
                <p className="text-xs">Anggota</p>
                <ul className="flex flex-col gap-0.5">
                  {ANGGOTA.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="font-display italic text-[11.5px]">
              Edisi 5.0: Fakultas Vokasi UM
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
