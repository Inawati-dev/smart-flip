import { useState } from 'react'
import { IconBook, IconDownload } from './icons'
import { PembacaPdf } from './PembacaPdf'

// Panduan Pemakaian SMART-FLIP (antrean #290), pola SAKTI TautanPanduan.
// Berkasnya public/panduan-smartflip.pdf, dibangun ulang dengan
// `python docs/panduan-smartflip/buat-pdf.py` dan ikut ter-deploy apa adanya.
// Edisi ditulis tangan di sini (harus sama dengan EDISI di buat-pdf.py): panduan
// tidak dibangun ulang tiap rilis, jadi jangan menyiratkan isinya selalu terbaru.
// Dipasang di Dashboard (dosen dan mahasiswa) dan Akun.
export const ALAMAT_PANDUAN = '/panduan-smartflip.pdf'
export const EDISI_PANDUAN = 'Edisi 4, 25 Okt 2026'
const JUMLAH_HALAMAN = 37

export function TautanPanduan() {
  const [baca, setBaca] = useState(false)
  return (
    <div className="bg-ivory rounded-2xl border p-4 flex items-center gap-x-4 gap-y-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0 flex-1 basis-56">
        <div className="text-sm font-semibold text-brown">Panduan Pemakaian SMART-FLIP</div>
        <div className="text-xs text-brown-3 mt-0.5">
          PDF {JUMLAH_HALAMAN} halaman · {EDISI_PANDUAN} · cara memakai tiap menu dan daftar link akses
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setBaca(true)} className="btn btn-secondary">
          <IconBook size={16} /> Baca Panduan
        </button>
        <a href={ALAMAT_PANDUAN} download className="btn btn-secondary">
          <IconDownload size={16} /> Unduh PDF
        </a>
      </div>
      {baca && (
        <PembacaPdf
          src={ALAMAT_PANDUAN}
          judul="Panduan Pemakaian SMART-FLIP"
          onEscape={() => setBaca(false)}
          kiri={<span className="text-sm font-semibold truncate">Panduan Pemakaian SMART-FLIP</span>}
          aksi={
            <>
              <a href={ALAMAT_PANDUAN} download className="pembaca-tb">
                Unduh
              </a>
              <button type="button" onClick={() => setBaca(false)} className="pembaca-tb on">
                Tutup
              </button>
            </>
          }
        />
      )}
    </div>
  )
}
