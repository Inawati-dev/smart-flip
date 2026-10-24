// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { TugasAkhirMhsCard } from './TugasAkhirMhsCard'

const submitTugasAkhir = vi.fn().mockResolvedValue(undefined)

vi.mock('../contexts/CourseContext', () => ({ useCourse: () => ({ courseId: 1 }) }))
vi.mock('../lib/tugasAkhir', async (importOriginal) => {
  const asli = await importOriginal<typeof import('../lib/tugasAkhir')>()
  return {
    ...asli,
    fetchProjectsMhs: vi.fn().mockResolvedValue([
      { id: 'p1', dosen_id: 'd', title: 'Brief Uji', description: '', deadline: null, rubric: [], class_ids: [], is_open: true, created_at: '2026-01-01' },
    ]),
    fetchMySubmission: vi.fn().mockResolvedValue(null),
    submitTugasAkhir: (...a: unknown[]) => submitTugasAkhir(...a),
  }
})

describe('TugasAkhirMhsCard modal kirim', () => {
  it('membuka modal berjudul benar dan tombol Kirim memanggil submitTugasAkhir', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <TugasAkhirMhsCard />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Kirim Mini Projek' }))
    expect(screen.getByRole('dialog', { name: 'Kirim Mini Projek' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Tautan'), { target: { value: 'https://contoh.id' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kirim' }))
    await waitFor(() => expect(submitTugasAkhir).toHaveBeenCalledTimes(1))
    expect(submitTugasAkhir.mock.calls[0][0]).toMatchObject({ projectId: 'p1', link: 'https://contoh.id' })
  })
})
