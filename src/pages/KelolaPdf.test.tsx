// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { KelolaPdf } from './KelolaPdf'

afterEach(cleanup)

const mockListModulPdfFiles = vi.hoisted(() => vi.fn())
const mockDeleteModulPdfFile = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('../lib/manajemen', () => ({
  listModulPdfFiles: mockListModulPdfFiles,
  deleteModulPdfFile: mockDeleteModulPdfFile,
}))

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
}))

const FILES = [
  { name: 'modul-1-111.pdf', url: 'https://x/modul-1-111.pdf', updatedAt: '2026-09-01T00:00:00Z', usedBy: 'Modul Satu' },
  { name: 'modul-2-222.pdf', url: 'https://x/modul-2-222.pdf', updatedAt: '2026-09-02T00:00:00Z', usedBy: null },
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
  it('menampilkan 2 baris dari 2 berkas hasil listModulPdfFiles', async () => {
    mockListModulPdfFiles.mockResolvedValue(FILES)
    renderPage()

    expect(await screen.findByText('modul-1-111.pdf')).toBeTruthy()
    expect(screen.getByText('modul-2-222.pdf')).toBeTruthy()
    expect(screen.getByText('Dipakai modul: Modul Satu')).toBeTruthy()
    expect(screen.getByText('Belum terpakai')).toBeTruthy()
  })

  it('klik Hapus membuka modal konfirmasi sebelum memanggil deleteModulPdfFile', async () => {
    mockListModulPdfFiles.mockResolvedValue(FILES)
    renderPage()

    await screen.findByText('modul-1-111.pdf')
    fireEvent.click(screen.getAllByText('Hapus')[0])

    expect(screen.getByText('Hapus berkas modul-1-111.pdf?')).toBeTruthy()
    expect(screen.getByText('Modul Modul Satu akan kehilangan PDF-nya.')).toBeTruthy()
    expect(mockDeleteModulPdfFile).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Ya, Hapus'))
    await waitFor(() => expect(mockDeleteModulPdfFile).toHaveBeenCalledWith('modul-1-111.pdf'))
  })
})
