// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { Akun } from './Akun'

afterEach(cleanup)

const mockAuth = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  profile: null as { full_name: string; role: string; nim_nidn: string | null; avatar_url: string | null } | null,
  role: null as 'mahasiswa' | 'dosen' | null,
  loading: false,
  refreshProfile: vi.fn(async () => {}),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: async () => ({}),
      getUser: async () => ({ data: { user: mockAuth.user } }),
    },
  },
  isSupabaseConfigured: false,
}))

function renderAkun(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Akun />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function seedQueryCache(queryClient: QueryClient) {
  queryClient.setQueryData(['modules'], [])
  queryClient.setQueryData(['progress', 'all'], {})
  queryClient.setQueryData(['quizAttempts', 'all'], [])
  queryClient.setQueryData(['analitik', 'studentStats'], [])
}

describe('Akun', () => {
  beforeEach(() => {
    mockAuth.user = { id: 'u1', email: 'ahmad.rizki@student.um.ac.id' }
    mockAuth.profile = { full_name: 'Ahmad Rizki', role: 'mahasiswa', nim_nidn: '220341600001', avatar_url: null }
    mockAuth.role = 'mahasiswa'
    mockAuth.loading = false
  })

  it('tombol Ubah membuka modal ubah profil', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient)

    expect(screen.queryByText('Ubah Profil')).toBeNull()
    fireEvent.click(screen.getByText('Ubah'))
    expect(screen.getByText('Ubah Profil')).toBeTruthy()
    expect(screen.getByDisplayValue('Ahmad Rizki')).toBeTruthy()
  })

  it('tidak ada teks kode undangan di halaman Akun', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    const { container } = renderAkun(queryClient)
    expect(container.textContent).not.toContain('kode undangan')
    expect(container.textContent).not.toContain('Kode Undangan')
  })

  it('mahasiswa tidak melihat tautan Kelola PDF', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient)
    expect(screen.queryByText('Kelola PDF')).toBeNull()
  })

  it('dosen melihat tautan Kelola PDF', () => {
    mockAuth.profile = { full_name: 'Dr. Ahmad Fauzi', role: 'dosen', nim_nidn: '0012345678', avatar_url: null }
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient)
    expect(screen.getByText('Kelola PDF')).toBeTruthy()
  })
})
