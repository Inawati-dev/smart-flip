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

    expect(screen.queryByText('Ubah profil')).toBeNull()
    fireEvent.click(screen.getByText('Ubah'))
    expect(screen.getByText('Ubah profil')).toBeTruthy()
    expect(screen.getByDisplayValue('Ahmad Rizki')).toBeTruthy()
  })

  it('tidak ada teks kode undangan di halaman Akun', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    const { container } = renderAkun(queryClient)
    expect(container.textContent).not.toContain('kode undangan')
    expect(container.textContent).not.toContain('Kode Undangan')
  })

  // Koreksi Johan 16 Sep 2026: Kelola PDF pindah ke rel navigasi (Layout.tsx,
  // dosen saja) — tidak lagi ada tautannya di halaman Akun, untuk peran mana pun.
  it('tidak ada tautan Kelola PDF di halaman Akun', () => {
    mockAuth.profile = { full_name: 'Dr. Ahmad Fauzi', role: 'dosen', nim_nidn: '0012345678', avatar_url: null }
    mockAuth.role = 'dosen'
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    renderAkun(queryClient)
    expect(screen.queryByText('Kelola PDF')).toBeNull()
  })

  // Pengaturan.tsx dilebur ke sini (PengaturanSections) — bagian Tema harus
  // muncul, dan tidak ada lagi tautan terpisah ke /pengaturan atau tombol
  // Keluar sendiri (Keluar sudah ada di rel/bilah bawah Layout).
  it('memuat bagian Tema dari Pengaturan, tanpa tautan Pengaturan atau tombol Keluar', () => {
    const queryClient = new QueryClient()
    seedQueryCache(queryClient)
    const { container } = renderAkun(queryClient)
    expect(screen.getByText('Tema')).toBeTruthy()
    expect(container.querySelector('a[href="/pengaturan"]')).toBeNull()
    expect(screen.queryByText('Keluar')).toBeNull()
  })
})
