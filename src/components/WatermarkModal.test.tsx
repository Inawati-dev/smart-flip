// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Antrean #177: isi watermark pembaca PDF bisa dipilih dosen.
const h = vi.hoisted(() => ({ updateCourse: vi.fn(async (..._a: unknown[]) => {}) }))
vi.mock('../lib/courses', async (asli) => ({ ...(await asli<typeof import('../lib/courses')>()), updateCourse: h.updateCourse }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }))
vi.mock('../contexts/CourseContext', () => ({ useCourse: () => ({ course: null }) }))

import { WatermarkModal, pilihanCap } from './WatermarkModal'
import { pilihCapAir } from './PembacaPdf'
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
