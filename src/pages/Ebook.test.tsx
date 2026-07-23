// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import Ebook from './Ebook'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

const saveProgressMock = vi.fn(async (_path: string, _data: unknown) => {})
vi.mock('../lib/progress', () => ({
  saveProgress: (path: string, data: unknown) => saveProgressMock(path, data),
}))

// A fake PDF with `pageCount` pages; getDocument resolves/rejects depending on
// the requested path, so tests can exercise both the happy path and the
// "file not found" error path (mirrors legacy/script.js's openBook() catch).
function makeFakeDoc(pageCount: number) {
  const page = {
    getViewport: () => ({ width: 100, height: 150 }),
    render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
  }
  return {
    numPages: pageCount,
    getPage: async () => page,
  }
}

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (src: string) => ({
    promise:
      src === 'books/missing.pdf'
        ? Promise.reject(new Error('Failed to fetch: 404'))
        : Promise.resolve(makeFakeDoc(3)),
  }),
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.js?url', () => ({ default: '' }))

function renderEbook(book: string | null) {
  const queryClient = new QueryClient()
  const path = book ? `/ebook?book=${encodeURIComponent(book)}` : '/ebook'
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Ebook />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Ebook', () => {
  it('shows a loading state before the PDF resolves', () => {
    renderEbook('books/modul-01.pdf')
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('Membuka PDF…')).toBeTruthy()
  })

  it('shows the page counter and navigation once the PDF loads', async () => {
    renderEbook('books/modul-01.pdf')
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Sebelumnya') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTitle('Berikutnya') as HTMLButtonElement).disabled).toBe(false)
  })

  it('navigates forward/back and disables buttons at the first/last page boundary', async () => {
    renderEbook('books/modul-01.pdf')
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByTitle('Berikutnya'))
    await waitFor(() => expect(screen.getAllByText('2 / 3').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByTitle('Halaman terakhir'))
    await waitFor(() => expect(screen.getAllByText('3 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Berikutnya') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTitle('Halaman terakhir') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByTitle('Halaman pertama'))
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect((screen.getByTitle('Sebelumnya') as HTMLButtonElement).disabled).toBe(true)
  })

  it('saves progress with the exact book path, page, and computed pct on every page change', async () => {
    saveProgressMock.mockClear()
    renderEbook('books/modul-01.pdf')
    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    await waitFor(() =>
      expect(saveProgressMock).toHaveBeenCalledWith(
        'books/modul-01.pdf',
        expect.objectContaining({ pct: 33, currentPage: 1 }),
      ),
    )

    fireEvent.click(screen.getByTitle('Berikutnya'))
    await waitFor(() =>
      expect(saveProgressMock).toHaveBeenCalledWith(
        'books/modul-01.pdf',
        expect.objectContaining({ pct: 67, currentPage: 2 }),
      ),
    )
  })

  it('shows an error message when no ?book= param is present', () => {
    renderEbook(null)
    expect(screen.getByText('Tidak ada buku yang dipilih.')).toBeTruthy()
  })

  it('shows a friendly "not available yet" message when the PDF fails to load (404)', async () => {
    renderEbook('books/missing.pdf')
    await waitFor(() => expect(screen.getByText(/belum tersedia/)).toBeTruthy())
  })
})
