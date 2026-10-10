import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateCourse, isMissingCourseSchema, type Course } from '../lib/courses'
import { capAir, POLA_GAMBAR_CAP } from './PembacaPdf'
import { PillGroup } from './PillGroup'
import { FileInput } from './FileInput'

const BORDER = { borderColor: 'var(--border)' } as const
const TEKS_MAKS = 60
// Sama dengan check di migration_v35: gambar disimpan sebagai teks di baris mata kuliah.
const GAMBAR_MAKS = 400000

type Pilihan = 'mati' | 'nama' | 'teks' | 'gambar'
export const LABEL_CAP: Record<Pilihan, string> = { mati: 'Mati', nama: 'Nama dan NIM', teks: 'Teks', gambar: 'Gambar' }

// Sama dengan aturan pilihCapAir di pembaca: jenis teks atau gambar yang isinya
// kosong atau tidak sah dianggap nama dan NIM, karena itulah yang tampil.
export function pilihanCap(course: Course | null | undefined): Pilihan {
  if (!course?.watermark_pdf) return 'mati'
  if (course.watermark_jenis === 'gambar' && POLA_GAMBAR_CAP.test(course.watermark_gambar ?? '')) return 'gambar'
  if (course.watermark_jenis === 'teks' && course.watermark_teks?.trim()) return 'teks'
  return 'nama'
}

// Gambar unggahan dijadikan satu ubin watermark: ukuran ubin sama dengan ubin
// teks di capAir (340x220), gambar dimuat utuh di tengah dan ditipiskan, latar
// tembus pandang. Hasilnya PNG kecil yang langsung dipakai sebagai latar berulang.
function ubinGambar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const kanvas = document.createElement('canvas')
        kanvas.width = 340
        kanvas.height = 220
        const ctx = kanvas.getContext('2d')
        if (!ctx || !img.naturalWidth || !img.naturalHeight) return reject(new Error('Gambar tidak bisa dibaca'))
        const skala = Math.min(200 / img.naturalWidth, 130 / img.naturalHeight)
        const w = img.naturalWidth * skala
        const h = img.naturalHeight * skala
        ctx.globalAlpha = 0.16
        ctx.drawImage(img, (340 - w) / 2, (220 - h) / 2, w, h)
        resolve(kanvas.toDataURL('image/png'))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gambar tidak bisa dibaca'))
    }
    img.src = url
  })
}

// Modal "Watermark PDF" (antrean #177): dosen memilih isi watermark pembaca
// PDF per mata kuliah. Mati, nama dan NIM pembaca (bawaan sejak #157), teks
// bebas, atau gambar unggahan.
export function WatermarkModal({ course, onClose, onSaved }: { course: Course; onClose: () => void; onSaved: (pesan: string) => void }) {
  const queryClient = useQueryClient()
  const [pilih, setPilih] = useState<Pilihan>(pilihanCap(course))
  const [teks, setTeks] = useState(course.watermark_teks ?? '')
  const [gambar, setGambar] = useState(POLA_GAMBAR_CAP.test(course.watermark_gambar ?? '') ? (course.watermark_gambar as string) : '')
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')

  async function pilihBerkas(file: File | null) {
    if (!file) return
    setGalat('')
    try {
      const hasil = await ubinGambar(file)
      if (hasil.length > GAMBAR_MAKS) return setGalat('Gambar terlalu rumit untuk watermark. Pakai logo yang lebih sederhana.')
      setGambar(hasil)
    } catch {
      setGalat('Gambar tidak bisa dibaca. Pilih berkas PNG atau JPG lain.')
    }
  }

  const pratinjau =
    pilih === 'mati'
      ? null
      : pilih === 'gambar'
        ? gambar && `url("${gambar}")`
        : capAir(pilih === 'teks' ? teks.trim() || 'Teks watermark' : 'Nama Mahasiswa · NIM')

  async function simpan() {
    if (pilih === 'teks' && !teks.trim()) return setGalat('Isi teks watermark dulu.')
    if (pilih === 'gambar' && !gambar) return setGalat('Pilih gambar watermark dulu.')
    // Kolom v35 hanya dikirim bila nilainya berubah, supaya "Mati" dan
    // "Nama dan NIM" tetap bisa disimpan sebelum migrasi v35 dijalankan.
    const patch: Parameters<typeof updateCourse>[1] = { watermark_pdf: pilih !== 'mati' }
    if (pilih !== 'mati' && pilih !== (course.watermark_jenis ?? 'nama')) patch.watermark_jenis = pilih
    if (pilih === 'teks' && teks.trim() !== (course.watermark_teks ?? '')) patch.watermark_teks = teks.trim()
    if (pilih === 'gambar' && gambar !== (course.watermark_gambar ?? '')) patch.watermark_gambar = gambar
    setSaving(true)
    setGalat('')
    try {
      await updateCourse(course.id, patch)
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      onSaved(pilih === 'mati' ? 'Watermark PDF dimatikan' : `Watermark PDF: ${LABEL_CAP[pilih]}`)
      onClose()
    } catch (e) {
      setGalat(
        isMissingCourseSchema(e)
          ? 'Kolom watermark belum ada. Jalankan migration_v35_watermark_custom.sql di Supabase dulu.'
          : (e as { message?: string } | null)?.message || 'Gagal menyimpan watermark',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Watermark PDF"
        className="bg-ivory rounded-2xl p-5 max-w-md w-full max-h-[90dvh] overflow-y-auto"
        style={{ animation: 'slideUpModal 0.22s ease' }}
      >
        <h3 className="text-base font-semibold text-brown mb-1">Watermark PDF</h3>
        <p className="text-xs text-brown-3 mb-4">{course.name}. Watermark ditumpangkan di tiap halaman PDF yang dibuka di pembaca.</p>

        <div className="overflow-x-auto mb-4">
          <PillGroup
            ariaLabel="Isi watermark"
            value={pilih}
            onChange={(v) => {
              setPilih(v as Pilihan)
              setGalat('')
            }}
            options={(Object.keys(LABEL_CAP) as Pilihan[]).map((k) => ({ value: k, label: LABEL_CAP[k] }))}
          />
        </div>

        {pilih === 'nama' && <p className="text-xs text-brown-3 mb-4">Nama dan NIM akun yang sedang membaca, berbeda di tiap pembaca.</p>}
        {pilih === 'teks' && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
            Teks Watermark
            <input
              value={teks}
              maxLength={TEKS_MAKS}
              onChange={(e) => setTeks(e.target.value)}
              placeholder="Contoh: Dilarang disebarluaskan"
              className="h-11 rounded-[var(--radius-control)] border px-3 text-base font-normal text-brown"
              style={BORDER}
            />
            <span className="font-normal text-brown-3 tabular-nums">
              {teks.length}/{TEKS_MAKS} huruf
            </span>
          </label>
        )}
        {pilih === 'gambar' && (
          <div className="mb-4">
            <FileInput accept="image/png,image/jpeg" label="Pilih Gambar" maxSizeMb={20} file={null} onChange={(f) => void pilihBerkas(f)} />
            <p className="text-xs text-brown-3 mt-1.5">Logo PNG atau JPG. Gambar dikecilkan dan ditipiskan otomatis.</p>
          </div>
        )}

        {pilih !== 'mati' && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-brown-2 mb-1">Pratinjau</div>
            <div
              data-testid="pratinjau-cap"
              className="h-36 rounded-[var(--radius-control)] border flex items-center justify-center text-xs text-brown-3"
              style={{ ...BORDER, backgroundColor: '#fff', backgroundImage: pratinjau || undefined, backgroundRepeat: 'repeat' }}
            >
              {!pratinjau && 'Belum ada gambar yang dipilih.'}
            </div>
          </div>
        )}

        {galat && <p className="text-xs text-danger mb-3">{galat}</p>}
        <div className="flex gap-2.5">
          <button onClick={onClose} disabled={saving} className="btn btn-secondary flex-1">
            Batal
          </button>
          <button onClick={() => void simpan()} disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
