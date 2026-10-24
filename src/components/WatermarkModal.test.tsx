// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Antrean #177: isi watermark pembaca PDF bisa dipilih dosen.
const h = vi.hoisted(() => ({ updateCourse: vi.fn(async (..._a: unknown[]) => {}) }))
vi.mock('../lib/courses', async (asli) => ({ ...(await asli<typeof import('../lib/courses')>()), updateCourse: h.updateCourse }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }))
vi.mock('../contexts/CourseContext', () => ({ useCourse: () => ({ course: null }) }))

import { WatermarkModal, pilihanCap } from './WatermarkModal'
import { pilihCapAir, capAir, capGambar } from './PembacaPdf'
import type { Course } from '../lib/courses'

afterEach(cleanup)
beforeEach(() => h.updateCourse.mockClear())

const dasar: Course = { id: 7, code: 'MPP', name: 'Metode Penelitian', description: '', dosen_id: null, order_num: 1, is_active: true }
const PNG = 'data:image/png;base64,iVBORw0KGgo='

function buka(course: Course) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WatermarkModal course={course} onClose={onClose} onSaved={onSaved} />
    </QueryClientProvider>,
  )
  return { onClose, onSaved }
}

describe('pilihCapAir', () => {
  it('mati: tanpa watermark apa pun jenisnya', () => {
    expect(pilihCapAir({ watermark_pdf: false, watermark_jenis: 'teks', watermark_teks: 'x' }, 'A · 1')).toBeNull()
    expect(pilihCapAir(null, 'A · 1')).toBeNull()
  })
  it('nama (bawaan, juga saat kolom v35 belum ada): nama dan NIM pembaca', () => {
    expect(decodeURIComponent(pilihCapAir({ watermark_pdf: true }, 'Ani · 123') ?? '')).toContain('Ani · 123')
  })
  it('teks: teks dosen menggantikan nama pembaca', () => {
    const cap = decodeURIComponent(pilihCapAir({ watermark_pdf: true, watermark_jenis: 'teks', watermark_teks: ' Rahasia <b> ' }, 'Ani · 123') ?? '')
    expect(cap).toContain('Rahasia &lt;b&gt;')
    expect(cap).not.toContain('Ani')
  })
  it('gambar sah: dipakai apa adanya sebagai latar', () => {
    expect(pilihCapAir({ watermark_pdf: true, watermark_jenis: 'gambar', watermark_gambar: PNG }, 'Ani')).toBe(`url("${PNG}")`)
  })
  it('gambar tidak sah (bukan data URL PNG, atau menyelipkan CSS): jatuh ke nama pembaca', () => {
    for (const jahat of ['https://jahat.example/x.png', PNG + '");background:url("https://jahat.example', 'data:image/svg+xml;base64,AAAA', '']) {
      const cap = pilihCapAir({ watermark_pdf: true, watermark_jenis: 'gambar', watermark_gambar: jahat }, 'Ani') ?? ''
      expect(cap).not.toContain('jahat')
      expect(decodeURIComponent(cap)).toContain('Ani')
    }
  })
  it('karakter kontrol di teks dibuang supaya SVG tetap terbaca', () => {
    const cap = pilihCapAir({ watermark_pdf: true, watermark_jenis: 'teks', watermark_teks: 'Ra\u0001ha\u000Bsia￾' }, 'Ani') ?? ''
    const svg = decodeURIComponent(cap.slice('url("data:image/svg+xml,'.length, -2))
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull()
    expect(svg).toContain('>Rahasia<')
  })
  it('teks kosong: jatuh ke nama pembaca', () => {
    expect(decodeURIComponent(pilihCapAir({ watermark_pdf: true, watermark_jenis: 'teks', watermark_teks: '  ' }, 'Ani') ?? '')).toContain('Ani')
  })
})

describe('ukuran dan kerapatan (antrean #308)', () => {
  const svgDari = (cap: string) => decodeURIComponent(cap.slice('url("data:image/svg+xml,'.length, -2))
  it('sedang/sedang, null, dan tanpa argumen: SVG sama persis dengan tampilan lama', () => {
    const lama = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='340' height='220'><text x='170' y='110' text-anchor='middle' transform='rotate(-30 170 110)' font-family='sans-serif' font-size='15' font-weight='600' fill='#000' fill-opacity='0.14'>Ani</text></svg>")}")`
    expect(capAir('Ani')).toBe(lama)
    expect(capAir('Ani', 'sedang', 'sedang')).toBe(lama)
    expect(capAir('Ani', null, null)).toBe(lama)
    expect(capGambar(PNG)).toBe(`url("${PNG}")`)
    expect(capGambar(PNG, 'sedang', 'sedang')).toBe(`url("${PNG}")`)
  })
  it('besar: huruf lebih besar; rapat: ubin lebih kecil; renggang: ubin lebih besar', () => {
    expect(svgDari(capAir('Ani', 'besar', 'sedang'))).toContain("font-size='22.5'")
    expect(svgDari(capAir('Ani', 'kecil', 'sedang'))).toContain("font-size='11.25'")
    const lebar = (s: string) => Number(svgDari(s).match(/width='(\d+)'/)?.[1])
    const nama = 'Natasya Adelia Ramadhanti · 230535600123'
    // Rapat jelas lebih sempit dari renggang, dan kecil+rapat lebih sempit dari ubin lama 340.
    expect(lebar(capAir(nama, 'sedang', 'rapat'))).toBeLessThan(lebar(capAir(nama, 'sedang', 'renggang')))
    expect(lebar(capAir('Nama Mahasiswa · NIM', 'kecil', 'rapat'))).toBeLessThan(200)
    // Ubin selalu cukup lebar untuk teks miring, jadi tulisan panjang tidak terpotong tepi ubin.
    const panjangMiring = [...nama].length * 15 * 0.6 * Math.cos(Math.PI / 6)
    expect(lebar(capAir(nama, 'sedang', 'rapat'))).toBeGreaterThan(panjangMiring)
  })
  it('urutan rapat < sedang < renggang berlaku untuk teks pendek, panjang, dan kapital lebar', () => {
    const lebar = (s: string) => Number(svgDari(s).match(/width='(\d+)'/)?.[1])
    for (const teks of ['Ani', 'A'.repeat(60), 'WWWWWWWWWWWWWWWWWWWW', 'Kelas 📘 SMART-FLIP']) {
      for (const u of ['kecil', 'sedang', 'besar'] as const) {
        const [r, s, g] = (['rapat', 'sedang', 'renggang'] as const).map((k) => lebar(capAir(teks, u, k)))
        expect(r).toBeLessThan(s)
        expect(s).toBeLessThan(g)
      }
    }
    // 20 huruf W tebal miring sekitar 247 px; ubin rapat harus cukup lebar.
    expect(lebar(capAir('WWWWWWWWWWWWWWWWWWWW', 'sedang', 'rapat'))).toBeGreaterThan(247)
  })
  it('gambar: ukuran dan kerapatan memakai bungkus SVG yang tetap terbaca', () => {
    const svg = svgDari(capGambar(PNG, 'besar', 'rapat'))
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull()
    expect(svg).toContain(PNG)
    expect(pilihCapAir({ watermark_pdf: true, watermark_jenis: 'gambar', watermark_gambar: PNG, watermark_ukuran: 'besar' }, 'Ani')).not.toBe(`url("${PNG}")`)
  })
  it('pilihCapAir meneruskan setelan ke teks', () => {
    expect(svgDari(pilihCapAir({ watermark_pdf: true, watermark_ukuran: 'besar', watermark_kerapatan: 'rapat' }, 'Ani') ?? '')).toContain("font-size='22.5'")
  })
})

describe('WatermarkModal ukuran dan kerapatan', () => {
  it('Besar + Rapat dikirim ke updateCourse', async () => {
    const { onClose } = buka({ ...dasar, watermark_pdf: true })
    fireEvent.click(within(screen.getByRole('group', { name: 'Ukuran watermark' })).getByRole('button', { name: 'Besar' }))
    fireEvent.click(within(screen.getByRole('group', { name: 'Kerapatan watermark' })).getByRole('button', { name: 'Rapat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(h.updateCourse).toHaveBeenCalledWith(7, { watermark_pdf: true, watermark_ukuran: 'besar', watermark_kerapatan: 'rapat' })
  })
  it('baris pilihan hilang saat Mati', () => {
    buka(dasar)
    expect(screen.queryByRole('group', { name: 'Ukuran watermark' })).toBeNull()
  })
  it('kolom v52 belum ada: sisa setelan tetap tersimpan tanpa dua kolom itu, pesan menyebut v52', async () => {
    h.updateCourse.mockRejectedValueOnce({ code: 'PGRST204', message: "Could not find the 'watermark_ukuran' column of 'courses' in the schema cache" })
    const { onSaved } = buka({ ...dasar, watermark_pdf: true })
    fireEvent.click(within(screen.getByRole('group', { name: 'Ukuran watermark' })).getByRole('button', { name: 'Besar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(h.updateCourse).toHaveBeenLastCalledWith(7, { watermark_pdf: true })
    expect(onSaved.mock.calls[0][0]).toMatch(/migration_v52_watermark_ukuran\.sql/)
  })
})

describe('WatermarkModal', () => {
  it('pilihan awal mengikuti setelan mata kuliah', () => {
    expect(pilihanCap(dasar)).toBe('mati')
    expect(pilihanCap({ ...dasar, watermark_pdf: true })).toBe('nama')
    expect(pilihanCap({ ...dasar, watermark_pdf: true, watermark_jenis: 'gambar', watermark_gambar: PNG })).toBe('gambar')
    // Isi rusak atau kosong: modal menunjukkan yang benar-benar tampil di pembaca.
    expect(pilihanCap({ ...dasar, watermark_pdf: true, watermark_jenis: 'gambar', watermark_gambar: 'https://x/y.png' })).toBe('nama')
    expect(pilihanCap({ ...dasar, watermark_pdf: true, watermark_jenis: 'teks', watermark_teks: ' ' })).toBe('nama')
  })

  it('Nama dan NIM dari keadaan mati: hanya sakelar yang dikirim (aman sebelum v35)', async () => {
    const { onClose, onSaved } = buka(dasar)
    fireEvent.click(screen.getByRole('button', { name: 'Nama dan NIM' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(h.updateCourse).toHaveBeenCalledWith(7, { watermark_pdf: true })
    expect(onSaved).toHaveBeenCalledWith('Watermark PDF: Nama dan NIM')
  })

  it('Teks: wajib diisi, lalu jenis dan teksnya dikirim', async () => {
    const { onClose } = buka(dasar)
    fireEvent.click(screen.getByRole('button', { name: 'Teks' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Isi teks watermark dulu.')).toBeTruthy()
    expect(h.updateCourse).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Teks Watermark/), { target: { value: '  Milik Prodi  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(h.updateCourse).toHaveBeenCalledWith(7, { watermark_pdf: true, watermark_jenis: 'teks', watermark_teks: 'Milik Prodi' })
  })

  it('Gambar tanpa berkas: ditahan dengan pesan', () => {
    buka(dasar)
    fireEvent.click(screen.getByRole('button', { name: 'Gambar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    expect(screen.getByText('Pilih gambar watermark dulu.')).toBeTruthy()
    expect(h.updateCourse).not.toHaveBeenCalled()
  })

  it('Mati dari jenis teks: sakelar dimatikan, teks lama tidak dihapus', async () => {
    const { onSaved } = buka({ ...dasar, watermark_pdf: true, watermark_jenis: 'teks', watermark_teks: 'Lama' })
    fireEvent.click(screen.getByRole('button', { name: 'Mati' }))
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('Watermark PDF dimatikan'))
    expect(h.updateCourse).toHaveBeenCalledWith(7, { watermark_pdf: false })
  })

  it('kolom v35 belum ada: pesan menyebut berkas migrasinya, modal tetap terbuka', async () => {
    h.updateCourse.mockRejectedValueOnce({ code: 'PGRST204', message: "Could not find the 'watermark_jenis' column of 'courses' in the schema cache" })
    const { onClose } = buka(dasar)
    fireEvent.click(screen.getByRole('button', { name: 'Teks' }))
    fireEvent.change(screen.getByLabelText(/Teks Watermark/), { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(screen.getByText(/migration_v35_watermark_custom\.sql/)).toBeTruthy())
    expect(onClose).not.toHaveBeenCalled()
  })
})
