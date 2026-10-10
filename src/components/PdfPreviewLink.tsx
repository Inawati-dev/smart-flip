import { useEffect, useState } from 'react'
import { IconEye, IconX } from './icons'
import { parseVideoUrl } from '../lib/video'
import { PembacaPdf, useCapAir } from './PembacaPdf'

// Tombol kecil "pratinjau": PDF dibuka di pembaca yang sama dengan flipbook
// mahasiswa (PembacaPdf), sebagai lapisan selayar penuh di atas halaman dan
// modal pembuka, tanpa berpindah tab (antrean #166). Video tetap di modal
// pemutar. Dipakai di Modul dosen, PDF Modul, dan modal Ganti PDF
// (antrean #31, #32, #39). Tautan "Buka di Tab Baru" tetap ada di bilah atas
// untuk yang ingin unduh atau cetak.
// `compact` (antrean #92): tombol berlabel 36 px selebar sel kisi aksi kartu,
// label tersembunyi di telepon; bawaan tetap tombol ikon 44 px.
export function PreviewLink({ url, label = 'Pratinjau', compact = false }: { url: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={compact ? 'btn btn-secondary btn-sm w-full whitespace-nowrap' : 'btn btn-secondary btn-icon flex-shrink-0'}
      >
        <IconEye size={compact ? 13 : 16} />
        {compact && <span className="hidden sm:inline">{label}</span>}
      </button>
      {open && (parseVideoUrl(url) ? <PreviewModal url={url} title={label} onClose={() => setOpen(false)} /> : <PratinjauPdf url={url} title={label} onClose={() => setOpen(false)} />)}
    </>
  )
}

// Pembaca flipbook di atas modal. Tidak menyimpan progres baca (tanpa onHalaman);
// watermark mengikuti setelan mata kuliah seperti di halaman mahasiswa.
function PratinjauPdf({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const cap = useCapAir()
  const fileName = url.split('/').pop()?.split('?')[0] || url
  return (
    <PembacaPdf
      src={url}
      judul={title}
      cap={cap}
      diAtasModal
      onEscape={onClose}
      kiri={
        <span className="text-sm font-semibold truncate" title={fileName}>
          {fileName}
        </span>
      }
      aksi={
        <>
          <a href={url} target="_blank" rel="noopener noreferrer" className="pembaca-tb">
            Buka di Tab Baru
          </a>
          <button type="button" onClick={onClose} className="pembaca-tb on">
            Tutup
          </button>
        </>
      }
    />
  )
}

// Modal pemutar video. Klik latar gelap tidak menutupnya (antrean #167);
// tutup lewat tombol silang atau Escape. PDF tidak lewat sini lagi (lihat PratinjauPdf).
export function PreviewModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const video = parseVideoUrl(url)
  const fileName = url.split('/').pop()?.split('?')[0] || url

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(62,54,46,.52)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="rounded-2xl w-full flex flex-col overflow-hidden"
        style={{
          background: 'var(--ivory)',
          maxWidth: 'min(1200px, 96vw)',
          height: 'min(88dvh, 900px)',
          boxShadow: '0 8px 40px rgba(62,54,46,.22)',
          animation: 'slideUpModal 0.22s ease',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold text-brown truncate flex-1" title={fileName}>
            {fileName}
          </span>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            Buka di Tab Baru
          </a>
          <button type="button" onClick={onClose} aria-label="Tutup pratinjau" className="btn btn-secondary btn-icon">
            <IconX size={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0" style={{ background: 'var(--bg3)' }}>
          {video?.kind === 'youtube' ? (
            <iframe
              src={video.embedUrl}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : video?.kind === 'file' ? (
            <video src={video.src} controls playsInline className="w-full h-full bg-black" />
          ) : (
            // Tautan video yang tidak dikenali (bukan YouTube/mp4/webm): tampil sebagai halaman tertanam.
            <iframe src={url} title={title} className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  )
}

// Nama lama, dipertahankan supaya pemakai existing (KelolaPdf.tsx,
// ModulList.tsx) tidak perlu berubah — sekadar label default beda.
export function PdfPreviewLink({ url, label = 'Pratinjau PDF', compact = false }: { url: string; label?: string; compact?: boolean }) {
  return <PreviewLink url={url} label={label} compact={compact} />
}
