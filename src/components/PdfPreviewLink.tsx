import { IconEye } from './icons'

// Tombol kecil "pratinjau": buka URL di tab baru. Dipakai di semua tempat
// yang menampilkan nama berkas atau tautan (Modul dosen, Kelola PDF, modal
// Ganti PDF, tabel Video dosen) supaya bentuknya sama (antrean #31/#32).
export function PreviewLink({ url, label = 'Pratinjau' }: { url: string; label?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-11 h-11 rounded-lg border text-brown-2 hover:bg-cream flex-shrink-0"
      style={{ borderColor: 'rgba(62,54,46,.10)' }}
    >
      <IconEye size={16} />
    </a>
  )
}

// Nama lama, dipertahankan supaya pemakai existing (KelolaPdf.tsx,
// ModulList.tsx) tidak perlu berubah — sekadar label default beda.
export function PdfPreviewLink({ url, label = 'Pratinjau PDF' }: { url: string; label?: string }) {
  return <PreviewLink url={url} label={label} />
}
