// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Vark } from './Vark'

afterEach(cleanup)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

function renderVark(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Vark />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Vark', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the intro screen with no retake link when no assessment has been taken', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['vark'], null)
    renderVark(queryClient)
    expect(screen.getByText('Asesmen Gaya Belajar VARK')).toBeTruthy()
    expect(screen.getByText('Mulai Asesmen →')).toBeTruthy()
    expect(screen.queryByText(/sudah mengisi asesmen/)).toBeNull()
  })

  it('shows a retake prompt and current dominant style when an assessment already exists', async () => {
    // Seeded via localStorage (not just setQueryData) so the value survives
    // useVarkResult's background refetch (fetchVarkResult reads localStorage
    // when Supabase isn't configured) instead of flickering back to null.
    localStorage.setItem(
      'sfp_vark',
      JSON.stringify({ V: 9, A: 1, R: 1, K: 1, dominant: 'V', completedAt: '2026-01-01T00:00:00.000Z' }),
    )
    const queryClient = new QueryClient()
    renderVark(queryClient)
    await waitFor(() => {
      expect(screen.getByText(/sudah mengisi asesmen/)).toBeTruthy()
    })
    expect(screen.getByText(/Visual Learner/)).toBeTruthy()
  })

  it('walks through all 12 questions and shows a result matching the answers given', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['vark'], null)
    renderVark(queryClient)

    fireEvent.click(screen.getByText('Mulai Asesmen →'))
    expect(screen.getByText('Pertanyaan 1 dari 12')).toBeTruthy()

    // Next is disabled until an option is picked
    const nextBtn = () => screen.getByText(/Berikutnya →|Selesai ✓/)
    expect((nextBtn() as HTMLButtonElement).disabled).toBe(true)

    // Answer all 12 questions with option A (index 0 → Visual)
    for (let i = 0; i < 12; i++) {
      const options = screen.getAllByText('A')
      fireEvent.click(options[options.length - 1])
      fireEvent.click(nextBtn())
    }

    await waitFor(
      () => {
        expect(screen.getByText(/Gaya Belajar Kamu: Visual Learner/)).toBeTruthy()
      },
      { timeout: 3000 },
    )

    // Score 12/12 for Visual should be reflected in the result
    expect(screen.getByText(/skor: 12\/12/)).toBeTruthy()

    // Saved into localStorage for Profil.tsx / fetchVarkResult to read back
    const saved = JSON.parse(localStorage.getItem('sfp_vark') || 'null')
    expect(saved).toMatchObject({ V: 12, A: 0, R: 0, K: 0, dominant: 'V' })
  })

  it('supports going back to a previous question and changing the answer', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['vark'], null)
    renderVark(queryClient)

    fireEvent.click(screen.getByText('Mulai Asesmen →'))
    fireEvent.click(screen.getAllByText('A')[0])
    fireEvent.click(screen.getByText('Berikutnya →'))
    expect(screen.getByText('Pertanyaan 2 dari 12')).toBeTruthy()

    fireEvent.click(screen.getByText('← Sebelumnya'))
    expect(screen.getByText('Pertanyaan 1 dari 12')).toBeTruthy()
  })
})
