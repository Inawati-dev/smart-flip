// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { PdfPreviewLink, PreviewLink } from './PdfPreviewLink'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }), signOut: async () => ({ error: null }) } },
  isSupabaseConfigured: false,
}))

// Pratinjau tidak boleh menyimpan progres baca.
const saveProgressMock = vi.fn(async (_path: string, _data: unknown) => {})
vi.mock('../lib/progress', () => ({
  saveProgress: (path: string, data: unknown) => saveProgressMock(path, data),
  moduleIdToPath: (id: number) => 'books/modul-' + id + '.pdf',
}))

vi.mock('pdfjs-dist', () => {
  const page = {
    getViewport: () => ({ width: 100, height: 150 }),
    render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
  }
  return {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({ promise: Promise.resolve({ numPages: 3, getPage: async () => page, destroy: async () => {} }) }),
  }
})
vi.mock('pdfjs-dist/build/pdf.worker.min.js?url', () => ({ default: '' }))

const setelan = vi.hoisted(() => ({ watermark: false }))
vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({ courses: [], courseId: 1, course: { id: 1, watermark_pdf: setelan.watermark }, setCourseId: () => {}, isLoading: false }),
}))

describe('Pratinjau PDF dosen', () => {
  beforeEach(() => {
    saveProgressMock.mockClear()
    setelan.watermark = false
    localStorage.clear()
  })

  it('PDF dibuka di pembaca flipbook (bukan iframe), di atas modal, tanpa menyimpan progres', async () => {
    render(<PdfPreviewLink url="https://x.test/berkas/modul-01.pdf" label="Pratinjau" />)
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }))
    const pembaca = document.querySelector('.pembaca') as HTMLElement
    expect(pembaca).toBeTruthy()
    expect(pembaca.classList.contains('di-atas-modal')).toBe(true)
    expect(document.querySelector('iframe')).toBeNull()
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByTitle('Berikutnya'))
    await waitFor(() => expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0))
    expect(saveProgressMock).not.toHaveBeenCalled()
    expect((screen.getByRole('link', { name: 'Buka di Tab Baru' }) as HTMLAnchorElement).href).toBe('https://x.test/berkas/modul-01.pdf')
  })

  it('tombol Tutup menutup pembaca, juga saat masih memuat; Escape sama', async () => {
    render(<PdfPreviewLink url="https://x.test/a.pdf" label="Pratinjau" />)
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }))
    // Belum siap: bilah atas dengan Tutup sudah ada.
    expect(screen.getByRole('button', { name: 'Tutup' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(document.querySelector('.pembaca')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }))
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('.pembaca')).toBeNull()
  })

  it('watermark mengikuti setelan mata kuliah', async () => {
    setelan.watermark = true
    render(<PdfPreviewLink url="https://x.test/a.pdf" label="Pratinjau" />)
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau' }))
    await waitFor(() => expect(document.querySelectorAll('.pembaca-cap').length).toBeGreaterThan(0))
  })

  it('video tetap memakai modal lama; klik latar tidak menutupnya, tombol silang dan Escape menutup', () => {
    render(<PreviewLink url="https://youtu.be/dQw4w9WgXcQ" label="Pratinjau Video" />)
    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau Video' }))
    const dialog = screen.getByRole('dialog')
    expect(document.querySelector('.pembaca')).toBeNull()
    expect(dialog.querySelector('iframe')).toBeTruthy()
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tutup pratinjau' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Pratinjau Video' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
