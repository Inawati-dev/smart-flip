// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { KelolaPdf } from './KelolaPdf'

afterEach(cleanup)

const mockListModulPdfFiles = vi.hoisted(() => vi.fn())
const mockDeleteModulPdfFile = vi.hoisted(() => vi.fn(async () => {}))
const mockListModulVideoFiles = vi.hoisted(() => vi.fn())
const mockDeleteModulVideoFile = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('../lib/manajemen', () => ({
  listModulPdfFiles: mockListModulPdfFiles,
  deleteModulPdfFile: mockDeleteModulPdfFile,
  listModulVideoFiles: mockListModulVideoFiles,
  deleteModulVideoFile: mockDeleteModulVideoFile,
}))

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
}))

const PDF_FILES = [
  {
    name: 'modul-1-111.pdf',
    url: 'https://x/modul-1-111.pdf',
    updatedAt: '2026-09-01T00:00:00Z',
    createdAt: '2026-09-01T00:00:00Z',
    sizeBytes: 512_000,
    usedBy: 'Topik Satu',
  },
  {
    name: 'modul-2-222.pdf',
    url: 'https://x/modul-2-222.pdf',
    updatedAt: '2026-09-02T00:00:00Z',
    createdAt: null,
    sizeBytes: null,
    usedBy: null,
  },
]

const VIDEO_FILES = [
  {
    name: 'modul-1-333.mp4',
    url: 'https://x/modul-1-333.mp4',
    updatedAt: '2026-09-03T00:00:00Z',
    createdAt: '2026-09-03T00:00:00Z',
    sizeBytes: 5_242_880,
    usedBy: 'Topik Satu',
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <KelolaPdf />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('KelolaPdf', () => {
  it('menampilkan 2 baris dari 2 berkas hasil listModulPdfFiles di tab PDF (bawaan)', async () => {
    mockListModulPdfFiles.mockResolvedValue(PDF_FILES)
    mockListModulVideoFiles.mockResolvedValue([])
    renderPage()

    expect(await screen.findByText('modul-1-111.pdf')).toBeTruthy()
    expect(screen.getByText('modul-2-222.pdf')).toBeTruthy()
    expect(screen.getByText('Topik Satu')).toBeTruthy()
    expect(screen.getByText('Belum terpakai')).toBeTruthy()
  })

  // Kolom sama di kedua tab (spec #73): No, Nama berkas, Ukuran, Tanggal
  // unggah, Dipakai topik, Aksi -- plus format ukuran KB di bawah 1 MB dan
  // nomor urut 1..n.
  it('header kolom lengkap dan Ukuran memakai KB di bawah 1 MB', async () => {
    mockListModulPdfFiles.mockResolvedValue(PDF_FILES)
    mockListModulVideoFiles.mockResolvedValue([])
    renderPage()

    await screen.findByText('modul-1-111.pdf')
    expect(screen.getByText('No')).toBeTruthy()
    expect(screen.getByText('Nama berkas')).toBeTruthy()
    expect(screen.getByText('Ukuran')).toBeTruthy()
    expect(screen.getByText('Tanggal unggah')).toBeTruthy()
    expect(screen.getByText('Dipakai topik')).toBeTruthy()
    expect(screen.getByText('500 KB')).toBeTruthy()
  })

  it('klik Hapus membuka modal konfirmasi sebelum memanggil deleteModulPdfFile', async () => {
    mockListModulPdfFiles.mockResolvedValue(PDF_FILES)
    mockListModulVideoFiles.mockResolvedValue([])
    renderPage()

    await screen.findByText('modul-1-111.pdf')
    fireEvent.click(screen.getByLabelText('Hapus berkas modul-1-111.pdf'))

    expect(screen.getByText('Hapus berkas modul-1-111.pdf?')).toBeTruthy()
    expect(screen.getByText('Topik Topik Satu akan kehilangan PDF-nya.')).toBeTruthy()
    expect(mockDeleteModulPdfFile).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Ya, Hapus'))
    await waitFor(() => expect(mockDeleteModulPdfFile).toHaveBeenCalledWith('modul-1-111.pdf'))
  })

  it('klik tab "Video topik" menampilkan nama berkas video', async () => {
    mockListModulPdfFiles.mockResolvedValue(PDF_FILES)
    mockListModulVideoFiles.mockResolvedValue(VIDEO_FILES)
    renderPage()

    await screen.findByText('modul-1-111.pdf')
    fireEvent.click(screen.getByText(/Video topik/))

    expect(await screen.findByText('modul-1-333.mp4')).toBeTruthy()
    expect(screen.getByText('5.0 MB')).toBeTruthy()
  })
})
