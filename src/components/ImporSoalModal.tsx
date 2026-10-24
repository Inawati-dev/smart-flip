import { useState } from 'react'
import { FileInput } from './FileInput'
import { IconDownload, IconX } from './icons'
import { bacaBarisSoal, bacaBerkasXlsx, buatTemplat, HURUF_OPSI, type DraftSoal, type GalatBaris } from '../lib/imporSoal'

// Modal Impor Soal di Bank Soal (antrean #329): unduh templat, pilih berkas,
// pratinjau baris sah/galat, lalu simpan. Penyimpanan per soal dikerjakan
// pemanggil lewat `simpan` supaya jenis, Bab, dan urutan ikut filter aktif.
export function ImporSoalModal({
  judulJenis,
  namaBab,
  denganTopik,
  babList,
  simpan,
  onClose,
}: {
  judulJenis: string
  /** "Bab 2. Judul" untuk tes formatif; null untuk tes lain. */
  namaBab: string | null
  denganTopik: boolean
  babList: { id: number; title: string }[]
  simpan: (soal: DraftSoal, urutanKe: number) => Promise<void>
  onClose: (jumlahMasuk: number) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [hasil, setHasil] = useState<{ sah: DraftSoal[]; galat: GalatBaris[] } | null>(null)
  const [membaca, setMembaca] = useState(false)
  const [masuk, setMasuk] = useState<number | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)
  // Soal yang sudah tersimpan walau impor gagal di tengah; dikirim saat modal ditutup supaya daftar dimuat ulang.
  const [tersimpan, setTersimpan] = useState(0)
  const sibuk = membaca || masuk != null

  async function pilihBerkas(f: File | null) {
    setFile(f)
    setHasil(null)
    setPesan(null)
    if (!f) return
    setMembaca(true)
    try {
      setHasil(bacaBarisSoal(await bacaBerkasXlsx(f), { denganTopik, babList }))
    } catch {
      setPesan('Berkas tidak bisa dibaca. Pastikan formatnya .xlsx dari templat.')
    } finally {
      setMembaca(false)
    }
  }

  async function unduhTemplat() {
    const blob = await buatTemplat(denganTopik, babList)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `templat-soal-${judulJenis.toLowerCase().replace(/\s+/g, '-')}.xlsx`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function impor() {
    if (!hasil?.sah.length) return
    let n = 0
    setMasuk(0)
    try {
      for (const soal of hasil.sah) {
        await simpan(soal, n)
        n++
        setMasuk(n)
      }
      onClose(tersimpan + n)
    } catch {
      // Soal yang sudah tersimpan tetap ada; laporkan berapa yang masuk.
      setPesan(`Gagal di baris ${hasil.sah[n].baris}. ${n} dari ${hasil.sah.length} soal sudah tersimpan.`)
      setTersimpan((t) => t + n)
      setMasuk(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Impor Soal"
        className="bg-ivory rounded-2xl modal-sedang p-6 my-8 flex flex-col gap-4"
        style={{ boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)', animation: 'slideUpModal 0.22s ease' }}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-brown">Impor Soal: {judulJenis}</h3>
          <button onClick={() => onClose(tersimpan)} disabled={masuk != null} aria-label="Tutup" className="btn btn-secondary btn-icon flex-shrink-0">
            <IconX size={16} />
          </button>
        </div>
        {namaBab && <p className="text-sm text-brown-2 -mt-2">Soal masuk ke {namaBab}.</p>}

        <section className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-brown">1. Unduh templat lalu isi di Excel</p>
          <p className="text-[13px] text-brown-3">
            Satu soal per baris. Opsi A sampai D wajib, Kunci diisi A, B, C, atau D, Pembahasan boleh kosong
            {denganTopik ? ', Topik diisi nomor Bab (boleh kosong)' : ''}.
          </p>
          <button type="button" onClick={unduhTemplat} className="btn btn-secondary btn-sm self-start">
            <IconDownload size={15} /> Unduh Templat
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-brown">2. Pilih berkas yang sudah diisi</p>
          <FileInput accept=".xlsx" label="Pilih Berkas Excel" hint="Format .xlsx, maks 5 MB" maxSizeMb={5} file={file} onChange={pilihBerkas} disabled={sibuk} />
        </section>

        {membaca && <p className="text-sm text-brown-3">Membaca berkas…</p>}
        {pesan && (
          <p role="alert" className="text-sm font-medium" style={{ color: 'var(--red)' }}>
            {pesan}
          </p>
        )}

        {hasil && (
          <section className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-brown">
              3. Periksa: {hasil.sah.length} soal siap diimpor{hasil.galat.length ? `, ${hasil.galat.length} baris bermasalah (dilewati)` : ''}
            </p>
            {hasil.galat.length > 0 && (
              <ul className="text-[13px] flex flex-col gap-1 rounded-lg border p-3 max-h-40 overflow-y-auto" style={{ borderColor: 'var(--border)', color: 'var(--red)' }}>
                {hasil.galat.map((g) => (
                  <li key={g.baris}>
                    Baris {g.baris}: {g.pesan}
                  </li>
                ))}
              </ul>
            )}
            {hasil.sah.length > 0 && (
              <div className="rounded-lg border max-h-64 overflow-auto" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-bg3 text-brown-3 text-left">
                      <th className="px-2 py-1.5 font-semibold">Baris</th>
                      <th className="px-2 py-1.5 font-semibold">Pertanyaan</th>
                      <th className="px-2 py-1.5 font-semibold text-center">Kunci</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasil.sah.map((s) => (
                      <tr key={s.baris} className="row-divider">
                        <td className="px-2 py-1.5 text-brown-3">{s.baris}</td>
                        <td className="px-2 py-1.5 text-brown">{s.question}</td>
                        <td className="px-2 py-1.5 text-center font-semibold">{HURUF_OPSI[s.answer_idx]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end gap-2 flex-wrap">
          <button type="button" onClick={() => onClose(tersimpan)} disabled={masuk != null} className="btn btn-secondary">
            Batal
          </button>
          <button type="button" onClick={impor} disabled={!hasil?.sah.length || sibuk} className="btn btn-primary">
            {masuk != null ? `Mengimpor ${masuk}/${hasil?.sah.length ?? 0}…` : `Impor ${hasil?.sah.length ?? 0} Soal`}
          </button>
        </div>
      </div>
    </div>
  )
}
