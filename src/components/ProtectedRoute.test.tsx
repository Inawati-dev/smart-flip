// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProtectedRoute } from './ProtectedRoute'

// `<Navigate>` (react-router) only swaps the matched route via an effect —
// renderToStaticMarkup is a one-shot SSR pass that never runs effects, so it
// can never show the redirect target's content. Use a real render() here
// (like AuthContext.test.tsx's own ProtectedRoute tests) instead.
afterEach(cleanup)

const mockAuth = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  role: 'mahasiswa' as 'mahasiswa' | 'dosen' | null,
  loading: false,
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mockAuth }))

const mockPreTestDone = vi.hoisted(() => ({ data: false as boolean | undefined, isLoading: false }))
vi.mock('../lib/topik', () => ({ usePreTestDone: () => mockPreTestDone }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/modul" element={<ProtectedRoute><div>Halaman Modul</div></ProtectedRoute>} />
        <Route path="/asesmen/pre" element={<div>Halaman Pre-test</div>} />
        <Route path="/dashboard" element={<div>Halaman Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute — gerbang pre-test (spec §4.1, §9 WP6)', () => {
  it('mahasiswa tanpa pre-test membuka /modul dialihkan ke /asesmen/pre', async () => {
    mockAuth.role = 'mahasiswa'
    mockPreTestDone.data = false
    mockPreTestDone.isLoading = false
    renderAt('/modul')
    await waitFor(() => expect(screen.getByText('Halaman Pre-test')).toBeTruthy())
  })

  it('mahasiswa dengan pre-test lolos ke /modul', async () => {
    mockAuth.role = 'mahasiswa'
    mockPreTestDone.data = true
    mockPreTestDone.isLoading = false
    renderAt('/modul')
    await waitFor(() => expect(screen.getByText('Halaman Modul')).toBeTruthy())
  })

  it('dosen lolos tanpa dicek pre-test', async () => {
    mockAuth.role = 'dosen'
    mockPreTestDone.data = false
    mockPreTestDone.isLoading = false
    renderAt('/modul')
    await waitFor(() => expect(screen.getByText('Halaman Modul')).toBeTruthy())
  })
})
